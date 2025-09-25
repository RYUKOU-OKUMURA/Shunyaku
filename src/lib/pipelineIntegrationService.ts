// エンドツーエンドパイプライン統合サービス
import { ImageInput, OCRConfig, TranslationRequest } from '../types';
import { ocrService } from './ocrService';
import { translationService } from './translationService';

export interface PipelineResult {
  originalImage: ImageInput;
  ocrResult: {
    text: string;
    confidence: number;
  };
  translationResult: {
    originalText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
  };
  performanceMetrics: {
    totalTime: number;
    ocrTime: number;
    translationTime: number;
    memoryUsage: {
      start: number;
      peak: number;
      end: number;
    };
  };
  success: boolean;
}

export interface PipelineBenchmarkResult {
  passed: boolean;
  message: string;
  averageTime: number;
  successRate: number;
  details: {
    results: PipelineResult[];
    memoryMetrics: {
      averagePeak: number;
      maxPeak: number;
      averageIncrease: number;
    };
  };
}

export class PipelineIntegrationService {
  constructor(
    private defaultOcrConfig: OCRConfig = {
      language: 'eng+jpn',
      psm: 6,
      oem: 3,
      preprocessingEnabled: true,
      confidenceThreshold: 0.6,
    },
    private defaultTargetLang: string = 'ja'
  ) {}

  // エンドツーエンド翻訳パイプライン
  async processImageToTranslation(
    image: ImageInput,
    targetLang: string = this.defaultTargetLang,
    ocrConfig: OCRConfig = this.defaultOcrConfig
  ): Promise<PipelineResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    let peakMemory = startMemory;

    let ocrResult: { text: string; confidence: number } = { text: '', confidence: 0 };
    let translationResult = {
      originalText: '',
      translatedText: '',
      sourceLang: 'unknown',
      targetLang,
    };

    let success = false;

    try {
      // 1. OCR処理
      console.log('Starting OCR processing...');
      const ocrStartTime = performance.now();

      const ocrResponse = await ocrService.processImage(image, ocrConfig);

      const ocrEndTime = performance.now();
      const ocrTime = ocrEndTime - ocrStartTime;

      // メモリ使用量チェック
      const memoryAfterOcr = this.getMemoryUsage();
      if (memoryAfterOcr > peakMemory) {
        peakMemory = memoryAfterOcr;
      }

      if (!ocrResponse.success || !ocrResponse.data) {
        throw new Error(`OCR failed: ${ocrResponse.error?.message || 'Unknown error'}`);
      }

      ocrResult = {
        text: ocrResponse.data.text,
        confidence: ocrResponse.data.confidence,
      };

      console.log(`OCR completed in ${ocrTime.toFixed(2)}ms, extracted text length: ${ocrResult.text.length}`);

      // 2. 翻訳処理
      if (!ocrResult.text.trim()) {
        throw new Error('No text extracted from image');
      }

      console.log('Starting translation...');
      const translationStartTime = performance.now();

      const translationRequest: TranslationRequest = {
        text: ocrResult.text,
        targetLang,
        sourceLang: 'auto',
      };

      const translationResponse = await translationService.translateText(translationRequest);

      const translationEndTime = performance.now();
      const translationTime = translationEndTime - translationStartTime;

      // メモリ使用量チェック
      const memoryAfterTranslation = this.getMemoryUsage();
      if (memoryAfterTranslation > peakMemory) {
        peakMemory = memoryAfterTranslation;
      }

      if (!translationResponse.success || !translationResponse.data) {
        throw new Error(`Translation failed: ${translationResponse.error?.message || 'Unknown error'}`);
      }

      translationResult = {
        originalText: translationResponse.data.originalText,
        translatedText: translationResponse.data.translatedText,
        sourceLang: translationResponse.data.sourceLang,
        targetLang: translationResponse.data.targetLang,
      };

      const totalTime = performance.now() - startTime;
      console.log(`Translation completed in ${translationTime.toFixed(2)}ms`);
      console.log(`Total pipeline time: ${totalTime.toFixed(2)}ms`);

      success = true;

      return {
        originalImage: image,
        ocrResult,
        translationResult,
        performanceMetrics: {
          totalTime: Number(totalTime.toFixed(2)),
          ocrTime: Number(ocrTime.toFixed(2)),
          translationTime: Number(translationTime.toFixed(2)),
          memoryUsage: {
            start: startMemory,
            peak: peakMemory,
            end: this.getMemoryUsage(),
          },
        },
        success,
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error('Pipeline failed:', error);

      return {
        originalImage: image,
        ocrResult,
        translationResult,
        performanceMetrics: {
          totalTime: Number(totalTime.toFixed(2)),
          ocrTime: 0,
          translationTime: 0,
          memoryUsage: {
            start: startMemory,
            peak: peakMemory,
            end: this.getMemoryUsage(),
          },
        },
        success: false,
      };
    }
  }

  // 5秒以内達成のベンチマークテスト
  async runFiveSecondBenchmark(
    iterations: number = 5,
    targetLang: string = this.defaultTargetLang
  ): Promise<PipelineBenchmarkResult> {
    console.log(`Running ${iterations} iterations of 5-second benchmark...`);

    const results: PipelineResult[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      console.log(`\nBenchmark iteration ${i + 1}/${iterations}`);

      try {
        // 標準テスト画像を生成
        const testImage = await this.generateBenchmarkImage();

        // パイプライン実行
        const result = await this.processImageToTranslation(testImage, targetLang);

        results.push(result);

        if (result.success) {
          successCount++;
          console.log(`✓ Iteration ${i + 1} succeeded in ${result.performanceMetrics.totalTime}ms`);
        } else {
          console.log(`✗ Iteration ${i + 1} failed`);
        }

        // 次のイテレーション前に少し待機
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Iteration ${i + 1} encountered error:`, error);

        // エラーの場合もダミー結果を追加
        results.push({
          originalImage: { data: '', format: 'png', width: 0, height: 0, size: 0 },
          ocrResult: { text: '', confidence: 0 },
          translationResult: { originalText: '', translatedText: '', sourceLang: '', targetLang },
          performanceMetrics: { totalTime: 0, ocrTime: 0, translationTime: 0, memoryUsage: { start: 0, peak: 0, end: 0 } },
          success: false,
        });
      }
    }

    // 統計計算
    const successfulResults = results.filter(r => r.success);
    const times = successfulResults.map(r => r.performanceMetrics.totalTime);

    const averageTime = times.length > 0
      ? Number((times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(2))
      : 0;

    const successRate = Number((successCount / iterations).toFixed(3));

    // メモリメトリクス計算
    const memoryPeaks = results.map(r => r.performanceMetrics.memoryUsage.peak);
    const memoryIncreases = results.map(r =>
      r.performanceMetrics.memoryUsage.end - r.performanceMetrics.memoryUsage.start
    );

    const memoryMetrics = {
      averagePeak: memoryPeaks.length > 0
        ? Number((memoryPeaks.reduce((sum, peak) => sum + peak, 0) / memoryPeaks.length).toFixed(2))
        : 0,
      maxPeak: memoryPeaks.length > 0 ? Math.max(...memoryPeaks) : 0,
      averageIncrease: memoryIncreases.length > 0
        ? Number((memoryIncreases.reduce((sum, inc) => sum + inc, 0) / memoryIncreases.length).toFixed(2))
        : 0,
    };

    // 5秒以内達成判定
    const targetTime = 5000; // 5秒 = 5000ms
    const passed = averageTime <= targetTime && successRate >= 0.8; // 80%以上の成功率

    const message = passed
      ? `✓ 5-second benchmark PASSED (${averageTime}ms average, ${(successRate * 100).toFixed(1)}% success rate)`
      : `✗ 5-second benchmark FAILED (${averageTime}ms average, target: ≤${targetTime}ms, ${(successRate * 100).toFixed(1)}% success rate)`;

    console.log(`\n${message}`);
    console.log(`Memory usage - Average peak: ${memoryMetrics.averagePeak}MB, Max peak: ${memoryMetrics.maxPeak}MB`);

    return {
      passed,
      message,
      averageTime,
      successRate,
      details: {
        results,
        memoryMetrics,
      },
    };
  }

  // ベンチマーク用テスト画像生成
  private async generateBenchmarkImage(): Promise<ImageInput> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Cannot create canvas context');
    }

    // 2000×1200pxの画像を作成
    canvas.width = 2000;
    canvas.height = 1200;

    // 白背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // テスト用テキストを描画
    ctx.fillStyle = 'black';
    ctx.font = '28px Arial';

    const testTexts = [
      'End-to-End Pipeline Test',
      'This is a comprehensive OCR and translation test.',
      'Image resolution: 2000x1200 pixels',
      'Target processing time: < 5 seconds',
      'Testing various text patterns and complexity.',
      'Mixed content with numbers: 12345, 67890',
      'Special characters: @#$%^&*()_+-=[]{}|;:,.<>?',
      'English text for language detection.',
      'Additional content to increase processing complexity.',
      'Final line of test content for evaluation.',
    ];

    testTexts.forEach((text, index) => {
      const y = 80 + (index * 50);
      ctx.fillText(text, 40, y);
    });

    // 追加コンテンツ（複雑性を増加）
    ctx.font = '18px Arial';
    for (let i = 0; i < 15; i++) {
      const text = `Line ${i + 1}: Additional test content with complexity variation and text density.`;
      ctx.fillText(text, 40, 600 + (i * 25));
    }

    // 一部日本語コンテンツ（多言語対応テスト）
    ctx.font = '24px Arial';
    ctx.fillText('日本語テキスト: パイプラインテスト', 40, 1100);
    ctx.fillText('混合言語処理テスト - Mixed Language Test', 40, 1140);

    const dataUrl = canvas.toDataURL('image/png');

    return {
      data: dataUrl,
      format: 'png',
      width: canvas.width,
      height: canvas.height,
      size: dataUrl.length,
    };
  }

  // メモリ使用量取得
  private getMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return Number(((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)); // MB
    }
    return 0;
  }

  // パイプライン統計情報取得
  getStatistics(): {
    ocrService: any;
    translationService: any;
  } {
    return {
      ocrService: ocrService.getStatus(),
      translationService: translationService.getStatistics(),
    };
  }
}

// シングルトンインスタンス
export const pipelineIntegrationService = new PipelineIntegrationService();