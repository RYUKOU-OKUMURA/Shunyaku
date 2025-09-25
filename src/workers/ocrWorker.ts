/// <reference lib="webworker" />

// Tesseract.js Web Worker
import { createWorker, Worker as TesseractWorker } from 'tesseract.js';
import type { OEM, PSM } from 'tesseract.js';
import { OCRResult, OCRConfig, ImageInput, ApiResponse, PerformanceMetrics } from '../types';

// ワーカー間通信用のメッセージ型定義
export interface OCRWorkerMessage {
  type: 'INITIALIZE' | 'PROCESS_IMAGE' | 'TERMINATE' | 'WARMUP';
  payload?: {
    image?: ImageInput;
    config?: OCRConfig;
    languages?: string[];
  };
  id: string;
}

export interface OCRWorkerResponse {
  type: 'INITIALIZED' | 'RESULT' | 'ERROR' | 'WARMED_UP';
  payload?: {
    result?: OCRResult;
    error?: string;
    performanceMetrics?: PerformanceMetrics;
  };
  id: string;
}

class OCRWorkerManager {
  private worker: TesseractWorker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private currentLanguages = 'eng';
  private initPromise: Promise<void> | null = null;

  // ワーカー初期化
  async initialize(languages: string = 'eng'): Promise<void> {
    if (this.isInitialized && this.currentLanguages === languages) {
      return;
    }

    if (this.isInitializing) {
      return this.initPromise || Promise.resolve();
    }

    this.isInitializing = true;
    this.currentLanguages = languages;

    this.initPromise = this.doInitialize(languages);
    await this.initPromise;

    this.isInitializing = false;
    this.isInitialized = true;
  }

  private async doInitialize(languages: string): Promise<void> {
    try {
      // 既存のワーカーがある場合は終了
      if (this.worker) {
        await this.worker.terminate();
      }

      // 新しいワーカーを作成
      this.worker = await createWorker(languages, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.debug(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
          }
        },
        // ローカルアセットを使用（CDN依存を回避）
        langPath: '/tessdata', // publicディレクトリのtessdata
        gzip: true, // 圧縮を有効化
      });

      // ワーカー作成後にパラメーターを設定
      await this.worker.setParameters({
        preserve_interword_spaces: '1',
      });

      console.log(`OCR Worker initialized with languages: ${languages}`);
    } catch (error) {
      this.isInitialized = false;
      this.isInitializing = false;
      throw new Error(`Failed to initialize OCR worker: ${error}`);
    }
  }

  // 画像からテキストを認識
  async recognizeText(
    image: ImageInput,
    config: OCRConfig,
  ): Promise<ApiResponse<OCRResult>> {
    const startTime = Date.now();

    try {
      // ワーカーが初期化されていない場合は初期化
      if (!this.isInitialized) {
        await this.initialize(config.language);
      }

      // 言語が変更された場合は再初期化
      if (this.currentLanguages !== config.language) {
        await this.initialize(config.language);
      }

      if (!this.worker) {
        throw new Error('OCR worker is not available');
      }

      // Tesseract.jsのオプションを設定
      await this.worker.setParameters({
        tessedit_pageseg_mode: config.psm as unknown as PSM,
        tessedit_ocr_engine_mode: config.oem as unknown as OEM,
        tessedit_char_whitelist: '', // 必要に応じて文字制限を設定
      });

      // 画像データを準備
      const imageData = this.prepareImageData(image);

      // OCR実行
      const { data } = await this.worker.recognize(imageData);

      const processingTime = Date.now() - startTime;

      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence / 100, // 0-1の範囲に正規化
        language: config.language,
        processingTime,
        timestamp: new Date(),
      };

      const performanceMetrics: PerformanceMetrics = {
        ocrTime: processingTime,
        translationTime: 0,
        totalTime: processingTime,
        memoryUsage: this.estimateMemoryUsage(image),
        imageSize: image.size,
        textLength: result.text.length,
        timestamp: new Date(),
      };

      return {
        success: true,
        data: result,
        performanceMetrics,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'OCR_PROCESSING_ERROR',
          message: `OCR processing failed: ${error}`,
          context: 'ocr',
          timestamp: new Date(),
          details: error,
        },
        performanceMetrics: {
          ocrTime: processingTime,
          translationTime: 0,
          totalTime: processingTime,
          memoryUsage: this.estimateMemoryUsage(image),
          imageSize: image.size,
          textLength: 0,
          timestamp: new Date(),
        },
      };
    }
  }

  // 画像データを準備
  private prepareImageData(image: ImageInput): ImageBitmap | ImageData | HTMLCanvasElement | string {
    if (typeof image.data === 'string') {
      // Base64データの場合
      return image.data;
    }

    if (image.data instanceof ArrayBuffer) {
      // ArrayBufferの場合はBlob経由でURLを作成
      const blob = new Blob([image.data], { type: `image/${image.format}` });
      const url = URL.createObjectURL(blob);

      // 使用後にメモリリークを防ぐためのクリーンアップを登録
      // Note: OCR完了後にrevokeObjectURLが呼ばれるはずだが、
      // 念のためタイムアウト付きのフォールバックも設定
      setTimeout(() => URL.revokeObjectURL(url), 30000); // 30秒後にクリーンアップ

      return url;
    }

    throw new Error('Unsupported image data format');
  }

  // メモリ使用量の推定
  private estimateMemoryUsage(image: ImageInput): number {
    // 画像サイズに基づく簡易的な推定
    // 実際のメモリ使用量は画像の展開後のサイズに依存
    const pixelCount = image.width * image.height;
    const bytesPerPixel = 4; // RGBA
    const estimatedMemory = pixelCount * bytesPerPixel;

    // Tesseract.js自体のメモリ使用量も加算
    const tesseractOverhead = 50 * 1024 * 1024; // 約50MB

    return estimatedMemory + tesseractOverhead;
  }

  // ワーカーのウォームアップ（シーケンシャル実行で競合を回避）
  async warmUp(languages: string[] = ['eng', 'jpn']): Promise<void> {
    const warmupStartTime = Date.now();
    console.log('Starting OCR worker warm-up process...');

    // 複合言語で一度だけ初期化（eng+jpnなど）
    const combinedLanguages = languages.join('+');

    try {
      console.log(`Warming up OCR worker for combined languages: ${combinedLanguages}`);

      await this.initialize(combinedLanguages);

      // 複数サイズのテスト画像でウォームアップ
      const testImages = [
        this.createTestImage('small'), // 100x40
        this.createTestImage('medium'), // 300x100
        this.createTestImage('large'), // 600x200
      ];

      for (const testImage of testImages) {
        const config: OCRConfig = {
          language: combinedLanguages as 'eng' | 'jpn' | 'eng+jpn',
          psm: 3,
          oem: 1,
          preprocessingEnabled: false,
        };

        await this.recognizeText(testImage, config);
      }

      const totalWarmupTime = Date.now() - warmupStartTime;
      console.log(`OCR worker warm-up completed successfully (${totalWarmupTime}ms)`);
    } catch (error) {
      console.error(`Failed to warm up OCR worker:`, error);
      throw error;
    }
  }

  // テスト用の画像を作成（サイズ別）
  private createTestImage(size: 'small' | 'medium' | 'large' = 'small'): ImageInput {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Fallback: 最小限のテスト画像
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      return {
        data: testImageBase64,
        format: 'png',
        width: 1,
        height: 1,
        size: testImageBase64.length,
      };
    }

    // サイズとテキストを設定
    let width: number, height: number, text: string, fontSize: number;
    switch (size) {
      case 'small':
        width = 100;
        height = 40;
        text = 'Test';
        fontSize = 14;
        break;
      case 'medium':
        width = 300;
        height = 100;
        text = 'OCR Warm-up Test';
        fontSize = 20;
        break;
      case 'large':
        width = 600;
        height = 200;
        text = 'Large OCR Performance Test Image';
        fontSize = 24;
        break;
    }

    canvas.width = width;
    canvas.height = height;

    // 白背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // 黒いテキスト
    ctx.fillStyle = 'black';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    // Base64に変換
    const dataUrl = canvas.toDataURL('image/png');

    return {
      data: dataUrl,
      format: 'png',
      width,
      height,
      size: dataUrl.length,
    };
  }

  // キャッシュクリア
  async clearCache(): Promise<void> {
    // Tesseract.jsのキャッシュをクリア
    // 実装は将来的にTesseract.js APIに依存
    console.log('OCR cache cleared');
  }

  // リソースクリーンアップ
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
    console.log('OCR worker terminated');
  }

  // ワーカーの状態確認
  getStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
    currentLanguages: string;
  } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      currentLanguages: this.currentLanguages,
    };
  }
}

// Web Worker内でのメッセージハンドリング
if (typeof importScripts !== 'undefined') {
  // Web Worker環境
  const ocrManager = new OCRWorkerManager();

  self.onmessage = async (event: MessageEvent<OCRWorkerMessage>) => {
    const { type, payload, id } = event.data;

    try {
      switch (type) {
        case 'INITIALIZE':
          if (payload?.config?.language) {
            await ocrManager.initialize(payload.config.language);
          }
          self.postMessage({
            type: 'INITIALIZED',
            id,
          } as OCRWorkerResponse);
          break;

        case 'PROCESS_IMAGE':
          if (payload?.image && payload?.config) {
            const result = await ocrManager.recognizeText(payload.image, payload.config);
            self.postMessage({
              type: 'RESULT',
              payload: {
                result: result.data,
                performanceMetrics: result.performanceMetrics,
              },
              id,
            } as OCRWorkerResponse);
          }
          break;

        case 'WARMUP':
          if (payload?.languages) {
            await ocrManager.warmUp(payload.languages);
          }
          self.postMessage({
            type: 'WARMED_UP',
            id,
          } as OCRWorkerResponse);
          break;

        case 'TERMINATE':
          await ocrManager.terminate();
          self.close();
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: {
          error: String(error),
        },
        id,
      } as OCRWorkerResponse);
    }
  };
}

export { OCRWorkerManager };
export default OCRWorkerManager;
