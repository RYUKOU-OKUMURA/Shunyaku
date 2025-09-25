import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ProgressIndicator from './ProgressIndicator';

const meta = {
  title: 'Components/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
    },
    currentStep: {
      control: { type: 'select' },
      options: ['idle', 'ocr', 'translation', 'saving'],
    },
    visible: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ProgressIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

const ProgressDemo = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'idle' | 'ocr' | 'translation' | 'saving'>('idle');
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    { key: 'idle' as const, label: 'Ready', duration: 500 },
    { key: 'ocr' as const, label: 'Reading Image', duration: 3000 },
    { key: 'translation' as const, label: 'Translating', duration: 2000 },
    { key: 'saving' as const, label: 'Saving', duration: 1000 },
  ];

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('idle');

    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(step.key);

      // Simulate progress within the step
      const stepDuration = step.duration;
      const progressPerStep = 100 / (steps.length - 1);
      const baseProgress = (i - 1) * progressPerStep;

      for (let p = 0; p <= 100; p += 2) {
        const totalProgress = baseProgress + (progressPerStep * p) / 100;
        setProgress(totalProgress);
        await new Promise(resolve => setTimeout(resolve, stepDuration / 50));
      }
    }

    // Complete
    setProgress(100);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCurrentStep('idle');
    setProgress(0);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Progress Indicator Demo</h2>
        <p className="text-gray-600 mb-6">
          This component shows the progress of the translation pipeline.
          Click the button below to run a simulation of the complete process.
        </p>

        <div className="mb-6">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running Simulation...' : 'Start Translation Simulation'}
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Current Status</h3>
          <div className="space-y-2 text-sm">
            <div>Step: <span className="font-medium">{currentStep}</span></div>
            <div>Progress: <span className="font-medium">{Math.round(progress)}%</span></div>
            <div>Status: <span className="font-medium">{isRunning ? 'Running' : 'Idle'}</span></div>
          </div>
        </div>
      </div>

      <ProgressIndicator
        progress={progress}
        currentStep={currentStep}
        visible={isRunning || progress > 0}
      />
    </div>
  );
};

export const InteractiveDemo: Story = {
  render: ProgressDemo,
  args: {
    progress: 0,
    currentStep: 'idle',
    visible: true,
  },
};

export const IdleState: Story = {
  args: {
    progress: 0,
    currentStep: 'idle',
    visible: true,
  },
};

export const OCRInProgress: Story = {
  args: {
    progress: 25,
    currentStep: 'ocr',
    visible: true,
  },
};

export const TranslationInProgress: Story = {
  args: {
    progress: 65,
    currentStep: 'translation',
    visible: true,
  },
};

export const SavingInProgress: Story = {
  args: {
    progress: 90,
    currentStep: 'saving',
    visible: true,
  },
};

export const NearCompletion: Story = {
  args: {
    progress: 95,
    currentStep: 'saving',
    visible: true,
  },
};

export const Hidden: Story = {
  args: {
    progress: 50,
    currentStep: 'translation',
    visible: false,
  },
};