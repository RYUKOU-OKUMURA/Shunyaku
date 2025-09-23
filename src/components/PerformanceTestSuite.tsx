import React, { useState } from 'react';
import TesseractPerformanceTest from './TesseractPerformanceTest';
import DeepLPerformanceTest from './DeepLPerformanceTest';
import TauriMultiWindowTest from './TauriMultiWindowTest';

type TestSuite = 'overview' | 'tesseract' | 'deepl' | 'multiwindow';

const PerformanceTestSuite: React.FC = () => {
  const [activeTest, setActiveTest] = useState<TestSuite>('overview');

  const testSuites = [
    { id: 'overview' as const, name: 'Overview', icon: '📊' },
    { id: 'tesseract' as const, name: 'Tesseract.js OCR', icon: '👁️' },
    { id: 'deepl' as const, name: 'DeepL API', icon: '🌐' },
    { id: 'multiwindow' as const, name: 'Multi-Window', icon: '🪟' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Phase 1-2: Technical PoC Performance Tests
          </h1>
          <nav className="flex space-x-1">
            {testSuites.map((suite) => (
              <button
                key={suite.id}
                onClick={() => setActiveTest(suite.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTest === suite.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {suite.icon} {suite.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTest === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Performance Test Suite Overview</h2>
              <p className="text-gray-600 mb-6">
                This test suite validates the key technical assumptions for the Shunyaku translation app.
                Each test measures critical performance metrics to ensure the 5-second translation target is achievable.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl mb-2">👁️</div>
                  <h3 className="font-semibold text-blue-800 mb-2">Tesseract.js OCR</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Measures cold start time, memory usage, and OCR processing speed for text extraction.
                  </p>
                  <ul className="text-xs text-blue-600 list-disc list-inside">
                    <li>Cold start target: &lt; 2000ms</li>
                    <li>Memory usage: &lt; 100MB</li>
                    <li>OCR processing: &lt; 3000ms</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl mb-2">🌐</div>
                  <h3 className="font-semibold text-green-800 mb-2">DeepL API</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Tests translation API response times and rate limiting behavior.
                  </p>
                  <ul className="text-xs text-green-600 list-disc list-inside">
                    <li>Response time: &lt; 1000ms</li>
                    <li>Rate limit monitoring</li>
                    <li>Error handling validation</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl mb-2">🪟</div>
                  <h3 className="font-semibold text-purple-800 mb-2">Multi-Window</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    Validates Tauri's floating panel implementation for result display.
                  </p>
                  <ul className="text-xs text-purple-600 list-disc list-inside">
                    <li>Window creation: &lt; 300ms</li>
                    <li>Memory per window: ~20-50MB</li>
                    <li>Always-on-top behavior</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Success Criteria (Phase 1-2)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Performance Targets</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Total pipeline &lt; 5000ms</li>
                    <li>✅ OCR reliability &gt; 95%</li>
                    <li>✅ Translation accuracy validation</li>
                    <li>✅ Memory usage within bounds</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Technical Validation</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Floating window functionality</li>
                    <li>✅ Cross-window communication</li>
                    <li>✅ API integration patterns</li>
                    <li>✅ Error handling robustness</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">Next Steps After Validation:</h4>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>Optimize performance bottlenecks identified in testing</li>
                <li>Implement worker warm-up strategies for Tesseract.js</li>
                <li>Design caching layers for translation API</li>
                <li>Prototype the full OCR → Translation → Display pipeline</li>
              </ol>
            </div>
          </div>
        )}

        {activeTest === 'tesseract' && <TesseractPerformanceTest />}
        {activeTest === 'deepl' && <DeepLPerformanceTest />}
        {activeTest === 'multiwindow' && <TauriMultiWindowTest />}
      </div>
    </div>
  );
};

export default PerformanceTestSuite;