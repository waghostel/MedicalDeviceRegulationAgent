/**
 * Unit tests for Sidebar component
 * Tests navigation rendering, route changes, and responsive behavior
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, createMockSession, createMockRouter } from '@/lib/testing/test-utils';
import { Sidebar } from '../Sidebar';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return (props) => (
    <a href={props.href} {...props}>
      {props.children}
    </a>
  );
});

// Mock Next.js usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('Sidebar Component', () => {
  const mockSession = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default pathname
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');
  });

  describe('Basic Rendering', () => {
    it('renders navigation section with correct title', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      // Main navigation items
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /agent workflow/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /predicate search/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
    });

    it('renders quick action buttons', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      expect(screen.getByRole('button', { name: /find predicates/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check classification/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate checklist/i })).toBeInTheDocument();
    });

    it('renders settings link', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Navigation Links', () => {
    it('has correct href attributes for all navigation links', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '/projects');
      expect(screen.getByRole('link', { name: /agent workflow/i })).toHaveAttribute('href', '/agent');
      expect(screen.getByRole('link', { name: /documents/i })).toHaveAttribute('href', '/documents');
      expect(screen.getByRole('link', { name: /predicate search/i })).toHaveAttribute('href', '/predicate-search');
      expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/analytics');
    });

    it('displays correct icons for navigation items', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      // Check that each navigation item has an icon (SVG element)
      const navigationLinks = [
        screen.getByRole('link', { name: /dashboard/i }),
        screen.getByRole('link', { name: /projects/i }),
        screen.getByRole('link', { name: /agent workflow/i }),
        screen.getByRole('link', { name: /documents/i }),
        screen.getByRole('link', { name: /predicate search/i }),
        screen.getByRole('link', { name: /analytics/i }),
      ];

      navigationLinks.forEach(link => {
        const icon = link.querySelector('svg');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveClass('mr-2', 'h-4', 'w-4');
      });
    });
  });

  describe('Active Route Highlighting', () => {
    it('highlights dashboard link when on home route', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/');

      renderWithProviders(<Sidebar />, { session: mockSession });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      // The button should have secondary variant when active
      expect(dashboardLink.closest('button')).toHaveClass('variant-secondary');
    });

    it('highlights projects link when on projects route', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/projects');

      renderWithProviders(<Sidebar />, { session: mockSession });

      const projectsLink = screen.getByRole('link', { name: /projects/i });
      expect(projectsLink.closest('button')).toHaveClass('variant-secondary');
    });

    it('highlights agent workflow link when on agent route', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/agent');

      renderWithProviders(<Sidebar />, { session: mockSession });

      const agentLink = screen.getByRole('link', { name: /agent workflow/i });
      expect(agentLink.closest('button')).toHaveClass('variant-secondary');
    });

    it('uses ghost variant for non-active links', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/projects');

      renderWithProviders(<Sidebar />, { session: mockSession });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const agentLink = screen.getByRole('link', { name: /agent workflow/i });
      
      expect(dashboardLink.closest('button')).toHaveClass('variant-ghost');
      expect(agentLink.closest('button')).toHaveClass('variant-ghost');
    });
  });

  describe('Quick Actions', () => {
    it('renders quick action buttons with correct icons', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const findPredicatesBtn = screen.getByRole('button', { name: /find predicates/i });
      const checkClassificationBtn = screen.getByRole('button', { name: /check classification/i });
      const generateChecklistBtn = screen.getByRole('button', { name: /generate checklist/i });

      // Check icons are present
      expect(findPredicatesBtn.querySelector('svg')).toBeInTheDocument();
      expect(checkClassificationBtn.querySelector('svg')).toBeInTheDocument();
      expect(generateChecklistBtn.querySelector('svg')).toBeInTheDocument();

      // Check icon classes
      [findPredicatesBtn, checkClassificationBtn, generateChecklistBtn].forEach(btn => {
        const icon = btn.querySelector('svg');
        expect(icon).toHaveClass('mr-2', 'h-4', 'w-4');
      });
    });

    it('quick action buttons are clickable', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const findPredicatesBtn = screen.getByRole('button', { name: /find predicates/i });
      const checkClassificationBtn = screen.getByRole('button', { name: /check classification/i });
      const generateChecklistBtn = screen.getByRole('button', { name: /generate checklist/i });

      // Buttons should be clickable (not disabled)
      expect(findPredicatesBtn).not.toBeDisabled();
      expect(checkClassificationBtn).not.toBeDisabled();
      expect(generateChecklistBtn).not.toBeDisabled();

      // Should not throw when clicked
      expect(() => {
        fireEvent.click(findPredicatesBtn);
        fireEvent.click(checkClassificationBtn);
        fireEvent.click(generateChecklistBtn);
      }).not.toThrow();
    });
  });

  describe('Layout and Styling', () => {
    it('has correct container styling', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const sidebar = document.querySelector('.pb-12.w-64');
      expect(sidebar).toBeInTheDocument();
    });

    it('has proper spacing between sections', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const sections = document.querySelectorAll('.space-y-4 > .px-3.py-2');
      expect(sections).toHaveLength(3); // Navigation, Quick Actions, Settings
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-sidebar-class';
      renderWithProviders(<Sidebar className={customClass} />, { session: mockSession });

      const sidebar = document.querySelector(`.${customClass}`);
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('pb-12', 'w-64', customClass);
    });

    it('has correct button styling for navigation items', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const button = dashboardLink.closest('button');
      
      expect(button).toHaveClass('w-full', 'justify-start');
    });
  });

  describe('Section Headers', () => {
    it('renders section headers with correct styling', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const navigationHeader = screen.getByText('Navigation');
      const quickActionsHeader = screen.getByText('Quick Actions');

      expect(navigationHeader).toHaveClass('mb-2', 'px-4', 'text-lg', 'font-semibold', 'tracking-tight');
      expect(quickActionsHeader).toHaveClass('mb-2', 'px-4', 'text-lg', 'font-semibold', 'tracking-tight');
    });

    it('has proper heading hierarchy', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const headers = screen.getAllByRole('heading', { level: 2 });
      expect(headers).toHaveLength(2);
      expect(headers[0]).toHaveTextContent('Navigation');
      expect(headers[1]).toHaveTextContent('Quick Actions');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      // Check for proper heading structure
      const navigationHeading = screen.getByRole('heading', { name: /navigation/i });
      const quickActionsHeading = screen.getByRole('heading', { name: /quick actions/i });

      expect(navigationHeading).toBeInTheDocument();
      expect(quickActionsHeading).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const allLinks = screen.getAllByRole('link');
      const allButtons = screen.getAllByRole('button');

      // All interactive elements should be focusable
      [...allLinks, ...allButtons].forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });

    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      // Navigation links should have proper roles
      const navigationLinks = screen.getAllByRole('link');
      expect(navigationLinks.length).toBeGreaterThan(0);

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains fixed width for consistent layout', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const sidebar = document.querySelector('.w-64');
      expect(sidebar).toBeInTheDocument();
    });

    it('has proper spacing for mobile and desktop', () => {
      renderWithProviders(<Sidebar />, { session: mockSession });

      const container = document.querySelector('.space-y-4.py-4');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing pathname gracefully', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue(undefined);

      expect(() => {
        renderWithProviders(<Sidebar />, { session: mockSession });
      }).not.toThrow();
    });

    it('handles invalid pathname gracefully', () => {
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/invalid-route');

      renderWithProviders(<Sidebar />, { session: mockSession });

      // All navigation items should use ghost variant when no match
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink.closest('button')).toHaveClass('variant-ghost');
    });

    it('renders without session', () => {
      renderWithProviders(<Sidebar />, { session: null });

      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Integration with Router', () => {
    it('works with mock router', () => {
      const mockRouter = createMockRouter('/projects');
      
      renderWithProviders(<Sidebar />, { 
        session: mockSession,
        router: mockRouter 
      });

      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
    });

    it('handles route changes correctly', () => {
      const { usePathname } = require('next/navigation');
      
      // Start with dashboard
      usePathname.mockReturnValue('/');
      const { rerender } = renderWithProviders(<Sidebar />, { session: mockSession });
      
      let dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink.closest('button')).toHaveClass('variant-secondary');

      // Change to projects
      usePathname.mockReturnValue('/projects');
      rerender(<Sidebar />);
      
      dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const projectsLink = screen.getByRole('link', { name: /projects/i });
      
      expect(dashboardLink.closest('button')).toHaveClass('variant-ghost');
      expect(projectsLink.closest('button')).toHaveClass('variant-secondary');
    });
  });
});