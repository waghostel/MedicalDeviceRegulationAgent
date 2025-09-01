import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('CommandPalette', () => {
  const mockOnClose = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAction.mockClear();
  });

  it('renders when open', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CommandPalette
        isOpen={false}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    expect(screen.queryByText('Command Palette')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('filters commands based on search query', async () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    const searchInput = screen.getByPlaceholderText('Type a command or search...');
    fireEvent.change(searchInput, { target: { value: 'predicate' } });

    await waitFor(() => {
      expect(screen.getByText('Find Similar Predicates')).toBeInTheDocument();
      expect(screen.queryByText('Check Classification')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    const searchInput = screen.getByPlaceholderText('Type a command or search...');

    // Test Escape key
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onAction when command is selected', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    const predicateCommand = screen.getByText('Find Similar Predicates');
    fireEvent.click(predicateCommand);

    expect(mockOnAction).toHaveBeenCalledWith('find-predicates');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows "No commands found" when search has no results', async () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        onAction={mockOnAction}
      />
    );

    const searchInput = screen.getByPlaceholderText('Type a command or search...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No commands found.')).toBeInTheDocument();
    });
  });
});