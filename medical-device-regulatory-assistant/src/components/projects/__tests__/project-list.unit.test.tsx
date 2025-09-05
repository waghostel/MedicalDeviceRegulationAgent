/**
 * Unit tests for ProjectList component
 * Tests project rendering, search, filtering, and empty states
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { ProjectList } from '../project-list';
import { generateMockProjects } from '@/lib/mock-data';
import { ProjectStatus } from '@/types/project';

// Mock the hooks
jest.mock('@/hooks/use-projects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@/hooks/use-websocket', () => ({
  useProjectWebSocket: jest.fn(),
}));

jest.mock('@/hooks/use-offline', () => ({
  useOffline: jest.fn(),
}));

// Mock the ProjectCard component
jest.mock('../project-card', () => ({
  ProjectCard: (props) => (
    <div data-testid="project-card" data-project-id={props.project.id}>
      <div>{props.project.name}</div>
      <div>{props.project.status}</div>
      <button onClick={() => props.onSelect?.(props.project)}>Select</button>
      <button onClick={() => props.onEdit?.(props.project)}>Edit</button>
      <button onClick={() => props.onDelete?.(props.project)}>Delete</button>
    </div>
  ),
  ProjectCardSkeleton: () => <div data-testid="project-card-skeleton">Loading...</div>,
}));

describe('ProjectList Component', () => {
  const mockSession = createMockSession();
  const mockProjects = generateMockProjects(3);
  
  const defaultMockHooks = {
    useProjects: {
      projects: mockProjects,
      loading: false,
      error: null,
      hasMore: false,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      searchProjects: jest.fn(),
      filterProjects: jest.fn(),
      loadMore: jest.fn(),
      refreshProjects: jest.fn(),
    },
    useProjectWebSocket: jest.fn(),
    useOffline: {
      isOffline: false,
      pendingActions: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    const { useProjects } = require('@/hooks/use-projects');
    const { useProjectWebSocket } = require('@/hooks/use-websocket');
    const { useOffline } = require('@/hooks/use-offline');
    
    useProjects.mockReturnValue(defaultMockHooks.useProjects);
    useProjectWebSocket.mockReturnValue(undefined);
    useOffline.mockReturnValue(defaultMockHooks.useOffline);
  });

  describe('Basic Rendering', () => {
    it('renders header with title and description', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Manage your medical device regulatory projects')).toBeInTheDocument();
    });

    it('renders new project button', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('renders search and filter section', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('Search & Filter')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument();
    });
  });

  describe('Project Display', () => {
    it('renders project cards for each project', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      const projectCards = screen.getAllByTestId('project-card');
      expect(projectCards).toHaveLength(mockProjects.length);

      mockProjects.forEach((project, index) => {
        expect(projectCards[index]).toHaveAttribute('data-project-id', project.id.toString());
        expect(screen.getByText(project.name)).toBeInTheDocument();
      });
    });

    it('shows loading skeletons when loading', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        loading: true,
        projects: [],
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const skeletons = screen.getAllByTestId('project-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows empty state when no projects exist', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        projects: [],
        loading: false,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first project')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first project/i })).toBeInTheDocument();
    });

    it('shows filtered empty state message', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        projects: [],
        loading: false,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      // Simulate search
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls searchProjects when search input changes', async () => {
      const mockSearchProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        searchProjects: mockSearchProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'cardiac' } });

      // Should debounce the search
      await waitFor(() => {
        expect(mockSearchProjects).toHaveBeenCalledWith('cardiac');
      }, { timeout: 500 });
    });

    it('debounces search input', async () => {
      const mockSearchProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        searchProjects: mockSearchProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      
      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'c' } });
      fireEvent.change(searchInput, { target: { value: 'ca' } });
      fireEvent.change(searchInput, { target: { value: 'car' } });

      // Should only call search once after debounce
      await waitFor(() => {
        expect(mockSearchProjects).toHaveBeenCalledTimes(1);
        expect(mockSearchProjects).toHaveBeenCalledWith('car');
      }, { timeout: 500 });
    });
  });

  describe('Filter Functionality', () => {
    it('calls filterProjects when status filter changes', () => {
      const mockFilterProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const statusFilter = screen.getByRole('combobox', { name: /all status/i });
      fireEvent.click(statusFilter);
      
      const inProgressOption = screen.getByRole('option', { name: /in progress/i });
      fireEvent.click(inProgressOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        status: ProjectStatus.IN_PROGRESS,
      });
    });

    it('calls filterProjects when device type filter changes', () => {
      const mockFilterProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const deviceTypeFilter = screen.getByRole('combobox', { name: /device type/i });
      fireEvent.click(deviceTypeFilter);
      
      // Assuming there's a device type option available
      const deviceTypeOption = screen.getByRole('option', { name: /cardiovascular device/i });
      fireEvent.click(deviceTypeOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        device_type: 'Cardiovascular Device',
      });
    });

    it('combines multiple filters', () => {
      const mockFilterProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      // Set status filter
      const statusFilter = screen.getByRole('combobox', { name: /all status/i });
      fireEvent.click(statusFilter);
      const inProgressOption = screen.getByRole('option', { name: /in progress/i });
      fireEvent.click(inProgressOption);

      // Set device type filter
      const deviceTypeFilter = screen.getByRole('combobox', { name: /device type/i });
      fireEvent.click(deviceTypeFilter);
      const deviceTypeOption = screen.getByRole('option', { name: /cardiovascular device/i });
      fireEvent.click(deviceTypeOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        status: ProjectStatus.IN_PROGRESS,
        device_type: 'Cardiovascular Device',
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onCreateProject when new project button is clicked', () => {
      const mockOnCreateProject = jest.fn();
      renderWithProviders(
        <ProjectList onCreateProject={mockOnCreateProject} />,
        { session: mockSession }
      );

      const newProjectButton = screen.getByRole('button', { name: /new project/i });
      fireEvent.click(newProjectButton);

      expect(mockOnCreateProject).toHaveBeenCalled();
    });

    it('calls onSelectProject when project card is selected', () => {
      const mockOnSelectProject = jest.fn();
      renderWithProviders(
        <ProjectList onSelectProject={mockOnSelectProject} />,
        { session: mockSession }
      );

      const selectButton = screen.getAllByText('Select')[0];
      fireEvent.click(selectButton);

      expect(mockOnSelectProject).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('calls onEditProject when project card is edited', () => {
      const mockOnEditProject = jest.fn();
      renderWithProviders(
        <ProjectList onEditProject={mockOnEditProject} />,
        { session: mockSession }
      );

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      expect(mockOnEditProject).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('calls refreshProjects when refresh button is clicked', () => {
      const mockRefreshProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        refreshProjects: mockRefreshProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefreshProjects).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner on refresh button when loading', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        loading: true,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const spinner = refreshButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows load more button when hasMore is true', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        hasMore: true,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByRole('button', { name: /load more projects/i })).toBeInTheDocument();
    });

    it('calls loadMore when load more button is clicked', () => {
      const mockLoadMore = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        hasMore: true,
        loadMore: mockLoadMore,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const loadMoreButton = screen.getByRole('button', { name: /load more projects/i });
      fireEvent.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('shows loading more indicator when loading with existing projects', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        loading: true,
        projects: mockProjects, // Has existing projects
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('Loading more projects...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        error: 'Failed to load projects',
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('Error loading projects:')).toBeInTheDocument();
      expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls refreshProjects when try again button is clicked', () => {
      const mockRefreshProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        error: 'Failed to load projects',
        refreshProjects: mockRefreshProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);

      expect(mockRefreshProjects).toHaveBeenCalled();
    });
  });

  describe('Offline Support', () => {
    it('shows offline badge when offline', () => {
      const { useOffline } = require('@/hooks/use-offline');
      useOffline.mockReturnValue({
        isOffline: true,
        pendingActions: [
          { endpoint: '/api/projects/1', method: 'POST' },
          { endpoint: '/api/projects/2', method: 'PUT' },
        ],
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.getByText('Offline (2 pending)')).toBeInTheDocument();
    });

    it('does not show offline badge when online', () => {
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('sets up WebSocket connection for real-time updates', () => {
      const { useProjectWebSocket } = require('@/hooks/use-websocket');
      
      renderWithProviders(<ProjectList />, { session: mockSession });

      expect(useProjectWebSocket).toHaveBeenCalledWith(
        null,
        expect.any(Function)
      );
    });

    it('refreshes projects when WebSocket message is received', () => {
      const mockRefreshProjects = jest.fn();
      const { useProjects } = require('@/hooks/use-projects');
      const { useProjectWebSocket } = require('@/hooks/use-websocket');
      
      useProjects.mockReturnValue({
        ...defaultMockHooks.useProjects,
        refreshProjects: mockRefreshProjects,
      });

      renderWithProviders(<ProjectList />, { session: mockSession });

      // Get the WebSocket message handler
      const messageHandler = useProjectWebSocket.mock.calls[0][1];
      
      // Simulate WebSocket message
      messageHandler({ type: 'project_updated', data: {} });

      expect(mockRefreshProjects).toHaveBeenCalled();
    });
  });
});