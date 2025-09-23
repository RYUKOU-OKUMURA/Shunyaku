import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: '瞬訳アプリ/基本コンポーネント/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'アプリケーション全体で使用される基本的なボタンコンポーネントです。3つのバリエーション（primary、secondary、danger）と3つのサイズ（sm、md、lg）に対応しています。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger'],
      description: 'ボタンの見た目のバリエーション',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'ボタンのサイズ',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'ボタンを無効化するかどうか',
    },
    loading: {
      control: 'boolean',
      description: 'ローディング状態を表示するかどうか',
    },
    onClick: {
      description: 'クリック時のイベントハンドラー',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な使用例
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: '翻訳を開始',
  },
  parameters: {
    docs: {
      description: {
        story: 'プライマリボタンの基本的な表示例です。主要なアクションに使用します。',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'キャンセル',
  },
  parameters: {
    docs: {
      description: {
        story: 'セカンダリボタンの表示例です。副次的なアクションに使用します。',
      },
    },
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: '履歴を削除',
  },
  parameters: {
    docs: {
      description: {
        story: 'デンジャーボタンの表示例です。削除などの注意が必要なアクションに使用します。',
      },
    },
  },
};

// サイズバリエーション
export const Small: Story = {
  args: {
    size: 'sm',
    children: '小さいボタン',
  },
  parameters: {
    docs: {
      description: {
        story: '小サイズのボタンです。コンパクトな場所での使用に適しています。',
      },
    },
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: '大きいボタン',
  },
  parameters: {
    docs: {
      description: {
        story: '大サイズのボタンです。重要なアクションを目立たせる場合に使用します。',
      },
    },
  },
};

// 状態バリエーション
export const Loading: Story = {
  args: {
    loading: true,
    children: '処理中...',
  },
  parameters: {
    docs: {
      description: {
        story: 'ローディング状態のボタンです。非同期処理中に表示されます。',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: '無効化されたボタン',
  },
  parameters: {
    docs: {
      description: {
        story: '無効化されたボタンです。条件が満たされていない場合に表示されます。',
      },
    },
  },
};

// 実際の使用ケース
export const StartTranslation: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: '📸 画像から翻訳を開始',
  },
  parameters: {
    docs: {
      description: {
        story: '実際のアプリケーションで使用される「翻訳開始」ボタンの例です。',
      },
    },
  },
};

export const SaveToFile: Story = {
  args: {
    variant: 'secondary',
    children: '💾 ファイルに保存',
  },
  parameters: {
    docs: {
      description: {
        story: '翻訳結果をファイルに保存するボタンの例です。',
      },
    },
  },
};

export const ClearHistory: Story = {
  args: {
    variant: 'danger',
    size: 'sm',
    children: '🗑️ 履歴をクリア',
  },
  parameters: {
    docs: {
      description: {
        story: '翻訳履歴を削除するボタンの例です。',
      },
    },
  },
};