import React, { useState, useEffect } from 'react';
import { SettingsModalProps, AppSettings, OCRConfig, TranslationConfig, UISettings, HotkeySettings } from '../types';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  className = '',
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'ocr' | 'translation' | 'hotkeys' | 'export'>('general');

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings); // Reset to original settings
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleCancel]);

  if (!isOpen) {
    return null;
  }

  const updateOcrSettings = (updates: Partial<OCRConfig>) => {
    setLocalSettings(prev => ({
      ...prev,
      ocr: { ...prev.ocr, ...updates }
    }));
  };

  const updateTranslationSettings = (updates: Partial<TranslationConfig>) => {
    setLocalSettings(prev => ({
      ...prev,
      translation: { ...prev.translation, ...updates }
    }));
  };

  const updateUISettings = (updates: Partial<UISettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      ui: { ...prev.ui, ...updates }
    }));
  };

  const updateHotkeySettings = (updates: Partial<HotkeySettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      hotkeys: { ...prev.hotkeys, ...updates }
    }));
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'ocr' as const, label: 'OCR', icon: '👁️' },
    { id: 'translation' as const, label: 'Translation', icon: '🌐' },
    { id: 'hotkeys' as const, label: 'Hotkeys', icon: '⌨️' },
    { id: 'export' as const, label: 'Export', icon: '💾' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className={`relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">General Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <select
                      value={localSettings.ui.theme}
                      onChange={(e) => updateUISettings({ theme: e.target.value as UISettings['theme'] })}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enable Floating Panel
                      </label>
                      <p className="text-sm text-gray-500">Show translation results in a floating window</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.ui.floatingPanelEnabled}
                      onChange={(e) => updateUISettings({ floatingPanelEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Auto-save History
                      </label>
                      <p className="text-sm text-gray-500">Automatically save translation history</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.ui.autoSaveHistory}
                      onChange={(e) => updateUISettings({ autoSaveHistory: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max History Items
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={localSettings.ui.maxHistoryItems}
                      onChange={(e) => updateUISettings({ maxHistoryItems: parseInt(e.target.value) })}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ocr' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">OCR Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Language
                    </label>
                    <select
                      value={localSettings.ocr.language}
                      onChange={(e) => updateOcrSettings({ language: e.target.value as OCRConfig['language'] })}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="eng">English</option>
                      <option value="jpn">Japanese</option>
                      <option value="eng+jpn">English + Japanese</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Segmentation Mode (PSM)
                      </label>
                      <select
                        value={localSettings.ocr.psm}
                        onChange={(e) => updateOcrSettings({ psm: parseInt(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="3">3 - Fully automatic page segmentation</option>
                        <option value="6">6 - Single uniform block of text</option>
                        <option value="7">7 - Single text line</option>
                        <option value="8">8 - Single word</option>
                        <option value="13">13 - Raw line (bypass heuristics)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        OCR Engine Mode (OEM)
                      </label>
                      <select
                        value={localSettings.ocr.oem}
                        onChange={(e) => updateOcrSettings({ oem: parseInt(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="0">0 - Legacy engine only</option>
                        <option value="1">1 - Neural nets LSTM engine only</option>
                        <option value="2">2 - Legacy + LSTM engines</option>
                        <option value="3">3 - Default (based on what is available)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enable Image Preprocessing
                      </label>
                      <p className="text-sm text-gray-500">Apply image enhancement before OCR</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.ocr.preprocessingEnabled}
                      onChange={(e) => updateOcrSettings({ preprocessingEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'translation' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Translation Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DeepL API Key
                    </label>
                    <input
                      type="password"
                      value={localSettings.translation.apiKey}
                      onChange={(e) => updateTranslationSettings({ apiKey: e.target.value })}
                      placeholder="Enter your DeepL API key"
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Get your API key from <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeepL Pro API</a>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Source Language
                      </label>
                      <select
                        value={localSettings.translation.defaultSourceLang}
                        onChange={(e) => updateTranslationSettings({ defaultSourceLang: e.target.value })}
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="en">English</option>
                        <option value="ja">Japanese</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="zh">Chinese</option>
                        <option value="ko">Korean</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Target Language
                      </label>
                      <select
                        value={localSettings.translation.defaultTargetLang}
                        onChange={(e) => updateTranslationSettings({ defaultTargetLang: e.target.value })}
                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="ja">Japanese</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="zh">Chinese</option>
                        <option value="ko">Korean</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formality
                    </label>
                    <select
                      value={localSettings.translation.formality || 'default'}
                      onChange={(e) => updateTranslationSettings({
                        formality: e.target.value === 'default' ? undefined : e.target.value as 'formal' | 'informal'
                      })}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="default">Default</option>
                      <option value="formal">Formal</option>
                      <option value="informal">Informal</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Preserve Formatting
                      </label>
                      <p className="text-sm text-gray-500">Maintain original text formatting when possible</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.translation.preserveFormatting}
                      onChange={(e) => updateTranslationSettings({ preserveFormatting: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hotkeys' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Translate
                    </label>
                    <input
                      type="text"
                      value={localSettings.hotkeys.quickTranslate}
                      onChange={(e) => updateHotkeySettings({ quickTranslate: e.target.value })}
                      placeholder="e.g., Cmd+Option+T"
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Global shortcut to capture and translate clipboard/selection
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Toggle Floating Panel
                    </label>
                    <input
                      type="text"
                      value={localSettings.hotkeys.toggleFloatingPanel}
                      onChange={(e) => updateHotkeySettings({ toggleFloatingPanel: e.target.value })}
                      placeholder="e.g., Cmd+Shift+F"
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Open Settings
                    </label>
                    <input
                      type="text"
                      value={localSettings.hotkeys.openSettings}
                      onChange={(e) => updateHotkeySettings({ openSettings: e.target.value })}
                      placeholder="e.g., Cmd+,"
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">Global shortcuts require system permissions</p>
                        <p>Make sure to grant accessibility permissions to the app in System Preferences.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Export Settings</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2">ℹ️</span>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Export functionality coming soon</p>
                      <p>This section will allow you to configure how translations are saved and exported.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;