/**
 * Unit tests for Header component
 * Tests header rendering, navigation links, user information display, and responsive behavior
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { Header } from '../Header';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return (props) => (
    <a href={props.href} {...props}>
      {props.children}
    </a>
  );
});

describe('Header Component', () => {
  const mockSession = createMockSession({
    name: 'John Doe',
    email: 'john.doe@example.com',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders header with application title and MVP badge', () => {
      renderWithProviders(<Header />, { session: mockSession });

      expect(
        screen.getByText('Medical Device Regulatory Assistant')
      ).toBeInTheDocument();
      expect(screen.getByText('MVP')).toBeInTheDocument();
    });

    it('renders navigation links correctly', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const aiAssistantLink = screen.getByRole('link', {
        name: /ai assistant/i,
      });

      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/');

      expect(aiAssistantLink).toBeInTheDocument();
      expect(aiAssistantLink).toHaveAttribute('href', '/agent');
    });

    it('renders user menu and settings buttons', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const userButton = screen.getByRole('button', { name: /user menu/i });
      const settingsButton = screen.getByRole('button', { name: /settings/i });

      expect(userButton).toBeInTheDocument();
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('Menu Toggle Functionality', () => {
    it('renders menu toggle button when showMenuButton is true', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('does not render menu toggle button when showMenuButton is false', () => {
      renderWithProviders(<Header showMenuButton={false} />, {
        session: mockSession,
      });

      const menuButton = screen.queryByRole('button', { name: /toggle menu/i });
      expect(menuButton).not.toBeInTheDocument();
    });

    it('calls onMenuToggle when menu button is clicked', () => {
      const mockOnMenuToggle = jest.fn();
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={mockOnMenuToggle} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      fireEvent.click(menuButton);

      expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);
    });

    it('handles missing onMenuToggle prop gracefully', () => {
      renderWithProviders(<Header showMenuButton={true} />, {
        session: mockSession,
      });

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });

      expect(() => {
        fireEvent.click(menuButton);
      }).not.toThrow();
    });
  });

  describe('Responsive Behavior', () => {
    it('has correct responsive classes for menu button', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveClass('md:hidden');
    });

    it('has correct responsive classes for navigation', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('hidden', 'md:flex');
    });

    it('applies mobile-first responsive design', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'w-full');

      const container = header.querySelector('.container');
      expect(container).toHaveClass('flex', 'h-14', 'items-center');
    });
  });

  describe('Navigation Links', () => {
    it('applies correct styling to navigation links', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const aiAssistantLink = screen.getByRole('link', {
        name: /ai assistant/i,
      });

      expect(dashboardLink).toHaveClass(
        'transition-colors',
        'hover:text-foreground/80',
        'text-foreground/60'
      );

      expect(aiAssistantLink).toHaveClass(
        'transition-colors',
        'hover:text-foreground/80',
        'text-foreground/60'
      );
    });

    it('has proper link structure and accessibility', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const homeLink = screen.getByRole('link', {
        name: /medical device regulatory assistant mvp/i,
      });
      expect(homeLink).toHaveAttribute('href', '/');
      expect(homeLink).toHaveClass('mr-6', 'flex', 'items-center', 'space-x-2');
    });
  });

  describe('User Interface Elements', () => {
    it('renders user button with correct icon and accessibility', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const userButton = screen.getByRole('button', { name: /user menu/i });
      expect(userButton).toHaveClass('variant-ghost', 'size-sm');

      // Check for User icon (Lucide icon)
      const userIcon = userButton.querySelector('svg');
      expect(userIcon).toBeInTheDocument();
      expect(userIcon).toHaveClass('h-4', 'w-4');
    });

    it('renders settings button with correct icon and accessibility', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toHaveClass('variant-ghost', 'size-sm');

      // Check for Settings icon (Lucide icon)
      const settingsIcon = settingsButton.querySelector('svg');
      expect(settingsIcon).toBeInTheDocument();
      expect(settingsIcon).toHaveClass('h-4', 'w-4');
    });

    it('renders MVP badge with correct styling', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const mvpBadge = screen.getByText('MVP');
      expect(mvpBadge).toHaveClass('ml-2');
      // Badge component should have variant="secondary"
      expect(mvpBadge.closest('[class*="badge"]')).toBeInTheDocument();
    });
  });

  describe('Header Layout and Styling', () => {
    it('has correct header styling and backdrop blur', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const header = screen.getByRole('banner');
      expect(header).toHaveClass(
        'sticky',
        'top-0',
        'z-50',
        'w-full',
        'border-b',
        'bg-background/95',
        'backdrop-blur',
        'supports-[backdrop-filter]:bg-background/60'
      );
    });

    it('has proper container layout', () => {
      renderWithProviders(<Header />, { session: mockSession });

      const container = document.querySelector('.container');
      expect(container).toHaveClass('flex', 'h-14', 'items-center');
    });

    it('has correct spacing and layout for elements', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toHaveClass('mr-2', 'px-0');

      const brandSection = document.querySelector('.mr-4');
      expect(brandSection).toBeInTheDocument();

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('items-center', 'space-x-6');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic HTML structure', () => {
      renderWithProviders(<Header />, { session: mockSession });

      // Header should be a banner landmark
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Navigation should be a navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('has proper screen reader text for icon buttons', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      expect(screen.getByText('Toggle Menu')).toHaveClass('sr-only');
      expect(screen.getByText('User menu')).toHaveClass('sr-only');
      expect(screen.getByText('Settings')).toHaveClass('sr-only');
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      const userButton = screen.getByRole('button', { name: /user menu/i });
      const settingsButton = screen.getByRole('button', { name: /settings/i });

      // All interactive elements should be focusable
      expect(menuButton).toHaveAttribute('tabIndex', '0');
      expect(userButton).toHaveAttribute('tabIndex', '0');
      expect(settingsButton).toHaveAttribute('tabIndex', '0');
    });

    it('has proper focus management', () => {
      renderWithProviders(
        <Header showMenuButton={true} onMenuToggle={jest.fn()} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });

      // Button should have focus-visible classes
      expect(menuButton).toHaveClass(
        'focus-visible:bg-transparent',
        'focus-visible:ring-0',
        'focus-visible:ring-offset-0'
      );
    });
  });

  describe('Error Handling', () => {
    it('renders without session data', () => {
      renderWithProviders(<Header />, { session: null });

      expect(
        screen.getByText('Medical Device Regulatory Assistant')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /user menu/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /settings/i })
      ).toBeInTheDocument();
    });

    it('handles undefined props gracefully', () => {
      expect(() => {
        renderWithProviders(<Header />, { session: mockSession });
      }).not.toThrow();
    });
  });

  describe('Integration with Authentication', () => {
    it('renders correctly with authenticated session', () => {
      const authenticatedSession = createMockSession({
        name: 'Jane Smith',
        email: 'jane.smith@medtech.com',
      });

      renderWithProviders(<Header />, { session: authenticatedSession });

      // Header should render normally with authenticated session
      expect(
        screen.getByText('Medical Device Regulatory Assistant')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /user menu/i })
      ).toBeInTheDocument();
    });

    it('renders correctly without authentication', () => {
      renderWithProviders(<Header />, { session: null });

      // Header should still render without session
      expect(
        screen.getByText('Medical Device Regulatory Assistant')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /user menu/i })
      ).toBeInTheDocument();
    });
  });
});
