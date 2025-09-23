import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DropZone } from './DropZone';

const meta: Meta<typeof DropZone> = {
  title: '瞬訳アプリ/機能コンポーネント/DropZone',
  component: DropZone,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ファイルのドラッグ&ドロップ機能を提供するコンポーネントです。画像ファイル（PNG、JPG、JPEG）とPDFファイルに対応しています。ファイル形式やサイズの検証機能も含まれています。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    acceptedFormats: {
      control: { type: 'check' },
      options: ['png', 'jpg', 'jpeg', 'pdf'],
      description: '受け入れるファイル形式',
      table: {
        defaultValue: { summary: "['png', 'jpg', 'jpeg', 'pdf']" },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'ドロップゾーンを無効化するかどうか',
    },
    onImageDrop: {
      description: 'ファイルがドロップされた時のコールバック関数',
    },
  },
  args: {
    onImageDrop: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な使用例
export const Default: Story = {
  args: {
    acceptedFormats: ['png', 'jpg', 'jpeg', 'pdf'],
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルトのドロップゾーンです。すべてのサポートされているファイル形式を受け入れます。',
      },
    },
  },
};

// 画像のみ対応
export const ImageOnly: Story = {
  args: {
    acceptedFormats: ['png', 'jpg', 'jpeg'],
  },
  parameters: {
    docs: {
      description: {
        story: '画像ファイルのみを受け入れるドロップゾーンです。',
      },
    },
  },
};

// PDFのみ対応
export const PDFOnly: Story = {
  args: {
    acceptedFormats: ['pdf'],
  },
  parameters: {
    docs: {
      description: {
        story: 'PDFファイルのみを受け入れるドロップゾーンです。',
      },
    },
  },
};

// 無効化状態
export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: '無効化されたドロップゾーンです。ファイルの選択やドロップができません。',
      },
    },
  },
};

// カスタム内容
export const CustomContent: Story = {
  args: {
    children: (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="text-6xl">🔍</div>
        <div className="text-xl font-bold text-blue-600">
          OCR処理用の画像をアップロード
        </div>
        <div className="text-sm text-gray-600">
          テキストを抽出したい画像ファイルを選択してください
        </div>
        <div className="px-4 py-2 bg-blue-100 rounded-md text-blue-800 text-xs">
          最大ファイルサイズ: 10MB
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'カスタムコンテンツを表示するドロップゾーンの例です。用途に応じてメッセージや見た目をカスタマイズできます。',
      },
    },
  },
};

// 小さいサイズ
export const Compact: Story = {
  args: {
    className: 'min-h-32',
    children: (
      <div className="flex items-center justify-center space-x-2">
        <span className="text-2xl">📁</span>
        <span className="text-sm font-medium">ファイルを選択</span>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'コンパクトなサイズのドロップゾーンです。スペースが限られた場所での使用に適しています。',
      },
    },
  },
};

// 実際の使用ケース例
export const TranslationWorkflow: Story = {
  args: {
    acceptedFormats: ['png', 'jpg', 'jpeg'],
    children: (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="text-5xl">🌐</div>
        <div className="text-lg font-semibold text-gray-800">
          翻訳したい画像をアップロード
        </div>
        <div className="text-sm text-gray-600 text-center max-w-xs">
          スクリーンショットや写真から自動でテキストを抽出し、翻訳します
        </div>
        <div className="flex space-x-2 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
          <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
          <span className="px-2 py-1 bg-gray-100 rounded">JPEG</span>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '実際の翻訳ワークフローで使用されるドロップゾーンの例です。',
      },
    },
  },
};