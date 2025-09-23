import { useState } from 'react';
import PipelinePrototype from './components/PipelinePrototype';
import PerformanceTestSuite from './components/PerformanceTestSuite';

type AppView = 'pipeline' | 'tests';

function App() {
  const [activeView, setActiveView] = useState<AppView>('pipeline');

  if (activeView === 'tests') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Developer Test Utilities</h1>
            <button
              type="button"
              onClick={() => setActiveView('pipeline')}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              ← Back to Pipeline Prototype
            </button>
          </div>
        </div>
        <PerformanceTestSuite />
      </div>
    );
  }

  return <PipelinePrototype onOpenTests={() => setActiveView('tests')} />;
}

export default App;
