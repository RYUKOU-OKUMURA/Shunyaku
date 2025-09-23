import React, { useState, useCallback } from 'react';

interface DeepLPerformanceMetrics {
  responseTime: number;
  rateLimitInfo: {
    characterCount: number;
    characterLimit: number;
    remaining: number;
  } | null;
  translationQuality: string;
  error?: string;
}

interface DeepLMockResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

const DeepLPerformanceTest: React.FC = () => {
  const [metrics, setMetrics] = useState<DeepLPerformanceMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [testText, setTestText] = useState('Hello, world! This is a test for translation performance.');
  const [useMockApi, setUseMockApi] = useState(true);

  const mockDeepLTranslate = async (_text: string): Promise<{ data: DeepLMockResponse; responseTime: number }> => {
    const startTime = performance.now();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const responseTime = performance.now() - startTime;

    const mockResponse: DeepLMockResponse = {
      translations: [{
        detected_source_language: 'EN',
        text: `こんにちは、世界！これは翻訳パフォーマンスのテストです。`
      }]
    };

    return { data: mockResponse, responseTime };
  };

  const realDeepLTranslate = async (text: string, key: string): Promise<{ data: DeepLMockResponse; responseTime: number }> => {
    const startTime = performance.now();

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        target_lang: 'JA',
        source_lang: 'EN'
      })
    });

    const responseTime = performance.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data, responseTime };
  };

  const runPerformanceTest = useCallback(async () => {
    setIsRunning(true);
    setMetrics(null);

    try {
      let translationResult;

      if (useMockApi) {
        translationResult = await mockDeepLTranslate(testText);
      } else {
        if (!apiKey.trim()) {
          throw new Error('API key is required for real API testing');
        }
        translationResult = await realDeepLTranslate(testText, apiKey);
      }

      const { data, responseTime } = translationResult;

      // Mock rate limit info (in real implementation, this would come from response headers)
      const mockRateLimitInfo = {
        characterCount: testText.length,
        characterLimit: 500000, // DeepL Free tier limit
        remaining: 500000 - testText.length
      };

      setMetrics({
        responseTime,
        rateLimitInfo: mockRateLimitInfo,
        translationQuality: data.translations[0].text
      });

    } catch (error) {
      setMetrics({
        responseTime: 0,
        rateLimitInfo: null,
        translationQuality: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  }, [testText, apiKey, useMockApi]);

  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">DeepL API Performance Test</h2>

      <div className="mb-6 space-y-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useMockApi}
              onChange={(e) => setUseMockApi(e.target.checked)}
              className="mr-2"
            />
            Use Mock API (for testing without real API key)
          </label>
        </div>

        {!useMockApi && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DeepL API Key:
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your DeepL API key..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Text:
          </label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={runPerformanceTest}
          disabled={isRunning}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
        >
          {isRunning ? 'Testing API...' : 'Run API Performance Test'}
        </button>
      </div>

      {metrics && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">API Performance Metrics</h3>

          {metrics.error ? (
            <div className="text-red-600">
              <strong>Error:</strong> {metrics.error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded border">
                  <div className="text-sm text-gray-600">Response Time</div>
                  <div className="text-xl font-semibold text-blue-600">
                    {formatTime(metrics.responseTime)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    API call duration
                  </div>
                </div>

                {metrics.rateLimitInfo && (
                  <div className="bg-white p-4 rounded border">
                    <div className="text-sm text-gray-600">Rate Limit Status</div>
                    <div className="text-xl font-semibold text-green-600">
                      {metrics.rateLimitInfo.remaining.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Characters remaining / {metrics.rateLimitInfo.characterLimit.toLocaleString()} total
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600 mb-2">Translation Result:</div>
                <div className="text-gray-800 italic">"{metrics.translationQuality}"</div>
              </div>

              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm font-medium text-green-800">Performance Analysis:</div>
                <ul className="text-sm text-green-700 mt-1 list-disc list-inside">
                  <li>Response time should be &lt; 1000ms for good UX</li>
                  <li>Monitor rate limits to avoid service interruption</li>
                  <li>Target: Total translation pipeline &lt; 2000ms</li>
                  <li>Consider caching for repeated translations</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Rate Limit Information:</h4>
        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
          <li>DeepL Free: 500,000 characters/month</li>
          <li>DeepL Pro: 1,000,000+ characters/month (depending on plan)</li>
          <li>Rate limiting: Generally not enforced for normal usage</li>
          <li>Character count includes source text only</li>
        </ul>
      </div>
    </div>
  );
};

export default DeepLPerformanceTest;