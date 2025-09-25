import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DropZone from './DropZone';
import {
  ApiResponse,
  ImageInput,
  OCRConfig,
  OCRResult,
  TranslationResult,
} from '../types';
import { MockPipelineService } from '../lib/mockServices';

interface PipelinePrototypeProps {
  onOpenTests?: () => void;
  onOpenUIDemo?: () => void;
  onOpenPreprocessingTest?: () => void;
}

type PipelineHistoryItem = {
  id: string;
  image: ImageInput;
  previewUrl: string | null;
  ocrResult: ApiResponse<OCRResult>;
  translationResult: ApiResponse<TranslationResult>;
  totalTime: number;
  createdAt: Date;
};

const defaultOcrConfig: OCRConfig = {
  language: 'eng',
  psm: 3,
  oem: 1,
  preprocessingEnabled: true,
  confidenceThreshold: 0.6,
};

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const PipelinePrototype: React.FC<PipelinePrototypeProps> = ({ onOpenTests, onOpenUIDemo, onOpenPreprocessingTest }) => {
  const [ocrConfig, setOcrConfig] = useState<OCRConfig>(defaultOcrConfig);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ja');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<PipelineHistoryItem | null>(null);
  const [history, setHistory] = useState<PipelineHistoryItem[]>([]);
  const [useFailureSimulation, setUseFailureSimulation] = useState(false);

  // Clean up object URLs when component unmounts or history resets
  useEffect(() => {
    return () => {
      history.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      if (latestResult?.previewUrl && latestResult.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(latestResult.previewUrl);
      }
    };
  }, [history, latestResult]);

  const createPreviewUrl = useCallback((image: ImageInput): string | null => {
    if (typeof image.data === 'string') {
      return image.data;
    }

    try {
      const blob = new Blob([image.data], { type: `image/${image.format}` });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Failed to create preview blob:', err);
      return null;
    }
  }, []);

  const runPipeline = useCallback(
    async (image: ImageInput) => {
      setIsProcessing(true);
      setError(null);

      try {
        const previewUrl = createPreviewUrl(image);
        const pipelineRunner = useFailureSimulation
          ? MockPipelineService.simulateRandomFailure
          : MockPipelineService.processImageToTranslation;

        const result = await pipelineRunner(image, ocrConfig, {
          sourceLang,
          targetLang,
        });

        const item: PipelineHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          image,
          previewUrl,
          ocrResult: result.ocrResult,
          translationResult: result.translationResult,
          totalTime: result.totalTime,
          createdAt: new Date(),
        };

        setLatestResult(item);
        setHistory((prev) => [item, ...prev].slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown pipeline error');
      } finally {
        setIsProcessing(false);
      }
    },
    [createPreviewUrl, ocrConfig, sourceLang, targetLang, useFailureSimulation],
  );

  const handleImageDrop = useCallback(
    async (image: ImageInput) => {
      await runPipeline(image);
    },
    [runPipeline],
  );

  const renderOcrResult = useMemo(() => {
    if (!latestResult) {
      return null;
    }

    const { ocrResult } = latestResult;

    if (!ocrResult.success || !ocrResult.data) {
      return (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">OCR Error</h3>
          <p className="text-sm text-red-600">
            {ocrResult.error?.message || 'OCR processing failed.'}
          </p>
        </div>
      );
    }

    const metrics = ocrResult.performanceMetrics;

    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-800">OCR Result</h3>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Confidence {(ocrResult.data.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
          {ocrResult.data.text}
        </p>
        {metrics && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Processing Time</div>
              <div>{metrics.ocrTime.toFixed(0)} ms</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Text Length</div>
              <div>{metrics.textLength}</div>
            </div>
          </div>
        )}
      </div>
    );
  }, [latestResult]);

  const renderTranslationResult = useMemo(() => {
    if (!latestResult) {
      return null;
    }

    const { translationResult } = latestResult;

    if (!translationResult.success || !translationResult.data) {
      return (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">Translation Error</h3>
          <p className="text-sm text-red-600">
            {translationResult.error?.message || 'Translation failed.'}
          </p>
        </div>
      );
    }

    const metrics = translationResult.performanceMetrics;

    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Translation Result</h3>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
            {translationResult.data.sourceLang.toUpperCase()} → {translationResult.data.targetLang.toUpperCase()}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
          {translationResult.data.translatedText}
        </p>
        {metrics && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Processing Time</div>
              <div>{metrics.translationTime.toFixed(0)} ms</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Provider</div>
              <div className="uppercase">{translationResult.data.provider}</div>
            </div>
          </div>
        )}
      </div>
    );
  }, [latestResult]);

  const totalTimeDisplay = useMemo(() => {
    if (!latestResult) {
      return null;
    }

    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-xs uppercase tracking-wide text-purple-600 font-semibold">Total Pipeline Time</div>
        <div className="text-2xl font-bold text-purple-700">
          {latestResult.totalTime.toFixed(0)} ms
        </div>
        <p className="text-xs text-purple-600 mt-1">
          Target is 5000ms including OCR, translation, and rendering.
        </p>
      </div>
    );
  }, [latestResult]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phase 2-3 Pipeline Prototype</h1>
            <p className="text-sm text-gray-600 mt-1">
              Drop an image to run the OCR → Translation pipeline. Toggle failure simulation to verify error handling.
            </p>
          </div>
          <div className="flex gap-2">
            {onOpenPreprocessingTest && (
              <button
                onClick={onOpenPreprocessingTest}
                className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                type="button"
              >
                🔧 Advanced Preprocessing (Phase 5-1)
              </button>
            )}
            {onOpenUIDemo && (
              <button
                onClick={onOpenUIDemo}
                className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                type="button"
              >
                🎨 UI Components Demo
              </button>
            )}
            {onOpenTests && (
              <button
                onClick={onOpenTests}
                className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                type="button"
              >
                📊 Performance Tests
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Input Image</h2>
                  <p className="text-sm text-gray-500">PNG, JPG, JPEG, PDF up to 10MB</p>
                </div>
                <label className="inline-flex items-center text-sm text-gray-600 gap-2 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600"
                    checked={useFailureSimulation}
                    onChange={(event) => setUseFailureSimulation(event.target.checked)}
                  />
                  Failure Simulation
                </label>
              </div>

              <div className="mt-6">
                <DropZone onImageDrop={handleImageDrop} disabled={isProcessing} />
              </div>

              {isProcessing && (
                <div className="mt-4 flex items-center gap-3 text-sm text-indigo-600">
                  <span className="inline-block h-3 w-3 animate-ping rounded-full bg-indigo-400" />
                  Processing pipeline...
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  ⚠️ {error}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">OCR Configuration</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1">Language</label>
                    <select
                      className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      value={ocrConfig.language}
                      onChange={(event) =>
                        setOcrConfig((prev) => ({ ...prev, language: event.target.value as OCRConfig['language'] }))
                      }
                    >
                      <option value="eng">English</option>
                      <option value="jpn">Japanese</option>
                      <option value="eng+jpn">English + Japanese</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 mb-1">PSM</label>
                      <input
                        type="number"
                        min={0}
                        max={13}
                        className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        value={ocrConfig.psm}
                        onChange={(event) =>
                          setOcrConfig((prev) => ({ ...prev, psm: Number(event.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">OEM</label>
                      <input
                        type="number"
                        min={0}
                        max={3}
                        className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        value={ocrConfig.oem}
                        onChange={(event) =>
                          setOcrConfig((prev) => ({ ...prev, oem: Number(event.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600"
                      checked={ocrConfig.preprocessingEnabled}
                      onChange={(event) =>
                        setOcrConfig((prev) => ({ ...prev, preprocessingEnabled: event.target.checked }))
                      }
                    />
                    Enable preprocessing (binarization & contrast)
                  </label>
                </div>
              </div>

              <div className="bg-white border rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Translation Configuration</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1">Source Language</label>
                    <select
                      className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      value={sourceLang}
                      onChange={(event) => setSourceLang(event.target.value)}
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1">Target Language</label>
                    <select
                      className="w-full rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      value={targetLang}
                      onChange={(event) => setTargetLang(event.target.value)}
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
                    <p className="font-semibold mb-1">DeepL Integration TODO</p>
                    <p>
                      Real DeepL API calls will replace the mock service once API key storage and rate limit handling are wired via Tauri commands.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            {latestResult?.previewUrl && (
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-700">Latest Preview</h3>
                  <p className="text-xs text-gray-500">
                    {latestResult.image.width}×{latestResult.image.height} · {(latestResult.image.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <img
                  src={latestResult.previewUrl}
                  alt="Latest processed"
                  className="w-full object-cover max-h-64"
                />
              </div>
            )}

            {totalTimeDisplay}

            <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Recent Runs</h3>
              {history.length === 0 && (
                <p className="text-xs text-gray-500">Drop an image to build the pipeline history.</p>
              )}

              {history.map((item) => (
                <div key={item.id} className="border rounded-lg px-3 py-2 text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{item.createdAt.toLocaleTimeString()}</span>
                    <span>
                      {item.translationResult.success ? '✅' : '⚠️'} {item.totalTime.toFixed(0)} ms
                    </span>
                  </div>
                  <div>OCR: {item.ocrResult.success ? 'OK' : 'Error'}</div>
                  <div>TR: {item.translationResult.success ? 'OK' : 'Error'}</div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderOcrResult}
          {renderTranslationResult}
        </section>
      </main>
    </div>
  );
};

export default PipelinePrototype;
