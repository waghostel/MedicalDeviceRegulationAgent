/**
 * End-to-end integration tests for project management workflow
 * Tests complete user workflows from UI through API to backend
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ProjectsPage } from '@/app/projects/page';
import { Project, ProjectStatus } from '@/types/project';
import { apiClient } from '@/lib/api-client';

// Mock data
const mockProjects: Project[] = [
  {
    id: 1,
    user_id: 'user-123',
    name: 'Cardiac Monitor Device',
    description: 'A portable cardiac monitoring device for home use',
    device_type: 'Class II Medical Device',
    intended_use: 'Continuous cardiac rhythm monitoring',
    status: ProjectStatus.IN_PROGRESS,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
  },
  {
    id: 2,
    user_id: 'user-123',
    name: 'Blood Glucose Meter',
    description: 'Digital blood glucose monitoring system',
    device_type: 'Class II Medical Device',
    intended_use: 'Blood glucose level measurement',
    status: ProjectStatus.DRAFT,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
  },
];

const mockDashboardData = {
  project: mockProjects[0],
  classification_status: {
    has_classification: true,
    device_class: 'II',
    product_code: 'DQK',
    regulatory_pathway: '510k',
    confidence_score: 0.85,
  },
  predicate_summary: {
    total_predicates: 5,
    selected_predicates: 2,
    top_confidence_score: 0.92,
    last_search_date: '2024-01-16T12:00:00Z',
  },
  document_summary: {
    total_documents: 3,
    document_types: { 'FDA_GUIDANCE': 2, 'USER_DOCUMENT': 1 },
    last_upload_date: '2024-01-15T16:00:00Z',
  },
  interaction_summary: {
    total_interactions: 8,
    recent_actions: ['predicate_search', 'device_classification', 'document_upload'],
    last_interaction_date: '2024-01-16T14:30:00Z',
  },
  completion_percentage: 75,
};

// Mock server setup
const server = setupServer(
  // Get projects
  rest.get('/api/projects', (req, res, ctx) => {
    const search = req.url.searchParams.get('search');
    const status = req.url.searchParams.get('status');
    
    let filteredProjects = [...mockProjects];
    
    if (search) {
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status && status !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }
    
    return res(ctx.json(filteredProjects));
  }),

  // Create project
  rest.post('/api/projects', async (req, res, ctx) => {
    const projectData = await req.json();
    const newProject: Project = {
      id: 3,
      user_id: 'user-123',
      ...projectData,
      status: ProjectStatus.DRAFT,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    mockProjects.push(newProject);
    return res(ctx.status(201), ctx.json(newProject));
  }),

  // Update project
  rest.put('/api/projects/:id', async (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string);
    const updateData = await req.json();
    
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }));
    }
    
    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    
    return res(ctx.json(mockProjects[projectIndex]));
  }),

  // Delete project
  rest.delete('/api/projects/:id', (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string);
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }));
    }
    
    mockProjects.splice(projectIndex, 1);
    return res(ctx.json({ message: 'Project deleted successfully' }));
  }),

  // Get project dashboard
  rest.get('/api/projects/:id/dashboard', (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string);
    const project = mockProjects.find(p => p.id === projectId);
    
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }));
    }
    
    return res(ctx.json({ ...mockDashboardData, project }));
  }),

  // Export project
  rest.get('/api/projects/:id/export', (req, res, ctx) => {
    const format = req.url.searchParams.get('format') || 'json';
    const projectId = parseInt(req.params.id as string);
    const project = mockProjects.find(p => p.id === projectId);
    
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }));
    }
    
    if (format === 'json') {
      return res(
        ctx.json({
          project,
          classifications: [],
          predicates: [],
          documents: [],
          interactions: [],
          export_date: new Date().toISOString(),
          export_format: 'json',
        })
      );
    }
    
    // Mock PDF response
    return res(
      ctx.set('Content-Type', 'application/pdf'),
      ctx.set('Content-Disposition', `attachment; filename=project_${projectId}_report.pdf`),
      ctx.body('Mock PDF content')
    );
  }),

  // Error scenarios
  rest.get('/api/projects/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),

  rest.post('/api/projects/error', (req, res, ctx) => {
    return res(ctx.status(400), ctx.json({ 
      error: 'Validation error',
      message: 'Project name is required',
      suggestions: ['Please provide a valid project name']
    }));
  }),
);

// Test setup
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  // Reset mock data
  mockProjects.length = 2;
  mockProjects[0] = {
    id: 1,
    user_id: 'user-123',
    name: 'Cardiac Monitor Device',
    description: 'A portable cardiac monitoring device for home use',
    device_type: 'Class II Medical Device',
    intended_use: 'Continuous cardiac rhythm monitoring',
    status: ProjectStatus.IN_PROGRESS,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
  };
  mockProjects[1] = {
    id: 2,
    user_id: 'user-123',
    name: 'Blood Glucose Meter',
    description: 'Digital blood glucose monitoring system',
    device_type: 'Class II Medical Device',
    intended_use: 'Blood glucose level measurement',
    status: ProjectStatus.DRAFT,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
  };
});
afterAll(() => server.close());

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('Project Management Integration Tests', () => {
  const user = userEvent.setup();

  describe('Project List Workflow', () => {
    test('should load and display projects on page load', async () => {
      render(<ProjectsPage />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
        expect(screen.getByText('Blood Glucose Meter')).toBeInTheDocument();
      });

      // Verify project details are displayed
      expect(screen.getByText('A portable cardiac monitoring device for home use')).toBeInTheDocument();
      expect(screen.getByText('Digital blood glucose monitoring system')).toBeInTheDocument();
      
      // Verify status badges
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('should handle search functionality', async () => {
      render(<ProjectsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
      });

      // Search for specific project
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await user.type(searchInput, 'cardiac');

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
        expect(screen.queryByText('Blood Glucose Meter')).not.toBeInTheDocument();
      });
    });

    test('should handle status filtering', async () => {
      render(<ProjectsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
      });

      // Filter by draft status
      const statusFilter = screen.getByRole('combobox', { name: /all status/i });
      await user.click(statusFilter);
      
      const draftOption = screen.getByRole('option', { name: /draft/i });
      await user.click(draftOption);

      // Wait for filtered results
      await waitFor(() => {
        expect(screen.getByText('Blood Glucose Meter')).toBeInTheDocument();
        expect(screen.queryByText('Cardiac Monitor Device')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Creation Workflow', () => {
    test('should create a new project successfully', async () => {
      render(<ProjectsPage />);

      // Click create project button
      const createButton = screen.getByRole('button', { name: /new project/i });
      await user.click(createButton);

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill out the form
      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const deviceTypeInput = screen.getByLabelText(/device type/i);
      const intendedUseInput = screen.getByLabelText(/intended use/i);

      await user.type(nameInput, 'New Test Device');
      await user.type(descriptionInput, 'A test device for integration testing');
      await user.type(deviceTypeInput, 'Class I Medical Device');
      await user.type(intendedUseInput, 'Testing purposes only');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Wait for project to be created and form to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify new project appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Test Device')).toBeInTheDocument();
        expect(screen.getByText('A test device for integration testing')).toBeInTheDocument();
      });
    });

    test('should handle validation errors during creation', async () => {
      // Mock validation error response
      server.use(
        rest.post('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'Validation error',
              message: 'Project name is required',
              suggestions: ['Please provide a valid project name']
            })
          );
        })
      );

      render(<ProjectsPage />);

      // Open create form
      const createButton = screen.getByRole('button', { name: /new project/i });
      await user.click(createButton);

      // Submit empty form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create project/i });
      await user.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        // Form should still be open
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Project Update Workflow', () => {
    test('should update project with optimistic updates', async () => {
      render(<ProjectsPage />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
      });

      // Find and click edit button for first project
      const projectCard = screen.getByText('Cardiac Monitor Device').closest('[data-testid="project-card"]');
      expect(projectCard).toBeInTheDocument();

      const editButton = within(projectCard!).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for edit form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Update project name
      const nameInput = screen.getByDisplayValue('Cardiac Monitor Device');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Cardiac Monitor');

      // Submit update
      const updateButton = screen.getByRole('button', { name: /update project/i });
      await user.click(updateButton);

      // Verify optimistic update (should see updated name immediately)
      await waitFor(() => {
        expect(screen.getByText('Updated Cardiac Monitor')).toBeInTheDocument();
        expect(screen.queryByText('Cardiac Monitor Device')).not.toBeInTheDocument();
      });
    });
  });

  describe('Project Deletion Workflow', () => {
    test('should delete project with confirmation', async () => {
      render(<ProjectsPage />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Blood Glucose Meter')).toBeInTheDocument();
      });

      // Find and click delete button
      const projectCard = screen.getByText('Blood Glucose Meter').closest('[data-testid="project-card"]');
      const deleteButton = within(projectCard!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion (assuming there's a confirmation dialog)
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Verify project is removed from list
      await waitFor(() => {
        expect(screen.queryByText('Blood Glucose Meter')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock server error
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      render(<ProjectsPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      // Verify retry button is available
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    test('should handle network errors', async () => {
      // Mock network error
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res.networkError('Network error');
        })
      );

      render(<ProjectsPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading skeletons while fetching projects', async () => {
      // Delay the response to test loading state
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.delay(1000), ctx.json(mockProjects));
        })
      );

      render(<ProjectsPage />);

      // Verify loading skeletons are shown
      expect(screen.getAllByTestId('project-card-skeleton')).toHaveLength(6);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify skeletons are gone
      expect(screen.queryByTestId('project-card-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    test('should export project as JSON', async () => {
      // Mock URL.createObjectURL and document methods
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      render(<ProjectsPage />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText('Cardiac Monitor Device')).toBeInTheDocument();
      });

      // Find and click export button
      const projectCard = screen.getByText('Cardiac Monitor Device').closest('[data-testid="project-card"]');
      const exportButton = within(projectCard!).getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Wait for export to complete
      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });

      // Verify download attributes
      expect(mockLink.download).toContain('project_1_export.json');
    });
  });
});

describe('API Client Integration', () => {
  test('should handle retry logic for failed requests', async () => {
    let attemptCount = 0;
    
    server.use(
      rest.get('/api/projects', (req, res, ctx) => {
        attemptCount++;
        if (attemptCount < 3) {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        }
        return res(ctx.json(mockProjects));
      })
    );

    const response = await apiClient.get('/api/projects');
    
    expect(attemptCount).toBe(3);
    expect(response.data).toEqual(mockProjects);
  });

  test('should handle timeout errors', async () => {
    server.use(
      rest.get('/api/projects', (req, res, ctx) => {
        return res(ctx.delay(35000)); // Longer than 30s timeout
      })
    );

    await expect(apiClient.get('/api/projects')).rejects.toThrow('Request timeout');
  });

  test('should set authentication token correctly', () => {
    const token = 'test-jwt-token';
    apiClient.setAuthToken(token);
    
    // Verify token is set in default headers
    expect((apiClient as any).defaultHeaders['Authorization']).toBe(`Bearer ${token}`);
  });
});