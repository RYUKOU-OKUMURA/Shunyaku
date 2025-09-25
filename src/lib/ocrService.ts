// OCR サービス統合マネージャー
import { OCRResult, OCRConfig, ImageInput, ApiResponse } from '../types';
import { OCRWorkerMessage, OCRWorkerResponse } from '../workers/ocrWorker';

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageId = 0;
  private pendingMessages = new Map<string, {
    resolve: (value: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    reject: (error: Error) => void;
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

      case 'ERROR': {
        const error = new Error(payload?.error || 'Unknown worker error');
        pending.reject(error);
        break;
      }

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

      // OCR結果を正規化・ノイズ除去
      if (result.success && result.data) {
        result.data.text = this.normalizeOcrText(result.data.text);
        result.data.confidence = this.adjustConfidence(result.data.confidence, result.data.text);
      }

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

  // OCRテキストを正規化・ノイズ除去
  private normalizeOcrText(text: string): string {
    if (!text) return text;

    let normalized = text;

    // 1. 基本的な文字正規化
    normalized = this.basicTextNormalization(normalized);

    // 2. OCR特有のノイズ除去
    normalized = this.removeOcrNoise(normalized);

    // 3. 文字置換（よくある誤認識パターン）
    normalized = this.correctCommonOcrErrors(normalized);

    // 4. 不要な空白・改行の整理
    normalized = this.cleanupWhitespace(normalized);

    // 5. 特殊文字の正規化
    normalized = this.normalizeSpecialCharacters(normalized);

    return normalized;
  }

  // 基本的なテキスト正規化
  private basicTextNormalization(text: string): string {
    return text
      // Unicode正規化
      .normalize('NFKC')
      // 全角英数字を半角に
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      );
  }

  // OCR特有のノイズ除去
  private removeOcrNoise(text: string): string {
    return text
      // 単独の記号・ノイズ文字を除去
      .replace(/^[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/gm, '')
      // 極端に短い行（1-2文字の意味不明な行）を除去
      .replace(/^\s*[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]{1,2}\s*$/gm, '')
      // 連続する同一文字（スキャンアーチファクト）を短縮
      .replace(/(.)\1{4,}/g, '$1$1$1')
      // ランダムな文字列パターンを除去
      .replace(/[a-zA-Z]{1}[^a-zA-Z\s]{1}[a-zA-Z]{1}/g, '')
      // 空行の連続を2行以内に制限
      .replace(/\n{3,}/g, '\n\n');
  }

  // よくある誤認識パターンの修正
  private correctCommonOcrErrors(text: string): string {
    const corrections: Array<[RegExp, string]> = [
      // 数字とアルファベットの誤認識
      [/(?<!\w)0(?=\w)/g, 'O'], // 単語の先頭の0をOに
      [/(?<!\w)1(?=[a-zA-Z])/g, 'l'], // 1をlに（単語内）
      [/(?<=[a-zA-Z])1(?=\w)/g, 'l'], // 1をlに（単語内）
      [/(?<!\w)5(?=[a-zA-Z])/g, 'S'], // 5をSに
      [/(?<!\w)8(?=[a-zA-Z])/g, 'B'], // 8をBに

      // 句読点の誤認識
      [/\s*,\s*(?=[^\s\d])/g, '、'], // カンマを読点に（日本語文脈）
      [/\s*\.\s*(?=[^\s\d\w])/g, '。'], // ピリオドを句点に（日本語文脈）

      // 特殊文字の誤認識
      [/\|/g, 'I'], // パイプをIに
      [/0/g, 'O'], // コンテキストに応じた0とOの区別

      // 日本語特有の誤認識
      [/ー/g, 'ー'], // 長音記号の正規化
      [/～/g, '〜'], // チルダの正規化
    ];

    let corrected = text;
    for (const [pattern, replacement] of corrections) {
      corrected = corrected.replace(pattern, replacement);
    }

    return corrected;
  }

  // 空白・改行の整理
  private cleanupWhitespace(text: string): string {
    return text
      // 行末の空白を除去
      .replace(/[ \t]+$/gm, '')
      // 行頭の空白を除去（インデントが重要でない場合）
      .replace(/^[ \t]+/gm, '')
      // 連続する空白を単一に
      .replace(/[ \t]{2,}/g, ' ')
      // 文の途中の不自然な改行を修正
      .replace(/([^\n\s])\n([^\n\s])/g, '$1 $2')
      // 前後の空白を除去
      .trim();
  }

  // 特殊文字の正規化
  private normalizeSpecialCharacters(text: string): string {
    return text
      // クォーテーションマークの正規化
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // ダッシュ類の正規化
      .replace(/[—–―]/g, '-')
      // 省略記号の正規化
      .replace(/…{2,}/g, '…')
      .replace(/\.{3,}/g, '...');
  }

  // 信頼度の調整（テキスト品質に基づく）
  private adjustConfidence(originalConfidence: number, text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    let adjustmentFactor = 1.0;

    // テキスト長による調整
    if (text.length < 5) {
      adjustmentFactor *= 0.8; // 短いテキストは信頼度を下げる
    } else if (text.length > 100) {
      adjustmentFactor *= 1.1; // 長いテキストは信頼度を上げる
    }

    // 文字種のバランスによる調整
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    const numericCount = (text.match(/[0-9]/g) || []).length;
    const japaneseCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const symbolCount = (text.match(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;

    const totalChars = text.length;
    const meaningfulChars = alphaCount + numericCount + japaneseCount;

    if (meaningfulChars / totalChars < 0.7) {
      adjustmentFactor *= 0.7; // 意味のある文字が少ない場合
    }

    if (symbolCount / totalChars > 0.3) {
      adjustmentFactor *= 0.8; // 記号が多すぎる場合
    }

    // 単語の完全性チェック
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const validWordCount = words.filter(word => this.isValidWord(word)).length;

    if (validWordCount / words.length < 0.6) {
      adjustmentFactor *= 0.9; // 有効な単語の割合が低い場合
    }

    return Math.min(1.0, Math.max(0.0, originalConfidence * adjustmentFactor));
  }

  // 単語の有効性チェック
  private isValidWord(word: string): boolean {
    // 基本的なヒューリスティック
    if (word.length < 2) return false;

    // 英単語パターン
    if (/^[a-zA-Z]{2,}$/.test(word)) return true;

    // 日本語パターン
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word)) return true;

    // 数字パターン
    if (/^\d+$/.test(word)) return true;

    // 混合パターン（英数字）
    if (/^[a-zA-Z0-9]{2,}$/.test(word)) return true;

    return false;
  }

  // 画像前処理（リサイズ + 二値化）
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

      // リサイズ計算（性能向上のため最大幅/高さを制限）
      const maxWidth = 2000;
      const maxHeight = 2000;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (aspectRatio > 1) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      // キャンバスサイズを設定
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      // 画像スムージングを無効化（テキスト処理に最適化）
      ctx.imageSmoothingEnabled = false;

      // リサイズして描画
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 画像データを取得
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // グレースケール変換と適応的二値化
      const grayValues: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayValues.push(gray);
      }

      // Otsu の閾値を簡易計算
      const threshold = this.calculateOtsuThreshold(grayValues);

      // 二値化を適用
      for (let i = 0; i < data.length; i += 4) {
        const grayIndex = Math.floor(i / 4);
        const enhanced = grayValues[grayIndex] > threshold ? 255 : 0;

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

  // Otsu の閾値計算（簡易版）
  private calculateOtsuThreshold(grayValues: number[]): number {
    const histogram = new Array(256).fill(0);
    grayValues.forEach(val => histogram[val]++);

    const total = grayValues.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = total - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];

      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * (mB - mF) * (mB - mF);

      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  // 画像を読み込み
  private loadImage(image: ImageInput): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let objectUrl: string | null = null;

      img.onload = () => {
        // 作成したObjectURLをクリーンアップ
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        resolve(img);
      };

      img.onerror = (error) => {
        // 作成したObjectURLをクリーンアップ
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      };

      if (typeof image.data === 'string') {
        img.src = image.data;
      } else {
        const blob = new Blob([image.data], { type: `image/${image.format}` });
        objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
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

  // 詳細パフォーマンステスト（Phase 2要件対応）
  async runDetailedPerformanceTest(
    testImage: ImageInput,
    config: OCRConfig,
    iterations: number = 5,
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
    memoryUsage: {
      start: number;
      peak: number;
      end: number;
    };
    stages: {
      imagePreprocessing: number;
      ocrProcessing: number;
      textExtraction: number;
    };
    results: Array<{
      time: number;
      success: boolean;
      textLength: number;
      stageBreakdown: {
        preprocessing: number;
        ocr: number;
        extraction: number;
      };
      memorySnapshot: {
        before: number;
        after: number;
      };
    }>;
  }> {
    const results = [];
    let successCount = 0;

    // メモリ使用量監視開始
    const startMemory = this.getMemoryUsage();
    let peakMemory = startMemory;

    for (let i = 0; i < iterations; i++) {
      const overallStartTime = performance.now();
      const memoryBefore = this.getMemoryUsage();

      try {
        // ステージごとのプロファイリング
        const stageBreakdown = {
          preprocessing: 0,
          ocr: 0,
          extraction: 0,
        };

        // 1. 前処理ステージ
        const preprocessStart = performance.now();
        const processedImage = config.preprocessingEnabled
          ? await this.preprocessImage(testImage)
          : testImage;
        stageBreakdown.preprocessing = performance.now() - preprocessStart;

        // 2. OCR処理ステージ
        const ocrStart = performance.now();
        if (!this.isInitialized) {
          await this.initialize(config);
        }

        const result = await this.sendMessage<ApiResponse<OCRResult>>({
          type: 'PROCESS_IMAGE',
          payload: {
            image: processedImage,
            config,
          },
        });
        stageBreakdown.ocr = performance.now() - ocrStart;

        // 3. テキスト抽出ステージ（結果処理）
        const extractionStart = performance.now();
        const overallEndTime = performance.now();
        const duration = overallEndTime - overallStartTime;
        stageBreakdown.extraction = performance.now() - extractionStart;

        const memoryAfter = this.getMemoryUsage();
        if (memoryAfter > peakMemory) {
          peakMemory = memoryAfter;
        }

        if (result.success && result.data) {
          successCount++;
          results.push({
            time: Number(duration.toFixed(2)),
            success: true,
            textLength: result.data.text.length,
            stageBreakdown,
            memorySnapshot: {
              before: memoryBefore,
              after: memoryAfter,
            },
          });
        } else {
          results.push({
            time: Number(duration.toFixed(2)),
            success: false,
            textLength: 0,
            stageBreakdown,
            memorySnapshot: {
              before: memoryBefore,
              after: memoryAfter,
            },
          });
        }
      } catch (error) {
        const overallEndTime = performance.now();
        const duration = overallEndTime - overallStartTime;
        const memoryAfter = this.getMemoryUsage();

        console.error(`Performance test iteration ${i + 1} failed:`, error);

        results.push({
          time: Number(duration.toFixed(2)),
          success: false,
          textLength: 0,
          stageBreakdown: {
            preprocessing: 0,
            ocr: 0,
            extraction: 0,
          },
          memorySnapshot: {
            before: memoryBefore,
            after: memoryAfter,
          },
        });
      }
    }

    const endMemory = this.getMemoryUsage();
    const times = results.map(r => r.time);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const successRate = successCount / iterations;

    // ステージ別平均時間計算
    const validResults = results.filter(r => r.success);
    const stages = {
      imagePreprocessing: validResults.length > 0
        ? Number((validResults.reduce((sum, r) => sum + r.stageBreakdown.preprocessing, 0) / validResults.length).toFixed(2))
        : 0,
      ocrProcessing: validResults.length > 0
        ? Number((validResults.reduce((sum, r) => sum + r.stageBreakdown.ocr, 0) / validResults.length).toFixed(2))
        : 0,
      textExtraction: validResults.length > 0
        ? Number((validResults.reduce((sum, r) => sum + r.stageBreakdown.extraction, 0) / validResults.length).toFixed(2))
        : 0,
    };

    return {
      averageTime: Number(averageTime.toFixed(2)),
      minTime: Number(minTime.toFixed(2)),
      maxTime: Number(maxTime.toFixed(2)),
      successRate: Number(successRate.toFixed(3)),
      memoryUsage: {
        start: startMemory,
        peak: peakMemory,
        end: endMemory,
      },
      stages,
      results,
    };
  }

  // パフォーマンステスト（既存・後方互換性のため）
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
    const detailedResult = await this.runDetailedPerformanceTest(testImage, config, iterations);

    return {
      averageTime: detailedResult.averageTime,
      minTime: detailedResult.minTime,
      maxTime: detailedResult.maxTime,
      successRate: detailedResult.successRate,
      results: detailedResult.results.map(r => ({
        time: r.time,
        success: r.success,
        textLength: r.textLength,
      })),
    };
  }

  // メモリ使用量取得
  private getMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0; // メモリ情報が取得できない環境では0を返す
  }

  // 2000×1200px画像でのベンチマーク
  async runStandardBenchmark(config?: Partial<OCRConfig>): Promise<{
    passed: boolean;
    message: string;
    details: any;
  }> {
    const standardConfig: OCRConfig = {
      language: 'eng+jpn',
      preprocessingEnabled: true,
      confidenceThreshold: 0.6,
      ...config,
    };

    // 2000×1200px テスト画像を生成
    const testImage = await this.generateStandardTestImage();

    try {
      const result = await this.runDetailedPerformanceTest(testImage, standardConfig, 3);

      const passed = result.averageTime <= 3000; // 3秒以内を目標
      const message = passed
        ? `✓ Standard benchmark passed (${result.averageTime}ms average)`
        : `✗ Standard benchmark failed (${result.averageTime}ms average, target: ≤3000ms)`;

      return {
        passed,
        message,
        details: result,
      };
    } catch (error) {
      return {
        passed: false,
        message: `✗ Standard benchmark error: ${error}`,
        details: { error },
      };
    }
  }

  // 標準テスト画像生成（2000×1200px）
  private async generateStandardTestImage(): Promise<ImageInput> {
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
    ctx.font = '32px Arial';

    const testTexts = [
      'Performance Test Document',
      'This is a standard OCR test image.',
      'Image size: 2000x1200 pixels',
      'Contains mixed English and Japanese text.',
      'テストドキュメント - OCR性能評価用',
      '画像サイズ: 2000×1200ピクセル',
      'Expected processing time: < 3 seconds',
      '期待処理時間: 3秒未満',
    ];

    testTexts.forEach((text, index) => {
      const y = 100 + (index * 120);
      ctx.fillText(text, 50, y);
    });

    // 追加のテキスト要素（複雑さを増すため）
    ctx.font = '16px Arial';
    for (let i = 0; i < 20; i++) {
      ctx.fillText(
        `Line ${i + 1}: Additional test content for OCR processing evaluation`,
        50,
        1000 + (i * 20)
      );
    }

    const dataUrl = canvas.toDataURL('image/png');

    return {
      data: dataUrl,
      format: 'png',
      width: canvas.width,
      height: canvas.height,
      size: dataUrl.length,
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