import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import SettingsModal from './SettingsModal';
import { AppSettings } from '../types';

const meta = {
  title: 'Components/SettingsModal',
  component: SettingsModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SettingsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSettings: AppSettings = {
  ocr: {
    language: 'eng+jpn',
    psm: 3,
    oem: 1,
    preprocessingEnabled: true,
    confidenceThreshold: 0.6,
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

const SettingsModalDemo = (args: any) => {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Settings Modal Demo</h2>
        <p className="text-gray-600 mb-4">
          Click the button below to open the settings modal. The modal includes multiple tabs
          for different categories of settings.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Open Settings
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Settings Preview</h3>
          <div className="text-sm space-y-1 text-gray-700">
            <div>Theme: {settings.ui.theme}</div>
            <div>OCR Language: {settings.ocr.language}</div>
            <div>Default Target: {settings.translation.defaultTargetLang}</div>
            <div>Quick Translate: {settings.hotkeys.quickTranslate}</div>
            <div>Floating Panel: {settings.ui.floatingPanelEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={settings}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: SettingsModalDemo,
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
    settings: defaultSettings,
    onSettingsChange: (settings) => console.log('Settings changed:', settings),
  },
};

export const AlwaysOpen: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Settings modal closed'),
    settings: defaultSettings,
    onSettingsChange: (settings) => console.log('Settings changed:', settings),
  },
};

export const WithCustomSettings: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Settings modal closed'),
    settings: {
      ...defaultSettings,
      ui: {
        ...defaultSettings.ui,
        theme: 'dark',
        floatingPanelEnabled: false,
        maxHistoryItems: 100,
      },
      translation: {
        ...defaultSettings.translation,
        apiKey: 'demo-api-key-***********',
        defaultSourceLang: 'en',
        defaultTargetLang: 'fr',
        formality: 'formal',
      },
      hotkeys: {
        quickTranslate: 'Ctrl+Alt+T',
        toggleFloatingPanel: 'Ctrl+Shift+F',
        openSettings: 'Ctrl+,',
      },
    },
    onSettingsChange: (settings) => console.log('Settings changed:', settings),
  },
};