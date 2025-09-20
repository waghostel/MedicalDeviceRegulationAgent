'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Keyboard,
  Search,
  Plus,
  Save,
  Copy,
  FileText,
  Home,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Keyboard shortcut definitions
export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'editor' | 'search' | 'accessibility';
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  isShortcutsDialogOpen: boolean;
  openShortcutsDialog: () => void;
  closeShortcutsDialog: () => void;
}

const KeyboardShortcutsContext =
  React.createContext<KeyboardShortcutsContextType | null>(null);

export const useKeyboardShortcuts = () => {
  const context = React.useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      'useKeyboardShortcuts must be used within KeyboardShortcutsProvider'
    );
  }
  return context;
};

// Default shortcuts
const defaultShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
  // Navigation
  {
    id: 'go-home',
    keys: ['Alt', 'H'],
    description: 'Go to dashboard',
    category: 'navigation',
    icon: Home,
  },
  {
    id: 'open-search',
    keys: ['Ctrl', 'K'],
    description: 'Open command palette',
    category: 'search',
    icon: Search,
  },
  {
    id: 'new-project',
    keys: ['Ctrl', 'N'],
    description: 'Create new project',
    category: 'actions',
    icon: Plus,
  },

  // Actions
  {
    id: 'save',
    keys: ['Ctrl', 'S'],
    description: 'Save current document',
    category: 'actions',
    icon: Save,
  },
  {
    id: 'copy-citation',
    keys: ['Ctrl', 'Shift', 'C'],
    description: 'Copy citation to clipboard',
    category: 'actions',
    icon: Copy,
  },
  {
    id: 'export-report',
    keys: ['Ctrl', 'E'],
    description: 'Export current report',
    category: 'actions',
    icon: FileText,
  },

  // Editor
  {
    id: 'bold',
    keys: ['Ctrl', 'B'],
    description: 'Bold text',
    category: 'editor',
  },
  {
    id: 'italic',
    keys: ['Ctrl', 'I'],
    description: 'Italic text',
    category: 'editor',
  },
  {
    id: 'find-in-document',
    keys: ['Ctrl', 'F'],
    description: 'Find in document',
    category: 'editor',
    icon: Search,
  },

  // Accessibility
  {
    id: 'skip-to-content',
    keys: ['Alt', 'S'],
    description: 'Skip to main content',
    category: 'accessibility',
  },
  {
    id: 'focus-search',
    keys: ['Alt', 'F'],
    description: 'Focus search input',
    category: 'accessibility',
  },
  {
    id: 'show-shortcuts',
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'accessibility',
    icon: Keyboard,
  },
];

export const KeyboardShortcutsProvider: React.FC<{
  children: React.ReactNode;
  onNavigateHome?: () => void;
  onOpenSearch?: () => void;
  onNewProject?: () => void;
  onSave?: () => void;
  onCopyCitation?: () => void;
  onExportReport?: () => void;
}> = ({
  children,
  onNavigateHome,
  onOpenSearch,
  onNewProject,
  onSave,
  onCopyCitation,
  onExportReport,
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);

  // Initialize default shortcuts with actions
  useEffect(() => {
    const shortcutsWithActions: KeyboardShortcut[] = defaultShortcuts.map(
      (shortcut) => ({
        ...shortcut,
        action: () => {
          switch (shortcut.id) {
            case 'go-home':
              onNavigateHome?.();
              break;
            case 'open-search':
              onOpenSearch?.();
              break;
            case 'new-project':
              onNewProject?.();
              break;
            case 'save':
              onSave?.();
              break;
            case 'copy-citation':
              onCopyCitation?.();
              break;
            case 'export-report':
              onExportReport?.();
              break;
            case 'show-shortcuts':
              setIsShortcutsDialogOpen(true);
              break;
            case 'skip-to-content':
              const mainContent = document.getElementById('main-content');
              mainContent?.focus();
              break;
            case 'focus-search':
              const searchInput = document.querySelector(
                '[data-search-input]'
              ) as HTMLElement;
              searchInput?.focus();
              break;
            default:
              console.log(`Shortcut ${shortcut.id} triggered`);
          }
        },
      })
    );

    setShortcuts(shortcutsWithActions);
  }, [
    onNavigateHome,
    onOpenSearch,
    onNewProject,
    onSave,
    onCopyCitation,
    onExportReport,
  ]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [
      ...prev.filter((s) => s.id !== shortcut.id),
      shortcut,
    ]);
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        // Allow some shortcuts even in inputs
        if (
          !['Ctrl+K', 'Alt+H', '?'].some((combo) => {
            const keys = combo.split('+');
            return keys.every((key) => {
              if (key === 'Ctrl') return event.ctrlKey;
              if (key === 'Alt') return event.altKey;
              if (key === 'Shift') return event.shiftKey;
              return event.key === key || event.key === key.toLowerCase();
            });
          })
        ) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        const matches = shortcut.keys.every((key) => {
          if (key === 'Ctrl') return event.ctrlKey;
          if (key === 'Alt') return event.altKey;
          if (key === 'Shift') return event.shiftKey;
          if (key === 'Meta') return event.metaKey;
          return event.key === key || event.key === key.toLowerCase();
        });

        if (matches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value: KeyboardShortcutsContextType = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    isShortcutsDialogOpen,
    openShortcutsDialog: () => setIsShortcutsDialogOpen(true),
    closeShortcutsDialog: () => setIsShortcutsDialogOpen(false),
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <KeyboardShortcutsDialog />
    </KeyboardShortcutsContext.Provider>
  );
};

// Keyboard shortcuts dialog
const KeyboardShortcutsDialog: React.FC = () => {
  const { shortcuts, isShortcutsDialogOpen, closeShortcutsDialog } =
    useKeyboardShortcuts();

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    editor: 'Editor',
    search: 'Search',
    accessibility: 'Accessibility',
  };

  return (
    <Dialog open={isShortcutsDialogOpen} onOpenChange={closeShortcutsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(
            ([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">
                  {categoryLabels[category as keyof typeof categoryLabels] ||
                    category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon && (
                          <shortcut.icon className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <React.Fragment key={key}>
                            {index > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {key}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(groupedShortcuts).indexOf(category) <
                  Object.keys(groupedShortcuts).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            )
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={closeShortcutsDialog}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Key combination display component
export const KeyCombo: React.FC<{ keys: string[]; className?: string }> = ({
  keys,
  className,
}) => (
  <div className={cn('flex items-center gap-1', className)}>
    {keys.map((key, index) => (
      <React.Fragment key={key}>
        {index > 0 && <span className="text-xs text-muted-foreground">+</span>}
        <Badge variant="outline" className="text-xs font-mono">
          {key}
        </Badge>
      </React.Fragment>
    ))}
  </div>
);

// Skip link component for accessibility
export const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
  >
    Skip to main content
  </a>
);
