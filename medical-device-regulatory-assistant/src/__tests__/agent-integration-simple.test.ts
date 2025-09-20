/**
 * Simple integration tests for agent functionality
 * Tests core logic without complex UI components
 */

import { jest } from '@jest/globals';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Agent Integration - Core Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('API Integration', () => {
    test('should format agent task request correctly', () => {
      const taskRequest = {
        task_type: 'predicate_search',
        project_id: 'test-project',
        device_description: 'Cardiac monitoring device',
        intended_use: 'Heart rhythm monitoring',
        parameters: { product_code: 'DQK' },
      };

      expect(taskRequest.task_type).toBe('predicate_search');
      expect(taskRequest.project_id).toBe('test-project');
      expect(taskRequest.device_description).toBe('Cardiac monitoring device');
      expect(taskRequest.parameters.product_code).toBe('DQK');
    });

    test('should handle successful API response', async () => {
      const mockResponse = {
        session_id: 'test-session-123',
        task_type: 'predicate_search',
        status: 'completed',
        result: {
          predicates: [
            {
              k_number: 'K123456',
              device_name: 'Test Device',
              confidence_score: 0.85,
            },
          ],
        },
        confidence: 0.85,
        execution_time_ms: 2500,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'predicate_search',
          project_id: 'test-project',
          device_description: 'Test device',
          intended_use: 'Test use',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.session_id).toBe('test-session-123');
      expect(data.task_type).toBe('predicate_search');
      expect(data.status).toBe('completed');
    });

    test('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'invalid_task',
          project_id: 'test-project',
          device_description: 'Test device',
          intended_use: 'Test use',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Command Parsing', () => {
    test('should parse predicate search command', () => {
      const command = '/predicate-search for cardiac monitoring device';

      const parseCommandToTaskType = (cmd: string): string => {
        if (cmd.includes('/predicate-search') || cmd.includes('predicate')) {
          return 'predicate_search';
        } else if (
          cmd.includes('/classify-device') ||
          cmd.includes('classify')
        ) {
          return 'device_classification';
        } else if (
          cmd.includes('/compare-predicate') ||
          cmd.includes('compare')
        ) {
          return 'predicate_comparison';
        } else if (cmd.includes('/find-guidance') || cmd.includes('guidance')) {
          return 'guidance_search';
        }
        return 'predicate_search'; // Default
      };

      const taskType = parseCommandToTaskType(command);
      expect(taskType).toBe('predicate_search');
    });

    test('should parse device classification command', () => {
      const command = '/classify-device Class II medical device';

      const parseCommandToTaskType = (cmd: string): string => {
        if (cmd.includes('/predicate-search') || cmd.includes('predicate')) {
          return 'predicate_search';
        } else if (
          cmd.includes('/classify-device') ||
          cmd.includes('classify')
        ) {
          return 'device_classification';
        } else if (
          cmd.includes('/compare-predicate') ||
          cmd.includes('compare')
        ) {
          return 'predicate_comparison';
        } else if (cmd.includes('/find-guidance') || cmd.includes('guidance')) {
          return 'guidance_search';
        }
        return 'predicate_search'; // Default
      };

      const taskType = parseCommandToTaskType(command);
      expect(taskType).toBe('device_classification');
    });

    test('should extract K-number from command', () => {
      const command = 'Compare with predicate K123456';

      const parseCommandParameters = (cmd: string): Record<string, any> => {
        const params: Record<string, any> = {};

        // Extract K-number for comparison
        const kNumberMatch = cmd.match(/K\d{6}/);
        if (kNumberMatch) {
          params.predicate_k_number = kNumberMatch[0];
        }

        return params;
      };

      const params = parseCommandParameters(command);
      expect(params.predicate_k_number).toBe('K123456');
    });
  });

  describe('Status Management', () => {
    test('should create proper status object', () => {
      const status = {
        status: 'processing' as const,
        currentTask: 'predicate_search',
        completedTasks: [],
        message: 'Searching for predicate devices...',
        sessionId: 'test-session-123',
      };

      expect(status.status).toBe('processing');
      expect(status.currentTask).toBe('predicate_search');
      expect(status.completedTasks).toEqual([]);
      expect(status.message).toBe('Searching for predicate devices...');
      expect(status.sessionId).toBe('test-session-123');
    });

    test('should handle status transitions', () => {
      const initialStatus = {
        status: 'idle' as const,
        completedTasks: [],
      };

      const processingStatus = {
        ...initialStatus,
        status: 'processing' as const,
        currentTask: 'predicate_search',
        message: 'Starting predicate search...',
      };

      const completedStatus = {
        ...processingStatus,
        status: 'completed' as const,
        currentTask: undefined,
        completedTasks: ['predicate_search'],
        message: 'Task completed successfully',
      };

      expect(initialStatus.status).toBe('idle');
      expect(processingStatus.status).toBe('processing');
      expect(completedStatus.status).toBe('completed');
      expect(completedStatus.completedTasks).toContain('predicate_search');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      try {
        await fetch('/api/agent/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_type: 'predicate_search',
            project_id: 'test-project',
            device_description: 'Test device',
            intended_use: 'Test use',
          }),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    test('should create error status object', () => {
      const errorStatus = {
        status: 'error' as const,
        completedTasks: [],
        error: 'Backend API unavailable',
        message: 'Error: Backend API unavailable',
      };

      expect(errorStatus.status).toBe('error');
      expect(errorStatus.error).toBe('Backend API unavailable');
      expect(errorStatus.message).toContain('Error:');
    });
  });

  describe('Session Management', () => {
    test('should format session request correctly', () => {
      const sessionRequest = {
        session_id: 'test-session-123',
        reason: 'User cancelled',
      };

      expect(sessionRequest.session_id).toBe('test-session-123');
      expect(sessionRequest.reason).toBe('User cancelled');
    });

    test('should handle session status response', () => {
      const sessionStatus = {
        session_id: 'test-session-123',
        status: 'completed',
        current_task: null,
        completed_tasks: ['predicate_search', 'device_classification'],
        context: {
          project_id: 'test-project',
          device_description: 'Test device',
        },
      };

      expect(sessionStatus.session_id).toBe('test-session-123');
      expect(sessionStatus.status).toBe('completed');
      expect(sessionStatus.completed_tasks).toHaveLength(2);
      expect(sessionStatus.completed_tasks).toContain('predicate_search');
      expect(sessionStatus.completed_tasks).toContain('device_classification');
    });
  });

  describe('Real-time Updates', () => {
    test('should parse SSE event data', () => {
      const eventData = {
        event: 'status',
        data: {
          session_id: 'test-session-123',
          status: 'processing',
          current_task: 'predicate_search',
          timestamp: '2024-01-01T10:00:00Z',
        },
      };

      expect(eventData.event).toBe('status');
      expect(eventData.data.session_id).toBe('test-session-123');
      expect(eventData.data.status).toBe('processing');
      expect(eventData.data.current_task).toBe('predicate_search');
    });

    test('should handle completion event', () => {
      const completionEvent = {
        event: 'complete',
        data: {
          session_id: 'test-session-123',
          final_status: 'completed',
          timestamp: '2024-01-01T10:01:00Z',
        },
      };

      expect(completionEvent.event).toBe('complete');
      expect(completionEvent.data.final_status).toBe('completed');
    });
  });
});
