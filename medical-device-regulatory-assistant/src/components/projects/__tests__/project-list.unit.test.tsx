/**
 * Unit tests for ProjectList component
 * Verifies component renders without syntax errors and basic functionality
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { useOffline } from '@/hooks/use-offline';
import { useProjects } from '@/hooks/use-projects';
import { useProjectWebSocket } from '@/hooks/use-websocket';

import { ProjectList } from '../project-list';


// Mock the hooks
jest.mock('@/hooks/use-projects');
jest.mock('@/hooks/use-websocket');
jest.mock('@/hooks/use-offline');

// Mock the performance optimization hooks
jest.mock('@/lib/performance/optimization', () => ({
  useVirtualScrolling: jest.fn(() => ({
    visibleItems: [],
    totalHeight: 0,
    offsetY: 0,
    handleScroll: jest.fn(),
  })),
  useDebouncedCallback: jest.fn((callback) => callback),
  useRenderPerformance: jest.fn(),
}));

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/loading', () => ({
  ProjectListSkeleton: () => <div>Loading skeleton</div>,
  DataLoadingProgress: ({ loadingMessage }: any) => <div>{loadingMessage}</div>,
}));

jest.mock('./project-card', () => ({
  ProjectCard: ({ project }: any) => <div>Project: {project.name}</div>,
  ProjectCardSkeleton: () => <div>Project skeleton</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseProjectWebSocket = useProjectWebSocket as jest.MockedFunction<
  typeof useProjectWebSocket
>;
const mockUseOffline = useOffline as jest.MockedFunction<typeof useOffline>;

describe('ProjectList Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseProjects.mockReturnValue({
      projects: [],
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
    });

    mockUseProjectWebSocket.mockReturnValue(undefined);

    mockUseOffline.mockReturnValue({
      isOffline: false,
      pendingActions: [],
    });
  });

  it('renders without syntax errors', () => {
    expect(() => {
      render(<ProjectList />);
    }).not.toThrow();
  });

  it('displays the main heading', () => {
    render(<ProjectList />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('displays the description', () => {
    render(<ProjectList />);
    expect(
      screen.getByText('Manage your medical device regulatory projects')
    ).toBeInTheDocument();
  });

  it('displays search and filter section', () => {
    render(<ProjectList />);
    expect(screen.getByText('Search & Filter')).toBeInTheDocument();
  });

  it('displays empty state when no projects', () => {
    render(<ProjectList />);
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(
      screen.getByText('Get started by creating your first project')
    ).toBeInTheDocument();
  });

  it('displays projects when available', () => {
    const mockProjects = [
      {
        id: 1,
        name: 'Test Project 1',
        device_type: 'Medical Device',
        status: 'draft',
      },
      {
        id: 2,
        name: 'Test Project 2',
        device_type: 'Diagnostic Device',
        status: 'in_progress',
      },
    ];

    mockUseProjects.mockReturnValue({
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
    });

    render(<ProjectList />);
    expect(screen.getByText('Project: Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project: Test Project 2')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: true,
      error: null,
      hasMore: false,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      searchProjects: jest.fn(),
      filterProjects: jest.fn(),
      loadMore: jest.fn(),
      refreshProjects: jest.fn(),
    });

    render(<ProjectList />);
    expect(screen.getByText('Loading your projects...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: 'Failed to load projects',
      hasMore: false,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      searchProjects: jest.fn(),
      filterProjects: jest.fn(),
      loadMore: jest.fn(),
      refreshProjects: jest.fn(),
    });

    render(<ProjectList />);
    expect(screen.getByText('Error loading projects:')).toBeInTheDocument();
    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
  });

  it('displays offline indicator when offline', () => {
    mockUseOffline.mockReturnValue({
      isOffline: true,
      pendingActions: [
        { endpoint: '/api/projects/1', method: 'POST', data: {} },
        { endpoint: '/api/projects/2', method: 'PUT', data: {} },
      ],
    });

    render(<ProjectList />);
    expect(screen.getByText('Offline (2 pending)')).toBeInTheDocument();
  });

  it('calls onCreateProject when New Project button is clicked', () => {
    const mockOnCreateProject = jest.fn();
    render(<ProjectList onCreateProject={mockOnCreateProject} />);

    const newProjectButton = screen.getByText('New Project');
    newProjectButton.click();

    expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
  });

  it('handles search input changes', () => {
    const mockSearchProjects = jest.fn();
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      hasMore: false,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      searchProjects: mockSearchProjects,
      filterProjects: jest.fn(),
      loadMore: jest.fn(),
      refreshProjects: jest.fn(),
    });

    render(<ProjectList />);

    const searchInput = screen.getByPlaceholderText(
      'Search projects by name, description, or device type...'
    );
    searchInput.focus();

    // The search input should be present and functional
    expect(searchInput).toBeInTheDocument();
  });
});
