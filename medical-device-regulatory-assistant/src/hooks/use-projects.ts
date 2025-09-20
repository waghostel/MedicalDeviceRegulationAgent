/**
 * React hooks for project management with loading states, error handling, and optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { projectService } from '@/lib/services/project-service';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectDashboardData,
  ProjectSearchFilters,
  ProjectListState,
  ProjectDetailState,
} from '@/types/project';

/**
 * Hook for managing project list with search, filtering, and pagination
 */
export function useProjects(initialFilters: ProjectSearchFilters = {}) {
  const [state, setState] = useState<ProjectListState>({
    projects: [],
    loading: true,
    filters: initialFilters,
    totalCount: 0,
    hasMore: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadProjects = useCallback(
    async (filters: ProjectSearchFilters = state.filters) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      try {
        const projects = await projectService.getProjects(filters);

        setState((prev) => ({
          ...prev,
          projects,
          loading: false,
          filters,
          totalCount: projects.length,
          hasMore: projects.length === (filters.limit || 50),
        }));
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Failed to load projects',
          }));
        }
      }
    },
    [state.filters]
  );

  const createProject = useCallback(
    async (projectData: ProjectCreateRequest): Promise<Project | null> => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        const newProject = await projectService.createProject(projectData);

        // Add to local state optimistically
        setState((prev) => ({
          ...prev,
          projects: [newProject, ...prev.projects],
          loading: false,
          totalCount: prev.totalCount + 1,
        }));

        toast({
          title: 'Project Created',
          description: `Project "${newProject.name}" has been created successfully.`,
        });

        return newProject;
      } catch (error: any) {
        setState((prev) => ({ ...prev, loading: false }));
        toast({
          title: 'Failed to Create Project',
          description:
            error.message || 'An error occurred while creating the project.',
          variant: 'destructive',
        });
        return null;
      }
    },
    []
  );

  const updateProject = useCallback(
    async (
      projectId: number,
      projectData: ProjectUpdateRequest
    ): Promise<Project | null> => {
      try {
        // Optimistic update
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  ...projectData,
                  updated_at: new Date().toISOString(),
                }
              : project
          ),
        }));

        const updatedProject = await projectService.updateProject(
          projectId,
          projectData
        );

        // Update with real data
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((project) =>
            project.id === projectId ? updatedProject : project
          ),
        }));

        toast({
          title: 'Project Updated',
          description: `Project "${updatedProject.name}" has been updated successfully.`,
        });

        return updatedProject;
      } catch (error: any) {
        // Revert optimistic update
        await loadProjects();

        toast({
          title: 'Failed to Update Project',
          description:
            error.message || 'An error occurred while updating the project.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [loadProjects]
  );

  const deleteProject = useCallback(
    async (projectId: number): Promise<boolean> => {
      const projectToDelete = state.projects.find((p) => p.id === projectId);

      try {
        // Optimistic removal
        setState((prev) => ({
          ...prev,
          projects: prev.projects.filter((project) => project.id !== projectId),
          totalCount: prev.totalCount - 1,
        }));

        await projectService.deleteProject(projectId);

        toast({
          title: 'Project Deleted',
          description: `Project "${projectToDelete?.name}" has been deleted successfully.`,
        });

        return true;
      } catch (error: any) {
        // Revert optimistic removal
        await loadProjects();

        toast({
          title: 'Failed to Delete Project',
          description:
            error.message || 'An error occurred while deleting the project.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [state.projects, loadProjects]
  );

  const searchProjects = useCallback(
    async (query: string) => {
      const newFilters = { ...state.filters, search: query, offset: 0 };
      await loadProjects(newFilters);
    },
    [state.filters, loadProjects]
  );

  const filterProjects = useCallback(
    async (filters: Partial<ProjectSearchFilters>) => {
      const newFilters = { ...state.filters, ...filters, offset: 0 };
      await loadProjects(newFilters);
    },
    [state.filters, loadProjects]
  );

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;

    const newFilters = {
      ...state.filters,
      offset: (state.filters.offset || 0) + (state.filters.limit || 50),
    };

    try {
      const moreProjects = await projectService.getProjects(newFilters);

      setState((prev) => ({
        ...prev,
        projects: [...prev.projects, ...moreProjects],
        filters: newFilters,
        hasMore: moreProjects.length === (newFilters.limit || 50),
      }));
    } catch (error: any) {
      toast({
        title: 'Failed to Load More Projects',
        description:
          error.message || 'An error occurred while loading more projects.',
        variant: 'destructive',
      });
    }
  }, [state.hasMore, state.loading, state.filters]);

  const refreshProjects = useCallback(() => {
    projectService.clearCache();
    return loadProjects();
  }, [loadProjects]);

  // Load projects on mount and filter changes
  useEffect(() => {
    loadProjects();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    filterProjects,
    loadMore,
    refreshProjects,
  };
}

/**
 * Hook for managing a single project with dashboard data
 */
export function useProject(projectId: number | null) {
  const [state, setState] = useState<ProjectDetailState>({
    loading: true,
  });

  const router = useRouter();

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setState({ loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const [project, dashboardData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectDashboard(projectId),
      ]);

      setState({
        project,
        dashboardData,
        loading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load project',
      }));
    }
  }, [projectId]);

  const updateProject = useCallback(
    async (projectData: ProjectUpdateRequest): Promise<boolean> => {
      if (!projectId || !state.project) return false;

      try {
        // Optimistic update
        setState((prev) => ({
          ...prev,
          project: prev.project
            ? { ...prev.project, ...projectData }
            : undefined,
        }));

        const updatedProject = await projectService.updateProject(
          projectId,
          projectData
        );

        setState((prev) => ({
          ...prev,
          project: updatedProject,
          lastUpdated: new Date().toISOString(),
        }));

        toast({
          title: 'Project Updated',
          description: `Project "${updatedProject.name}" has been updated successfully.`,
        });

        return true;
      } catch (error: any) {
        // Revert optimistic update
        await loadProject();

        toast({
          title: 'Failed to Update Project',
          description:
            error.message || 'An error occurred while updating the project.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [projectId, state.project, loadProject]
  );

  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!projectId || !state.project) return false;

    try {
      await projectService.deleteProject(projectId);

      toast({
        title: 'Project Deleted',
        description: `Project "${state.project.name}" has been deleted successfully.`,
      });

      // Navigate back to projects list
      router.push('/projects');

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to Delete Project',
        description:
          error.message || 'An error occurred while deleting the project.',
        variant: 'destructive',
      });
      return false;
    }
  }, [projectId, state.project, router]);

  const refreshProject = useCallback(() => {
    projectService.clearCache();
    return loadProject();
  }, [loadProject]);

  const exportProject = useCallback(
    async (format: 'json' | 'pdf' = 'json') => {
      if (!projectId) return;

      try {
        const blob = await projectService.exportProject(projectId, format);

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${projectId}_export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Complete',
          description: `Project has been exported as ${format.toUpperCase()}.`,
        });
      } catch (error: any) {
        toast({
          title: 'Export Failed',
          description:
            error.message || 'An error occurred while exporting the project.',
          variant: 'destructive',
        });
      }
    },
    [projectId]
  );

  // Load project on mount and ID changes
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return {
    ...state,
    updateProject,
    deleteProject,
    refreshProject,
    exportProject,
  };
}

/**
 * Hook for project statistics
 */
export function useProjectStats() {
  const [stats, setStats] = useState<{
    total: number;
    by_status: Record<string, number>;
    by_device_type: Record<string, number>;
    recent_activity: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const statsData = await projectService.getProjectStats();
      setStats(statsData);
    } catch (error: any) {
      setError(error.message || 'Failed to load project statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: loadStats,
  };
}
