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

export class TranslationService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api-free.deepl.com'; // Free tier URL
  private rateLimiter: RateLimiter;
  private requestCount = 0;
  private characterCount = 0;

  constructor(private config?: Partial<TranslationConfig>) {
    this.rateLimiter = new RateLimiter(500, 60000); // 500 requests per minute
  }

  // API キーを設定
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;

    // API キーに基づいてベースURLを決定
    if (apiKey.endsWith(':fx')) {
      this.baseUrl = 'https://api-free.deepl.com';
    } else {
      this.baseUrl = 'https://api.deepl.com';
    }
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