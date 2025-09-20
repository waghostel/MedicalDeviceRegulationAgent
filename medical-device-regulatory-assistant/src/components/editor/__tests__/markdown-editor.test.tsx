import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { Document, MentionItem } from '@/types/document';

import { MarkdownEditor } from '../markdown-editor';


// Mock the dynamic import
jest.mock('next/dynamic', () => function mockDynamic(importFunc: any) {
    const MockedComponent = React.forwardRef<any, any>((props, ref) => {
      const { value, onChange, textareaProps } = props;
      return (
        <div data-testid="md-editor">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            {...textareaProps}
            data-testid="md-editor-textarea"
          />
        </div>
      );
    });
    MockedComponent.displayName = 'MockedMDEditor';
    return MockedComponent;
  });

const mockDocument: Document = {
  id: '1',
  name: 'Test Document',
  content: '# Test Content\n\nThis is a test document.',
  type: 'general-note',
  projectId: 'project-1',
  isFolder: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockMentionItems: MentionItem[] = [
  {
    id: '1',
    type: 'document',
    label: 'Predicate Analysis',
    value: '@predicate-analysis',
    metadata: { type: 'predicate-analysis' },
  },
  {
    id: '2',
    type: 'project',
    label: 'Device Classification',
    value: '@device-classification',
    metadata: { type: 'device-classification' },
  },
];

describe('MarkdownEditor', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the editor with document content', () => {
    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    expect(screen.getByTestId('md-editor-textarea')).toHaveValue(
      mockDocument.content
    );
    expect(screen.getByText(mockDocument.name)).toBeInTheDocument();
  });

  it('shows document metadata in header', () => {
    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('general note')).toBeInTheDocument();
  });

  it('updates content when typing', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.clear(textarea);
    await user.type(textarea, 'New content');

    expect(textarea).toHaveValue('New content');
  });

  it('shows unsaved changes indicator when content changes', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.type(textarea, ' Additional text');

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);

    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.type(textarea, ' Modified');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        `${mockDocument.content  } Modified`
      );
    });
  });

  it('shows character, line, and word count', () => {
    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    expect(screen.getByText(/\d+ characters/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ lines/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ words/)).toBeInTheDocument();
  });

  it('shows save error when save fails', async () => {
    const user = userEvent.setup();
    mockOnSave.mockRejectedValue(new Error('Save failed'));

    render(
      <MarkdownEditor
        document={mockDocument}
        onSave={mockOnSave}
        mentionItems={mockMentionItems}
      />
    );

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.type(textarea, ' Modified');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  describe('Auto-save functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-saves after delay when content changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      mockOnSave.mockResolvedValue(undefined);

      render(
        <MarkdownEditor
          document={mockDocument}
          onSave={mockOnSave}
          mentionItems={mockMentionItems}
        />
      );

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, ' Auto-save test');

      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          `${mockDocument.content  } Auto-save test`
        );
      });
    });

    it('does not auto-save if content has not changed', () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <MarkdownEditor
          document={mockDocument}
          onSave={mockOnSave}
          mentionItems={mockMentionItems}
        />
      );

      // Fast-forward time
      jest.advanceTimersByTime(3000);

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});
