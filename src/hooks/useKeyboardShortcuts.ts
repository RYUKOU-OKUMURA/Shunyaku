import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description: string;
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
  stopPropagation = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const activeShortcuts = shortcutsRef.current.filter(shortcut =>
      shortcut.enabled !== false
    );

    for (const shortcut of activeShortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const metaMatches = !!event.metaKey === !!shortcut.metaKey;
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
      const altMatches = !!event.altKey === !!shortcut.altKey;
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;

      if (keyMatches && metaMatches && ctrlMatches && altMatches && shiftMatches) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        shortcut.callback();
        return;
      }
    }
  }, [enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

// Helper function to parse keyboard shortcut strings like "Cmd+Option+T"
export function parseShortcutString(shortcut: string): Omit<KeyboardShortcut, 'callback' | 'description'> {
  const parts = shortcut.toLowerCase().split('+').map(part => part.trim());
  const key = parts[parts.length - 1]; // Last part is the key
  const modifiers = parts.slice(0, -1); // Everything else are modifiers

  return {
    key,
    metaKey: modifiers.includes('cmd') || modifiers.includes('meta'),
    ctrlKey: modifiers.includes('ctrl') || modifiers.includes('control'),
    altKey: modifiers.includes('alt') || modifiers.includes('option'),
    shiftKey: modifiers.includes('shift'),
  };
}

// Helper function to format shortcut for display
export function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.metaKey) {
    parts.push('⌘');
  }
  if (shortcut.ctrlKey) {
    parts.push('Ctrl');
  }
  if (shortcut.altKey) {
    parts.push('⌥');
  }
  if (shortcut.shiftKey) {
    parts.push('⇧');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}

// Pre-defined common shortcuts
export const createQuickTranslateShortcut = (callback: () => void): KeyboardShortcut => ({
  key: 't',
  metaKey: true,
  altKey: true,
  callback,
  description: 'Quick translate from clipboard',
});

export const createSettingsShortcut = (callback: () => void): KeyboardShortcut => ({
  key: ',',
  metaKey: true,
  callback,
  description: 'Open settings',
});

export const createToggleFloatingPanelShortcut = (callback: () => void): KeyboardShortcut => ({
  key: 'f',
  metaKey: true,
  shiftKey: true,
  callback,
  description: 'Toggle floating panel',
});

export const createEscapeShortcut = (callback: () => void): KeyboardShortcut => ({
  key: 'Escape',
  callback,
  description: 'Close current modal or panel',
});