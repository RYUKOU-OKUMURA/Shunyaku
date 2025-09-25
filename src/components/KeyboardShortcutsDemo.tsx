import React, { useState } from 'react';
import {
  useKeyboardShortcuts,
  createQuickTranslateShortcut,
  createSettingsShortcut,
  createToggleFloatingPanelShortcut,
  createEscapeShortcut,
  formatShortcutDisplay,
  KeyboardShortcut,
} from '../hooks/useKeyboardShortcuts';
import FloatingPanel from './FloatingPanel';
import SettingsModal from './SettingsModal';
import { ToastContainer, ToastNotification } from './Toast';
import { AppSettings } from '../types';

// Default settings for demo
const defaultSettings: AppSettings = {
  ocr: {
    language: 'eng+jpn',
    psm: 3,
    oem: 1,
    preprocessingEnabled: true,
  },
  translation: {
    apiKey: '',
    defaultSourceLang: 'auto',
    defaultTargetLang: 'ja',
    preserveFormatting: true,
  },
  imagePreprocessing: {
    resize: true,
    maxWidth: 2000,
    maxHeight: 2000,
    enhanceContrast: true,
    denoiseEnabled: true,
    binarizationEnabled: true,
  },
  ui: {
    theme: 'light',
    floatingPanelEnabled: true,
    autoSaveHistory: true,
    maxHistoryItems: 50,
    showProgressIndicator: true,
  },
  hotkeys: {
    quickTranslate: 'Cmd+Option+T',
    toggleFloatingPanel: 'Cmd+Shift+F',
    openSettings: 'Cmd+,',
  },
};

const KeyboardShortcutsDemo: React.FC = () => {
  const [floatingPanelVisible, setFloatingPanelVisible] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const newToast: ToastNotification = {
      ...toast,
      id: Date.now().toString(),
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    createQuickTranslateShortcut(() => {
      addToast({
        type: 'info',
        title: 'Quick Translate',
        message: 'Would capture and translate clipboard content in real app',
        duration: 3000,
      });
    }),
    createSettingsShortcut(() => {
      setSettingsModalOpen(true);
      addToast({
        type: 'info',
        title: 'Settings Opened',
        message: 'Settings modal opened with keyboard shortcut',
        duration: 2000,
      });
    }),
    createToggleFloatingPanelShortcut(() => {
      setFloatingPanelVisible(prev => {
        const newState = !prev;
        addToast({
          type: 'info',
          title: 'Floating Panel',
          message: newState ? 'Panel shown' : 'Panel hidden',
          duration: 2000,
        });
        return newState;
      });
    }),
    createEscapeShortcut(() => {
      if (settingsModalOpen) {
        setSettingsModalOpen(false);
        addToast({
          type: 'info',
          title: 'Settings Closed',
          message: 'Settings modal closed with Escape key',
          duration: 2000,
        });
      } else if (floatingPanelVisible) {
        setFloatingPanelVisible(false);
        addToast({
          type: 'info',
          title: 'Panel Closed',
          message: 'Floating panel closed with Escape key',
          duration: 2000,
        });
      }
    }),
  ];

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts,
    enabled: shortcutsEnabled,
  });

  const handleSaveTranslation = () => {
    addToast({
      type: 'success',
      title: 'Translation Saved',
      message: 'The translation has been saved successfully.',
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Keyboard Shortcuts Demo
            </h1>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shortcutsEnabled}
                  onChange={(e) => setShortcutsEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Enable Shortcuts
              </label>
            </div>
          </div>
          <p className="text-gray-600">
            This demo shows how keyboard shortcuts work in the translation app.
            Try the shortcuts listed below to see them in action.
          </p>
        </div>

        {/* Shortcuts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Available Shortcuts
            </h2>
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {shortcut.description}
                    </div>
                    <div className="text-sm text-gray-500">
                      Press the keys to trigger this action
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1 rounded border text-sm font-mono">
                    {formatShortcutDisplay(shortcut)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Controls */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Manual Controls
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open Settings Modal
              </button>
              <button
                onClick={() => setFloatingPanelVisible(true)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Show Floating Panel
              </button>
              <button
                onClick={() => addToast({
                  type: 'success',
                  title: 'Manual Toast',
                  message: 'This toast was triggered manually',
                  duration: 3000,
                })}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Show Success Toast
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-700">Shortcuts</div>
              <div className={shortcutsEnabled ? 'text-green-600' : 'text-red-600'}>
                {shortcutsEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-700">Settings Modal</div>
              <div className={settingsModalOpen ? 'text-green-600' : 'text-gray-500'}>
                {settingsModalOpen ? 'Open' : 'Closed'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-700">Floating Panel</div>
              <div className={floatingPanelVisible ? 'text-green-600' : 'text-gray-500'}>
                {floatingPanelVisible ? 'Visible' : 'Hidden'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-700">Active Toasts</div>
              <div className="text-blue-600">{toasts.length}</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How to Test
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>1. Make sure "Enable Shortcuts" is checked above</p>
            <p>2. Try pressing the keyboard combinations shown in the shortcuts list</p>
            <p>3. Watch for toast notifications and modal/panel changes</p>
            <p>4. Use the Escape key to close modals and panels</p>
            <p>5. Toggle "Enable Shortcuts" to see how shortcuts can be disabled</p>
          </div>
        </div>
      </div>

      {/* Floating Panel */}
      <FloatingPanel
        visible={floatingPanelVisible}
        content="This is a sample translation result displayed in the floating panel. You can drag this panel around and resize it. In the real app, this would contain the actual translated text from your OCR + translation pipeline."
        onClose={() => setFloatingPanelVisible(false)}
        onSave={handleSaveTranslation}
        position={{ x: 200, y: 150 }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          setSettingsModalOpen(false);
          addToast({
            type: 'success',
            title: 'Settings Saved',
            message: 'Your settings have been updated successfully.',
            duration: 3000,
          });
        }}
      />

      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />
    </div>
  );
};

export default KeyboardShortcutsDemo;