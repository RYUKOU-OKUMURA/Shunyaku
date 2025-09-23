// OCR サービス統合マネージャー
import { OCRResult, OCRConfig, ImageInput, ApiResponse, PerformanceMetrics } from '../types';
import { OCRWorkerMessage, OCRWorkerResponse } from '../workers/ocrWorker';

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageId = 0;
  private pendingMessages = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  constructor() {
    this.initializeWorker();
  }

  // Web Workerを初期化
  private initializeWorker(): void {
    try {
      // Web Workerを作成
      this.worker = new Worker(
        new URL('../workers/ocrWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // メッセージハンドラーを設定
      this.worker.onmessage = (event: MessageEvent<OCRWorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('OCR Worker error:', error);
        this.handleWorkerError(error);
      };

      console.log('OCR Worker initialized');
    } catch (error) {
      console.error('Failed to create OCR Worker:', error);
      throw new Error(`OCR Worker initialization failed: ${error}`);
    }
  }

  // ワーカーメッセージを処理
  private handleWorkerMessage(response: OCRWorkerResponse): void {
    const { id, type, payload } = response;
    const pending = this.pendingMessages.get(id);

    if (!pending) {
      console.warn(`No pending message found for ID: ${id}`);
      return;
    }

    this.pendingMessages.delete(id);

    switch (type) {
      case 'INITIALIZED':
        this.isInitialized = true;
        pending.resolve(undefined);
        break;

      case 'RESULT':
        if (payload?.result) {
          const apiResponse: ApiResponse<OCRResult> = {
            success: true,
            data: payload.result,
            performanceMetrics: payload.performanceMetrics,
          };
          pending.resolve(apiResponse);
        } else {
          pending.reject(new Error('No result in worker response'));
        }
        break;

      case 'WARMED_UP':
        pending.resolve(undefined);
        break;

      case 'ERROR':
        const error = new Error(payload?.error || 'Unknown worker error');
        pending.reject(error);
        break;

      default:
        pending.reject(new Error(`Unknown response type: ${type}`));
    }
  }

  // ワーカーエラーを処理
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);

    // すべての待機中のメッセージを拒否
    this.pendingMessages.forEach((pending) => {
      pending.reject(new Error(`Worker error: ${error.message}`));
    });
    this.pendingMessages.clear();

    // ワーカーを再初期化
    this.isInitialized = false;
    this.initializeWorker();
  }

  // ワーカーにメッセージを送信
  private sendMessage<T>(message: Omit<OCRWorkerMessage, 'id'>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('OCR Worker is not available'));
        return;
      }

      const id = (++this.messageId).toString();
      this.pendingMessages.set(id, { resolve, reject });

      const fullMessage: OCRWorkerMessage = {
        ...message,
        id,
      };

      this.worker.postMessage(fullMessage);

      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('OCR operation timed out'));
        }
      }, 30000);
    });
  }

  // OCR初期化
  async initialize(config: OCRConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.sendMessage({
        type: 'INITIALIZE',
        payload: { config },
      });
      console.log('OCR Service initialized');
    } catch (error) {
      console.error('Failed to initialize OCR service:', error);
      throw error;
    }
  }

  // 画像からテキストを抽出
  async processImage(
    image: ImageInput,
    config: OCRConfig,
  ): Promise<ApiResponse<OCRResult>> {
    try {
      // 必要に応じて初期化
      if (!this.isInitialized) {
        await this.initialize(config);
      }

      // 画像前処理（必要に応じて）
      const processedImage = config.preprocessingEnabled
        ? await this.preprocessImage(image)
        : image;

      // OCR実行
      const result = await this.sendMessage<ApiResponse<OCRResult>>({
        type: 'PROCESS_IMAGE',
        payload: {
          image: processedImage,
          config,
        },
      });

      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);

      return {
        success: false,
        error: {
          code: 'OCR_SERVICE_ERROR',
          message: `OCR service error: ${error}`,
          context: 'ocr',
          timestamp: new Date(),
          details: error,
        },
      };
    }
  }

  // 画像前処理
  private async preprocessImage(image: ImageInput): Promise<ImageInput> {
    try {
      // Canvas APIを使用して画像前処理を実行
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // 画像を読み込み
      const img = await this.loadImage(image);

      // キャンバスサイズを設定
      canvas.width = img.width;
      canvas.height = img.height;

      // 画像を描画
      ctx.drawImage(img, 0, 0);

      // 画像データを取得
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // グレースケール変換とコントラスト向上
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // グレースケール変換
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // コントラスト向上（簡易的な二値化）
        const enhanced = gray > 128 ? 255 : 0;

        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
        // A (alpha) はそのまま
      }

      // 処理済み画像データをキャンバスに戻す
      ctx.putImageData(imageData, 0, 0);

      // 新しいImageInputを作成
      const processedDataUrl = canvas.toDataURL('image/png');

      return {
        data: processedDataUrl,
        format: 'png',
        width: canvas.width,
        height: canvas.height,
        size: processedDataUrl.length,
      };
    } catch (error) {
      console.warn('Image preprocessing failed, using original image:', error);
      return image;
    }
  }

  // 画像を読み込み
  private loadImage(image: ImageInput): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;

      if (typeof image.data === 'string') {
        img.src = image.data;
      } else {
        const blob = new Blob([image.data], { type: `image/${image.format}` });
        img.src = URL.createObjectURL(blob);
      }
    });
  }

  // ワーカーウォームアップ
  async warmUp(languages: string[] = ['eng', 'jpn']): Promise<void> {
    try {
      await this.sendMessage({
        type: 'WARMUP',
        payload: { languages },
      });
      console.log('OCR Service warmed up');
    } catch (error) {
      console.error('Failed to warm up OCR service:', error);
      throw error;
    }
  }

  // パフォーマンステスト
  async runPerformanceTest(
    testImage: ImageInput,
    config: OCRConfig,
    iterations: number = 5,
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
    results: Array<{
      time: number;
      success: boolean;
      textLength: number;
    }>;
  }> {
    const results = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      try {
        const result = await this.processImage(testImage, config);
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (result.success && result.data) {
          successCount++;
          results.push({
            time: duration,
            success: true,
            textLength: result.data.text.length,
          });
        } else {
          results.push({
            time: duration,
            success: false,
            textLength: 0,
          });
        }
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          time: duration,
          success: false,
          textLength: 0,
        });
      }
    }

    const times = results.map(r => r.time);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const successRate = successCount / iterations;

    return {
      averageTime: Number(averageTime.toFixed(2)),
      minTime,
      maxTime,
      successRate: Number(successRate.toFixed(3)),
      results,
    };
  }

  // サービス状態の確認
  getStatus(): {
    isInitialized: boolean;
    workerAvailable: boolean;
    pendingOperations: number;
  } {
    return {
      isInitialized: this.isInitialized,
      workerAvailable: this.worker !== null,
      pendingOperations: this.pendingMessages.size,
    };
  }

  // リソースクリーンアップ
  async terminate(): Promise<void> {
    if (this.worker) {
      // 待機中のメッセージをクリア
      this.pendingMessages.forEach((pending) => {
        pending.reject(new Error('OCR Service is terminating'));
      });
      this.pendingMessages.clear();

      // ワーカーに終了メッセージを送信
      try {
        await this.sendMessage({ type: 'TERMINATE' });
      } catch (error) {
        console.warn('Error during worker termination:', error);
      }

      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    console.log('OCR Service terminated');
  }
}

// シングルトンインスタンス
export const ocrService = new OCRService();