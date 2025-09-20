/**
 * Unit tests for QuickActionsToolbar component
 * Tests quick action buttons, keyboard shortcuts, and callback handling
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { QuickActionsToolbar } from '../QuickActionsToolbar';

describe('QuickActionsToolbar Component', () => {
  const mockSession = createMockSession();
  const defaultProps = {
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders toolbar with title and lightning icon', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();

      // Should show lightning icon
      const lightningIcon = document.querySelector('[data-lucide="zap"]');
      expect(lightningIcon).toBeInTheDocument();
    });

    it('renders all quick action buttons', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      expect(
        screen.getByRole('button', { name: /find similar predicates/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /check classification/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /generate checklist/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /export report/i })
      ).toBeInTheDocument();
    });

    it('displays action icons correctly', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      // Check for specific Lucide icons
      expect(
        document.querySelector('[data-lucide="search"]')
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-lucide="bar-chart-3"]')
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-lucide="file-text"]')
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-lucide="download"]')
      ).toBeInTheDocument();
    });
  });

  describe('Action Button Interactions', () => {
    it('calls onAction with correct action ID when find predicates button is clicked', () => {
      const mockOnAction = jest.fn();
      renderWithProviders(<QuickActionsToolbar onAction={mockOnAction} />, {
        session: mockSession,
      });

      const findPredicatesButton = screen.getByRole('button', {
        name: /find similar predicates/i,
      });
      fireEvent.click(findPredicatesButton);

      expect(mockOnAction).toHaveBeenCalledWith('find-predicates');
    });

    it('calls onAction with correct action ID when check classification button is clicked', () => {
      const mockOnAction = jest.fn();
      renderWithProviders(<QuickActionsToolbar onAction={mockOnAction} />, {
        session: mockSession,
      });

      const checkClassificationButton = screen.getByRole('button', {
        name: /check classification/i,
      });
      fireEvent.click(checkClassificationButton);

      expect(mockOnAction).toHaveBeenCalledWith('check-classification');
    });

    it('calls onAction with correct action ID when generate checklist button is clicked', () => {
      const mockOnAction = jest.fn();
      renderWithProviders(<QuickActionsToolbar onAction={mockOnAction} />, {
        session: mockSession,
      });

      const generateChecklistButton = screen.getByRole('button', {
        name: /generate checklist/i,
      });
      fireEvent.click(generateChecklistButton);

      expect(mockOnAction).toHaveBeenCalledWith('generate-checklist');
    });

    it('calls onAction with correct action ID when export report button is clicked', () => {
      const mockOnAction = jest.fn();
      renderWithProviders(<QuickActionsToolbar onAction={mockOnAction} />, {
        session: mockSession,
      });

      const exportReportButton = screen.getByRole('button', {
        name: /export report/i,
      });
      fireEvent.click(exportReportButton);

      expect(mockOnAction).toHaveBeenCalledWith('export-report');
    });
  });

  describe('Keyboard Shortcuts Display', () => {
    it('displays keyboard shortcuts on medium and larger screens', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Ctrl+P')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+C')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+L')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+E')).toBeInTheDocument();
    });

    it('applies correct responsive classes for keyboard shortcuts', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const shortcutBadges = screen.getAllByText(/Ctrl\+[PCLE]/);
      shortcutBadges.forEach((badge) => {
        expect(badge).toHaveClass('hidden', 'md:inline');
      });
    });
  });

  describe('Responsive Design', () => {
    it('hides action labels on small screens', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const actionLabels = [
        screen.getByText('Find Similar Predicates'),
        screen.getByText('Check Classification'),
        screen.getByText('Generate Checklist'),
        screen.getByText('Export Report'),
      ];

      actionLabels.forEach((label) => {
        expect(label).toHaveClass('hidden', 'sm:inline');
      });
    });

    it('shows tooltips on small screens for action descriptions', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      // Check for tooltip containers
      const tooltips = document.querySelectorAll('.group-hover\\:opacity-100');
      expect(tooltips.length).toBeGreaterThan(0);

      // Check tooltip content
      expect(
        screen.getByText('Search for predicate devices')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Determine device classification')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Create submission checklist')
      ).toBeInTheDocument();
      expect(screen.getByText('Export current analysis')).toBeInTheDocument();
    });

    it('applies correct responsive classes for tooltips', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const tooltipElements = document.querySelectorAll('.sm\\:hidden');
      expect(tooltipElements.length).toBeGreaterThan(0);
    });
  });

  describe('Button Styling', () => {
    it('applies correct button styling classes', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const buttons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent?.includes('Find') ||
            btn.textContent?.includes('Check') ||
            btn.textContent?.includes('Generate') ||
            btn.textContent?.includes('Export')
        );

      buttons.forEach((button) => {
        expect(button).toHaveClass('hover:bg-primary/10');
      });
    });

    it('displays badge styling for keyboard shortcuts', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const shortcutBadges = screen.getAllByText(/Ctrl\+[PCLE]/);
      shortcutBadges.forEach((badge) => {
        expect(badge.closest('.badge')).toBeInTheDocument();
      });
    });
  });

  describe('Layout and Container', () => {
    it('applies correct container classes', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const toolbar = document.querySelector('.bg-background.border-b');
      expect(toolbar).toBeInTheDocument();

      const container = document.querySelector('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-2');
    });

    it('uses flexbox layout for proper alignment', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const flexContainer = document.querySelector(
        '.flex.items-center.justify-between'
      );
      expect(flexContainer).toBeInTheDocument();

      const actionContainer = document.querySelector(
        '.flex.items-center.space-x-2'
      );
      expect(actionContainer).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-toolbar-class';
      renderWithProviders(
        <QuickActionsToolbar {...defaultProps} className={customClass} />,
        { session: mockSession }
      );

      const toolbar = document.querySelector(`.${customClass}`);
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles and labels', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check that action buttons have accessible names
      expect(
        screen.getByRole('button', { name: /find similar predicates/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /check classification/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /generate checklist/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /export report/i })
      ).toBeInTheDocument();
    });

    it('provides keyboard navigation support', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      const buttons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent?.includes('Find') ||
            btn.textContent?.includes('Check') ||
            btn.textContent?.includes('Generate') ||
            btn.textContent?.includes('Export')
        );

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });

    it('has proper semantic structure', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      // Should have proper heading for the toolbar section
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing onAction prop gracefully', () => {
      renderWithProviders(<QuickActionsToolbar />, { session: mockSession });

      const findPredicatesButton = screen.getByRole('button', {
        name: /find similar predicates/i,
      });

      expect(() => {
        fireEvent.click(findPredicatesButton);
      }).not.toThrow();
    });

    it('renders without crashing when no props are provided', () => {
      expect(() => {
        renderWithProviders(<QuickActionsToolbar />, { session: mockSession });
      }).not.toThrow();

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Action Configuration', () => {
    it('displays all configured quick actions', () => {
      renderWithProviders(<QuickActionsToolbar {...defaultProps} />, {
        session: mockSession,
      });

      // Verify all 4 quick actions are rendered
      const actionButtons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent?.includes('Find') ||
            btn.textContent?.includes('Check') ||
            btn.textContent?.includes('Generate') ||
            btn.textContent?.includes('Export')
        );

      expect(actionButtons).toHaveLength(4);
    });

    it('maintains consistent action ID format', () => {
      const mockOnAction = jest.fn();
      renderWithProviders(<QuickActionsToolbar onAction={mockOnAction} />, {
        session: mockSession,
      });

      const buttons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent?.includes('Find') ||
            btn.textContent?.includes('Check') ||
            btn.textContent?.includes('Generate') ||
            btn.textContent?.includes('Export')
        );

      buttons.forEach((button, index) => {
        fireEvent.click(button);
      });

      const expectedActionIds = [
        'find-predicates',
        'check-classification',
        'generate-checklist',
        'export-report',
      ];

      expectedActionIds.forEach((actionId) => {
        expect(mockOnAction).toHaveBeenCalledWith(actionId);
      });
    });
  });
});
