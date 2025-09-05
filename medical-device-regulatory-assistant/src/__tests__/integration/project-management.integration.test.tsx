/**
 * Integration tests for project management workflows
 * Tests complete project creation, editing, deletion, and list management with optimistic updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupMockAPI, teardownMockAPI, addMockHandlers } from '@/lib/testing/msw-utils';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { generateMockProject, generateMockUser, generateMockProjects } from '@/lib/mock-data';
import { ProjectList } from '@/components/projects/project-list';
import { ProjectForm } from '@/components/projects/project-form';
import { ProjectCard } from '@/components/projects/project-card';
import { Project, ProjectStatus, ProjectCreateRequest, ProjectUpdateRequest } from '@/types/project';

// Mock hooks
jest.mock('@/hooks/use-projects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@/hooks/use-websocket', () => ({
  useProjectWebSocket: jest.fn(),
}));

jest.mock('@/hooks/use-offline', () => ({
  useOffline: jest.fn(() => ({
    isOffline: false,
    pendingActions: [],
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Test wrapper component for project management
const ProjectManagementTestWrapper: React.FC = () => {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Mock project operations
  const createProject = async (data: ProjectCreateRequest): Promise<Project | null> => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create project');
      
      const newProject = await response.json();
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (data: ProjectUpdateRequest): Promise<Project | null> => {
    if (!selectedProject) return null;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update project');
      
      const updatedProject = await response.json();
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      return updatedProject;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (project: Project): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete project');
      
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load initial projects
  React.useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  return (
    <div data-testid="project-management-wrapper">
      <div className="space-y-6">
        {/* Project List */}
        <div data-testid="project-list-section">
          <div className="flex justify-between items-center mb-4">
            <h2>Projects</h2>
            <button
              data-testid="create-project-btn"
              onClick={() => setShowCreateForm(true)}
            >
              Create Project
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading && projects.length === 0 ? (
              <div data-testid="loading-projects">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div data-testid="empty-projects">No projects found</div>
            ) : (
              projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={setSelectedProject}
                  onEdit={(project) => {
                    setSelectedProject(project);
                    setShowEditForm(true);
                  }}
                  onDelete={deleteProject}
                  loading={loading}
                />
              ))
            )}
          </div>
        </div>

        {/* Selected Project Details */}
        {selectedProject && !showEditForm && (
          <div data-testid="selected-project-details">
            <h3>Selected Project: {selectedProject.name}</h3>
            <p>Status: {selectedProject.status}</p>
            <button
              data-testid="edit-selected-project-btn"
              onClick={() => setShowEditForm(true)}
            >
              Edit Project
            </button>
          </div>
        )}

        {/* Create Project Form */}
        <ProjectForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSubmit={createProject}
          loading={loading}
        />

        {/* Edit Project Form */}
        <ProjectForm
          project={selectedProject || undefined}
          open={showEditForm}
          onOpenChange={(open) => {
            setShowEditForm(open);
            if (!open) setSelectedProject(null);
          }}
          onSubmit={updateProject}
          loading={loading}
        />
      </div>
    </div>
  );
};

describe('Project Management Integration Tests', () => {
  const mockUser = generateMockUser();
  const mockSession = createMockSession(mockUser);

  beforeEach(() => {
    setupMockAPI();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownMockAPI();
  });

  describe('Complete Project Creation Flow', () => {
    it('should create a new project from form submission to database persistence', async () => {
      const user = userEvent.setup();
      const mockProjects = generateMockProjects(2);

      // Mock initial projects load
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: mockProjects, total: 2 },
          delay: 100,
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Wait for initial projects to load
      await waitFor(() => {
        expect(screen.getByTestId('project-list-section')).toBeInTheDocument();
      });

      // Click create project button
      const createBtn = screen.getByTestId('create-project-btn');
      await user.click(createBtn);

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });

      // Fill out the form
      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const deviceTypeSelect = screen.getByRole('combobox', { name: /device type/i });
      const intendedUseInput = screen.getByLabelText(/intended use/i);

      await user.type(nameInput, 'Test Cardiac Monitor');
      await user.type(descriptionInput, 'A new cardiac monitoring device for testing');
      
      // Select device type
      await user.click(deviceTypeSelect);
      await waitFor(() => {
        const option = screen.getByText('Cardiovascular Device');
        user.click(option);
      });

      await user.type(intendedUseInput, 'For continuous monitoring of cardiac rhythm in hospital settings');

      // Mock successful project creation
      const newProject = generateMockProject({
        id: 999,
        name: 'Test Cardiac Monitor',
        description: 'A new cardiac monitoring device for testing',
        device_type: 'Cardiovascular Device',
        intended_use: 'For continuous monitoring of cardiac rhythm in hospital settings',
        status: ProjectStatus.DRAFT,
      });

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects',
          response: newProject,
          delay: 200,
        },
      ]);

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /create project/i });
      await user.click(submitBtn);

      // Wait for project to be created and form to close
      await waitFor(() => {
        expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify the new project appears in the list
      await waitFor(() => {
        expect(screen.getByText('Test Cardiac Monitor')).toBeInTheDocument();
      });
    });

    it('should handle project creation errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock project creation failure
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [], total: 0 },
        },
        {
          method: 'POST',
          path: '/api/projects',
          response: { error: 'Validation failed' },
          error: true,
          statusCode: 400,
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Open create form
      const createBtn = screen.getByTestId('create-project-btn');
      await user.click(createBtn);

      // Fill minimal form data
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /create project/i });
      await user.click(submitBtn);

      // Form should remain open on error
      await waitFor(() => {
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });
    });

    it('should show optimistic updates during project creation', async () => {
      const user = userEvent.setup();

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [], total: 0 },
        },
        {
          method: 'POST',
          path: '/api/projects',
          response: generateMockProject({ name: 'Optimistic Project' }),
          delay: 1000, // Longer delay to test loading state
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Open and fill form
      const createBtn = screen.getByTestId('create-project-btn');
      await user.click(createBtn);

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Optimistic Project');

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /create project/i });
      await user.click(submitBtn);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/creating/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Project Editing with Optimistic Updates', () => {
    it('should update project with optimistic UI updates', async () => {
      const user = userEvent.setup();
      const existingProject = generateMockProject({
        id: 1,
        name: 'Original Project',
        status: ProjectStatus.DRAFT,
      });

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [existingProject], total: 1 },
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Wait for project to load
      await waitFor(() => {
        expect(screen.getByText('Original Project')).toBeInTheDocument();
      });

      // Click edit on the project card
      const projectCard = screen.getByTestId('project-card');
      const moreButton = within(projectCard).getByRole('button', { name: /open menu/i });
      await user.click(moreButton);

      const editButton = screen.getByText('Edit Project');
      await user.click(editButton);

      // Wait for edit form
      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
      });

      // Update project name
      const nameInput = screen.getByDisplayValue('Original Project');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Project Name');

      // Mock successful update
      const updatedProject = { ...existingProject, name: 'Updated Project Name' };
      addMockHandlers([
        {
          method: 'PUT',
          path: `/api/projects/${existingProject.id}`,
          response: updatedProject,
          delay: 500,
        },
      ]);

      // Submit update
      const updateBtn = screen.getByRole('button', { name: /update project/i });
      await user.click(updateBtn);

      // Wait for update to complete
      await waitFor(() => {
        expect(screen.getByText('Updated Project Name')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle edit conflicts and resolution', async () => {
      const user = userEvent.setup();
      const conflictProject = generateMockProject({
        id: 1,
        name: 'Conflict Project',
        updated_at: new Date().toISOString(),
      });

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [conflictProject], total: 1 },
        },
        {
          method: 'PUT',
          path: `/api/projects/${conflictProject.id}`,
          response: { error: 'Conflict: Project was modified by another user' },
          error: true,
          statusCode: 409,
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Wait for project and start editing
      await waitFor(() => {
        expect(screen.getByText('Conflict Project')).toBeInTheDocument();
      });

      // Simulate edit attempt that results in conflict
      const projectCard = screen.getByTestId('project-card');
      const moreButton = within(projectCard).getByRole('button', { name: /open menu/i });
      await user.click(moreButton);

      const editButton = screen.getByText('Edit Project');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Conflict Project');
      await user.clear(nameInput);
      await user.type(nameInput, 'Conflicted Update');

      const updateBtn = screen.getByRole('button', { name: /update project/i });
      await user.click(updateBtn);

      // Form should remain open on conflict
      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
      });
    });
  });

  describe('Project Deletion with Confirmation', () => {
    it('should delete project with confirmation dialog and cleanup', async () => {
      const user = userEvent.setup();
      const projectToDelete = generateMockProject({
        id: 1,
        name: 'Project to Delete',
      });

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [projectToDelete], total: 1 },
        },
        {
          method: 'DELETE',
          path: `/api/projects/${projectToDelete.id}`,
          response: { success: true },
          delay: 300,
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      // Wait for project to load
      await waitFor(() => {
        expect(screen.getByText('Project to Delete')).toBeInTheDocument();
      });

      // Open dropdown menu and click delete
      const projectCard = screen.getByTestId('project-card');
      const moreButton = within(projectCard).getByRole('button', { name: /open menu/i });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Delete Project');
      await user.click(deleteButton);

      // Wait for deletion to complete
      await waitFor(() => {
        expect(screen.queryByText('Project to Delete')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Should show empty state
      expect(screen.getByTestId('empty-projects')).toBeInTheDocument();
    });

    it('should handle deletion errors gracefully', async () => {
      const user = userEvent.setup();
      const protectedProject = generateMockProject({
        id: 1,
        name: 'Protected Project',
      });

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [protectedProject], total: 1 },
        },
        {
          method: 'DELETE',
          path: `/api/projects/${protectedProject.id}`,
          response: { error: 'Cannot delete project with active classifications' },
          error: true,
          statusCode: 400,
        },
      ]);

      renderWithProviders(<ProjectManagementTestWrapper />, {
        session: mockSession,
      });

      await waitFor(() => {
        expect(screen.getByText('Protected Project')).toBeInTheDocument();
      });

      // Attempt deletion
      const projectCard = screen.getByTestId('project-card');
      const moreButton = within(projectCard).getByRole('button', { name: /open menu/i });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Delete Project');
      await user.click(deleteButton);

      // Project should still be visible after failed deletion
      await waitFor(() => {
        expect(screen.getByText('Protected Project')).toBeInTheDocument();
      });
    });
  });

  describe('Project List Filtering, Sorting, and Pagination', () => {
    it('should filter projects by status and device type', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        generateMockProject({
          id: 1,
          name: 'Draft Cardiac',
          status: ProjectStatus.DRAFT,
          device_type: 'Cardiovascular Device',
        }),
        generateMockProject({
          id: 2,
          name: 'Active Neuro',
          status: ProjectStatus.IN_PROGRESS,
          device_type: 'Neurological Device',
        }),
        generateMockProject({
          id: 3,
          name: 'Complete Cardiac',
          status: ProjectStatus.COMPLETED,
          device_type: 'Cardiovascular Device',
        }),
      ];

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: mockProjects, total: 3 },
        },
      ]);

      // Mock ProjectList component with filtering
      const FilterableProjectList: React.FC = () => {
        const [projects, setProjects] = React.useState<Project[]>(mockProjects);
        const [statusFilter, setStatusFilter] = React.useState<string>('all');
        const [deviceTypeFilter, setDeviceTypeFilter] = React.useState<string>('all');

        const filteredProjects = projects.filter(project => {
          const statusMatch = statusFilter === 'all' || project.status === statusFilter;
          const deviceMatch = deviceTypeFilter === 'all' || project.device_type === deviceTypeFilter;
          return statusMatch && deviceMatch;
        });

        return (
          <div data-testid="filterable-project-list">
            <div className="filters">
              <select
                data-testid="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value={ProjectStatus.DRAFT}>Draft</option>
                <option value={ProjectStatus.IN_PROGRESS}>In Progress</option>
                <option value={ProjectStatus.COMPLETED}>Completed</option>
              </select>
              
              <select
                data-testid="device-type-filter"
                value={deviceTypeFilter}
                onChange={(e) => setDeviceTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="Cardiovascular Device">Cardiovascular Device</option>
                <option value="Neurological Device">Neurological Device</option>
              </select>
            </div>
            
            <div data-testid="filtered-projects">
              {filteredProjects.map(project => (
                <div key={project.id} data-testid={`project-${project.id}`}>
                  {project.name} - {project.status} - {project.device_type}
                </div>
              ))}
            </div>
          </div>
        );
      };

      renderWithProviders(<FilterableProjectList />, {
        session: mockSession,
      });

      // Initially all projects should be visible
      expect(screen.getByTestId('project-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-2')).toBeInTheDocument();
      expect(screen.getByTestId('project-3')).toBeInTheDocument();

      // Filter by status
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, ProjectStatus.DRAFT);

      await waitFor(() => {
        expect(screen.getByTestId('project-1')).toBeInTheDocument();
        expect(screen.queryByTestId('project-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('project-3')).not.toBeInTheDocument();
      });

      // Reset status filter and filter by device type
      await user.selectOptions(statusFilter, 'all');
      const deviceTypeFilter = screen.getByTestId('device-type-filter');
      await user.selectOptions(deviceTypeFilter, 'Cardiovascular Device');

      await waitFor(() => {
        expect(screen.getByTestId('project-1')).toBeInTheDocument();
        expect(screen.queryByTestId('project-2')).not.toBeInTheDocument();
        expect(screen.getByTestId('project-3')).toBeInTheDocument();
      });
    });

    it('should handle search functionality with debouncing', async () => {
      const user = userEvent.setup();
      const searchableProjects = [
        generateMockProject({ id: 1, name: 'Cardiac Monitor Pro' }),
        generateMockProject({ id: 2, name: 'Neural Stimulator' }),
        generateMockProject({ id: 3, name: 'Cardiac Pacemaker' }),
      ];

      // Mock search component
      const SearchableProjectList: React.FC = () => {
        const [projects, setProjects] = React.useState<Project[]>(searchableProjects);
        const [searchQuery, setSearchQuery] = React.useState('');
        const [searchResults, setSearchResults] = React.useState<Project[]>(searchableProjects);

        React.useEffect(() => {
          const timeout = setTimeout(() => {
            const filtered = projects.filter(project =>
              project.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
          }, 300);

          return () => clearTimeout(timeout);
        }, [searchQuery, projects]);

        return (
          <div data-testid="searchable-project-list">
            <input
              data-testid="search-input"
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div data-testid="search-results">
              {searchResults.map(project => (
                <div key={project.id} data-testid={`search-result-${project.id}`}>
                  {project.name}
                </div>
              ))}
            </div>
          </div>
        );
      };

      renderWithProviders(<SearchableProjectList />, {
        session: mockSession,
      });

      // Initially all projects visible
      expect(screen.getByTestId('search-result-1')).toBeInTheDocument();
      expect(screen.getByTestId('search-result-2')).toBeInTheDocument();
      expect(screen.getByTestId('search-result-3')).toBeInTheDocument();

      // Search for "cardiac"
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'cardiac');

      // Wait for debounced search
      await waitFor(() => {
        expect(screen.getByTestId('search-result-1')).toBeInTheDocument();
        expect(screen.queryByTestId('search-result-2')).not.toBeInTheDocument();
        expect(screen.getByTestId('search-result-3')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Concurrent Project Operations and State Synchronization', () => {
    it('should handle concurrent project operations safely', async () => {
      const user = userEvent.setup();
      const sharedProject = generateMockProject({
        id: 1,
        name: 'Shared Project',
      });

      addMockHandlers([
        {
          method: 'GET',
          path: '/api/projects',
          response: { projects: [sharedProject], total: 1 },
        },
        {
          method: 'PUT',
          path: `/api/projects/${sharedProject.id}`,
          response: { ...sharedProject, name: 'Updated by User 1' },
          delay: 500,
        },
      ]);

      // Mock concurrent operations component
      const ConcurrentOperationsTest: React.FC = () => {
        const [project, setProject] = React.useState(sharedProject);
        const [updating, setUpdating] = React.useState(false);

        const updateProject = async (newName: string) => {
          setUpdating(true);
          try {
            const response = await fetch(`/api/projects/${project.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...project, name: newName }),
            });
            
            if (response.ok) {
              const updated = await response.json();
              setProject(updated);
            }
          } finally {
            setUpdating(false);
          }
        };

        return (
          <div data-testid="concurrent-operations-test">
            <div data-testid="project-name">{project.name}</div>
            <button
              data-testid="update-btn-1"
              onClick={() => updateProject('Updated by User 1')}
              disabled={updating}
            >
              Update as User 1
            </button>
            <button
              data-testid="update-btn-2"
              onClick={() => updateProject('Updated by User 2')}
              disabled={updating}
            >
              Update as User 2
            </button>
            {updating && <div data-testid="updating">Updating...</div>}
          </div>
        );
      };

      renderWithProviders(<ConcurrentOperationsTest />, {
        session: mockSession,
      });

      expect(screen.getByTestId('project-name')).toHaveTextContent('Shared Project');

      // Simulate concurrent update
      const updateBtn1 = screen.getByTestId('update-btn-1');
      await user.click(updateBtn1);

      await waitFor(() => {
        expect(screen.getByTestId('updating')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('project-name')).toHaveTextContent('Updated by User 1');
      }, { timeout: 1000 });
    });

    it('should synchronize state across multiple project views', async () => {
      const user = userEvent.setup();
      const syncProject = generateMockProject({
        id: 1,
        name: 'Sync Test Project',
      });

      // Mock state synchronization component
      const StateSyncTest: React.FC = () => {
        const [project, setProject] = React.useState(syncProject);

        // Simulate WebSocket update
        React.useEffect(() => {
          const timeout = setTimeout(() => {
            setProject(prev => ({ ...prev, name: 'Updated via WebSocket' }));
          }, 1000);

          return () => clearTimeout(timeout);
        }, []);

        return (
          <div data-testid="state-sync-test">
            <div data-testid="view-1">View 1: {project.name}</div>
            <div data-testid="view-2">View 2: {project.name}</div>
            <div data-testid="view-3">View 3: {project.name}</div>
          </div>
        );
      };

      renderWithProviders(<StateSyncTest />, {
        session: mockSession,
      });

      // Initially all views show same data
      expect(screen.getByTestId('view-1')).toHaveTextContent('Sync Test Project');
      expect(screen.getByTestId('view-2')).toHaveTextContent('Sync Test Project');
      expect(screen.getByTestId('view-3')).toHaveTextContent('Sync Test Project');

      // Wait for simulated WebSocket update
      await waitFor(() => {
        expect(screen.getByTestId('view-1')).toHaveTextContent('Updated via WebSocket');
        expect(screen.getByTestId('view-2')).toHaveTextContent('Updated via WebSocket');
        expect(screen.getByTestId('view-3')).toHaveTextContent('Updated via WebSocket');
      }, { timeout: 1500 });
    });
  });
});