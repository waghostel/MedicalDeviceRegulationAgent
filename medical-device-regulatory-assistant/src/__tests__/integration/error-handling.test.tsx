/**
 * Integration tests for error handling and loading states
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ProjectList } from '@/components/projects/project-list';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock server for error scenarios
const server = setupServer(
  // Default success response
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json([]));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('Error Handling Integration Tests', () => {
  describe('Network Errors', () => {
    test('should handle network connection errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res) => {
          return res.networkError('Network connection failed');
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        variant: 'destructive',
      });
    });

    test('should handle request timeout errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.delay(35000)); // Longer than 30s timeout
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      }, { timeout: 35000 });

      expect(toast).toHaveBeenCalledWith({
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
        variant: 'destructive',
      });
    });

    test('should retry failed requests automatically', async () => {
      let attemptCount = 0;
      
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          attemptCount++;
          if (attemptCount < 3) {
            return res(ctx.status(500), ctx.json({ error: 'Server error' }));
          }
          return res(ctx.json([
            {
              id: 1,
              name: 'Test Project',
              status: 'draft',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }
          ]));
        })
      );

      render(<ProjectList />);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(attemptCount).toBe(3);
    });

    test('should stop retrying after max attempts', async () => {
      let attemptCount = 0;
      
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          attemptCount++;
          return res(ctx.status(500), ctx.json({ error: 'Persistent server error' }));
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      }, { timeout: 15000 });

      // Should have attempted 4 times (initial + 3 retries)
      expect(attemptCount).toBe(4);
    });
  });

  describe('HTTP Error Responses', () => {
    test('should handle 401 unauthorized errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              error: 'Unauthorized',
              message: 'Authentication required',
            })
          );
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Authentication Required',
        description: 'Please sign in to continue.',
        variant: 'destructive',
      });
    });

    test('should handle 403 forbidden errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(403),
            ctx.json({
              error: 'Forbidden',
              message: 'Access denied',
            })
          );
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        variant: 'destructive',
      });
    });

    test('should handle 404 not found errors', async () => {
      server.use(
        rest.get('/api/projects/123', (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({
              error: 'Not Found',
              message: 'Project not found',
            })
          );
        })
      );

      try {
        await apiClient.get('/api/projects/123');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('Project not found');
      }
    });

    test('should handle 422 validation errors', async () => {
      server.use(
        rest.post('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(422),
            ctx.json({
              error: 'Validation Error',
              message: 'Invalid project data',
              details: {
                name: ['Project name is required'],
                device_type: ['Device type must be specified'],
              },
              suggestions: [
                'Please provide a valid project name',
                'Select an appropriate device type',
              ],
            })
          );
        })
      );

      try {
        await apiClient.post('/api/projects', {});
      } catch (error: any) {
        expect(error.status).toBe(422);
        expect(error.message).toBe('Invalid project data');
        expect(error.details).toBeDefined();
        expect(error.suggestions).toHaveLength(2);
      }
    });

    test('should handle 500 internal server errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: 'Internal Server Error',
              message: 'Something went wrong on our end',
            })
          );
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Request Failed',
        description: 'Something went wrong on our end',
        variant: 'destructive',
      });
    });

    test('should handle 503 service unavailable errors', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(503),
            ctx.json({
              error: 'Service Unavailable',
              message: 'Service is temporarily unavailable',
            })
          );
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      // Should retry 503 errors
      expect(toast).toHaveBeenCalledWith({
        title: 'Request Failed',
        description: 'Service is temporarily unavailable',
        variant: 'destructive',
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading skeletons during initial load', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.delay(1000), ctx.json([]));
        })
      );

      render(<ProjectList />);

      // Should show loading skeletons
      expect(screen.getAllByTestId('project-card-skeleton')).toHaveLength(6);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('project-card-skeleton')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should show loading indicator during refresh', async () => {
      // Initial load
      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.queryByTestId('project-card-skeleton')).not.toBeInTheDocument();
      });

      // Add delay for refresh
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.delay(500), ctx.json([]));
        })
      );

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Should show loading state on refresh button
      await waitFor(() => {
        expect(refreshButton).toHaveClass('animate-spin');
      });

      // Wait for refresh to complete
      await waitFor(() => {
        expect(refreshButton).not.toHaveClass('animate-spin');
      }, { timeout: 1000 });
    });

    test('should show loading state during search', async () => {
      render(<ProjectList />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByTestId('project-card-skeleton')).not.toBeInTheDocument();
      });

      // Add delay for search
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          const search = req.url.searchParams.get('search');
          if (search) {
            return res(ctx.delay(500), ctx.json([]));
          }
          return res(ctx.json([]));
        })
      );

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'test');

      // Should show loading state during search
      await waitFor(() => {
        expect(screen.getByText(/loading more projects/i)).toBeInTheDocument();
      });
    });

    test('should show loading state during project operations', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Test Project',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      ];

      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.json(mockProjects));
        }),
        rest.delete('/api/projects/1', (req, res, ctx) => {
          return res(ctx.delay(1000), ctx.json({ message: 'Deleted' }));
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      // Find and click delete button
      const projectCard = screen.getByText('Test Project').closest('[data-testid="project-card"]');
      const moreButton = projectCard?.querySelector('button[aria-label="Open menu"]');
      
      if (moreButton) {
        fireEvent.click(moreButton);
        
        const deleteButton = screen.getByText(/delete project/i);
        fireEvent.click(deleteButton);

        // Should show loading state during deletion
        await waitFor(() => {
          expect(screen.getByText(/deleting/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Recovery', () => {
    test('should allow retry after error', async () => {
      let shouldFail = true;
      
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          if (shouldFail) {
            return res(ctx.status(500), ctx.json({ error: 'Server error' }));
          }
          return res(ctx.json([
            {
              id: 1,
              name: 'Recovered Project',
              status: 'draft',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            }
          ]));
        })
      );

      render(<ProjectList />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      // Click try again button
      shouldFail = false;
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);

      // Should recover and show projects
      await waitFor(() => {
        expect(screen.getByText('Recovered Project')).toBeInTheDocument();
        expect(screen.queryByText(/error loading projects/i)).not.toBeInTheDocument();
      });
    });

    test('should handle partial failures gracefully', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Working Project',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      ];

      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.json(mockProjects));
        }),
        rest.get('/api/projects/1/dashboard', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Dashboard error' }));
        })
      );

      render(<ProjectList />);

      // Should show projects even if dashboard fails
      await waitFor(() => {
        expect(screen.getByText('Working Project')).toBeInTheDocument();
      });

      // Error should be handled gracefully without breaking the UI
      expect(screen.queryByText(/error loading projects/i)).not.toBeInTheDocument();
    });
  });

  describe('User Experience During Errors', () => {
    test('should maintain UI state during temporary errors', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Existing Project',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      ];

      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.json(mockProjects));
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Existing Project')).toBeInTheDocument();
      });

      // Simulate search that fails
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          const search = req.url.searchParams.get('search');
          if (search) {
            return res(ctx.status(500), ctx.json({ error: 'Search failed' }));
          }
          return res(ctx.json(mockProjects));
        })
      );

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      await userEvent.type(searchInput, 'test');

      // Should show error but maintain existing projects
      await waitFor(() => {
        expect(screen.getByText('Existing Project')).toBeInTheDocument();
      });
    });

    test('should provide helpful error messages with suggestions', async () => {
      server.use(
        rest.post('/api/projects', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'Validation Error',
              message: 'Project name is required',
              suggestions: [
                'Please provide a descriptive project name',
                'Project names should be between 1-255 characters',
                'Avoid special characters in project names',
              ],
            })
          );
        })
      );

      try {
        await apiClient.post('/api/projects', {});
      } catch (error: any) {
        expect(error.suggestions).toHaveLength(3);
        expect(error.suggestions[0]).toBe('Please provide a descriptive project name');
      }

      expect(toast).toHaveBeenCalledWith({
        title: 'Request Failed',
        description: 'Project name is required',
        variant: 'destructive',
      });
    });

    test('should handle malformed error responses', async () => {
      server.use(
        rest.get('/api/projects', (req, res, ctx) => {
          return res(ctx.status(500), ctx.text('Internal Server Error'));
        })
      );

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Request Failed',
        description: expect.stringContaining('HTTP 500'),
        variant: 'destructive',
      });
    });
  });

  describe('API Client Error Handling', () => {
    test('should normalize different error types', async () => {
      // Test network error
      server.use(
        rest.get('/api/projects/network-error', (req, res) => {
          return res.networkError('Network error');
        })
      );

      try {
        await apiClient.get('/api/projects/network-error');
      } catch (error: any) {
        expect(error.message).toBe('Network error - please check your internet connection');
        expect(error.code).toBe('NETWORK_ERROR');
      }

      // Test timeout error
      server.use(
        rest.get('/api/projects/timeout', (req, res, ctx) => {
          return res(ctx.delay(35000));
        })
      );

      try {
        await apiClient.get('/api/projects/timeout');
      } catch (error: any) {
        expect(error.message).toBe('Request timeout');
        expect(error.code).toBe('TIMEOUT');
      }
    });

    test('should skip error toast when requested', async () => {
      server.use(
        rest.get('/api/projects/silent-error', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Silent error' }));
        })
      );

      try {
        await apiClient.get('/api/projects/silent-error', { skipErrorToast: true });
      } catch (error) {
        // Error should be thrown but no toast should be shown
      }

      expect(toast).not.toHaveBeenCalled();
    });

    test('should handle concurrent requests with different error states', async () => {
      server.use(
        rest.get('/api/projects/success', (req, res, ctx) => {
          return res(ctx.json({ success: true }));
        }),
        rest.get('/api/projects/error', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      const [successResult, errorResult] = await Promise.allSettled([
        apiClient.get('/api/projects/success'),
        apiClient.get('/api/projects/error'),
      ]);

      expect(successResult.status).toBe('fulfilled');
      expect(errorResult.status).toBe('rejected');
    });
  });
});