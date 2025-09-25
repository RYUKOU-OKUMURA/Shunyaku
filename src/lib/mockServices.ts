// モックサービス実装
// 開発・テスト用のOCR/翻訳サービス

import {
  OCRResult,
  OCRConfig,
  TranslationRequest,
  TranslationResult,
  ImageInput,
  ApiResponse,
  PerformanceMetrics,
} from '../types';

// OCRモックサービス
export class MockOCRService {
  private static readonly MOCK_TEXTS = [
    'Hello, world! This is a sample text for OCR testing.',
    'Sample text content for translation testing purposes.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'The quick brown fox jumps over the lazy dog.',
    'This is a test document with multiple lines of text content.',
  ];

  private static readonly JAPANESE_TEXTS = [
    'こんにちは、世界！これはOCRテスト用のサンプルテキストです。',
    '翻訳テスト用のサンプルテキストコンテンツです。',
    'これは複数行のテキストコンテンツを含むテストドキュメントです。',
    '日本語のOCR処理のテストを行っています。',
    'モックサービスによる文字認識のシミュレーションです。',
  ];

  static async processImage(
    image: ImageInput,
    config: OCRConfig,
  ): Promise<ApiResponse<OCRResult>> {
    const startTime = Date.now();

    // 画像サイズに基づく処理時間シミュレーション
    const baseProcessingTime = 500; // 基本処理時間（ms）
    const sizeMultiplier = Math.min(image.size / (1024 * 1024), 3); // 最大3倍
    const processingTime = baseProcessingTime + sizeMultiplier * 1000;

    // 非同期処理のシミュレーション
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // 言語設定に基づくテキスト選択
    const isJapanese = config.language.includes('jpn');
    const textPool = isJapanese ? this.JAPANESE_TEXTS : this.MOCK_TEXTS;
    const randomIndex = Math.floor(Math.random() * textPool.length);
    const extractedText = textPool[randomIndex];

    // 信頼度の計算（画像サイズと設定に基づく）
    const baseConfidence = 0.85;
    const sizeBonus = Math.min(image.width * image.height / (2000 * 1200), 0.1);
    const configBonus = config.preprocessingEnabled ? 0.05 : 0;
    const confidence = Math.min(baseConfidence + sizeBonus + configBonus, 0.99);

    const result: OCRResult = {
      text: extractedText,
      confidence: Number(confidence.toFixed(3)),
      language: config.language,
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
    };

    const performanceMetrics: PerformanceMetrics = {
      ocrTime: result.processingTime,
      translationTime: 0,
      totalTime: result.processingTime,
      memoryUsage: Math.floor(image.size * 1.5), // モック値
      imageSize: image.size,
      textLength: extractedText.length,
      timestamp: new Date(),
    };

    return {
      success: true,
      data: result,
      performanceMetrics,
    };
  }

  static async simulateFailure(): Promise<ApiResponse<OCRResult>> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: false,
      error: {
        code: 'OCR_PROCESSING_FAILED',
        message: 'Mock OCR processing failure for testing',
        context: 'ocr',
        timestamp: new Date(),
      },
    };
  }
}

// 翻訳モックサービス
export class MockTranslationService {
  private static readonly TRANSLATION_PAIRS: Record<string, Record<string, string>> = {
    'Hello, world! This is a sample text for OCR testing.': {
      ja: 'こんにちは、世界！これはOCRテスト用のサンプルテキストです。',
      es: '¡Hola, mundo! Este es un texto de muestra para pruebas de OCR.',
      fr: 'Bonjour, le monde ! Ceci est un texte d\'exemple pour les tests OCR.',
    },
    'Sample text content for translation testing purposes.': {
      ja: '翻訳テスト用のサンプルテキストコンテンツです。',
      es: 'Contenido de texto de muestra para propósitos de prueba de traducción.',
      fr: 'Contenu de texte d\'exemple à des fins de test de traduction.',
    },
    'The quick brown fox jumps over the lazy dog.': {
      ja: '素早い茶色のキツネが怠惰な犬を飛び越えます。',
      es: 'El zorro marrón rápido salta sobre el perro perezoso.',
      fr: 'Le renard brun rapide saute par-dessus le chien paresseux.',
    },
    'こんにちは、世界！これはOCRテスト用のサンプルテキストです。': {
      en: 'Hello, world! This is a sample text for OCR testing.',
      es: '¡Hola, mundo! Este es un texto de muestra para pruebas de OCR.',
      fr: 'Bonjour, le monde ! Ceci est un texte d\'exemple pour les tests OCR.',
    },
    '翻訳テスト用のサンプルテキストコンテンツです。': {
      en: 'Sample text content for translation testing purposes.',
      es: 'Contenido de texto de muestra para propósitos de prueba de traducción.',
      fr: 'Contenu de texte d\'exemple à des fins de test de traduction.',
    },
  };

  static async translateText(
    request: TranslationRequest,
  ): Promise<ApiResponse<TranslationResult>> {
    const startTime = Date.now();

    // 翻訳処理時間のシミュレーション（テキスト長に比例）
    const baseTime = 300;
    const textLengthMultiplier = Math.min(request.text.length / 100, 5);
    const processingTime = baseTime + textLengthMultiplier * 200;

    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // 事前定義された翻訳ペアから検索
    let translatedText = this.TRANSLATION_PAIRS[request.text]?.[request.targetLang];

    // 定義されていない場合は簡易的な変換
    if (!translatedText) {
      translatedText = this.generateMockTranslation(request.text, request.targetLang);
    }

    const result: TranslationResult = {
      originalText: request.text,
      translatedText,
      sourceLang: request.sourceLang,
      targetLang: request.targetLang,
      confidence: 0.92 + Math.random() * 0.05, // 0.92-0.97の範囲
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
      provider: 'mock',
    };

    const performanceMetrics: PerformanceMetrics = {
      ocrTime: 0,
      translationTime: result.processingTime,
      totalTime: result.processingTime,
      memoryUsage: Math.floor(request.text.length * 2),
      imageSize: 0,
      textLength: request.text.length,
      timestamp: new Date(),
    };

    return {
      success: true,
      data: result,
      performanceMetrics,
    };
  }

  private static generateMockTranslation(text: string, targetLang: string): string {
    const prefixes: Record<string, string> = {
      ja: '[日本語翻訳] ',
      en: '[English Translation] ',
      es: '[Traducción Española] ',
      fr: '[Traduction Française] ',
      de: '[Deutsche Übersetzung] ',
      zh: '[中文翻译] ',
      ko: '[한국어 번역] ',
    };

    const prefix = prefixes[targetLang] || '[Translation] ';
    return prefix + text;
  }

  static async simulateRateLimit(): Promise<ApiResponse<TranslationResult>> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Translation API rate limit exceeded. Please try again later.',
        context: 'translation',
        timestamp: new Date(),
        details: {
          retryAfter: 60,
          remainingQuota: 0,
        },
      },
    };
  }

  static async simulateNetworkError(): Promise<ApiResponse<TranslationResult>> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to translation service',
        context: 'network',
        timestamp: new Date(),
        details: {
          statusCode: 503,
          retryable: true,
        },
      },
    };
  }
}

// 統合モックサービス（OCR + 翻訳パイプライン）
export class MockPipelineService {
  static async processImageToTranslation(
    image: ImageInput,
    ocrConfig: OCRConfig,
    translationRequest: Omit<TranslationRequest, 'text'>,
  ): Promise<{
    ocrResult: ApiResponse<OCRResult>;
    translationResult: ApiResponse<TranslationResult>;
    totalTime: number;
  }> {
    const startTime = Date.now();

    // OCR処理
    const ocrResult = await MockOCRService.processImage(image, ocrConfig);

    let translationResult: ApiResponse<TranslationResult>;

    // OCRが成功した場合のみ翻訳実行
    if (ocrResult.success && ocrResult.data) {
      const fullTranslationRequest: TranslationRequest = {
        ...translationRequest,
        text: ocrResult.data.text,
      };
      translationResult = await MockTranslationService.translateText(fullTranslationRequest);
    } else {
      translationResult = {
        success: false,
        error: {
          code: 'OCR_PREREQUISITE_FAILED',
          message: 'Cannot translate: OCR processing failed',
          context: 'translation',
          timestamp: new Date(),
        },
      };
    }

    return {
      ocrResult,
      translationResult,
      totalTime: Date.now() - startTime,
    };
  }

  // 失敗パターンのシミュレーション
  static async simulateRandomFailure(
    image: ImageInput,
    ocrConfig: OCRConfig,
    translationRequest: Omit<TranslationRequest, 'text'>,
  ): Promise<{
    ocrResult: ApiResponse<OCRResult>;
    translationResult: ApiResponse<TranslationResult>;
    totalTime: number;
  }> {
    const failureType = Math.random();

    if (failureType < 0.1) {
      // 10% OCR失敗
      return {
        ocrResult: await MockOCRService.simulateFailure(),
        translationResult: {
          success: false,
          error: {
            code: 'OCR_PREREQUISITE_FAILED',
            message: 'Cannot translate: OCR processing failed',
            context: 'translation',
            timestamp: new Date(),
          },
        },
        totalTime: 1000,
      };
    } else if (failureType < 0.15) {
      // 5% 翻訳レート制限
      const ocrResult = await MockOCRService.processImage(image, ocrConfig);
      return {
        ocrResult,
        translationResult: await MockTranslationService.simulateRateLimit(),
        totalTime: 1500,
      };
    } else if (failureType < 0.18) {
      // 3% ネットワークエラー
      const ocrResult = await MockOCRService.processImage(image, ocrConfig);
      return {
        ocrResult,
        translationResult: await MockTranslationService.simulateNetworkError(),
        totalTime: 2000,
      };
    }

    // 正常ケース
    return this.processImageToTranslation(image, ocrConfig, translationRequest);
  }
}

// パフォーマンステスト用のユーティリティ
export class MockPerformanceTestUtils {
  static generateTestImage(width: number, height: number): ImageInput {
    // テスト用の画像データを生成
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // テスト用の文字を描画
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText('This is a test image for OCR processing', 50, 50);
    ctx.fillText('Generated for performance testing purposes', 50, 80);

    const imageData = ctx.getImageData(0, 0, width, height);
    const arrayBuffer = imageData.data.buffer;

    return {
      data: arrayBuffer,
      format: 'png',
      width,
      height,
      size: arrayBuffer.byteLength,
    };
  }

  static async runPerformanceTest(
    iterations: number = 10,
    imageSize: { width: number; height: number } = { width: 2000, height: 1200 },
  ): Promise<{
    averageOcrTime: number;
    averageTranslationTime: number;
    averageTotalTime: number;
    successRate: number;
    results: Array<{
      ocrTime: number;
      translationTime: number;
      totalTime: number;
      success: boolean;
    }>;
  }> {
    const results = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const testImage = this.generateTestImage(imageSize.width, imageSize.height);
      const ocrConfig: OCRConfig = {
        language: 'eng',
        psm: 3,
        oem: 1,
        preprocessingEnabled: true,
        confidenceThreshold: 0.6,
      };
      const translationRequest = {
        sourceLang: 'en',
        targetLang: 'ja',
      };

      const result = await MockPipelineService.processImageToTranslation(
        testImage,
        ocrConfig,
        translationRequest,
      );

      const success = result.ocrResult.success && result.translationResult.success;
      if (success) successCount++;

      results.push({
        ocrTime: result.ocrResult.performanceMetrics?.ocrTime || 0,
        translationTime: result.translationResult.performanceMetrics?.translationTime || 0,
        totalTime: result.totalTime,
        success,
      });
    }

    const avgOcrTime = results.reduce((sum, r) => sum + r.ocrTime, 0) / iterations;
    const avgTranslationTime = results.reduce((sum, r) => sum + r.translationTime, 0) / iterations;
    const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / iterations;

    return {
      averageOcrTime: Number(avgOcrTime.toFixed(2)),
      averageTranslationTime: Number(avgTranslationTime.toFixed(2)),
      averageTotalTime: Number(avgTotalTime.toFixed(2)),
      successRate: Number((successCount / iterations).toFixed(3)),
      results,
    };
  }
}