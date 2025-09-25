/**
 * Storybook stories for TranslationHistorySearch component
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState, useEffect } from 'react'
import TranslationHistorySearch from './TranslationHistorySearch'
import { useHistoryStore } from '../store/useHistoryStore'

const meta: Meta<typeof TranslationHistorySearch> = {
  title: 'Components/TranslationHistorySearch',
  component: TranslationHistorySearch,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof TranslationHistorySearch>

// Mock data setup component
const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize, addTranslation, isInitialized } = useHistoryStore()

  useEffect(() => {
    const setupMockData = async () => {
      if (!isInitialized) {
        await initialize()

        // Add some mock translation history
        await addTranslation(
          'Hello, how are you?',
          'こんにちは、元気ですか？',
          'en',
          'ja'
        )
        await addTranslation(
          'Thank you very much',
          'ありがとうございます',
          'en',
          'ja'
        )
        await addTranslation(
          'Good morning',
          'おはようございます',
          'en',
          'ja'
        )
        await addTranslation(
          'Machine learning is fascinating',
          '機械学習は魅力的です',
          'en',
          'ja'
        )
        await addTranslation(
          'The weather is nice today',
          '今日は天気がいいです',
          'en',
          'ja'
        )
      }
    }

    setupMockData()
  }, [initialize, addTranslation, isInitialized])

  return <>{children}</>
}

export const Default: Story = {
  decorators: [
    (Story) => (
      <MockDataProvider>
        <Story />
      </MockDataProvider>
    ),
  ],
  render: (args) => {
    const [selectedItem, setSelectedItem] = useState<TranslationHistoryItem | null>(null)

    return (
      <div className="space-y-4">
        <TranslationHistorySearch
          {...args}
          onItemSelect={(item) => {
            console.log('Selected item:', item)
            setSelectedItem(item)
          }}
        />
        {selectedItem && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">選択された履歴:</h3>
            <p><strong>原文:</strong> {selectedItem.originalText}</p>
            <p><strong>翻訳:</strong> {selectedItem.translatedText}</p>
            <p><strong>言語:</strong> {selectedItem.sourceLanguage} → {selectedItem.targetLanguage}</p>
          </div>
        )}
      </div>
    )
  },
}

export const CustomPlaceholder: Story = {
  decorators: [
    (Story) => (
      <MockDataProvider>
        <Story />
      </MockDataProvider>
    ),
  ],
  args: {
    placeholder: '翻訳履歴から検索...',
  },
}

export const LimitedResults: Story = {
  decorators: [
    (Story) => (
      <MockDataProvider>
        <Story />
      </MockDataProvider>
    ),
  ],
  args: {
    maxResults: 3,
  },
}

export const MinimalDisplay: Story = {
  decorators: [
    (Story) => (
      <MockDataProvider>
        <Story />
      </MockDataProvider>
    ),
  ],
  args: {
    showTimestamp: false,
    showLanguages: false,
  },
}

export const Loading: Story = {
  render: (args) => (
    <TranslationHistorySearch {...args} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state is automatically handled when the history store is initializing.',
      },
    },
  },
}

export const WithCustomStyling: Story = {
  decorators: [
    (Story) => (
      <MockDataProvider>
        <Story />
      </MockDataProvider>
    ),
  ],
  args: {
    className: 'border-2 border-blue-300 rounded-xl',
  },
  render: (args) => (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-gray-800">翻訳履歴検索</h2>
      <TranslationHistorySearch {...args} />
    </div>
  ),
}