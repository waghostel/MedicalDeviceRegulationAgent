/**
 * Project API Service
 * Handles all project-related API calls with caching, optimistic updates, and error handling
 */

import { apiClient, ApiResponse } from '@/lib/api-client';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectDashboardData,
  ProjectSearchFilters,
  ProjectExportData,
  PaginatedResponse,
  OptimisticUpdate,
} from '@/types/project';

export class ProjectService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectCreateRequest): Promise<Project> {
    try {
      const response = await apiClient.post<Project>('/api/projects', projectData);
      
      // Invalidate project list cache
      this.invalidateCache('projects-list');
      
      return response.data;
    } catch (error: any) {
      // Enhanced error handling for backend integration
      if (error.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      } else if (error.status === 400) {
        throw new Error(error.details?.message || 'Invalid project data provided.');
      } else if (error.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(error.message || 'Failed to create project.');
    }
  }

  /**
   * Get list of projects with search and filtering
   */
  async getProjects(filters: ProjectSearchFilters = {}): Promise<Project[]> {
    const cacheKey = `projects-list-${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this.getCached<Project[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.device_type) params.append('device_type', filters.device_type);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<Project[]>(endpoint);
    
    // Cache the results
    this.setCache(cacheKey, response.data);
    
    return response.data;
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: number): Promise<Project> {
    const cacheKey = `project-${projectId}`;
    
    // Check cache first
    const cached = this.getCached<Project>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await apiClient.get<Project>(`/api/projects/${projectId}`);
    
    // Cache the result
    this.setCache(cacheKey, response.data);
    
    return response.data;
  }

  /**
   * Update a project
   */
  async updateProject(projectId: number, projectData: ProjectUpdateRequest): Promise<Project> {
    try {
      const response = await apiClient.put<Project>(`/api/projects/${projectId}`, projectData);
      
      // Invalidate related cache entries
      this.invalidateCache(`project-${projectId}`);
      this.invalidateCache('projects-list');
      this.invalidateCache(`dashboard-${projectId}`);
      
      return response.data;
    } catch (error: any) {
      // Enhanced error handling for backend integration
      if (error.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      } else if (error.status === 404) {
        throw new Error('Project not found or access denied.');
      } else if (error.status === 400) {
        throw new Error(error.details?.message || 'Invalid project data provided.');
      } else if (error.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(error.message || 'Failed to update project.');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/projects/${projectId}`);
      
      // Invalidate related cache entries
      this.invalidateCache(`project-${projectId}`);
      this.invalidateCache('projects-list');
      this.invalidateCache(`dashboard-${projectId}`);
    } catch (error: any) {
      // Enhanced error handling for backend integration
      if (error.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      } else if (error.status === 404) {
        throw new Error('Project not found or access denied.');
      } else if (error.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(error.message || 'Failed to delete project.');
    }
  }

  /**
   * Get project dashboard data
   */
  async getProjectDashboard(projectId: number): Promise<ProjectDashboardData> {
    const cacheKey = `dashboard-${projectId}`;
    
    // Check cache first (shorter TTL for dashboard data)
    const cached = this.getCached<ProjectDashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<ProjectDashboardData>(`/api/projects/${projectId}/dashboard`);
      
      // Cache with shorter TTL (2 minutes for dashboard data)
      this.setCache(cacheKey, response.data, 2 * 60 * 1000);
      
      return response.data;
    } catch (error: any) {
      // Enhanced error handling for backend integration
      if (error.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      } else if (error.status === 404) {
        throw new Error('Project not found or access denied.');
      } else if (error.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(error.message || 'Failed to get project dashboard.');
    }
  }

  /**
   * Export project data
   */
  async exportProject(projectId: number, format: 'json' | 'pdf' = 'json'): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/api/projects/${projectId}/export?format=${format}`,
      {
        headers: {
          'Accept': format === 'json' ? 'application/json' : 'application/pdf',
        },
      }
    );
    
    return response.data;
  }

  /**
   * Optimistic update - immediately update local state before API call
   */
  async updateProjectOptimistic(
    projectId: number,
    projectData: ProjectUpdateRequest,
    onOptimisticUpdate?: (project: Project) => void
  ): Promise<Project> {
    // Get current project data
    const currentProject = await this.getProject(projectId);
    
    // Create optimistic update
    const optimisticProject: Project = {
      ...currentProject,
      ...projectData,
      updated_at: new Date().toISOString(),
    };
    
    // Immediately update UI
    if (onOptimisticUpdate) {
      onOptimisticUpdate(optimisticProject);
    }
    
    try {
      // Make actual API call
      const updatedProject = await this.updateProject(projectId, projectData);
      
      // Update cache with real data
      this.setCache(`project-${projectId}`, updatedProject);
      
      return updatedProject;
    } catch (error) {
      // Revert optimistic update on error
      if (onOptimisticUpdate) {
        onOptimisticUpdate(currentProject);
      }
      throw error;
    }
  }

  /**
   * Batch operations for multiple projects
   */
  async batchUpdateProjects(updates: Array<{ id: number; data: ProjectUpdateRequest }>): Promise<Project[]> {
    const promises = updates.map(({ id, data }) => this.updateProject(id, data));
    return Promise.all(promises);
  }

  /**
   * Search projects with debouncing support
   */
  async searchProjects(
    query: string,
    filters: Omit<ProjectSearchFilters, 'search'> = {},
    signal?: AbortSignal
  ): Promise<Project[]> {
    const searchFilters: ProjectSearchFilters = {
      ...filters,
      search: query,
    };
    
    return this.getProjects(searchFilters);
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_device_type: Record<string, number>;
    recent_activity: number;
  }> {
    const cacheKey = 'project-stats';
    
    // Check cache first
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // For now, calculate from project list
    // In the future, this could be a dedicated API endpoint
    const projects = await this.getProjects({ limit: 1000 });
    
    const stats = {
      total: projects.length,
      by_status: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_device_type: projects.reduce((acc, project) => {
        if (project.device_type) {
          acc[project.device_type] = (acc[project.device_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      recent_activity: projects.filter(
        project => new Date(project.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
    };
    
    // Cache for 10 minutes
    this.setCache(cacheKey, stats, 10 * 60 * 1000);
    
    return stats;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Preload project data for better UX
   */
  async preloadProject(projectId: number): Promise<void> {
    // Preload both project details and dashboard data
    await Promise.all([
      this.getProject(projectId),
      this.getProjectDashboard(projectId),
    ]);
  }
}

// Export singleton instance
export const projectService = new ProjectService();