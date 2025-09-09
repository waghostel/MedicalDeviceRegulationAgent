/**
 * Unit tests for ProjectList component
 * Tests search, filtering, loading states, and user interactions
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectList } from '@/components/projects/project-list';
import { useProjects } from '@/hooks/use-projects';
import { useProjectWebSocket } from '@/hooks/use-websocket';
import { useOffline } from '@/hooks/use-offline';
import { Project, ProjectStatus } from '@/types/project';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';

// Mock hooks
jest.mock('@/hooks/use-projects');
jest.mock('@/hooks/use-websocket');
jest.mock('@/hooks/use-offline');
jest.mock('@/lib/performance/optimization', () => ({
  useVirtualScrolling: jest.fn(() => ({
    visibleItems: [],
    totalHeight: 0,
    offsetY: 0,
    handleScroll: jest.fn(),
  })),
  useDebouncedCallback: jest.fn((fn) => fn),
  useRenderPerformance: jest.fn(),
}));

const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseProjectWebSocket = useProjectWebSocket as jest.MockedFunction<
  typeof useProjectWebSocket
>;
const mockUseOffline = useOffline as jest.MockedFunction<typeof useOffline>;

// Mock project data
const mockProjects: Project[] = [
  {
    id: 1,
    user_id: 'user-1',
    name: 'Cardiac Monitor X1',
    description: 'Advanced cardiac monitoring device',
    device_type: 'Cardiovascular Device',
    intended_use: 'Continuous cardiac rhythm monitoring',
    status: ProjectStatus.IN_PROGRESS,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 2,
    user_id: 'user-1',
    name: 'Blood Glucose Meter',
    description: 'Portable glucose monitoring system',
    device_type: 'Diagnostic Device',
    intended_use: 'Blood glucose measurement',
    status: ProjectStatus.DRAFT,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 3,
    user_id: 'user-1',
    name: 'Surgical Robot',
    description: 'Robotic surgical assistance system',
    device_type: 'Surgical Instrument',
    intended_use: 'Minimally invasive surgery assistance',
    status: ProjectStatus.COMPLETED,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
];

const defaultMockUseProjects = {
  projects: mockProjects,
  loading: false,
  error: undefined,
  hasMore: false,
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  searchProjects: jest.fn(),
  filterProjects: jest.fn(),
  loadMore: jest.fn(),
  refreshProjects: jest.fn(),
};

const defaultMockUseOffline = {
  isOffline: false,
  pendingActions: [],
};

describe('ProjectList Component', () => {
  const mockOnCreateProject = jest.fn();
  const mockOnSelectProject = jest.fn();
  const mockOnEditProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjects.mockReturnValue(defaultMockUseProjects);
    mockUseProjectWebSocket.mockReturnValue(undefined);
    mockUseOffline.mockReturnValue(defaultMockUseOffline);
  });

  describe('Rendering', () => {
    it('renders project list with header and controls', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(
        screen.getByText('Manage your medical device regulatory projects')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /new project/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument();
    });

    it('renders search and filter controls', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(
        screen.getByPlaceholderText(/search projects/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: /all status/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: /device type/i })
      ).toBeInTheDocument();
    });

    it('renders project cards for each project', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText('Cardiac Monitor X1')).toBeInTheDocument();
      expect(screen.getByText('Blood Glucose Meter')).toBeInTheDocument();
      expect(screen.getByText('Surgical Robot')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when loading and no projects', () => {
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        projects: [],
        loading: true,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText(/loading your projects/i)).toBeInTheDocument();
    });

    it('shows loading indicators when loading more projects', () => {
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        loading: true,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText(/loading more projects/i)).toBeInTheDocument();
    });

    it('disables controls when loading', () => {
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        loading: true,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByPlaceholderText(/search projects/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });
  });

  describe('Error States', () => {
    it('displays error message when there is an error', () => {
      const errorMessage = 'Failed to load projects';
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        error: errorMessage,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument();
    });

    it('calls refreshProjects when try again button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefreshProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        error: 'Failed to load projects',
        refreshProjects: mockRefreshProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      expect(mockRefreshProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no projects and not loading', () => {
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        projects: [],
        loading: false,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(
        screen.getByText(/get started by creating your first project/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create your first project/i })
      ).toBeInTheDocument();
    });

    it('shows filtered empty state when search returns no results', () => {
      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        projects: [],
        loading: false,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Simulate search input
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(
        screen.getByText(/try adjusting your search or filters/i)
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls searchProjects when search input changes', async () => {
      const user = userEvent.setup();
      const mockSearchProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        searchProjects: mockSearchProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await user.type(searchInput, 'cardiac');

      // Should be debounced, so wait for the call
      await waitFor(() => {
        expect(mockSearchProjects).toHaveBeenCalledWith('cardiac');
      });
    });

    it('clears search when input is cleared', async () => {
      const user = userEvent.setup();
      const mockSearchProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        searchProjects: mockSearchProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await user.type(searchInput, 'cardiac');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(mockSearchProjects).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Filter Functionality', () => {
    it('calls filterProjects when status filter changes', async () => {
      const user = userEvent.setup();
      const mockFilterProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Open status filter dropdown
      const statusFilter = screen.getByRole('combobox', {
        name: /all status/i,
      });
      await user.click(statusFilter);

      // Select "In Progress" option
      const inProgressOption = screen.getByRole('option', {
        name: /in progress/i,
      });
      await user.click(inProgressOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        status: ProjectStatus.IN_PROGRESS,
      });
    });

    it('calls filterProjects when device type filter changes', async () => {
      const user = userEvent.setup();
      const mockFilterProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Open device type filter dropdown
      const deviceTypeFilter = screen.getByRole('combobox', {
        name: /device type/i,
      });
      await user.click(deviceTypeFilter);

      // Select "Cardiovascular Device" option
      const cardiovascularOption = screen.getByRole('option', {
        name: /cardiovascular device/i,
      });
      await user.click(cardiovascularOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        device_type: 'Cardiovascular Device',
      });
    });

    it('combines multiple filters correctly', async () => {
      const user = userEvent.setup();
      const mockFilterProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        filterProjects: mockFilterProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Set status filter
      const statusFilter = screen.getByRole('combobox', {
        name: /all status/i,
      });
      await user.click(statusFilter);
      const draftOption = screen.getByRole('option', { name: /draft/i });
      await user.click(draftOption);

      // Set device type filter
      const deviceTypeFilter = screen.getByRole('combobox', {
        name: /device type/i,
      });
      await user.click(deviceTypeFilter);
      const diagnosticOption = screen.getByRole('option', {
        name: /diagnostic device/i,
      });
      await user.click(diagnosticOption);

      expect(mockFilterProjects).toHaveBeenCalledWith({
        status: ProjectStatus.DRAFT,
        device_type: 'Diagnostic Device',
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onCreateProject when New Project button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const newProjectButton = screen.getByRole('button', {
        name: /new project/i,
      });
      await user.click(newProjectButton);

      expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
    });

    it('calls refreshProjects when Refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefreshProjects = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        refreshProjects: mockRefreshProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefreshProjects).toHaveBeenCalledTimes(1);
    });

    it('calls loadMore when Load More button is clicked', async () => {
      const user = userEvent.setup();
      const mockLoadMore = jest.fn();

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        hasMore: true,
        loadMore: mockLoadMore,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const loadMoreButton = screen.getByRole('button', {
        name: /load more projects/i,
      });
      await user.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Offline Support', () => {
    it('shows offline indicator when offline', () => {
      mockUseOffline.mockReturnValue({
        isOffline: true,
        pendingActions: [
          { endpoint: '/api/projects/1', method: 'PUT', data: {} },
          { endpoint: '/api/projects', method: 'POST', data: {} },
        ],
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(screen.getByText(/offline \(2 pending\)/i)).toBeInTheDocument();
    });

    it('filters pending actions to show only project-related ones', () => {
      mockUseOffline.mockReturnValue({
        isOffline: true,
        pendingActions: [
          { endpoint: '/api/projects/1', method: 'PUT', data: {} },
          { endpoint: '/api/users/profile', method: 'PUT', data: {} },
          { endpoint: '/api/projects', method: 'POST', data: {} },
        ],
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Should only show 2 project-related pending actions
      expect(screen.getByText(/offline \(2 pending\)/i)).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('sets up WebSocket message handler', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(mockUseProjectWebSocket).toHaveBeenCalledWith(
        null,
        expect.any(Function)
      );
    });

    it('refreshes projects when WebSocket message is received', () => {
      const mockRefreshProjects = jest.fn();
      let messageHandler: (message: any) => void;

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        refreshProjects: mockRefreshProjects,
      });

      mockUseProjectWebSocket.mockImplementation((projectId, handler) => {
        messageHandler = handler;
        return undefined;
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Simulate WebSocket message
      messageHandler!({ type: 'project_updated', project_id: 1 });

      expect(mockRefreshProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      expect(
        screen.getByRole('button', { name: /new project/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: /search/i })
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      const newProjectButton = screen.getByRole('button', {
        name: /new project/i,
      });

      // Tab to the button and press Enter
      await user.tab();
      expect(newProjectButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Optimizations', () => {
    it('uses virtual scrolling for large lists', () => {
      const manyProjects = Array.from({ length: 50 }, (_, i) => ({
        ...mockProjects[0],
        id: i + 1,
        name: `Project ${i + 1}`,
      }));

      mockUseProjects.mockReturnValue({
        ...defaultMockUseProjects,
        projects: manyProjects,
      });

      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // Virtual scrolling should be used for large lists
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    it('does not use virtual scrolling for small lists', () => {
      renderWithProviders(
        <ProjectList
          onCreateProject={mockOnCreateProject}
          onSelectProject={mockOnSelectProject}
          onEditProject={mockOnEditProject}
        />
      );

      // All projects should be rendered directly for small lists
      expect(screen.getByText('Cardiac Monitor X1')).toBeInTheDocument();
      expect(screen.getByText('Blood Glucose Meter')).toBeInTheDocument();
      expect(screen.getByText('Surgical Robot')).toBeInTheDocument();
    });
  });
});
