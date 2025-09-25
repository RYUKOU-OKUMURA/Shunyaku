// DeepL API 抽象化レイヤー
import { TranslationRequest, TranslationResult, TranslationConfig, ApiResponse } from '../types';

export interface DeepLApiResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export interface DeepLUsageResponse {
  character_count: number;
  character_limit: number;
}

export interface DeepLLanguagesResponse {
  languages: Array<{
    language: string;
    name: string;
    supports_formality: boolean;
  }>;
}

// キューアイテムの型定義
interface TranslationQueueItem {
  id: string;
  request: TranslationRequest;
  priority: 'high' | 'normal' | 'low';
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

// 再試行戦略の設定
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class TranslationService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api-free.deepl.com'; // Free tier URL
  private rateLimiter: RateLimiter;
  private requestCount = 0;
  private characterCount = 0;
  private translationQueue: TranslationQueueItem[] = [];
  private isProcessingQueue = false;
  private retryStrategy: RetryStrategy;

  constructor(private config?: Partial<TranslationConfig>) {
    this.rateLimiter = new RateLimiter(500, 60000); // 500 requests per minute
    this.retryStrategy = new RetryStrategy({
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    });
    this.initializeApiKey();
  }

  // APIキーを安全に初期化
  private async initializeApiKey(): Promise<void> {
    try {
      // Tauri Store から暗号化されたAPIキーを読み込み
      const encryptedApiKey = await this.getStoredApiKey();
      if (encryptedApiKey) {
        this.apiKey = await this.decryptApiKey(encryptedApiKey);
        this.updateBaseUrl();
      }
    } catch (error) {
      console.warn('Failed to load API key from storage:', error);
    }
  }

  // 暗号化されたAPIキーを保存
  async setAndStoreApiKey(apiKey: string): Promise<void> {
    try {
      const encrypted = await this.encryptApiKey(apiKey);
      await this.storeApiKey(encrypted);
      this.setApiKey(apiKey);
    } catch (error) {
      console.error('Failed to store API key:', error);
      throw new Error('API key storage failed');
    }
  }

  // APIキーを暗号化（簡易実装）
  private async encryptApiKey(apiKey: string): Promise<string> {
    // 本来はより強固な暗号化を実装すべき
    // 現在は base64 エンコーディングのみ
    return btoa(apiKey);
  }

  // APIキーを復号化
  private async decryptApiKey(encryptedApiKey: string): Promise<string> {
    try {
      return atob(encryptedApiKey);
    } catch {
      throw new Error('Invalid encrypted API key');
    }
  }

  // APIキーをストレージに保存（Tauri Store使用予定）
  private async storeApiKey(encryptedApiKey: string): Promise<void> {
    // TODO: Tauri plugin-store の実装
    localStorage.setItem('deepl_api_key_encrypted', encryptedApiKey);
  }

  // ストレージからAPIキーを取得
  private async getStoredApiKey(): Promise<string | null> {
    // TODO: Tauri plugin-store の実装
    return localStorage.getItem('deepl_api_key_encrypted');
  }

  // ベースURLを更新
  private updateBaseUrl(): void {
    if (this.apiKey && this.apiKey.endsWith(':fx')) {
      this.baseUrl = 'https://api-free.deepl.com';
    } else {
      this.baseUrl = 'https://api.deepl.com';
    }
  }

  // API キーを設定
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.updateBaseUrl();
  }

  // キューイング翻訳（優先度付き）
  async queueTranslation(
    request: TranslationRequest,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const queueItem: TranslationQueueItem = {
        id: this.generateRequestId(),
        request,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      };

      // 優先度に基づいてキューに挿入
      this.insertIntoQueue(queueItem);

      // キュー処理開始
      this.processQueue();
    });
  }

  // バッチ翻訳
  async translateBatch(
    requests: TranslationRequest[],
    batchSize: number = 5
  ): Promise<Array<ApiResponse<TranslationResult>>> {
    const results: Array<ApiResponse<TranslationResult>> = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      // バッチを並列処理
      const batchPromises = batch.map(request =>
        this.translateWithRetry(request)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: {
                code: 'BATCH_TRANSLATION_ERROR',
                message: `Batch item ${i + index} failed: ${result.reason}`,
                context: 'translation',
                timestamp: new Date(),
                details: result.reason,
              },
            });
          }
        });

        // バッチ間で少し待機
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);

        // バッチ全体が失敗した場合
        for (let j = 0; j < batch.length; j++) {
          results.push({
            success: false,
            error: {
              code: 'BATCH_PROCESSING_ERROR',
              message: `Batch processing failed: ${error}`,
              context: 'translation',
              timestamp: new Date(),
              details: error,
            },
          });
        }
      }
    }

    return results;
  }

  // 再試行付き翻訳
  private async translateWithRetry(request: TranslationRequest): Promise<ApiResponse<TranslationResult>> {
    return this.retryStrategy.execute(async () => {
      const result = await this.translateText(request);

      // エラーが再試行可能かチェック
      if (!result.success && result.error) {
        const isRetryable = result.error.details?.retryable ||
          ['DEEPL_RATE_LIMIT_EXCEEDED', 'DEEPL_SERVICE_UNAVAILABLE'].includes(result.error.code);

        if (isRetryable) {
          throw new RetryableError(result.error.message);
        } else {
          // 再試行不可能なエラーは即座に返す
          throw new NonRetryableError(result.error.message);
        }
      }

      return result;
    });
  }

  // キューに挿入（優先度順）
  private insertIntoQueue(item: TranslationQueueItem): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    let insertIndex = this.translationQueue.length;

    for (let i = 0; i < this.translationQueue.length; i++) {
      if (priorityOrder[item.priority] < priorityOrder[this.translationQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }

    this.translationQueue.splice(insertIndex, 0, item);
  }

  // キュー処理
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.translationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.translationQueue.length > 0) {
      const item = this.translationQueue.shift()!;

      try {
        const result = await this.translateWithRetry(item.request);

        if (result.success && result.data) {
          item.resolve(result.data.translatedText);
        } else {
          item.reject(new Error(result.error?.message || 'Translation failed'));
        }
      } catch (error) {
        item.reject(error);
      }

      // キュー処理間隔
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.isProcessingQueue = false;
  }

  // リクエストID生成
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 翻訳実行
  async translateText(request: TranslationRequest): Promise<ApiResponse<TranslationResult>> {
    const startTime = Date.now();

    try {
      // API キーチェック
      if (!this.apiKey) {
        throw new Error('DeepL API key is not configured');
      }

      // レート制限チェック
      await this.rateLimiter.waitForAvailability();

      // リクエストパラメータを構築
      const params = this.buildRequestParams(request);

      // API リクエスト実行
      const response = await this.makeApiRequest('/v2/translate', 'POST', params);

      if (!response.ok) {
        throw new DeepLApiError(
          await response.text(),
          response.status,
          this.getErrorMessage(response.status)
        );
      }

      const data: DeepLApiResponse = await response.json();
      const processingTime = Date.now() - startTime;

      // 統計更新
      this.requestCount++;
      this.characterCount += request.text.length;

      // 結果を変換
      const result = this.parseTranslationResponse(data, request, processingTime);

      return {
        success: true,
        data: result,
        performanceMetrics: {
          ocrTime: 0,
          translationTime: processingTime,
          totalTime: processingTime,
          memoryUsage: 0,
          imageSize: 0,
          textLength: request.text.length,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      // Processing time would be calculated here if needed

      if (error instanceof DeepLApiError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            context: 'translation',
            timestamp: new Date(),
            details: {
              statusCode: error.statusCode,
              retryable: error.isRetryable(),
            },
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'TRANSLATION_ERROR',
          message: `Translation failed: ${error}`,
          context: 'translation',
          timestamp: new Date(),
          details: error,
        },
      };
    }
  }

  // リクエストパラメータを構築
  private buildRequestParams(request: TranslationRequest): Record<string, string> {
    const params: Record<string, string> = {
      text: request.text,
      target_lang: this.mapLanguageCode(request.targetLang),
    };

    // ソース言語指定（自動検出でない場合）
    if (request.sourceLang && request.sourceLang !== 'auto') {
      params.source_lang = this.mapLanguageCode(request.sourceLang);
    }

    // 敬語設定
    if (this.config?.formality) {
      params.formality = this.config.formality;
    }

    // フォーマット保持
    if (this.config?.preserveFormatting) {
      params.preserve_formatting = '1';
    }

    return params;
  }

  // 言語コードをDeepL形式にマッピング
  private mapLanguageCode(lang: string): string {
    const mapping: Record<string, string> = {
      'en': 'EN',
      'ja': 'JA',
      'zh': 'ZH',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'pt': 'PT',
      'ru': 'RU',
      'ko': 'KO',
      'nl': 'NL',
      'pl': 'PL',
      'sv': 'SV',
      'da': 'DA',
      'no': 'NB',
      'fi': 'FI',
      'cs': 'CS',
      'bg': 'BG',
      'et': 'ET',
      'hu': 'HU',
      'lv': 'LV',
      'lt': 'LT',
      'ro': 'RO',
      'sk': 'SK',
      'sl': 'SL',
      'el': 'EL',
    };

    return mapping[lang.toLowerCase()] || lang.toUpperCase();
  }

  // API リクエスト実行
  private async makeApiRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    params?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && params) {
      options.body = new URLSearchParams(params).toString();
    }

    return fetch(url, options);
  }

  // 翻訳レスポンスを解析
  private parseTranslationResponse(
    data: DeepLApiResponse,
    request: TranslationRequest,
    processingTime: number
  ): TranslationResult {
    if (!data.translations || data.translations.length === 0) {
      throw new Error('No translations returned from DeepL API');
    }

    const translation = data.translations[0];

    return {
      originalText: request.text,
      translatedText: translation.text,
      sourceLang: translation.detected_source_language.toLowerCase(),
      targetLang: request.targetLang,
      confidence: 0.95, // DeepL は信頼度を返さないので固定値
      processingTime,
      timestamp: new Date(),
      provider: 'deepl',
    };
  }

  // エラーメッセージを取得
  private getErrorMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad request. Please check your request parameters.',
      403: 'Forbidden. Invalid API key or insufficient permissions.',
      404: 'Resource not found.',
      413: 'Request entity too large. Text is too long.',
      429: 'Too many requests. Rate limit exceeded.',
      456: 'Quota exceeded. You have reached your usage limit.',
      503: 'Service unavailable. Please try again later.',
    };

    return messages[statusCode] || `HTTP ${statusCode} error`;
  }

  // 使用量を取得
  async getUsage(): Promise<ApiResponse<DeepLUsageResponse>> {
    try {
      if (!this.apiKey) {
        throw new Error('DeepL API key is not configured');
      }

      const response = await this.makeApiRequest('/v2/usage', 'GET');

      if (!response.ok) {
        throw new DeepLApiError(
          await response.text(),
          response.status,
          this.getErrorMessage(response.status)
        );
      }

      const data: DeepLUsageResponse = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USAGE_FETCH_ERROR',
          message: `Failed to fetch usage: ${error}`,
          context: 'translation',
          timestamp: new Date(),
        },
      };
    }
  }

  // サポート言語を取得
  async getSupportedLanguages(): Promise<ApiResponse<DeepLLanguagesResponse>> {
    try {
      if (!this.apiKey) {
        throw new Error('DeepL API key is not configured');
      }

      const response = await this.makeApiRequest('/v2/languages', 'GET');

      if (!response.ok) {
        throw new DeepLApiError(
          await response.text(),
          response.status,
          this.getErrorMessage(response.status)
        );
      }

      const data: DeepLLanguagesResponse = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LANGUAGES_FETCH_ERROR',
          message: `Failed to fetch supported languages: ${error}`,
          context: 'translation',
          timestamp: new Date(),
        },
      };
    }
  }

  // 統計情報を取得
  getStatistics(): {
    requestCount: number;
    characterCount: number;
    rateLimitStatus: {
      remaining: number;
      resetTime: Date;
    };
  } {
    return {
      requestCount: this.requestCount,
      characterCount: this.characterCount,
      rateLimitStatus: this.rateLimiter.getStatus(),
    };
  }

  // 設定をリセット
  reset(): void {
    this.requestCount = 0;
    this.characterCount = 0;
    this.rateLimiter.reset();
  }
}

// レート制限管理クラス
class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForAvailability(): Promise<void> {
    const now = Date.now();

    // 古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // 制限チェック
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // 現在のリクエストを記録
    this.requests.push(now);
  }

  getStatus(): { remaining: number; resetTime: Date } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    const remaining = Math.max(0, this.maxRequests - this.requests.length);
    const resetTime = this.requests.length > 0
      ? new Date(Math.min(...this.requests) + this.windowMs)
      : new Date();

    return { remaining, resetTime };
  }

  reset(): void {
    this.requests = [];
  }
}

// 再試行戦略クラス
class RetryStrategy {
  constructor(private config: RetryConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 最後の試行または再試行不可能なエラーの場合
        if (attempt === this.config.maxRetries || error instanceof NonRetryableError) {
          throw lastError;
        }

        // 再試行可能なエラーの場合、待機時間を計算
        if (error instanceof RetryableError) {
          const delay = this.calculateDelay(attempt);
          console.warn(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // 未知のエラーも再試行する
          const delay = this.calculateDelay(attempt);
          console.warn(`Retry attempt ${attempt + 1}/${this.config.maxRetries} for unknown error after ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt);

    // ジッター追加（±20%）
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    const finalDelay = Math.min(delay + jitter, this.config.maxDelayMs);

    return Math.max(finalDelay, 0);
  }
}

// 再試行可能エラー
class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

// 再試行不可能エラー
class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// DeepL API エラークラス
export class DeepLApiError extends Error {
  constructor(
    public readonly response: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'DeepLApiError';
  }

  get code(): string {
    const codeMapping: Record<number, string> = {
      400: 'DEEPL_BAD_REQUEST',
      403: 'DEEPL_FORBIDDEN',
      404: 'DEEPL_NOT_FOUND',
      413: 'DEEPL_TEXT_TOO_LARGE',
      429: 'DEEPL_RATE_LIMIT_EXCEEDED',
      456: 'DEEPL_QUOTA_EXCEEDED',
      503: 'DEEPL_SERVICE_UNAVAILABLE',
    };

    return codeMapping[this.statusCode] || 'DEEPL_UNKNOWN_ERROR';
  }

  isRetryable(): boolean {
    return [429, 503].includes(this.statusCode);
  }
}

// シングルトンインスタンス
export const translationService = new TranslationService();