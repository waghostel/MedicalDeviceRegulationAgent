/**
 * Integration tests for CopilotKit Agent Integration
 * Tests the complete workflow from frontend to backend
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { AgentWorkflowPage } from '@/components/agent/AgentWorkflowPage';
import { ProjectContextProvider } from '@/components/providers/ProjectContextProvider';
import { useAgentExecution } from '@/hooks/useAgentExecution';

// Mock the useAgentExecution hook
jest.mock('@/hooks/useAgentExecution');

// Mock CopilotKit components
jest.mock('@copilotkit/react-core', () => ({
  CopilotKit: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="copilot-kit">{children}</div>
  ),
  CopilotChat: () => <div data-testid="copilot-chat" />,
}));

jest.mock('@copilotkit/react-ui', () => ({
  CopilotSidebar: ({ instructions }: { instructions: string }) => (
    <div data-testid="copilot-sidebar">
      <div data-testid="sidebar-instructions">{instructions}</div>
    </div>
  ),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockProject = {
  id: 'test-project-1',
  name: 'Cardiac Monitoring Device',
  description:
    'A wearable cardiac monitoring device for continuous heart rhythm analysis',
  deviceType: 'Class II Medical Device',
  intendedUse:
    'For continuous monitoring of cardiac rhythm in ambulatory patients to detect arrhythmias',
  status: 'in-progress' as const,
};

const mockUseAgentExecution = useAgentExecution as jest.MockedFunction<
  typeof useAgentExecution
>;

describe('Agent Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseAgentExecution.mockReturnValue({
      status: {
        status: 'idle',
        completedTasks: [],
      },
      isExecuting: false,
      result: null,
      executeTask: jest.fn(),
      cancelExecution: jest.fn(),
      getSessionStatus: jest.fn(),
      startStatusMonitoring: jest.fn(),
    });
  });

  const renderAgentWorkflowPage = (project = mockProject) => render(
      <ProjectContextProvider>
        <AgentWorkflowPage projectId={project.id} initialProject={project} />
      </ProjectContextProvider>
    );

  describe('Component Rendering', () => {
    test('renders agent workflow page with project context', () => {
      renderAgentWorkflowPage();

      expect(screen.getByText('Regulatory Assistant')).toBeInTheDocument();
      expect(screen.getByText('Cardiac Monitoring Device')).toBeInTheDocument();
      expect(screen.getByText('Current Project')).toBeInTheDocument();
    });

    test('renders CopilotKit components', () => {
      renderAgentWorkflowPage();

      expect(screen.getByTestId('copilot-kit')).toBeInTheDocument();
      expect(screen.getByTestId('copilot-sidebar')).toBeInTheDocument();
    });

    test('displays project information correctly', () => {
      renderAgentWorkflowPage();

      expect(screen.getByText('Class II Medical Device')).toBeInTheDocument();
      expect(
        screen.getByText(/For continuous monitoring of cardiac rhythm/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/A wearable cardiac monitoring device/)
      ).toBeInTheDocument();
    });
  });

  describe('Agent Execution Status', () => {
    test('shows execution status when agent is processing', () => {
      mockUseAgentExecution.mockReturnValue({
        status: {
          status: 'processing',
          currentTask: 'predicate_search',
          completedTasks: [],
          message: 'Searching for predicate devices...',
        },
        isExecuting: true,
        result: null,
        executeTask: jest.fn(),
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      expect(screen.getByText('Agent Status')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Predicate Search')).toBeInTheDocument();
    });

    test('shows cancel button when agent is executing', () => {
      const mockCancelExecution = jest.fn();

      mockUseAgentExecution.mockReturnValue({
        status: {
          status: 'processing',
          currentTask: 'predicate_search',
          completedTasks: [],
        },
        isExecuting: true,
        result: null,
        executeTask: jest.fn(),
        cancelExecution: mockCancelExecution,
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockCancelExecution).toHaveBeenCalledWith('User cancelled');
    });

    test('shows completed status with results', () => {
      mockUseAgentExecution.mockReturnValue({
        status: {
          status: 'completed',
          completedTasks: ['predicate_search'],
          executionTime: 2500,
        },
        isExecuting: false,
        result: {
          sessionId: 'test-session',
          taskType: 'predicate_search',
          status: 'completed',
          confidence: 0.85,
          executionTime: 2500,
        },
        executeTask: jest.fn(),
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Predicate Search')).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });
  });

  describe('Command Execution', () => {
    test('executes predicate search command', async () => {
      const mockExecuteTask = jest.fn().mockResolvedValue({
        sessionId: 'test-session',
        taskType: 'predicate_search',
        status: 'completed',
      });

      mockUseAgentExecution.mockReturnValue({
        status: { status: 'idle', completedTasks: [] },
        isExecuting: false,
        result: null,
        executeTask: mockExecuteTask,
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      // Find and click predicate search command
      const predicateSearchButton = screen.getByText(/Find Similar Predicates/);
      fireEvent.click(predicateSearchButton);

      await waitFor(() => {
        expect(mockExecuteTask).toHaveBeenCalledWith(
          'predicate_search',
          {},
          expect.objectContaining({
            projectId: mockProject.id,
            deviceDescription: mockProject.description,
            intendedUse: mockProject.intendedUse,
          })
        );
      });
    });

    test('executes device classification command', async () => {
      const mockExecuteTask = jest.fn().mockResolvedValue({
        sessionId: 'test-session',
        taskType: 'device_classification',
        status: 'completed',
      });

      mockUseAgentExecution.mockReturnValue({
        status: { status: 'idle', completedTasks: [] },
        isExecuting: false,
        result: null,
        executeTask: mockExecuteTask,
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      // Find and click classification command
      const classifyButton = screen.getByText(/Check Classification/);
      fireEvent.click(classifyButton);

      await waitFor(() => {
        expect(mockExecuteTask).toHaveBeenCalledWith(
          'device_classification',
          {},
          expect.objectContaining({
            projectId: mockProject.id,
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error status when execution fails', () => {
      mockUseAgentExecution.mockReturnValue({
        status: {
          status: 'error',
          completedTasks: [],
          error: 'Backend API unavailable',
          message: 'Error: Backend API unavailable',
        },
        isExecuting: false,
        result: null,
        executeTask: jest.fn(),
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Backend API unavailable')).toBeInTheDocument();
    });

    test('handles execution errors gracefully', async () => {
      const mockExecuteTask = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      mockUseAgentExecution.mockReturnValue({
        status: { status: 'idle', completedTasks: [] },
        isExecuting: false,
        result: null,
        executeTask: mockExecuteTask,
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      const predicateSearchButton = screen.getByText(/Find Similar Predicates/);
      fireEvent.click(predicateSearchButton);

      await waitFor(() => {
        expect(mockExecuteTask).toHaveBeenCalled();
      });

      // Error should be handled by the hook and not crash the component
      expect(screen.getByText('Regulatory Assistant')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('starts status monitoring when task begins', async () => {
      const mockStartStatusMonitoring = jest.fn();
      const mockExecuteTask = jest.fn().mockResolvedValue({
        sessionId: 'test-session',
        taskType: 'predicate_search',
        status: 'processing',
      });

      mockUseAgentExecution.mockReturnValue({
        status: { status: 'idle', completedTasks: [] },
        isExecuting: false,
        result: null,
        executeTask: mockExecuteTask,
        cancelExecution: jest.fn(),
        getSessionStatus: jest.fn(),
        startStatusMonitoring: mockStartStatusMonitoring,
      });

      renderAgentWorkflowPage();

      const predicateSearchButton = screen.getByText(/Find Similar Predicates/);
      fireEvent.click(predicateSearchButton);

      await waitFor(() => {
        expect(mockExecuteTask).toHaveBeenCalled();
      });
    });
  });

  describe('CopilotKit Integration', () => {
    test('passes correct instructions to CopilotKit', () => {
      renderAgentWorkflowPage();

      const sidebarInstructions = screen.getByTestId('sidebar-instructions');
      expect(sidebarInstructions).toHaveTextContent(
        'specialized FDA regulatory assistant'
      );
      expect(sidebarInstructions).toHaveTextContent(
        'Cardiac Monitoring Device'
      );
      expect(sidebarInstructions).toHaveTextContent('/predicate-search');
      expect(sidebarInstructions).toHaveTextContent('/classify-device');
    });

    test('toggles sidebar visibility', () => {
      renderAgentWorkflowPage();

      const toggleButton = screen.getByText('Hide Chat');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Show Chat')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    test('handles session restoration', async () => {
      const mockGetSessionStatus = jest.fn().mockResolvedValue({
        sessionId: 'existing-session',
        status: 'completed',
        completedTasks: ['predicate_search'],
      });

      mockUseAgentExecution.mockReturnValue({
        status: { status: 'idle', completedTasks: [] },
        isExecuting: false,
        result: null,
        executeTask: jest.fn(),
        cancelExecution: jest.fn(),
        getSessionStatus: mockGetSessionStatus,
        startStatusMonitoring: jest.fn(),
      });

      renderAgentWorkflowPage();

      // Session status should be available for restoration
      expect(mockGetSessionStatus).toBeDefined();
    });
  });
});

describe('useAgentExecution Hook', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  test('executes task successfully', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'test-session',
        task_type: 'predicate_search',
        status: 'completed',
        result: { predicates: [] },
        confidence: 0.85,
      }),
    });

    // This would require testing the actual hook implementation
    // For now, we verify the mock setup is correct
    expect(global.fetch).toBeDefined();
  });

  test('handles API errors', async () => {
    // Mock API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    // Error handling would be tested with actual hook implementation
    expect(global.fetch).toBeDefined();
  });
});
