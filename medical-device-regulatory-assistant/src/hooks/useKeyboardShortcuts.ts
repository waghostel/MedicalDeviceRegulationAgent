'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;

        if (
          keyMatches &&
          ctrlMatches &&
          shiftMatches &&
          altMatches &&
          metaMatches
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
};

// Predefined shortcuts for the regulatory assistant
export const createRegulatoryShortcuts = (actions: {
  openCommandPalette: () => void;
  findPredicates: () => void;
  checkClassification: () => void;
  generateChecklist: () => void;
  exportReport: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'k',
    ctrlKey: true,
    action: actions.openCommandPalette,
    description: 'Open command palette',
  },
  {
    key: 'p',
    ctrlKey: true,
    action: actions.findPredicates,
    description: 'Find similar predicates',
  },
  {
    key: 'c',
    ctrlKey: true,
    action: actions.checkClassification,
    description: 'Check device classification',
  },
  {
    key: 'l',
    ctrlKey: true,
    action: actions.generateChecklist,
    description: 'Generate submission checklist',
  },
  {
    key: 'e',
    ctrlKey: true,
    action: actions.exportReport,
    description: 'Export current report',
  },
];
