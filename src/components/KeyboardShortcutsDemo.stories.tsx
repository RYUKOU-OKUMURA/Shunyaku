import type { Meta, StoryObj } from '@storybook/react';
import KeyboardShortcutsDemo from './KeyboardShortcutsDemo';

const meta = {
  title: 'Components/KeyboardShortcutsDemo',
  component: KeyboardShortcutsDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Keyboard Shortcuts Demo

This component demonstrates the keyboard shortcuts system implemented for the translation app.

## Available Shortcuts

- **⌘ + ⌥ + T**: Quick translate from clipboard
- **⌘ + ,**: Open settings modal
- **⌘ + ⇧ + F**: Toggle floating panel
- **Escape**: Close current modal or panel

## Features

- Global keyboard shortcuts using React hooks
- Customizable shortcut combinations
- Enable/disable shortcuts functionality
- Visual feedback through toasts
- Integration with all major UI components

## Testing Instructions

1. Enable shortcuts using the checkbox
2. Try each keyboard combination
3. Watch for toast notifications and UI changes
4. Use Escape to close modals/panels
5. Toggle shortcuts on/off to test behavior

## Implementation Details

The shortcuts system uses:
- Custom \`useKeyboardShortcuts\` hook
- Event listener management
- Modifier key detection (⌘, ⌥, ⇧, Ctrl)
- Shortcut parsing and formatting utilities
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KeyboardShortcutsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: `
The main keyboard shortcuts demo showing all available shortcuts and their functionality.

Try these shortcuts:
- ⌘+⌥+T for quick translate
- ⌘+, for settings
- ⌘+⇧+F for floating panel
- Escape to close modals
        `,
      },
    },
  },
};