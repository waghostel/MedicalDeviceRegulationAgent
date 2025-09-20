/**
 * Unit tests for AppLayout component
 * Tests layout rendering, sidebar functionality, and responsive behavior
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  createMockSession,
  setupTestEnvironment,
  cleanupTestEnvironment,
  waitForAsyncUpdates,
  fireEventWithAct,
} from '@/lib/testing/react-test-utils';
import { AppLayout } from '../AppLayout';

// Mock the child components
jest.mock('../Header', () => ({
  Header: (props) => {
    const mockReact = require('react');
    return mockReact.createElement(
      'div',
      {
        'data-testid': 'mock-header',
      },
      [
        props.showMenuButton &&
          mockReact.createElement(
            'button',
            {
              key: 'menu-toggle',
              onClick: props.onMenuToggle,
              'data-testid': 'menu-toggle',
            },
            'Menu'
          ),
        'Header Component',
      ]
    );
  },
}));

jest.mock('../Sidebar', () => ({
  Sidebar: () => {
    const mockReact = require('react');
    return mockReact.createElement(
      'div',
      {
        'data-testid': 'mock-sidebar',
      },
      'Sidebar Component'
    );
  },
}));

jest.mock('../QuickActionsToolbar', () => ({
  QuickActionsToolbar: (props) =>
    React.createElement(
      'div',
      {
        'data-testid': 'mock-quick-actions',
      },
      React.createElement(
        'button',
        {
          onClick: () => props.onAction('test-action'),
          'data-testid': 'quick-action-btn',
        },
        'Quick Action'
      )
    ),
}));

jest.mock('../CommandPalette', () => ({
  CommandPalette: (props) =>
    props.isOpen
      ? React.createElement(
          'div',
          {
            'data-testid': 'mock-command-palette',
          },
          [
            React.createElement(
              'button',
              {
                key: 'close',
                onClick: props.onClose,
                'data-testid': 'close-palette',
              },
              'Close'
            ),
            React.createElement(
              'button',
              {
                key: 'action',
                onClick: () => props.onAction('palette-action'),
                'data-testid': 'palette-action',
              },
              'Palette Action'
            ),
          ]
        )
      : null,
}));

jest.mock('../Breadcrumb', () => ({
  Breadcrumb: (props) =>
    React.createElement(
      'div',
      {
        'data-testid': 'mock-breadcrumb',
      },
      props.items.map((item, index) =>
        React.createElement(
          'span',
          {
            key: index,
            'data-testid': `breadcrumb-item-${index}`,
          },
          item.label
        )
      )
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
    children: React.createElement(
      'div',
      {
        'data-testid': 'main-content',
      },
      'Main Content'
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders header, sidebar, and main content correctly', () => {
      renderWithProviders(React.createElement(AppLayout, defaultProps), {
        session: mockSession,
      });

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('mock-quick-actions')).toBeInTheDocument();
    });

    it('renders without sidebar when showSidebar is false', () => {
      renderWithProviders(
        React.createElement(AppLayout, { ...defaultProps, showSidebar: false }),
        { session: mockSession }
      );

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('applies custom className to main content', () => {
      const customClass = 'custom-layout-class';
      renderWithProviders(
        React.createElement(AppLayout, {
          ...defaultProps,
          className: customClass,
        }),
        { session: mockSession }
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass(customClass);
    });
  });

  describe('Quick Actions', () => {
    it('handles quick action callbacks correctly', () => {
      const mockOnQuickAction = jest.fn();
      renderWithProviders(
        React.createElement(AppLayout, {
          ...defaultProps,
          onQuickAction: mockOnQuickAction,
        }),
        { session: mockSession }
      );

      const quickActionBtn = screen.getByTestId('quick-action-btn');
      fireEvent.click(quickActionBtn);

      expect(mockOnQuickAction).toHaveBeenCalledWith('test-action');
    });
  });

  describe('Error Handling', () => {
    it('handles missing onQuickAction prop gracefully', () => {
      renderWithProviders(React.createElement(AppLayout, defaultProps), {
        session: mockSession,
      });

      const quickActionBtn = screen.getByTestId('quick-action-btn');

      // Should not throw error when onQuickAction is not provided
      expect(() => {
        fireEvent.click(quickActionBtn);
      }).not.toThrow();
    });
  });
});
