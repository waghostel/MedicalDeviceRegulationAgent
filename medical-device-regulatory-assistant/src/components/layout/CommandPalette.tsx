'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Search,
  BarChart3,
  FileText,
  Download,
  FolderOpen,
  MessageSquare,
  Home,
  Settings,
  Command,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  category: 'actions' | 'navigation' | 'tools';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Quick Actions
    {
      id: 'find-predicates',
      label: 'Find Similar Predicates',
      description: 'Search for predicate devices',
      icon: Search,
      shortcut: 'Ctrl+P',
      category: 'actions',
      action: () => handleCommand('find-predicates'),
    },
    {
      id: 'check-classification',
      label: 'Check Classification',
      description: 'Determine device classification',
      icon: BarChart3,
      shortcut: 'Ctrl+C',
      category: 'actions',
      action: () => handleCommand('check-classification'),
    },
    {
      id: 'generate-checklist',
      label: 'Generate Checklist',
      description: 'Create submission checklist',
      icon: FileText,
      shortcut: 'Ctrl+L',
      category: 'actions',
      action: () => handleCommand('generate-checklist'),
    },
    {
      id: 'export-report',
      label: 'Export Report',
      description: 'Export current analysis',
      icon: Download,
      shortcut: 'Ctrl+E',
      category: 'actions',
      action: () => handleCommand('export-report'),
    },
    // Navigation
    {
      id: 'go-home',
      label: 'Go to Dashboard',
      description: 'Navigate to main dashboard',
      icon: Home,
      category: 'navigation',
      action: () => window.location.href = '/',
    },
    {
      id: 'go-projects',
      label: 'Go to Projects',
      description: 'Navigate to projects page',
      icon: FolderOpen,
      category: 'navigation',
      action: () => window.location.href = '/projects',
    },
    {
      id: 'go-agent',
      label: 'Go to Agent Workflow',
      description: 'Navigate to agent workflow page',
      icon: MessageSquare,
      category: 'navigation',
      action: () => window.location.href = '/agent',
    },
    {
      id: 'go-settings',
      label: 'Go to Settings',
      description: 'Navigate to settings page',
      icon: Settings,
      category: 'navigation',
      action: () => window.location.href = '/settings',
    },
  ];

  const filteredCommands = commands.filter(
    (command) =>
      command.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      command.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCommand = (commandId: string) => {
    onAction?.(commandId);
    onClose();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Command className="h-4 w-4" />
            <span className="text-lg font-semibold">Command Palette</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type a command or search..."
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors',
                    index === selectedIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                  onClick={command.action}
                >
                  <command.icon className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{command.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {command.description}
                    </div>
                  </div>
                  {command.shortcut && (
                    <div className="text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </div>
    </div>
  );
};