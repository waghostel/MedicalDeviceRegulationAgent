/**
 * Unit tests for ProjectCard component
 * Tests rendering, interactions, loading states, and accessibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  ProjectCard,
  ProjectCardSkeleton,
} from '@/components/projects/project-card';
import { renderWithProviders } from '@/lib/testing/test-utils';
import { Project, ProjectStatus } from '@/types/project';

// Mock performance optimization hook
jest.mock('@/lib/performance/optimization', () => ({
  useRenderPerformance: jest.fn(),
}));

// Mock project data
const mockProject: Project = {
  id: 1,
  user_id: 'user-1',
  name: 'Cardiac Monitor X1',
  description:
    'Advanced cardiac monitoring device for continuous patient monitoring',
  device_type: 'Cardiovascular Device',
  intended_use:
    'Continuous monitoring of cardiac rhythm in ambulatory patients',
  status: ProjectStatus.IN_PROGRESS,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-02T15:30:00Z',
};

const mockProjectMinimal: Project = {
  id: 2,
  user_id: 'user-1',
  name: 'Simple Device',
  description: undefined,
  device_type: undefined,
  intended_use: undefined,
  status: ProjectStatus.DRAFT,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

describe('ProjectCard Component', () => {
  const mockOnSelect = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now() for consistent testing
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2024-01-03T00:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders project information correctly', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Cardiac Monitor X1')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Advanced cardiac monitoring device for continuous patient monitoring'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Cardiovascular Device')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Continuous monitoring of cardiac rhythm in ambulatory patients'
        )
      ).toBeInTheDocument();
    });

    it('renders status badge with correct styling', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const statusBadge = screen.getByText('In Progress');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('renders different status badges correctly', () => {
      const draftProject = { ...mockProject, status: ProjectStatus.DRAFT };
      const { rerender } = renderWithProviders(
        <ProjectCard
          project={draftProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Draft')).toHaveClass(
        'bg-gray-100',
        'text-gray-800'
      );

      const completedProject = {
        ...mockProject,
        status: ProjectStatus.COMPLETED,
      };
      rerender(
        <ProjectCard
          project={completedProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Completed')).toHaveClass(
        'bg-green-100',
        'text-green-800'
      );
    });

    it('shows recent activity badge for recently updated projects', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });

    it('does not show recent badge for older projects', () => {
      const oldProject = {
        ...mockProject,
        updated_at: '2023-12-01T10:00:00Z', // More than 24 hours ago
      };

      renderWithProviders(
        <ProjectCard
          project={oldProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    });

    it('renders dates correctly', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/Created 1\/1\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/Updated 1\/2\/2024/)).toBeInTheDocument();
    });

    it('handles projects with minimal data', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProjectMinimal}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Simple Device')).toBeInTheDocument();
      expect(screen.queryByText('Device Type:')).not.toBeInTheDocument();
      expect(screen.queryByText('Intended Use:')).not.toBeInTheDocument();
    });

    it('shows only created date when not updated', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProjectMinimal}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/Created 1\/1\/2024/)).toBeInTheDocument();
      expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onSelect when card is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const card = screen.getByTestId('project-card');
      await user.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith(mockProject);
    });

    it('does not call onSelect when loading', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          loading={true}
        />
      );

      const card = screen.getByTestId('project-card');
      await user.click(card);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('opens dropdown menu when menu button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
      expect(screen.getByText('Delete Project')).toBeInTheDocument();
    });

    it('calls onEdit when edit menu item is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const editMenuItem = screen.getByText('Edit Project');
      await user.click(editMenuItem);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
      expect(mockOnSelect).not.toHaveBeenCalled(); // Should not trigger card selection
    });

    it('calls onExport when export menu item is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const exportMenuItem = screen.getByText('Export Data');
      await user.click(exportMenuItem);

      expect(mockOnExport).toHaveBeenCalledWith(mockProject);
    });

    it('calls onDelete when delete menu item is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const deleteMenuItem = screen.getByText('Delete Project');
      await user.click(deleteMenuItem);

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    });

    it('prevents event bubbling on menu interactions', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      // Menu should open without triggering card selection
      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('applies loading styles when loading prop is true', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          loading={true}
        />
      );

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass('opacity-50', 'pointer-events-none');
    });

    it('disables menu button when loading', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          loading={true}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeDisabled();
    });

    it('shows deleting state during delete operation', async () => {
      const user = userEvent.setup();
      const mockOnDeleteAsync = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDeleteAsync}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const deleteMenuItem = screen.getByText('Delete Project');
      await user.click(deleteMenuItem);

      // Should show deleting state
      expect(screen.getByText('Deleting...')).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(mockOnDeleteAsync).toHaveBeenCalled();
      });
    });

    it('shows exporting state during export operation', async () => {
      const user = userEvent.setup();
      const mockOnExportAsync = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExportAsync}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const exportMenuItem = screen.getByText('Export Data');
      await user.click(exportMenuItem);

      // Should show exporting state
      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(mockOnExportAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Hover and Focus States', () => {
    it('applies hover styles on mouse enter', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const card = screen.getByTestId('project-card');
      await user.hover(card);

      expect(card).toHaveClass('hover:shadow-md', 'hover:scale-[1.02]');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const card = screen.getByTestId('project-card');

      // Focus the card
      await user.tab();
      expect(card).toHaveFocus();

      // Press Enter to select
      await user.keyboard('{Enter}');
      expect(mockOnSelect).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Text Truncation', () => {
    it('handles long project names gracefully', () => {
      const longNameProject = {
        ...mockProject,
        name: 'Very Long Project Name That Should Be Truncated Properly When Displayed In The Card Component',
      };

      renderWithProviders(
        <ProjectCard
          project={longNameProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const titleElement = screen.getByText(longNameProject.name);
      expect(titleElement).toHaveClass('truncate');
    });

    it('handles long descriptions with line clamping', () => {
      const longDescProject = {
        ...mockProject,
        description:
          'This is a very long description that should be clamped to two lines when displayed in the project card component to maintain consistent layout and prevent overflow issues that could break the design.',
      };

      renderWithProviders(
        <ProjectCard
          project={longDescProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const descriptionElement = screen.getByText(longDescProject.description);
      expect(descriptionElement).toHaveClass('line-clamp-2');
    });

    it('handles long intended use text with line clamping', () => {
      const longIntendedUseProject = {
        ...mockProject,
        intended_use:
          'This is a very long intended use statement that should be clamped to two lines when displayed in the project card component to maintain consistent layout and prevent overflow issues.',
      };

      renderWithProviders(
        <ProjectCard
          project={longIntendedUseProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const intendedUseElement = screen.getByText(
        longIntendedUseProject.intended_use
      );
      expect(intendedUseElement).toHaveClass('line-clamp-2');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const card = screen.getByTestId('project-card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('provides screen reader text for menu button', () => {
      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Open menu')).toHaveClass('sr-only');
    });

    it('maintains focus management in dropdown menu', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
        />
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      // Menu items should be focusable
      const editMenuItem = screen.getByRole('menuitem', {
        name: /edit project/i,
      });
      expect(editMenuItem).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className when provided', () => {
      const customClass = 'custom-project-card';

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          className={customClass}
        />
      );

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass(customClass);
    });

    it('combines custom className with default classes', () => {
      const customClass = 'custom-project-card';

      renderWithProviders(
        <ProjectCard
          project={mockProject}
          onSelect={mockOnSelect}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          className={customClass}
        />
      );

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass(customClass, 'cursor-pointer', 'transition-all');
    });
  });
});

describe('ProjectCardSkeleton Component', () => {
  it('renders skeleton loading state', () => {
    renderWithProviders(<ProjectCardSkeleton />);

    const skeleton = screen.getByTestId('project-card-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-skeleton';

    renderWithProviders(<ProjectCardSkeleton className={customClass} />);

    const skeleton = screen.getByTestId('project-card-skeleton');
    expect(skeleton).toHaveClass(customClass, 'animate-pulse');
  });

  it('has proper structure for skeleton elements', () => {
    renderWithProviders(<ProjectCardSkeleton />);

    // Should have skeleton elements for title, badges, description, etc.
    const skeletonElements = screen.getAllByRole('generic');
    expect(skeletonElements.length).toBeGreaterThan(5); // Multiple skeleton elements
  });
});
