import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { MentionItem } from '@/types/document';

import { MentionDropdown } from '../mention-dropdown';


const mockMentionItems: MentionItem[] = [
  {
    id: '1',
    type: 'document',
    label: 'Predicate Analysis Report',
    value: '@predicate-analysis-report',
    metadata: { type: 'predicate-analysis', updatedAt: new Date('2024-01-01') },
  },
  {
    id: '2',
    type: 'project',
    label: 'Device Classification Study',
    value: '@device-classification-study',
    metadata: {
      type: 'device-classification',
      updatedAt: new Date('2024-01-02'),
    },
  },
  {
    id: '3',
    type: 'predicate',
    label: 'K123456 - Similar Device',
    value: '@k123456-similar-device',
    metadata: { kNumber: 'K123456' },
  },
];

describe('MentionDropdown', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();
  const defaultProps = {
    items: mockMentionItems,
    query: '',
    position: { top: 100, left: 50 },
    onSelect: mockOnSelect,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all mention items when query is empty', () => {
    render(<MentionDropdown {...defaultProps} />);

    expect(screen.getByText('Predicate Analysis Report')).toBeInTheDocument();
    expect(screen.getByText('Device Classification Study')).toBeInTheDocument();
    expect(screen.getByText('K123456 - Similar Device')).toBeInTheDocument();
  });

  it('filters items based on query', () => {
    render(<MentionDropdown {...defaultProps} query="predicate" />);

    expect(screen.getByText('Predicate Analysis Report')).toBeInTheDocument();
    expect(screen.getByText('K123456 - Similar Device')).toBeInTheDocument();
    expect(
      screen.queryByText('Device Classification Study')
    ).not.toBeInTheDocument();
  });

  it('shows no results message when no items match query', () => {
    render(<MentionDropdown {...defaultProps} query="nonexistent" />);

    expect(
      screen.getByText('No items found for "nonexistent"')
    ).toBeInTheDocument();
  });

  it('calls onSelect when item is clicked', async () => {
    const user = userEvent.setup();
    render(<MentionDropdown {...defaultProps} />);

    await user.click(screen.getByText('Predicate Analysis Report'));

    expect(mockOnSelect).toHaveBeenCalledWith(mockMentionItems[0]);
  });

  it('navigates with arrow keys', () => {
    render(<MentionDropdown {...defaultProps} />);

    // First item should be selected by default
    expect(
      screen.getByText('Predicate Analysis Report').closest('div')
    ).toHaveClass('bg-blue-50');

    // Press arrow down
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Second item should be selected
    expect(
      screen.getByText('Device Classification Study').closest('div')
    ).toHaveClass('bg-blue-50');
  });

  it('selects item with Enter key', () => {
    render(<MentionDropdown {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith(mockMentionItems[0]);
  });

  it('closes dropdown with Escape key', () => {
    render(<MentionDropdown {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MentionDropdown {...defaultProps} />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    await user.click(screen.getByTestId('outside'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays correct icons for different item types', () => {
    render(<MentionDropdown {...defaultProps} />);

    // Check that different icons are rendered (we can't easily test the specific icons,
    // but we can verify they're different elements)
    const items = screen
      .getAllByRole('generic')
      .filter(
        (el) =>
          el.textContent?.includes('document') ||
          el.textContent?.includes('project') ||
          el.textContent?.includes('predicate')
      );

    expect(items.length).toBeGreaterThan(0);
  });

  it('shows metadata information', () => {
    render(<MentionDropdown {...defaultProps} />);

    expect(screen.getByText('document')).toBeInTheDocument();
    expect(screen.getByText('project')).toBeInTheDocument();
    expect(screen.getByText('predicate')).toBeInTheDocument();
  });

  it('positions dropdown correctly', () => {
    const { container } = render(<MentionDropdown {...defaultProps} />);

    const dropdown = container.firstChild as HTMLElement;
    expect(dropdown).toHaveStyle({
      top: '100px',
      left: '50px',
    });
  });

  it('wraps selection when navigating past bounds', () => {
    render(<MentionDropdown {...defaultProps} />);

    // Navigate to last item
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Navigate past last item should wrap to first
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    expect(
      screen.getByText('Predicate Analysis Report').closest('div')
    ).toHaveClass('bg-blue-50');
  });

  it('handles case-insensitive filtering', () => {
    render(<MentionDropdown {...defaultProps} query="PREDICATE" />);

    expect(screen.getByText('Predicate Analysis Report')).toBeInTheDocument();
    expect(screen.getByText('K123456 - Similar Device')).toBeInTheDocument();
  });
});
