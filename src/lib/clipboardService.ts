// クリップボード監視サービス
import { invoke } from '@tauri-apps/api/tauri';
import { ImageInput, ApiResponse } from '../types';

export interface ClipboardImageData {
  hasImage: boolean;
  imageData?: ImageInput;
  timestamp: Date;
}

export class ClipboardService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastClipboardHash: string | null = null;
  private callbacks: Array<(data: ClipboardImageData) => void> = [];

  constructor(private pollInterval: number = 1000) {}

  // クリップボード監視開始
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Clipboard monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkClipboard();
    }, this.pollInterval);

    console.log('Clipboard monitoring started');
  }

  // クリップボード監視停止
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Clipboard monitoring stopped');
  }

  // 監視状態確認
  isActive(): boolean {
    return this.isMonitoring;
  }

  // コールバック登録
  onImageDetected(callback: (data: ClipboardImageData) => void): () => void {
    this.callbacks.push(callback);

    // アンサブスクライブ関数を返す
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  // 手動でクリップボードをチェック
  async checkClipboard(): Promise<ClipboardImageData> {
    try {
      // Tauriのクリップボードプラグインを使用して画像データを取得
      const clipboardText = await this.getClipboardText();
      const clipboardImage = await this.getClipboardImage();

      // クリップボードのハッシュを生成（変更検知用）
      const currentHash = await this.generateClipboardHash(clipboardText, clipboardImage);

      // 前回と同じ内容の場合はスキップ
      if (currentHash === this.lastClipboardHash) {
        return {
          hasImage: false,
          timestamp: new Date(),
        };
      }

      this.lastClipboardHash = currentHash;

      if (clipboardImage) {
        const result: ClipboardImageData = {
          hasImage: true,
          imageData: clipboardImage,
          timestamp: new Date(),
        };

        // 登録されたコールバックを実行
        this.callbacks.forEach(callback => {
          try {
            callback(result);
          } catch (error) {
            console.error('Error in clipboard callback:', error);
          }
        });

        return result;
      }

      return {
        hasImage: false,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error checking clipboard:', error);
      return {
        hasImage: false,
        timestamp: new Date(),
      };
    }
  }

  // クリップボードからテキストを取得
  private async getClipboardText(): Promise<string | null> {
    try {
      // Tauriのclipboard-managerプラグインを使用
      const text = await invoke('plugin:clipboard-manager|read_text');
      return text as string;
    } catch (error) {
      // テキストがない場合やエラーの場合
      return null;
    }
  }

  // クリップボードから画像を取得
  private async getClipboardImage(): Promise<ImageInput | null> {
    try {
      // Tauriのclipboard-managerプラグインを使用して画像データを取得
      const imageData = await invoke('plugin:clipboard-manager|read_image');

      if (!imageData) {
        return null;
      }

      // Base64データの場合の処理
      if (typeof imageData === 'string') {
        return this.processBase64Image(imageData);
      }

      // バイナリデータの場合の処理
      if (imageData instanceof ArrayBuffer) {
        return this.processArrayBufferImage(imageData);
      }

      return null;
    } catch (error) {
      // 画像がない場合やエラーの場合
      console.debug('No image in clipboard or error:', error);
      return null;
    }
  }

  // Base64画像データを処理
  private processBase64Image(base64Data: string): ImageInput | null {
    try {
      // data:image/png;base64, のようなプレフィックスを除去
      const cleanBase64 = base64Data.replace(/^data:image\/[^;]+;base64,/, '');

      // Base64をArrayBufferに変換
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 画像形式を判定（簡易版）
      const format = this.detectImageFormat(bytes);

      return {
        data: bytes.buffer,
        format,
        width: 0, // 実際のサイズは後で取得
        height: 0,
        size: bytes.length,
      };
    } catch (error) {
      console.error('Error processing base64 image:', error);
      return null;
    }
  }

  // ArrayBuffer画像データを処理
  private processArrayBufferImage(arrayBuffer: ArrayBuffer): ImageInput | null {
    try {
      const bytes = new Uint8Array(arrayBuffer);
      const format = this.detectImageFormat(bytes);

      return {
        data: arrayBuffer,
        format,
        width: 0, // 実際のサイズは後で取得
        height: 0,
        size: arrayBuffer.byteLength,
      };
    } catch (error) {
      console.error('Error processing ArrayBuffer image:', error);
      return null;
    }
  }

  // 画像形式を検出
  private detectImageFormat(bytes: Uint8Array): 'png' | 'jpg' | 'jpeg' | 'pdf' {
    // PNG: 89 50 4E 47
    if (bytes.length >= 4 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 &&
        bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'png';
    }

    // JPEG: FF D8 FF
    if (bytes.length >= 3 &&
        bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'jpg';
    }

    // PDF: 25 50 44 46
    if (bytes.length >= 4 &&
        bytes[0] === 0x25 && bytes[1] === 0x50 &&
        bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }

    // デフォルトはPNG
    return 'png';
  }

  // クリップボード内容のハッシュを生成（変更検知用）
  private async generateClipboardHash(text: string | null, image: ImageInput | null): Promise<string> {
    const content = {
      text: text || '',
      image: image ? {
        size: image.size,
        format: image.format,
        timestamp: Date.now(),
      } : null,
    };

    const jsonString = JSON.stringify(content);

    // 簡易ハッシュ関数
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }

    return hash.toString();
  }

  // クリップボードに画像を設定（テスト用）
  async setClipboardImage(imageInput: ImageInput): Promise<ApiResponse<void>> {
    try {
      // ArrayBufferをBase64に変換
      const base64 = await this.arrayBufferToBase64(imageInput.data as ArrayBuffer);
      const dataUrl = `data:image/${imageInput.format};base64,${base64}`;

      await invoke('plugin:clipboard-manager|write_image', { image: dataUrl });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLIPBOARD_WRITE_ERROR',
          message: 'Failed to write image to clipboard',
          context: 'clipboard',
          timestamp: new Date(),
          details: error,
        },
      };
    }
  }

  // クリップボードにテキストを設定
  async setClipboardText(text: string): Promise<ApiResponse<void>> {
    try {
      await invoke('plugin:clipboard-manager|write_text', { text });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLIPBOARD_WRITE_ERROR',
          message: 'Failed to write text to clipboard',
          context: 'clipboard',
          timestamp: new Date(),
          details: error,
        },
      };
    }
  }

  // ArrayBufferをBase64に変換
  private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // リソースクリーンアップ
  destroy(): void {
    this.stopMonitoring();
    this.callbacks = [];
    this.lastClipboardHash = null;
  }
}

// シングルトンインスタンス
export const clipboardService = new ClipboardService(1000);