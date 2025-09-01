import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandCard, SlashCommandGrid } from '../slash-command-card';
import { SlashCommand } from '@/types/copilot';

const mockCommand: SlashCommand = {
  command: '/predicate-search',
  description: 'Find similar predicate devices for 510(k) submissions',
  icon: '🔍',
  category: 'search'
};

const mockCommands: SlashCommand[] = [
  mockCommand,
  {
    command: '/classify-device',
    description: 'Determine device classification and product code',
    icon: '📋',
    category: 'classification'
  },
  {
    command: '/compare-predicate',
    description: 'Compare your device with a specific predicate',
    icon: '⚖️',
    category: 'analysis'
  },
  {
    command: '/find-guidance',
    description: 'Search FDA guidance documents',
    icon: '📚',
    category: 'guidance'
  }
];

describe('SlashCommandCard', () => {
  it('should render command information correctly', () => {
    render(<SlashCommandCard command={mockCommand} />);
    
    expect(screen.getByText('/predicate-search')).toBeInTheDocument();
    expect(screen.getByText('Find similar predicate devices for 510(k) submissions')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('Execute Command')).toBeInTheDocument();
  });

  it('should call onExecute when clicked', () => {
    const mockOnExecute = jest.fn();
    render(<SlashCommandCard command={mockCommand} onExecute={mockOnExecute} />);
    
    const card = screen.getByText('/predicate-search').closest('.cursor-pointer');
    expect(card).toBeInTheDocument();
    
    if (card) {
      fireEvent.click(card);
      expect(mockOnExecute).toHaveBeenCalledWith('/predicate-search');
    }
  });

  it('should call onExecute when button is clicked', () => {
    const mockOnExecute = jest.fn();
    render(<SlashCommandCard command={mockCommand} onExecute={mockOnExecute} />);
    
    const button = screen.getByText('Execute Command');
    fireEvent.click(button);
    expect(mockOnExecute).toHaveBeenCalledWith('/predicate-search');
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnExecute = jest.fn();
    render(<SlashCommandCard command={mockCommand} onExecute={mockOnExecute} disabled={true} />);
    
    const button = screen.getByText('Execute Command');
    expect(button).toBeDisabled();
    
    const card = screen.getByText('/predicate-search').closest('.cursor-pointer');
    if (card) {
      fireEvent.click(card);
      expect(mockOnExecute).not.toHaveBeenCalled();
    }
  });

  it('should apply correct category styling', () => {
    const { rerender } = render(<SlashCommandCard command={mockCommand} />);
    
    // Test search category (blue)
    expect(screen.getByText('search')).toHaveClass('bg-blue-100', 'text-blue-800');
    
    // Test classification category (purple)
    const classificationCommand = { ...mockCommand, category: 'classification' as const };
    rerender(<SlashCommandCard command={classificationCommand} />);
    expect(screen.getByText('classification')).toHaveClass('bg-purple-100', 'text-purple-800');
    
    // Test analysis category (green)
    const analysisCommand = { ...mockCommand, category: 'analysis' as const };
    rerender(<SlashCommandCard command={analysisCommand} />);
    expect(screen.getByText('analysis')).toHaveClass('bg-green-100', 'text-green-800');
    
    // Test guidance category (orange)
    const guidanceCommand = { ...mockCommand, category: 'guidance' as const };
    rerender(<SlashCommandCard command={guidanceCommand} />);
    expect(screen.getByText('guidance')).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('should show hover effects when not disabled', () => {
    render(<SlashCommandCard command={mockCommand} />);
    
    const card = screen.getByText('/predicate-search').closest('.cursor-pointer');
    expect(card).toHaveClass('hover:scale-105');
    expect(card).not.toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should show disabled styling when disabled', () => {
    const { container } = render(<SlashCommandCard command={mockCommand} disabled={true} />);
    
    // The Card component should have the disabled styling
    const cardElement = container.querySelector('[data-slot="card"]');
    expect(cardElement).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(cardElement).not.toHaveClass('hover:scale-105');
  });
});

describe('SlashCommandGrid', () => {
  it('should render all commands in a grid', () => {
    render(<SlashCommandGrid commands={mockCommands} />);
    
    mockCommands.forEach(command => {
      expect(screen.getByText(command.command)).toBeInTheDocument();
      expect(screen.getByText(command.description)).toBeInTheDocument();
    });
  });

  it('should call onExecuteCommand for each command', () => {
    const mockOnExecuteCommand = jest.fn();
    render(<SlashCommandGrid commands={mockCommands} onExecuteCommand={mockOnExecuteCommand} />);
    
    const firstCard = screen.getByText('/predicate-search').closest('.cursor-pointer');
    if (firstCard) {
      fireEvent.click(firstCard);
      expect(mockOnExecuteCommand).toHaveBeenCalledWith('/predicate-search');
    }
    
    const secondCard = screen.getByText('/classify-device').closest('.cursor-pointer');
    if (secondCard) {
      fireEvent.click(secondCard);
      expect(mockOnExecuteCommand).toHaveBeenCalledWith('/classify-device');
    }
  });

  it('should disable all commands when disabled prop is true', () => {
    render(<SlashCommandGrid commands={mockCommands} disabled={true} />);
    
    const buttons = screen.getAllByText('Execute Command');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should render in responsive grid layout', () => {
    const { container } = render(<SlashCommandGrid commands={mockCommands} />);
    
    const grid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.gap-4');
    expect(grid).toBeInTheDocument();
  });

  it('should handle empty commands array', () => {
    render(<SlashCommandGrid commands={[]} />);
    
    // Should render empty grid without errors
    const grid = document.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid?.children).toHaveLength(0);
  });
});