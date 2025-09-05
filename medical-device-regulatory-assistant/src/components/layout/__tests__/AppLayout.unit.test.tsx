/**
 * Unit tests for AppLayout component
 * Tests layout rendering, sidebar functionality, and responsive behavior
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { AppLayout } from '../AppLayout';

// Mock the child components
jest.mock('../Header', () => ({
  Header: (props) => (
    <div data-testid="mock-header">
      {props.showMenuButton && (
        <button onClick={props.onMenuToggle} data-testid="menu-toggle">
          Menu
        </button>
      )}
      Header Component
    </div>
  ),
}));

jest.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar Component</div>,
}));

jest.mock('../QuickActionsToolbar', () => ({
  QuickActionsToolbar: (props) => (
    <div data-testid="mock-quick-actions">
      <button onClick={() => props.onAction('test-action')} data-testid="quick-action-btn">
        Quick Action
      </button>
    </div>
  ),
}));

jest.mock('../CommandPalette', () => ({
  CommandPalette: (props) => (
    props.isOpen ? (
      <div data-testid="mock-command-palette">
        <button onClick={props.onClose} data-testid="close-palette">Close</button>
        <button onClick={() => props.onAction('palette-action')} data-testid="palette-action">
          Palette Action
        </button>
      </div>
    ) : null
  ),
}));

jest.mock('../Breadcrumb', () => ({
  Breadcrumb: (props) => (
    <div data-testid="mock-breadcrumb">
      {props.items.map((item, index) => (
        <span key={index} data-testid={`breadcrumb-item-${index}`}>
          {item.label}
        </span>
      ))}
    </div>
  ),
}));

// Mock keyboard shortcuts hook
jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
  createRegulatoryShortcuts: jest.fn(() => ({})),
}));

describe('AppLayout Component', () => {
  const mockSession = createMockSession();
  const defaultProps = {
    children: <div data-testid="main-content">Main Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders header, sidebar, and main content correctly', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('mock-quick-actions')).toBeInTheDocument();
    });

    it('renders without sidebar when showSidebar is false', () => {
      renderWithProviders(
        <AppLayout {...defaultProps} showSidebar={false} />,
        { session: mockSession }
      );

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('applies custom className to main content', () => {
      const customClass = 'custom-layout-class';
      renderWithProviders(
        <AppLayout {...defaultProps} className={customClass} />,
        { session: mockSession }
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass(customClass);
    });
  });

  describe('Sidebar Functionality', () => {
    it('toggles mobile sidebar when menu button is clicked', async () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      const menuToggle = screen.getByTestId('menu-toggle');
      
      // Initially, mobile sidebar should not be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click to open mobile sidebar
      fireEvent.click(menuToggle);

      // Mobile sidebar should be visible (in a portal/overlay)
      await waitFor(() => {
        const sidebarOverlay = document.querySelector('[class*="fixed inset-0"]');
        expect(sidebarOverlay).toBeInTheDocument();
      });
    });

    it('closes mobile sidebar when overlay is clicked', async () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      const menuToggle = screen.getByTestId('menu-toggle');
      fireEvent.click(menuToggle);

      await waitFor(() => {
        const overlay = document.querySelector('[class*="bg-background/80"]');
        expect(overlay).toBeInTheDocument();
        
        // Click overlay to close
        fireEvent.click(overlay!);
      });

      await waitFor(() => {
        const overlay = document.querySelector('[class*="bg-background/80"]');
        expect(overlay).not.toBeInTheDocument();
      });
    });

    it('shows desktop sidebar by default on larger screens', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      // Desktop sidebar should be present with appropriate classes
      const desktopSidebar = document.querySelector('aside.hidden.md\\:flex');
      expect(desktopSidebar).toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    const breadcrumbItems = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Current Project', href: '/projects/1' },
    ];

    it('renders breadcrumb when showBreadcrumb is true and items are provided', () => {
      renderWithProviders(
        <AppLayout 
          {...defaultProps} 
          showBreadcrumb={true} 
          breadcrumbItems={breadcrumbItems} 
        />,
        { session: mockSession }
      );

      expect(screen.getByTestId('mock-breadcrumb')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Home');
      expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('Projects');
      expect(screen.getByTestId('breadcrumb-item-2')).toHaveTextContent('Current Project');
    });

    it('does not render breadcrumb when showBreadcrumb is false', () => {
      renderWithProviders(
        <AppLayout 
          {...defaultProps} 
          showBreadcrumb={false} 
          breadcrumbItems={breadcrumbItems} 
        />,
        { session: mockSession }
      );

      expect(screen.queryByTestId('mock-breadcrumb')).not.toBeInTheDocument();
    });

    it('does not render breadcrumb when no items are provided', () => {
      renderWithProviders(
        <AppLayout {...defaultProps} showBreadcrumb={true} />,
        { session: mockSession }
      );

      expect(screen.queryByTestId('mock-breadcrumb')).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('handles quick action callbacks correctly', () => {
      const mockOnQuickAction = jest.fn();
      renderWithProviders(
        <AppLayout {...defaultProps} onQuickAction={mockOnQuickAction} />,
        { session: mockSession }
      );

      const quickActionBtn = screen.getByTestId('quick-action-btn');
      fireEvent.click(quickActionBtn);

      expect(mockOnQuickAction).toHaveBeenCalledWith('test-action');
    });

    it('renders quick actions panel when showQuickActions is true', () => {
      renderWithProviders(
        <AppLayout {...defaultProps} showQuickActions={true} />,
        { session: mockSession }
      );

      const quickActionsPanel = document.querySelector('aside.hidden.lg\\:flex.lg\\:w-80');
      expect(quickActionsPanel).toBeInTheDocument();
      expect(quickActionsPanel).toHaveTextContent('Quick Actions');
    });

    it('does not render quick actions panel by default', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      const quickActionsPanel = document.querySelector('aside.hidden.lg\\:flex.lg\\:w-80');
      expect(quickActionsPanel).not.toBeInTheDocument();
    });
  });

  describe('Command Palette', () => {
    it('opens and closes command palette correctly', async () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      // Command palette should not be visible initially
      expect(screen.queryByTestId('mock-command-palette')).not.toBeInTheDocument();

      // Simulate keyboard shortcut to open command palette
      // This would be triggered by the keyboard shortcuts hook
      const { createRegulatoryShortcuts } = require('@/hooks/useKeyboardShortcuts');
      const mockShortcuts = createRegulatoryShortcuts.mock.calls[0][0];
      
      // Trigger open command palette
      mockShortcuts.openCommandPalette();

      await waitFor(() => {
        expect(screen.getByTestId('mock-command-palette')).toBeInTheDocument();
      });

      // Close command palette
      const closeButton = screen.getByTestId('close-palette');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('mock-command-palette')).not.toBeInTheDocument();
      });
    });

    it('handles command palette actions correctly', async () => {
      const mockOnQuickAction = jest.fn();
      renderWithProviders(
        <AppLayout {...defaultProps} onQuickAction={mockOnQuickAction} />,
        { session: mockSession }
      );

      // Open command palette
      const { createRegulatoryShortcuts } = require('@/hooks/useKeyboardShortcuts');
      const mockShortcuts = createRegulatoryShortcuts.mock.calls[0][0];
      mockShortcuts.openCommandPalette();

      await waitFor(() => {
        expect(screen.getByTestId('mock-command-palette')).toBeInTheDocument();
      });

      // Trigger palette action
      const paletteActionBtn = screen.getByTestId('palette-action');
      fireEvent.click(paletteActionBtn);

      expect(mockOnQuickAction).toHaveBeenCalledWith('palette-action');
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct classes for responsive layout', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('flex-1', 'min-h-screen', 'md:ml-64');
    });

    it('adjusts main content margin when sidebar is hidden', () => {
      renderWithProviders(
        <AppLayout {...defaultProps} showSidebar={false} />,
        { session: mockSession }
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('flex-1', 'min-h-screen');
      expect(mainElement).not.toHaveClass('md:ml-64');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and semantic structure', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      // Check for semantic HTML elements
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for proper heading structure in quick actions
      const quickActionsPanel = document.querySelector('aside.hidden.lg\\:flex.lg\\:w-80');
      if (quickActionsPanel) {
        expect(quickActionsPanel.querySelector('h3')).toHaveTextContent('Quick Actions');
      }
    });

    it('supports keyboard navigation', () => {
      const { createRegulatoryShortcuts, useKeyboardShortcuts } = require('@/hooks/useKeyboardShortcuts');
      
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      // Verify keyboard shortcuts are set up
      expect(createRegulatoryShortcuts).toHaveBeenCalled();
      expect(useKeyboardShortcuts).toHaveBeenCalled();

      const shortcutsConfig = createRegulatoryShortcuts.mock.calls[0][0];
      expect(shortcutsConfig).toHaveProperty('openCommandPalette');
      expect(shortcutsConfig).toHaveProperty('findPredicates');
      expect(shortcutsConfig).toHaveProperty('checkClassification');
    });
  });

  describe('Error Handling', () => {
    it('handles missing onQuickAction prop gracefully', () => {
      renderWithProviders(<AppLayout {...defaultProps} />, { session: mockSession });

      const quickActionBtn = screen.getByTestId('quick-action-btn');
      
      // Should not throw error when onQuickAction is not provided
      expect(() => {
        fireEvent.click(quickActionBtn);
      }).not.toThrow();
    });

    it('handles empty breadcrumb items array', () => {
      renderWithProviders(
        <AppLayout {...defaultProps} showBreadcrumb={true} breadcrumbItems={[]} />,
        { session: mockSession }
      );

      expect(screen.queryByTestId('mock-breadcrumb')).not.toBeInTheDocument();
    });
  });
});