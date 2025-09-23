// 共有型定義
// Tauri-React間での型安全性を確保

// OCR関連の型定義
export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
  timestamp: Date;
}

export interface OCRConfig {
  language: 'eng' | 'jpn' | 'eng+jpn';
  psm: number; // Page Segmentation Mode
  oem: number; // OCR Engine Mode
  preprocessingEnabled: boolean;
}

// 翻訳関連の型定義
export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  apiKey?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  confidence?: number;
  processingTime: number;
  timestamp: Date;
  provider: 'deepl' | 'mock';
}

export interface TranslationConfig {
  apiKey: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
  formality?: 'formal' | 'informal';
  preserveFormatting: boolean;
}

// 画像処理関連の型定義
export interface ImageInput {
  data: ArrayBuffer | string; // Base64 or binary data
  format: 'png' | 'jpg' | 'jpeg' | 'pdf';
  width: number;
  height: number;
  size: number; // bytes
}

export interface ImagePreprocessingConfig {
  resize: boolean;
  maxWidth: number;
  maxHeight: number;
  enhanceContrast: boolean;
  denoiseEnabled: boolean;
  binarizationEnabled: boolean;
}

// アプリケーション設定
export interface AppSettings {
  ocr: OCRConfig;
  translation: TranslationConfig;
  imagePreprocessing: ImagePreprocessingConfig;
  ui: UISettings;
  hotkeys: HotkeySettings;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  floatingPanelEnabled: boolean;
  autoSaveHistory: boolean;
  maxHistoryItems: number;
  showProgressIndicator: boolean;
}

export interface HotkeySettings {
  quickTranslate: string; // e.g., "Cmd+Option+T"
  toggleFloatingPanel: string;
  openSettings: string;
}

// 履歴・保存関連
export interface TranslationHistory {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
  ocrResult?: OCRResult;
  imageInput?: Omit<ImageInput, 'data'>; // データは保存しない
}

export interface SaveConfig {
  enabled: boolean;
  format: 'markdown' | 'txt' | 'json';
  includeOriginal: boolean;
  includeMetadata: boolean;
  destination: 'downloads' | 'custom' | 'url-scheme';
  customPath?: string;
  urlScheme?: string; // e.g., "obsidian://new"
}

// エラー処理
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  context: 'ocr' | 'translation' | 'ui' | 'storage' | 'network';
}

// パフォーマンス計測
export interface PerformanceMetrics {
  ocrTime: number;
  translationTime: number;
  totalTime: number;
  memoryUsage: number;
  imageSize: number;
  textLength: number;
  timestamp: Date;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  performanceMetrics?: PerformanceMetrics;
}

// Tauri コマンド用の型定義（将来tauri-spectaで生成される可能性あり）
export interface TauriCommands {
  // OCR関連
  processImageOcr: (image: ImageInput, config: OCRConfig) => Promise<ApiResponse<OCRResult>>;

  // 翻訳関連
  translateText: (request: TranslationRequest) => Promise<ApiResponse<TranslationResult>>;

  // 設定管理
  loadSettings: () => Promise<ApiResponse<AppSettings>>;
  saveSettings: (settings: AppSettings) => Promise<ApiResponse<void>>;

  // 履歴管理
  getTranslationHistory: (limit?: number) => Promise<ApiResponse<TranslationHistory[]>>;
  saveTranslationHistory: (item: TranslationHistory) => Promise<ApiResponse<void>>;
  clearTranslationHistory: () => Promise<ApiResponse<void>>;

  // ファイル操作
  saveTranslationToFile: (content: string, config: SaveConfig) => Promise<ApiResponse<string>>;

  // システム連携
  getClipboardImage: () => Promise<ApiResponse<ImageInput>>;
  setClipboardText: (text: string) => Promise<ApiResponse<void>>;

  // ウィンドウ管理
  showFloatingPanel: (content: string) => Promise<ApiResponse<void>>;
  hideFloatingPanel: () => Promise<ApiResponse<void>>;

  // パフォーマンス
  getPerformanceMetrics: () => Promise<ApiResponse<PerformanceMetrics>>;
}

// Zustand Store用の型定義
export interface AppState {
  // 設定
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // 現在の処理状態
  isProcessing: boolean;
  currentStep: 'idle' | 'ocr' | 'translation' | 'saving';
  progress: number;

  // 結果
  currentOcrResult: OCRResult | null;
  currentTranslationResult: TranslationResult | null;

  // 履歴
  translationHistory: TranslationHistory[];
  addToHistory: (item: TranslationHistory) => void;
  clearHistory: () => void;

  // エラー
  lastError: AppError | null;
  clearError: () => void;

  // UI状態
  floatingPanelVisible: boolean;
  settingsModalOpen: boolean;

  // アクション
  processImage: (image: ImageInput) => Promise<void>;
  translateText: (text: string) => Promise<void>;
  saveResult: () => Promise<void>;
}

// React Component Props用の基本型
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 再利用可能なコンポーネント用の型
export interface DropZoneProps extends BaseComponentProps {
  onImageDrop: (image: ImageInput) => void;
  acceptedFormats: ('png' | 'jpg' | 'jpeg' | 'pdf')[];
  disabled?: boolean;
}

export interface ProgressIndicatorProps extends BaseComponentProps {
  progress: number;
  currentStep: string;
  visible: boolean;
}

export interface SettingsModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export interface FloatingPanelProps extends BaseComponentProps {
  visible: boolean;
  content: string;
  onClose: () => void;
  onSave: () => void;
  position?: { x: number; y: number };
}