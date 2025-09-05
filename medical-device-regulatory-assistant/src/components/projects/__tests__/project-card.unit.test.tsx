/**
 * Unit tests for ProjectCard component
 * Tests project data display, user interactions, and loading states
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { ProjectCard, ProjectCardSkeleton } from '../project-card';
import { generateMockProject } from '@/lib/mock-data';
import { ProjectStatus } from '@/types/project';

describe('ProjectCard Component', () => {
  const mockSession = createMockSession();
  const mockProject = generateMockProject({
    id: 1,
    name: 'Test Cardiac Monitor',
    description: 'A wireless cardiac monitoring device for continuous patient monitoring',
    device_type: 'Cardiovascular Device',
    intended_use: 'For continuous monitoring of cardiac rhythm in hospital settings',
    status: ProjectStatus.IN_PROGRESS,
  });

  const defaultProps = {
    project: mockProject,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders project information correctly', () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      expect(screen.getByText('Test Cardiac Monitor')).toBeInTheDocument();
      expect(screen.getByText('A wireless cardiac monitoring device for continuous patient monitoring')).toBeInTheDocument();
      expect(screen.getByText('Cardiovascular Device')).toBeInTheDocument();
      expect(screen.getByText('For continuous monitoring of cardiac rhythm in hospital settings')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('displays project status badge with correct styling', () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      const statusBadge = screen.getByText('In Progress');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-blue-100')).toBeInTheDocument();
    });

    it('shows created and updated dates', () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      expect(screen.getByText(/Created/)).toBeInTheDocument();
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });

    it('shows recent badge for recently updated projects', () => {
      const recentProject = generateMockProject({
        ...mockProject,
        updated_at: new Date().toISOString(), // Very recent update
      });

      renderWithProviders(
        <ProjectCard project={recentProject} />,
        { session: mockSession }
      );

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });
  });

  describe('Project Status Variants', () => {
    it('renders draft status correctly', () => {
      const draftProject = generateMockProject({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      });

      renderWithProviders(
        <ProjectCard project={draftProject} />,
        { session: mockSession }
      );

      const statusBadge = screen.getByText('Draft');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-gray-100')).toBeInTheDocument();
    });

    it('renders completed status correctly', () => {
      const completedProject = generateMockProject({
        ...mockProject,
        status: ProjectStatus.COMPLETED,
      });

      renderWithProviders(
        <ProjectCard project={completedProject} />,
        { session: mockSession }
      );

      const statusBadge = screen.getByText('Completed');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.closest('.bg-green-100')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onSelect when card is clicked', () => {
      const mockOnSelect = jest.fn();
      renderWithProviders(
        <ProjectCard {...defaultProps} onSelect={mockOnSelect} />,
        { session: mockSession }
      );

      const card = screen.getByTestId('project-card');
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith(mockProject);
    });

    it('opens dropdown menu when menu button is clicked', async () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
        expect(screen.getByText('Export Data')).toBeInTheDocument();
        expect(screen.getByText('Delete Project')).toBeInTheDocument();
      });
    });

    it('calls onEdit when edit menu item is clicked', async () => {
      const mockOnEdit = jest.fn();
      renderWithProviders(
        <ProjectCard {...defaultProps} onEdit={mockOnEdit} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
      });

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    });

    it('calls onDelete when delete menu item is clicked', async () => {
      const mockOnDelete = jest.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ProjectCard {...defaultProps} onDelete={mockOnDelete} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Project');
        fireEvent.click(deleteButton);
      });

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    });

    it('calls onExport when export menu item is clicked', async () => {
      const mockOnExport = jest.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ProjectCard {...defaultProps} onExport={mockOnExport} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Data');
        fireEvent.click(exportButton);
      });

      expect(mockOnExport).toHaveBeenCalledWith(mockProject);
    });

    it('prevents card click when menu button is clicked', () => {
      const mockOnSelect = jest.fn();
      renderWithProviders(
        <ProjectCard {...defaultProps} onSelect={mockOnSelect} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      // onSelect should not be called when clicking the menu button
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('applies loading styles when loading prop is true', () => {
      renderWithProviders(
        <ProjectCard {...defaultProps} loading={true} />,
        { session: mockSession }
      );

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass('opacity-50', 'pointer-events-none');
    });

    it('disables menu button when loading', () => {
      renderWithProviders(
        <ProjectCard {...defaultProps} loading={true} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeDisabled();
    });

    it('shows deleting state when delete is in progress', async () => {
      const mockOnDelete = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithProviders(
        <ProjectCard {...defaultProps} onDelete={mockOnDelete} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Project');
        fireEvent.click(deleteButton);
      });

      // Should show deleting state
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass('opacity-50');
    });

    it('shows exporting state when export is in progress', async () => {
      const mockOnExport = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithProviders(
        <ProjectCard {...defaultProps} onExport={mockOnExport} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Data');
        fireEvent.click(exportButton);
      });

      // Should show exporting state
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
      });
    });
  });

  describe('Optional Fields', () => {
    it('renders without description when not provided', () => {
      const projectWithoutDescription = generateMockProject({
        ...mockProject,
        description: undefined,
      });

      renderWithProviders(
        <ProjectCard project={projectWithoutDescription} />,
        { session: mockSession }
      );

      expect(screen.getByText('Test Cardiac Monitor')).toBeInTheDocument();
      expect(screen.queryByText('A wireless cardiac monitoring device')).not.toBeInTheDocument();
    });

    it('renders without device type when not provided', () => {
      const projectWithoutDeviceType = generateMockProject({
        ...mockProject,
        device_type: undefined,
      });

      renderWithProviders(
        <ProjectCard project={projectWithoutDeviceType} />,
        { session: mockSession }
      );

      expect(screen.queryByText('Device Type:')).not.toBeInTheDocument();
      expect(screen.queryByText('Cardiovascular Device')).not.toBeInTheDocument();
    });

    it('renders without intended use when not provided', () => {
      const projectWithoutIntendedUse = generateMockProject({
        ...mockProject,
        intended_use: undefined,
      });

      renderWithProviders(
        <ProjectCard project={projectWithoutIntendedUse} />,
        { session: mockSession }
      );

      expect(screen.queryByText('Intended Use:')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<ProjectCard {...defaultProps} />, { session: mockSession });

      const card = screen.getByTestId('project-card');
      const menuButton = screen.getByRole('button', { name: /open menu/i });

      // Both card and menu button should be focusable
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(menuButton).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      renderWithProviders(<ProjectCard project={mockProject} />, { session: mockSession });

      const card = screen.getByTestId('project-card');
      
      expect(() => {
        fireEvent.click(card);
      }).not.toThrow();
    });

    it('handles async operation errors gracefully', async () => {
      const mockOnDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      
      renderWithProviders(
        <ProjectCard {...defaultProps} onDelete={mockOnDelete} />,
        { session: mockSession }
      );

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Project');
        fireEvent.click(deleteButton);
      });

      // Should handle error and reset state
      await waitFor(() => {
        expect(screen.getByText('Delete Project')).toBeInTheDocument();
      });
    });
  });
});

describe('ProjectCardSkeleton Component', () => {
  it('renders skeleton loader correctly', () => {
    renderWithProviders(<ProjectCardSkeleton />, { session: createMockSession() });

    const skeleton = screen.getByTestId('project-card-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const customClass = 'custom-skeleton-class';
    renderWithProviders(
      <ProjectCardSkeleton className={customClass} />,
      { session: createMockSession() }
    );

    const skeleton = screen.getByTestId('project-card-skeleton');
    expect(skeleton).toHaveClass(customClass);
  });
});