import { useState } from 'react';
import PipelinePrototype from './components/PipelinePrototype';
import PerformanceTestSuite from './components/PerformanceTestSuite';
import KeyboardShortcutsDemo from './components/KeyboardShortcutsDemo';
import AdvancedImagePreprocessingTest from './components/AdvancedImagePreprocessingTest';

type AppView = 'pipeline' | 'tests' | 'ui-demo' | 'preprocessing-test';

function App() {
  const [activeView, setActiveView] = useState<AppView>('pipeline');

  if (activeView === 'tests') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Developer Test Utilities</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveView('preprocessing-test')}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Preprocessing Test
              </button>
              <button
                type="button"
                onClick={() => setActiveView('ui-demo')}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                UI Demo
              </button>
              <button
                type="button"
                onClick={() => setActiveView('pipeline')}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                ← Back to Pipeline Prototype
              </button>
            </div>
          </div>
        </div>
        <PerformanceTestSuite />
      </div>
    );
  }

  if (activeView === 'ui-demo') {
    return <KeyboardShortcutsDemo />;
  }

  if (activeView === 'preprocessing-test') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Advanced Image Preprocessing Test (Phase 5-1)</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveView('tests')}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Performance Tests
              </button>
              <button
                type="button"
                onClick={() => setActiveView('pipeline')}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                ← Back to Pipeline
              </button>
            </div>
          </div>
        </div>
        <AdvancedImagePreprocessingTest />
      </div>
    );
  }

  return (
    <PipelinePrototype
      onOpenTests={() => setActiveView('tests')}
      onOpenUIDemo={() => setActiveView('ui-demo')}
      onOpenPreprocessingTest={() => setActiveView('preprocessing-test')}
    />
  );
}

export default App;
