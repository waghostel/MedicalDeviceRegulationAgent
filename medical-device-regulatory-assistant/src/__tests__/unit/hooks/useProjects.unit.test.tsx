/**
 * Unit tests for useProjects hook
 * Tests CRUD operations, error handling, optimistic updates, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import { useProjects, useProject, useProjectStats } from '@/hooks/use-projects';
import { toast } from '@/hooks/use-toast';
import { projectService } from '@/lib/services/project-service';
import {
  Project,
  ProjectStatus,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectDashboardData,
  ProjectSearchFilters,
} from '@/types/project';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/services/project-service');
jest.mock('@/hooks/use-toast');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

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
];

const mockProject = mockProjects[0];

const mockDashboardData: ProjectDashboardData = {
  project: mockProject,
  classification_status: {
    has_classification: true,
    device_class: 'II' as any,
    product_code: 'DPS',
    regulatory_pathway: '510k' as any,
    confidence_score: 0.85,
  },
  predicate_summary: {
    total_predicates: 5,
    selected_predicates: 2,
    top_confidence_score: 0.92,
    last_search_date: '2024-01-02T00:00:00Z',
  },
  document_summary: {
    total_documents: 3,
    document_types: { FDA_510K: 2, USER_DOCUMENT: 1 },
    last_upload_date: '2024-01-01T00:00:00Z',
  },
  interaction_summary: {
    total_interactions: 10,
    recent_actions: ['device_classification', 'predicate_search'],
    last_interaction_date: '2024-01-02T00:00:00Z',
  },
  completion_percentage: 75,
};

describe('useProjects Hook', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockProjectService.getProjects.mockResolvedValue(mockProjects);
    mockProjectService.createProject.mockResolvedValue(mockProject);
    mockProjectService.updateProject.mockResolvedValue(mockProject);
    mockProjectService.deleteProject.mockResolvedValue(undefined);
    mockProjectService.clearCache.mockImplementation(() => {});
  });

  describe('Initial State and Loading', () => {
    it('initializes with loading state', () => {
      const { result } = renderHook(() => useProjects());

      expect(result.current.loading).toBe(true);
      expect(result.current.projects).toEqual([]);
      expect(result.current.error).toBeUndefined();
      expect(result.current.hasMore).toBe(false);
      expect(result.current.totalCount).toBe(0);
    });

    it('loads projects on mount', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.totalCount).toBe(mockProjects.length);
      expect(mockProjectService.getProjects).toHaveBeenCalledWith({});
    });

    it('applies initial filters', async () => {
      const initialFilters: ProjectSearchFilters = {
        status: ProjectStatus.IN_PROGRESS,
        limit: 10,
      };

      const { result } = renderHook(() => useProjects(initialFilters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith(
        initialFilters
      );
      expect(result.current.filters).toEqual(initialFilters);
    });

    it('handles loading errors', async () => {
      const errorMessage = 'Failed to load projects';
      mockProjectService.getProjects.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.projects).toEqual([]);
    });
  });

  describe('Create Project', () => {
    it('creates project successfully with optimistic update', async () => {
      const { result } = renderHook(() => useProjects());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const createData: ProjectCreateRequest = {
        name: 'New Project',
        description: 'Test description',
        device_type: 'Test Device',
        intended_use: 'Test use',
      };

      let createdProject: Project | null = null;

      await act(async () => {
        createdProject = await result.current.createProject(createData);
      });

      expect(createdProject).toEqual(mockProject);
      expect(result.current.projects).toContain(mockProject);
      expect(result.current.totalCount).toBe(mockProjects.length + 1);
      expect(mockProjectService.createProject).toHaveBeenCalledWith(createData);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Created',
        description: `Project "${mockProject.name}" has been created successfully.`,
      });
    });

    it('handles create project errors', async () => {
      const errorMessage = 'Failed to create project';
      mockProjectService.createProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const createData: ProjectCreateRequest = {
        name: 'New Project',
        description: 'Test description',
      };

      let createdProject: Project | null = null;

      await act(async () => {
        createdProject = await result.current.createProject(createData);
      });

      expect(createdProject).toBeNull();
      expect(result.current.projects).toEqual(mockProjects);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Create Project',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Update Project', () => {
    it('updates project successfully with optimistic update', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateData: ProjectUpdateRequest = {
        name: 'Updated Project Name',
        status: ProjectStatus.COMPLETED,
      };

      const updatedProject = { ...mockProject, ...updateData };
      mockProjectService.updateProject.mockResolvedValue(updatedProject);

      let result_project: Project | null = null;

      await act(async () => {
        result_project = await result.current.updateProject(
          mockProject.id,
          updateData
        );
      });

      expect(result_project).toEqual(updatedProject);
      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        mockProject.id,
        updateData
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Updated',
        description: `Project "${updatedProject.name}" has been updated successfully.`,
      });
    });

    it('reverts optimistic update on error', async () => {
      const errorMessage = 'Failed to update project';
      mockProjectService.updateProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateData: ProjectUpdateRequest = {
        name: 'Updated Project Name',
      };

      let result_project: Project | null = null;

      await act(async () => {
        result_project = await result.current.updateProject(
          mockProject.id,
          updateData
        );
      });

      expect(result_project).toBeNull();
      expect(result.current.projects).toEqual(mockProjects); // Should be reverted
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Update Project',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Delete Project', () => {
    it('deletes project successfully with optimistic update', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;

      await act(async () => {
        deleteResult = await result.current.deleteProject(mockProject.id);
      });

      expect(deleteResult).toBe(true);
      expect(result.current.projects).not.toContain(mockProject);
      expect(result.current.totalCount).toBe(mockProjects.length - 1);
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith(
        mockProject.id
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Deleted',
        description: `Project "${mockProject.name}" has been deleted successfully.`,
      });
    });

    it('reverts optimistic delete on error', async () => {
      const errorMessage = 'Failed to delete project';
      mockProjectService.deleteProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;

      await act(async () => {
        deleteResult = await result.current.deleteProject(mockProject.id);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.projects).toEqual(mockProjects); // Should be reverted
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Delete Project',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Search and Filter', () => {
    it('searches projects', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const searchQuery = 'cardiac';

      await act(async () => {
        await result.current.searchProjects(searchQuery);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith({
        search: searchQuery,
        offset: 0,
      });
    });

    it('filters projects', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const filters = {
        status: ProjectStatus.IN_PROGRESS,
        device_type: 'Cardiovascular Device',
      };

      await act(async () => {
        await result.current.filterProjects(filters);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith({
        ...filters,
        offset: 0,
      });
    });

    it('combines search and filter parameters', async () => {
      const initialFilters: ProjectSearchFilters = {
        search: 'initial',
        limit: 20,
      };

      const { result } = renderHook(() => useProjects(initialFilters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const additionalFilters = {
        status: ProjectStatus.DRAFT,
      };

      await act(async () => {
        await result.current.filterProjects(additionalFilters);
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith({
        search: 'initial',
        limit: 20,
        status: ProjectStatus.DRAFT,
        offset: 0,
      });
    });
  });

  describe('Load More (Pagination)', () => {
    it('loads more projects when hasMore is true', async () => {
      const { result } = renderHook(() => useProjects());

      // Set up initial state with hasMore = true
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Manually set hasMore to true for testing
      act(() => {
        (result.current as any).hasMore = true;
      });

      const moreProjects = [
        {
          ...mockProject,
          id: 3,
          name: 'Additional Project',
        },
      ];

      mockProjectService.getProjects.mockResolvedValue(moreProjects);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledWith({
        offset: 50, // Default limit is 50
        limit: 50,
      });
    });

    it('does not load more when hasMore is false', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockProjectService.getProjects.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockProjectService.getProjects).toHaveBeenCalledTimes(
        initialCallCount
      );
    });

    it('handles load more errors', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set hasMore to true
      act(() => {
        (result.current as any).hasMore = true;
      });

      const errorMessage = 'Failed to load more projects';
      mockProjectService.getProjects.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Load More Projects',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Refresh Projects', () => {
    it('clears cache and reloads projects', async () => {
      const { result } = renderHook(() => useProjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshProjects();
      });

      expect(mockProjectService.clearCache).toHaveBeenCalled();
      expect(mockProjectService.getProjects).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  describe('Abort Controller', () => {
    it('cancels previous requests when new ones are made', async () => {
      const { result } = renderHook(() => useProjects());

      // Make multiple rapid calls
      act(() => {
        result.current.searchProjects('query1');
        result.current.searchProjects('query2');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have the latest call
      expect(mockProjectService.getProjects).toHaveBeenLastCalledWith({
        search: 'query2',
        offset: 0,
      });
    });
  });
});

describe('useProject Hook', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    mockProjectService.getProject.mockResolvedValue(mockProject);
    mockProjectService.getProjectDashboard.mockResolvedValue(mockDashboardData);
    mockProjectService.updateProject.mockResolvedValue(mockProject);
    mockProjectService.deleteProject.mockResolvedValue(undefined);
    mockProjectService.exportProject.mockResolvedValue(
      new Blob(['test'], { type: 'application/json' })
    );
    mockProjectService.clearCache.mockImplementation(() => {});
  });

  describe('Initial State and Loading', () => {
    it('initializes with loading state when projectId is provided', () => {
      const { result } = renderHook(() => useProject(1));

      expect(result.current.loading).toBe(true);
      expect(result.current.project).toBeUndefined();
      expect(result.current.dashboardData).toBeUndefined();
    });

    it('initializes without loading when projectId is null', () => {
      const { result } = renderHook(() => useProject(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.project).toBeUndefined();
    });

    it('loads project and dashboard data on mount', async () => {
      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project).toEqual(mockProject);
      expect(result.current.dashboardData).toEqual(mockDashboardData);
      expect(mockProjectService.getProject).toHaveBeenCalledWith(1);
      expect(mockProjectService.getProjectDashboard).toHaveBeenCalledWith(1);
    });

    it('handles loading errors', async () => {
      const errorMessage = 'Failed to load project';
      mockProjectService.getProject.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.project).toBeUndefined();
    });
  });

  describe('Update Project', () => {
    it('updates project successfully with optimistic update', async () => {
      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateData: ProjectUpdateRequest = {
        name: 'Updated Project Name',
      };

      const updatedProject = { ...mockProject, ...updateData };
      mockProjectService.updateProject.mockResolvedValue(updatedProject);

      let updateResult: boolean = false;

      await act(async () => {
        updateResult = await result.current.updateProject(updateData);
      });

      expect(updateResult).toBe(true);
      expect(result.current.project).toEqual(updatedProject);
      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        1,
        updateData
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Updated',
        description: `Project "${updatedProject.name}" has been updated successfully.`,
      });
    });

    it('reverts optimistic update on error', async () => {
      const errorMessage = 'Failed to update project';
      mockProjectService.updateProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateData: ProjectUpdateRequest = {
        name: 'Updated Project Name',
      };

      let updateResult: boolean = false;

      await act(async () => {
        updateResult = await result.current.updateProject(updateData);
      });

      expect(updateResult).toBe(false);
      expect(result.current.project).toEqual(mockProject); // Should be reverted
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Update Project',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Delete Project', () => {
    it('deletes project successfully and navigates to projects list', async () => {
      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;

      await act(async () => {
        deleteResult = await result.current.deleteProject();
      });

      expect(deleteResult).toBe(true);
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith('/projects');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Project Deleted',
        description: `Project "${mockProject.name}" has been deleted successfully.`,
      });
    });

    it('handles delete errors', async () => {
      const errorMessage = 'Failed to delete project';
      mockProjectService.deleteProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;

      await act(async () => {
        deleteResult = await result.current.deleteProject();
      });

      expect(deleteResult).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Delete Project',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Export Project', () => {
    it('exports project successfully', async () => {
      // Mock URL.createObjectURL and related methods
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document methods
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation(mockAppendChild);
      jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation(mockRemoveChild);

      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.exportProject('json');
      });

      expect(mockProjectService.exportProject).toHaveBeenCalledWith(1, 'json');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export Complete',
        description: 'Project has been exported as JSON.',
      });

      // Cleanup mocks
      jest.restoreAllMocks();
    });

    it('handles export errors', async () => {
      const errorMessage = 'Failed to export project';
      mockProjectService.exportProject.mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.exportProject('pdf');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('Refresh Project', () => {
    it('clears cache and reloads project data', async () => {
      const { result } = renderHook(() => useProject(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshProject();
      });

      expect(mockProjectService.clearCache).toHaveBeenCalled();
      expect(mockProjectService.getProject).toHaveBeenCalledTimes(2); // Initial load + refresh
      expect(mockProjectService.getProjectDashboard).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useProjectStats Hook', () => {
  const mockStats = {
    total: 10,
    by_status: {
      draft: 3,
      in_progress: 5,
      completed: 2,
    },
    by_device_type: {
      'Cardiovascular Device': 4,
      'Diagnostic Device': 3,
      'Surgical Instrument': 3,
    },
    recent_activity: 7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getProjectStats.mockResolvedValue(mockStats);
  });

  it('loads project statistics on mount', async () => {
    const { result } = renderHook(() => useProjectStats());

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(mockProjectService.getProjectStats).toHaveBeenCalled();
  });

  it('handles loading errors', async () => {
    const errorMessage = 'Failed to load project statistics';
    mockProjectService.getProjectStats.mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useProjectStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.stats).toBeNull();
  });

  it('refreshes statistics', async () => {
    const { result } = renderHook(() => useProjectStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshStats();
    });

    expect(mockProjectService.getProjectStats).toHaveBeenCalledTimes(2);
  });
});
