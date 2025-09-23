import React, { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

interface PerformanceMetrics {
  coldStartTime: number;
  memoryUsage: number;
  ocrTime: number;
  totalTime: number;
  error?: string;
}

const TesseractPerformanceTest: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testImage, setTestImage] = useState<string | null>(null);

  const generateTestImage = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 800, 400);
      ctx.fillStyle = 'black';
      ctx.font = '24px Arial';
      ctx.fillText('Hello World! This is a test image for OCR.', 50, 100);
      ctx.fillText('Testing Tesseract.js performance metrics.', 50, 150);
      ctx.fillText('Cold start time and memory usage measurement.', 50, 200);
      ctx.fillText('Sample text with numbers: 12345', 50, 250);
    }

    return canvas.toDataURL('image/png');
  }, []);

  const measureMemoryUsage = () => {
    if ('memory' in performance) {
      const memInfo = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit
      };
    }
    return null;
  };

  const runPerformanceTest = useCallback(async () => {
    setIsRunning(true);
    setMetrics(null);

    try {
      const testImageData = generateTestImage();
      setTestImage(testImageData);

      const startTime = performance.now();
      const memoryBefore = measureMemoryUsage();

      // Cold start measurement
      const coldStartBegin = performance.now();
      const worker = await createWorker('eng');
      const coldStartTime = performance.now() - coldStartBegin;

      // OCR processing measurement
      const ocrStartTime = performance.now();
      const { data: { text } } = await worker.recognize(testImageData);
      const ocrTime = performance.now() - ocrStartTime;

      await worker.terminate();

      const totalTime = performance.now() - startTime;
      const memoryAfter = measureMemoryUsage();

      const memoryUsed = memoryAfter && memoryBefore
        ? memoryAfter.used - memoryBefore.used
        : 0;

      setMetrics({
        coldStartTime,
        memoryUsage: memoryUsed,
        ocrTime,
        totalTime
      });

      console.log('OCR Result:', text);
    } catch (error) {
      setMetrics({
        coldStartTime: 0,
        memoryUsage: 0,
        ocrTime: 0,
        totalTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  }, [generateTestImage]);

  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;
  const formatMemory = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Tesseract.js Performance Test</h2>

      <div className="mb-6">
        <button
          onClick={runPerformanceTest}
          disabled={isRunning}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
        >
          {isRunning ? 'Running Test...' : 'Run Performance Test'}
        </button>
      </div>

      {testImage && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Test Image:</h3>
          <img src={testImage} alt="Test image for OCR" className="border border-gray-300 rounded" />
        </div>
      )}

      {metrics && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>

          {metrics.error ? (
            <div className="text-red-600">
              <strong>Error:</strong> {metrics.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Cold Start Time</div>
                <div className="text-xl font-semibold text-blue-600">
                  {formatTime(metrics.coldStartTime)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Worker initialization time
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Memory Usage</div>
                <div className="text-xl font-semibold text-green-600">
                  {formatMemory(metrics.memoryUsage)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Peak memory consumption
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">OCR Processing Time</div>
                <div className="text-xl font-semibold text-orange-600">
                  {formatTime(metrics.ocrTime)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Text recognition time
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Total Time</div>
                <div className="text-xl font-semibold text-purple-600">
                  {formatTime(metrics.totalTime)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  End-to-end processing
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div className="text-sm font-medium text-blue-800">Performance Analysis:</div>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
              <li>Cold start should be &lt; 2000ms for acceptable UX</li>
              <li>Memory usage should be &lt; 100MB for efficient operation</li>
              <li>OCR processing should be &lt; 3000ms for responsive UI</li>
              <li>Total time target: &lt; 5000ms (including translation)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TesseractPerformanceTest;