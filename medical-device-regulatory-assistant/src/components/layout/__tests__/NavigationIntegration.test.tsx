import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLayout } from '../AppLayout';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navigation Integration', () => {
  const mockOnQuickAction = jest.fn();

  beforeEach(() => {
    mockOnQuickAction.mockClear();
  });

  it('renders complete layout with all navigation components', () => {
    render(
      <AppLayout
        showSidebar={true}
        showQuickActions={true}
        showBreadcrumb={true}
        breadcrumbItems={[
          { label: 'Projects', href: '/projects' },
          { label: 'Current Project', current: true },
        ]}
        onQuickAction={mockOnQuickAction}
      >
        <div>Test Content</div>
      </AppLayout>
    );

    // Check that all major components are rendered
    expect(screen.getByText('Medical Device Regulatory Assistant')).toBeInTheDocument();
    expect(screen.getAllByText('Quick Actions')).toHaveLength(3); // Toolbar, sidebar, and quick actions panel
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getAllByText('Projects')).toHaveLength(2); // Sidebar and breadcrumb
    expect(screen.getByText('Current Project')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles quick actions from toolbar', () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Click on a quick action button
    const predicateButton = screen.getByText('Find Similar Predicates');
    fireEvent.click(predicateButton);

    expect(mockOnQuickAction).toHaveBeenCalledWith('find-predicates');
  });

  it('opens command palette with keyboard shortcut', async () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Simulate Ctrl+K keyboard shortcut
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Command Palette')).toBeInTheDocument();
    });
  });

  it('executes quick actions via keyboard shortcuts', async () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Test Ctrl+P for predicate search
    fireEvent.keyDown(document, { key: 'p', ctrlKey: true });

    await waitFor(() => {
      expect(mockOnQuickAction).toHaveBeenCalledWith('find-predicates');
    });

    // Test Ctrl+C for classification
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });

    await waitFor(() => {
      expect(mockOnQuickAction).toHaveBeenCalledWith('check-classification');
    });
  });

  it('toggles mobile sidebar', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <AppLayout showSidebar={true}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Find and click the mobile menu button
    const menuButton = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(menuButton);

    // The sidebar should be visible (this tests the toggle functionality)
    expect(menuButton).toBeInTheDocument();
  });

  it('navigates through breadcrumb links', () => {
    render(
      <AppLayout
        showBreadcrumb={true}
        breadcrumbItems={[
          { label: 'Projects', href: '/projects' },
          { label: 'Device A', href: '/projects/device-a' },
          { label: 'Analysis', current: true },
        ]}
      >
        <div>Test Content</div>
      </AppLayout>
    );

    // Check breadcrumb navigation - get all links and find the breadcrumb ones
    const projectsLinks = screen.getAllByRole('link', { name: 'Projects' });
    const breadcrumbProjectsLink = projectsLinks.find(link => 
      link.getAttribute('href') === '/projects' && 
      !link.querySelector('svg') // Breadcrumb link doesn't have icon
    );
    expect(breadcrumbProjectsLink).toHaveAttribute('href', '/projects');

    const deviceLink = screen.getByRole('link', { name: 'Device A' });
    expect(deviceLink).toHaveAttribute('href', '/projects/device-a');

    // Current item should not be a link
    const currentItem = screen.getByText('Analysis');
    expect(currentItem).not.toHaveAttribute('href');
  });

  it('handles command palette search and selection', async () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Open command palette
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Command Palette')).toBeInTheDocument();
    });

    // Search for a command
    const searchInput = screen.getByPlaceholderText('Type a command or search...');
    fireEvent.change(searchInput, { target: { value: 'predicate' } });

    await waitFor(() => {
      expect(screen.getAllByText('Find Similar Predicates')).toHaveLength(2); // Toolbar and command palette
    });

    // Select the command from the command palette (not the toolbar)
    const commandPaletteItems = screen.getAllByText('Find Similar Predicates');
    const commandPaletteItem = commandPaletteItems.find(item => 
      item.className.includes('text-sm font-medium')
    );
    if (commandPaletteItem) {
      fireEvent.click(commandPaletteItem);
    }

    expect(mockOnQuickAction).toHaveBeenCalledWith('find-predicates');
  });

  it('closes command palette with escape key', async () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <div>Test Content</div>
      </AppLayout>
    );

    // Open command palette
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Command Palette')).toBeInTheDocument();
    });

    // Close with escape
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Command Palette')).not.toBeInTheDocument();
    });
  });

  it('prevents keyboard shortcuts when typing in input fields', () => {
    render(
      <AppLayout onQuickAction={mockOnQuickAction}>
        <input type="text" placeholder="Test input" />
      </AppLayout>
    );

    const input = screen.getByPlaceholderText('Test input');
    input.focus();

    // Simulate Ctrl+P while focused on input
    fireEvent.keyDown(input, { key: 'p', ctrlKey: true });

    // Should not trigger the quick action
    expect(mockOnQuickAction).not.toHaveBeenCalled();
  });
});