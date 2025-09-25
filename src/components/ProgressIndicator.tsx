import React from 'react';
import { ProgressIndicatorProps } from '../types';

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  currentStep,
  visible,
  className = '',
}) => {
  if (!visible) {
    return null;
  }

  const steps = [
    { key: 'idle', label: 'Ready', icon: '⏸️' },
    { key: 'ocr', label: 'Reading Image', icon: '👁️' },
    { key: 'translation', label: 'Translating', icon: '🌐' },
    { key: 'saving', label: 'Saving', icon: '💾' },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const activeStep = steps[currentStepIndex] || steps[0];

  return (
    <div className={`fixed top-4 right-4 z-40 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <span className="text-lg">{activeStep.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{activeStep.label}</h3>
            <p className="text-xs text-gray-500">
              {progress > 0 ? `${Math.round(progress)}% complete` : 'Processing...'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between text-xs">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex flex-col items-center ${
                index <= currentStepIndex
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                  index < currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : index === currentStepIndex
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              <span className="text-xs font-medium truncate max-w-16">
                {step.key === 'idle' ? 'Ready' :
                 step.key === 'ocr' ? 'OCR' :
                 step.key === 'translation' ? 'Translate' : 'Save'}
              </span>
            </div>
          ))}
        </div>

        {/* Loading Animation */}
        {currentStep !== 'idle' && (
          <div className="flex items-center justify-center mt-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;