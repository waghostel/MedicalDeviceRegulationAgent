'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Document, MentionItem } from '@/types/document';
import { useAutoSave } from '@/hooks/use-auto-save';
import { MentionDropdown } from './mention-dropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, FileText, Clock, AlertCircle } from 'lucide-react';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  document: Document;
  onSave: (content: string) => Promise<void>;
  mentionItems: MentionItem[];
  className?: string;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  cursorPosition: number;
}

export function MarkdownEditor({
  document,
  onSave,
  mentionItems,
  className = '',
}: MarkdownEditorProps) {
  const [content, setContent] = useState(document.content);
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    position: { top: 0, left: 0 },
    cursorPosition: 0,
  });
  const [lastSaved, setLastSaved] = useState<Date>(document.updatedAt);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save functionality
  const { saveNow, isSaving } = useAutoSave(content, {
    onSave: async (newContent) => {
      try {
        await onSave(newContent);
        setLastSaved(new Date());
        setSaveError(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Save failed');
        throw error;
      }
    },
    enabled: content !== document.content,
  });

  // Handle @ mention detection
  const handleEditorChange = useCallback((value?: string) => {
    if (value === undefined) return;

    setContent(value);

    // Check for @ mentions
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const mentionStart = cursorPosition - mentionMatch[0].length;

      // Calculate position for dropdown
      const rect = textarea.getBoundingClientRect();
      const lineHeight = 20; // Approximate line height
      const lines = textBeforeCursor.split('\n').length - 1;

      setMentionState({
        isOpen: true,
        query,
        position: {
          top: rect.top + lines * lineHeight + 25,
          left: rect.left + 10,
        },
        cursorPosition: mentionStart,
      });
    } else {
      setMentionState((prev) => ({ ...prev, isOpen: false }));
    }
  }, []);

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (item: MentionItem) => {
      const beforeMention = content.substring(0, mentionState.cursorPosition);
      const afterMention = content.substring(
        mentionState.cursorPosition + mentionState.query.length + 1
      );
      const newContent = `${beforeMention}[${item.label}](${item.value})${afterMention}`;

      setContent(newContent);
      setMentionState((prev) => ({ ...prev, isOpen: false }));
    },
    [content, mentionState]
  );

  // Handle manual save
  const handleManualSave = useCallback(async () => {
    try {
      await saveNow();
    } catch (error) {
      // Error is already handled in auto-save hook
    }
  }, [saveNow]);

  // Update content when document changes
  useEffect(() => {
    setContent(document.content);
    setLastSaved(document.updatedAt);
  }, [document]);

  const hasUnsavedChanges = content !== document.content;
  const timeSinceLastSave = Math.floor(
    (Date.now() - lastSaved.getTime()) / 1000
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-sm">{document.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {isSaving ? (
                <span>Saving...</span>
              ) : hasUnsavedChanges ? (
                <span>Unsaved changes</span>
              ) : (
                <span>
                  Saved{' '}
                  {timeSinceLastSave < 60
                    ? 'just now'
                    : `${Math.floor(timeSinceLastSave / 60)}m ago`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveError && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Save failed</span>
            </div>
          )}

          <Badge variant={document.type === 'folder' ? 'secondary' : 'default'}>
            {document.type.replace('-', ' ')}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative" ref={editorRef}>
        <MDEditor
          value={content}
          onChange={handleEditorChange}
          preview="edit"
          hideToolbar={false}
          visibleDragBar={false}
          textareaProps={{
            ref: textareaRef,
            placeholder:
              'Start typing... Use @ to mention documents, projects, or other resources.',
            style: {
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            },
          }}
          height={400}
          data-color-mode="light"
        />

        {/* Mention Dropdown */}
        {mentionState.isOpen && (
          <MentionDropdown
            items={mentionItems}
            query={mentionState.query}
            position={mentionState.position}
            onSelect={handleMentionSelect}
            onClose={() =>
              setMentionState((prev) => ({ ...prev, isOpen: false }))
            }
          />
        )}
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
          <span>
            {content.split(/\s+/).filter((word) => word.length > 0).length}{' '}
            words
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Markdown</span>
          {hasUnsavedChanges && (
            <div
              className="w-2 h-2 bg-orange-400 rounded-full"
              title="Unsaved changes"
            />
          )}
        </div>
      </div>
    </div>
  );
}
