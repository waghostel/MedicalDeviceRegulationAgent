import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionsToolbar } from '../QuickActionsToolbar';

describe('QuickActionsToolbar', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('renders all quick action buttons', () => {
    render(<QuickActionsToolbar onAction={mockOnAction} />);

    expect(screen.getByText('Find Similar Predicates')).toBeInTheDocument();
    expect(screen.getByText('Check Classification')).toBeInTheDocument();
    expect(screen.getByText('Generate Checklist')).toBeInTheDocument();
    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  it('calls onAction when buttons are clicked', () => {
    render(<QuickActionsToolbar onAction={mockOnAction} />);

    fireEvent.click(screen.getByText('Find Similar Predicates'));
    expect(mockOnAction).toHaveBeenCalledWith('find-predicates');

    fireEvent.click(screen.getByText('Check Classification'));
    expect(mockOnAction).toHaveBeenCalledWith('check-classification');

    fireEvent.click(screen.getByText('Generate Checklist'));
    expect(mockOnAction).toHaveBeenCalledWith('generate-checklist');

    fireEvent.click(screen.getByText('Export Report'));
    expect(mockOnAction).toHaveBeenCalledWith('export-report');
  });

  it('displays keyboard shortcuts on desktop', () => {
    render(<QuickActionsToolbar onAction={mockOnAction} />);

    expect(screen.getByText('Ctrl+P')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+C')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+L')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+E')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <QuickActionsToolbar onAction={mockOnAction} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
