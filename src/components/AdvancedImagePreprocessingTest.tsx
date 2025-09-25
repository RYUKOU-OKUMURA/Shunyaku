import React, { useState, useCallback, useRef } from 'react';
import { ocrService } from '../lib/ocrService';
import type { ImageInput, OCRConfig, ImagePreprocessingOptions } from '../types';

interface PreprocessingResult {
  originalImage: string;
  processedImage: string;
  processingTime: number;
  settings: ImagePreprocessingOptions;
}

const AdvancedImagePreprocessingTest: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PreprocessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // デフォルト設定
  const [preprocessingOptions, setPreprocessingOptions] = useState<ImagePreprocessingOptions>({
    enhanceContrast: true,
    contrastFactor: 1.2,
    denoiseEnabled: true,
    denoiseStrength: 'medium',
    sharpenEnabled: true,
    sharpenStrength: 0.5,
    gammaCorrection: true,
    gammaValue: 1.1,
  });

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // FileをImageInputに変換
      const arrayBuffer = await file.arrayBuffer();
      const originalImage: ImageInput = {
        data: arrayBuffer,
        format: file.type.includes('png') ? 'png' : 'jpg',
        width: 0, // 実際の値は後で設定される
        height: 0,
        size: file.size,
      };

      // 元画像のData URLを作成（表示用）
      const originalDataUrl = URL.createObjectURL(file);

      // OCR設定
      const config: OCRConfig = {
        language: 'eng+jpn',
        psm: 6,
        oem: 3,
        preprocessingEnabled: true,
        confidenceThreshold: 0.6,
        preprocessingOptions,
      };

      // 前処理のテスト（private methodにアクセスするための一時的な解決策）
      const startTime = performance.now();

      // OCRサービスを使用して前処理をテスト
      await ocrService.initialize(config);
      const ocrResult = await ocrService.processImage(originalImage, config);

      const processingTime = performance.now() - startTime;

      if (ocrResult.success) {
        setResult({
          originalImage: originalDataUrl,
          processedImage: originalDataUrl, // 実際には処理済み画像のData URL
          processingTime: Math.round(processingTime),
          settings: preprocessingOptions,
        });
      } else {
        setError(ocrResult.error?.message || 'OCR processing failed');
      }
    } catch (err) {
      console.error('Image preprocessing test failed:', err);
      setError(`Processing failed: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  }, [preprocessingOptions]);

  const updatePreprocessingOption = useCallback(<K extends keyof ImagePreprocessingOptions>(
    key: K,
    value: ImagePreprocessingOptions[K]
  ) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreprocessingOptions({
      enhanceContrast: true,
      contrastFactor: 1.2,
      denoiseEnabled: true,
      denoiseStrength: 'medium',
      sharpenEnabled: true,
      sharpenStrength: 0.5,
      gammaCorrection: true,
      gammaValue: 1.1,
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Advanced Image Preprocessing Test</h1>
      <p className="text-gray-600 mb-8">
        Phase 5-1: Test advanced image preprocessing options (contrast enhancement, noise reduction, sharpening, gamma correction)
      </p>

      {/* 設定パネル */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Preprocessing Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* コントラスト設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contrast Enhancement</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preprocessingOptions.enhanceContrast}
                onChange={(e) => updatePreprocessingOption('enhanceContrast', e.target.checked)}
                className="rounded"
              />
              <span>Enable contrast enhancement</span>
            </label>
            {preprocessingOptions.enhanceContrast && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contrast Factor: {preprocessingOptions.contrastFactor.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={preprocessingOptions.contrastFactor}
                  onChange={(e) => updatePreprocessingOption('contrastFactor', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5 (Low)</span>
                  <span>3.0 (High)</span>
                </div>
              </div>
            )}
          </div>

          {/* ノイズ除去設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Noise Reduction</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preprocessingOptions.denoiseEnabled}
                onChange={(e) => updatePreprocessingOption('denoiseEnabled', e.target.checked)}
                className="rounded"
              />
              <span>Enable noise reduction</span>
            </label>
            {preprocessingOptions.denoiseEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Noise Reduction Strength</label>
                <select
                  value={preprocessingOptions.denoiseStrength}
                  onChange={(e) => updatePreprocessingOption('denoiseStrength', e.target.value as 'light' | 'medium' | 'strong')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            )}
          </div>

          {/* シャープニング設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sharpening</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preprocessingOptions.sharpenEnabled}
                onChange={(e) => updatePreprocessingOption('sharpenEnabled', e.target.checked)}
                className="rounded"
              />
              <span>Enable sharpening</span>
            </label>
            {preprocessingOptions.sharpenEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sharpen Strength: {preprocessingOptions.sharpenStrength.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={preprocessingOptions.sharpenStrength}
                  onChange={(e) => updatePreprocessingOption('sharpenStrength', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0 (None)</span>
                  <span>2.0 (Strong)</span>
                </div>
              </div>
            )}
          </div>

          {/* ガンマ補正設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Gamma Correction</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preprocessingOptions.gammaCorrection}
                onChange={(e) => updatePreprocessingOption('gammaCorrection', e.target.checked)}
                className="rounded"
              />
              <span>Enable gamma correction</span>
            </label>
            {preprocessingOptions.gammaCorrection && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Gamma Value: {preprocessingOptions.gammaValue.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={preprocessingOptions.gammaValue}
                  onChange={(e) => updatePreprocessingOption('gammaValue', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5 (Dark)</span>
                  <span>3.0 (Bright)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* ファイル選択 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Image</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400"
          disabled={isProcessing}
        />
        <p className="text-sm text-gray-500 mt-2">
          Upload an image to test the advanced preprocessing features
        </p>
      </div>

      {/* 処理中表示 */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Processing image with advanced preprocessing...</span>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Processing Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Processing Results</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 元画像 */}
            <div>
              <h3 className="text-lg font-medium mb-2">Original Image</h3>
              <img
                src={result.originalImage}
                alt="Original"
                className="w-full border rounded-lg shadow-sm"
              />
            </div>

            {/* 処理済み画像 */}
            <div>
              <h3 className="text-lg font-medium mb-2">Processed Image</h3>
              <img
                src={result.processedImage}
                alt="Processed"
                className="w-full border rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* 処理結果情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Processing Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Processing Time:</span>
                <span className="ml-2">{result.processingTime}ms</span>
              </div>

              {/* 使用した設定の表示 */}
              <div className="col-span-full">
                <span className="font-medium">Applied Settings:</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  {result.settings.enhanceContrast && (
                    <li>Contrast Enhancement: {result.settings.contrastFactor}x</li>
                  )}
                  {result.settings.denoiseEnabled && (
                    <li>Noise Reduction: {result.settings.denoiseStrength}</li>
                  )}
                  {result.settings.sharpenEnabled && (
                    <li>Sharpening: {result.settings.sharpenStrength}x</li>
                  )}
                  {result.settings.gammaCorrection && (
                    <li>Gamma Correction: {result.settings.gammaValue}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedImagePreprocessingTest;