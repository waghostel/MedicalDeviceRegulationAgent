/**
 * Project Service - Frontend service for project management
 * Handles API communication with the backend and local caching
 */

import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectDashboardData,
  ProjectSearchFilters,
  ProjectExportData,
  ProjectStatus,
  DeviceClass,
  RegulatoryPathway,
  DocumentType,
} from '@/types/project';

// Mock data for development - will be replaced with real API calls
const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    user_id: 'user_123',
    name: 'Cardiac Monitor Device',
    description: 'Portable cardiac monitoring device for home use',
    device_type: 'Cardiac Monitor',
    intended_use:
      'Continuous monitoring of cardiac rhythm for patients with arrhythmia',
    status: ProjectStatus.IN_PROGRESS,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
  },
  {
    id: 2,
    user_id: 'user_123',
    name: 'Blood Glucose Meter',
    description: 'Digital blood glucose monitoring system',
    device_type: 'Glucose Meter',
    intended_use:
      'Self-monitoring of blood glucose levels for diabetes management',
    status: ProjectStatus.DRAFT,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
  },
];

class ProjectService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache<T>(key: string, data: T, ttl = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Make API request with error handling
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Get all projects with optional filtering
   */
  async getProjects(filters: ProjectSearchFilters = {}): Promise<Project[]> {
    const cacheKey = `projects_${JSON.stringify(filters)}`;
    const cached = this.getFromCache<Project[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, return mock data. Replace with API call when backend is ready
      // const projects = await this.apiRequest<Project[]>('/api/projects', {
      //   method: 'GET',
      // });

      let projects = [...MOCK_PROJECTS];

      // Apply filters
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        projects = projects.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.device_type?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status) {
        projects = projects.filter((p) => p.status === filters.status);
      }

      if (filters.device_type) {
        projects = projects.filter(
          (p) => p.device_type === filters.device_type
        );
      }

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      projects = projects.slice(offset, offset + limit);

      this.setCache(cacheKey, projects);
      return projects;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(projectId: number): Promise<Project> {
    const cacheKey = `project_${projectId}`;
    const cached = this.getFromCache<Project>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, return mock data. Replace with API call when backend is ready
      // const project = await this.apiRequest<Project>(`/api/projects/${projectId}`);

      const project = MOCK_PROJECTS.find((p) => p.id === projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      this.setCache(cacheKey, project);
      return project;
    } catch (error) {
      console.error(`Failed to fetch project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectCreateRequest): Promise<Project> {
    try {
      // For now, create mock project. Replace with API call when backend is ready
      // const project = await this.apiRequest<Project>('/api/projects', {
      //   method: 'POST',
      //   body: JSON.stringify(projectData),
      // });

      const newProject: Project = {
        id: Math.max(...MOCK_PROJECTS.map((p) => p.id)) + 1,
        user_id: 'user_123', // This would come from auth context
        name: projectData.name,
        description: projectData.description,
        device_type: projectData.device_type,
        intended_use: projectData.intended_use,
        status: ProjectStatus.DRAFT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_PROJECTS.push(newProject);

      // Clear cache to force refresh
      this.clearCache();

      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(
    projectId: number,
    projectData: ProjectUpdateRequest
  ): Promise<Project> {
    try {
      // For now, update mock data. Replace with API call when backend is ready
      // const project = await this.apiRequest<Project>(`/api/projects/${projectId}`, {
      //   method: 'PUT',
      //   body: JSON.stringify(projectData),
      // });

      const projectIndex = MOCK_PROJECTS.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      const updatedProject: Project = {
        ...MOCK_PROJECTS[projectIndex],
        ...projectData,
        updated_at: new Date().toISOString(),
      };

      MOCK_PROJECTS[projectIndex] = updatedProject;

      // Clear cache to force refresh
      this.clearCache();

      return updatedProject;
    } catch (error) {
      console.error(`Failed to update project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number): Promise<void> {
    try {
      // For now, delete from mock data. Replace with API call when backend is ready
      // await this.apiRequest(`/api/projects/${projectId}`, {
      //   method: 'DELETE',
      // });

      const projectIndex = MOCK_PROJECTS.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      MOCK_PROJECTS.splice(projectIndex, 1);

      // Clear cache to force refresh
      this.clearCache();
    } catch (error) {
      console.error(`Failed to delete project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get project dashboard data
   */
  async getProjectDashboard(projectId: number): Promise<ProjectDashboardData> {
    const cacheKey = `dashboard_${projectId}`;
    const cached = this.getFromCache<ProjectDashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, return mock dashboard data. Replace with API call when backend is ready
      const project = await this.getProject(projectId);

      const dashboardData: ProjectDashboardData = {
        project,
        classification_status: {
          has_classification: project.id === 1, // Mock: only first project has classification
          device_class: project.id === 1 ? DeviceClass.CLASS_II : undefined,
          product_code: project.id === 1 ? 'DPS' : undefined,
          regulatory_pathway:
            project.id === 1 ? RegulatoryPathway.FIVE_TEN_K : undefined,
          confidence_score: project.id === 1 ? 0.85 : undefined,
        },
        predicate_summary: {
          total_predicates: project.id === 1 ? 5 : 0,
          selected_predicates: project.id === 1 ? 2 : 0,
          top_confidence_score: project.id === 1 ? 0.92 : undefined,
          last_search_date:
            project.id === 1 ? '2024-01-20T10:00:00Z' : undefined,
        },
        document_summary: {
          total_documents: 3,
          document_types: {
            [DocumentType.USER_DOCUMENT]: 2,
            [DocumentType.FDA_GUIDANCE]: 1,
          },
          last_upload_date: '2024-01-19T15:30:00Z',
        },
        interaction_summary: {
          total_interactions: 8,
          recent_actions: [
            'Device Classification',
            'Predicate Search',
            'Document Upload',
          ],
          last_interaction_date: '2024-01-20T14:30:00Z',
        },
        completion_percentage: project.id === 1 ? 65 : 15,
      };

      this.setCache(cacheKey, dashboardData);
      return dashboardData;
    } catch (error) {
      console.error(
        `Failed to fetch dashboard data for project ${projectId}:`,
        error
      );
      throw error;
    }
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
    const cacheKey = 'project_stats';
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, calculate from mock data. Replace with API call when backend is ready
      const projects = await this.getProjects();

      const stats = {
        total: projects.length,
        by_status: projects.reduce(
          (acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        by_device_type: projects.reduce(
          (acc, project) => {
            if (project.device_type) {
              acc[project.device_type] = (acc[project.device_type] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
        recent_activity: projects.filter(
          (p) =>
            Date.now() - new Date(p.updated_at).getTime() <
            7 * 24 * 60 * 60 * 1000
        ).length,
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Failed to fetch project statistics:', error);
      throw error;
    }
  }

  /**
   * Export project data
   */
  async exportProject(
    projectId: number,
    format: 'json' | 'pdf' = 'json'
  ): Promise<Blob> {
    try {
      // For now, create mock export. Replace with API call when backend is ready
      const project = await this.getProject(projectId);
      const dashboardData = await this.getProjectDashboard(projectId);

      const exportData: ProjectExportData = {
        project,
        classifications: [], // Mock empty arrays for now
        predicates: [],
        documents: [],
        interactions: [],
        export_date: new Date().toISOString(),
        export_format: format,
      };

      if (format === 'json') {
        const jsonString = JSON.stringify(exportData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
      } else {
        // For PDF, we'd need a PDF generation library
        // For now, return JSON as fallback
        const jsonString = JSON.stringify(exportData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
      }
    } catch (error) {
      console.error(`Failed to export project ${projectId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();
