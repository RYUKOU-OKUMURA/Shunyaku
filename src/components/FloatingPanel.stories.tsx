import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import FloatingPanel from './FloatingPanel';

const meta = {
  title: 'Components/FloatingPanel',
  component: FloatingPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    visible: { control: 'boolean' },
    content: { control: 'text' },
    position: { control: 'object' },
  },
} satisfies Meta<typeof FloatingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const FloatingPanelWithState = (args: any) => {
  const [visible, setVisible] = useState(args.visible);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Floating Panel Demo</h2>
        <p className="text-gray-600 mb-4">
          Click the button below to open the floating panel. You can drag it around by its header
          and resize it using the handle in the bottom-right corner.
        </p>
        <button
          onClick={() => setVisible(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Open Floating Panel
        </button>
      </div>

      <FloatingPanel
        {...args}
        visible={visible}
        onClose={() => setVisible(false)}
        onSave={() => alert('Translation saved!')}
      />
    </div>
  );
};

export const Default: Story = {
  render: FloatingPanelWithState,
  args: {
    visible: false,
    content: 'This is a sample translated text that appears in the floating panel. You can drag this panel around the screen and resize it as needed.',
    position: { x: 200, y: 150 },
    onClose: () => console.log('Panel closed'),
    onSave: () => console.log('Translation saved'),
  },
};

export const LongContent: Story = {
  render: FloatingPanelWithState,
  args: {
    visible: false,
    content: `This is a much longer translation result to demonstrate how the floating panel handles extensive content.

The panel includes proper scrolling behavior when the content exceeds the available space. This ensures that users can always access all of the translated text, even in complex documents.

Features demonstrated:
- Draggable by header
- Resizable from bottom-right corner
- Copy to clipboard functionality
- Save functionality
- Keyboard shortcut support (ESC to close)
- Proper text overflow handling

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    position: { x: 100, y: 100 },
    onClose: () => console.log('Panel closed'),
    onSave: () => console.log('Translation saved'),
  },
};

export const JapaneseContent: Story = {
  render: FloatingPanelWithState,
  args: {
    visible: false,
    content: `こんにちは、これは日本語の翻訳結果のサンプルです。

フローティングパネルは以下の機能を提供します：
- ヘッダーによるドラッグ移動
- 右下角からのリサイズ
- クリップボードへのコピー
- 保存機能
- キーボードショートカット（ESC で閉じる）

このパネルは、翻訳アプリケーションのメイン機能の一部として、ユーザーが翻訳結果を便利に表示・操作できるように設計されています。

パネルは画面内に留まるように制約され、使いやすいユーザーインターフェースを提供します。`,
    position: { x: 150, y: 100 },
    onClose: () => console.log('Panel closed'),
    onSave: () => console.log('Translation saved'),
  },
};

export const AlwaysVisible: Story = {
  args: {
    visible: true,
    content: 'This floating panel is always visible for demonstration purposes.',
    position: { x: 300, y: 200 },
    onClose: () => console.log('Close clicked'),
    onSave: () => console.log('Save clicked'),
  },
};