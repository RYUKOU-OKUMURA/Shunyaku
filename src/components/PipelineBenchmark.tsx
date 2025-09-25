import React, { useState } from 'react';
import { pipelineIntegrationService, PipelineBenchmarkResult, PipelineResult } from '../lib/pipelineIntegrationService';

export const PipelineBenchmark: React.FC = () => {
  const [benchmarkResult, setBenchmarkResult] = useState<PipelineBenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(5);
  const [targetLang, setTargetLang] = useState('ja');

  const runBenchmark = async () => {
    setIsRunning(true);
    setBenchmarkResult(null);

    try {
      console.log('Starting pipeline benchmark...');
      const result = await pipelineIntegrationService.runFiveSecondBenchmark(iterations, targetLang);
      setBenchmarkResult(result);
    } catch (error) {
      console.error('Benchmark failed:', error);
      // エラー結果を表示
      setBenchmarkResult({
        passed: false,
        message: `Benchmark failed: ${error}`,
        averageTime: 0,
        successRate: 0,
        details: {
          results: [],
          memoryMetrics: {
            averagePeak: 0,
            maxPeak: 0,
            averageIncrease: 0,
          },
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const renderResultCard = (result: PipelineResult, index: number) => {
    const statusColor = result.success ? 'text-green-600' : 'text-red-600';
    const bgColor = result.success ? 'bg-green-50' : 'bg-red-50';

    return (
      <div key={index} className={`p-3 border rounded-lg ${bgColor}`}>
        <div className={`font-semibold ${statusColor}`}>
          Test {index + 1}: {result.success ? 'SUCCESS' : 'FAILED'}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          <div>Total: {result.performanceMetrics.totalTime}ms</div>
          <div>OCR: {result.performanceMetrics.ocrTime}ms</div>
          <div>Translation: {result.performanceMetrics.translationTime}ms</div>
          <div>Memory: {result.performanceMetrics.memoryUsage.start}MB → {result.performanceMetrics.memoryUsage.peak}MB (peak)</div>
          {result.success && (
            <>
              <div className="mt-2">
                <div className="text-xs">OCR Text ({result.ocrResult.text.length} chars):</div>
                <div className="text-xs bg-gray-100 p-1 rounded max-h-20 overflow-y-auto">
                  {result.ocrResult.text.substring(0, 200)}
                  {result.ocrResult.text.length > 200 ? '...' : ''}
                </div>
              </div>
              <div className="mt-1">
                <div className="text-xs">Translation ({result.translationResult.translatedText.length} chars):</div>
                <div className="text-xs bg-blue-100 p-1 rounded max-h-20 overflow-y-auto">
                  {result.translationResult.translatedText.substring(0, 200)}
                  {result.translationResult.translatedText.length > 200 ? '...' : ''}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">
          End-to-End Pipeline Benchmark
        </h1>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This benchmark tests the complete OCR → Translation pipeline to verify the 5-second performance target.
            It generates a standardized test image, processes it through OCR, and translates the extracted text.
          </p>

          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iterations
              </label>
              <input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                min="1"
                max="20"
                className="border border-gray-300 rounded px-3 py-1 w-20"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1"
                disabled={isRunning}
              >
                <option value="ja">Japanese (日本語)</option>
                <option value="en">English</option>
                <option value="zh">Chinese (中文)</option>
                <option value="ko">Korean (한국어)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
              </select>
            </div>
          </div>

          <button
            onClick={runBenchmark}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Running Benchmark...
              </span>
            ) : (
              'Start Benchmark'
            )}
          </button>
        </div>

        {benchmarkResult && (
          <div className="mt-6">
            <div className={`p-4 rounded-lg mb-6 ${
              benchmarkResult.passed
                ? 'bg-green-100 border border-green-300'
                : 'bg-red-100 border border-red-300'
            }`}>
              <h2 className={`text-lg font-semibold mb-2 ${
                benchmarkResult.passed ? 'text-green-800' : 'text-red-800'
              }`}>
                Benchmark Result
              </h2>
              <p className={`${benchmarkResult.passed ? 'text-green-700' : 'text-red-700'}`}>
                {benchmarkResult.message}
              </p>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {benchmarkResult.averageTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Average Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {(benchmarkResult.successRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {benchmarkResult.details.memoryMetrics.averagePeak}MB
                  </div>
                  <div className="text-sm text-gray-600">Avg Memory Peak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {benchmarkResult.details.memoryMetrics.maxPeak}MB
                  </div>
                  <div className="text-sm text-gray-600">Max Memory Peak</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Individual Test Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benchmarkResult.details.results.map((result, index) => renderResultCard(result, index))}
              </div>
            </div>

            {benchmarkResult.passed && (
              <div className="mt-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🎉 Phase 2-3 Requirements Met!
                </h3>
                <p className="text-blue-700">
                  The end-to-end pipeline successfully achieves the 5-second performance target
                  with high reliability. Ready to proceed to Phase 4.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};