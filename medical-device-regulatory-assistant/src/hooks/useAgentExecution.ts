/**
 * Hook for managing agent execution status and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AgentExecutionStatus {
  sessionId?: string;
  status: 'idle' | 'processing' | 'completed' | 'error' | 'cancelled';
  currentTask?: string;
  completedTasks: string[];
  progress?: number;
  message?: string;
  error?: string;
  executionTime?: number;
}

export interface AgentExecutionResult {
  sessionId: string;
  taskType: string;
  status: string;
  result?: any;
  confidence?: number;
  sources?: any[];
  reasoning?: string;
  executionTime?: number;
  error?: string;
}

interface UseAgentExecutionOptions {
  onStatusUpdate?: (status: AgentExecutionStatus) => void;
  onComplete?: (result: AgentExecutionResult) => void;
  onError?: (error: string) => void;
  enableRealTimeUpdates?: boolean;
}

export function useAgentExecution(options: UseAgentExecutionOptions = {}) {
  const [status, setStatus] = useState<AgentExecutionStatus>({
    status: 'idle',
    completedTasks: [],
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<AgentExecutionResult | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onStatusUpdate,
    onComplete,
    onError,
    enableRealTimeUpdates = true,
  } = options;

  // Clean up event source and abort controller
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Start real-time status monitoring
  const startStatusMonitoring = useCallback(
    (sessionId: string) => {
      if (!enableRealTimeUpdates) return;

      cleanup(); // Clean up any existing connections

      const eventSource = new EventSource(
        `/api/agent/session/${sessionId}/stream`,
        { withCredentials: true }
      );

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          const newStatus: AgentExecutionStatus = {
            sessionId: data.session_id,
            status: data.status || 'processing',
            currentTask: data.current_task,
            completedTasks: data.completed_tasks || [],
            message: data.message,
            progress: data.progress,
          };

          setStatus(newStatus);
          onStatusUpdate?.(newStatus);
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.addEventListener('status', (event) => {
        try {
          const data = JSON.parse(event.data);
          const newStatus: AgentExecutionStatus = {
            sessionId: data.session_id,
            status: data.status,
            currentTask: data.current_task,
            completedTasks: data.completed_tasks || [],
            message: `Task status: ${data.status}`,
          };

          setStatus(newStatus);
          onStatusUpdate?.(newStatus);
        } catch (error) {
          console.error('Error parsing status event:', error);
        }
      });

      eventSource.addEventListener('update', (event) => {
        try {
          const data = JSON.parse(event.data);
          const newStatus: AgentExecutionStatus = {
            sessionId: data.session_id,
            status: data.status,
            currentTask: data.current_task,
            completedTasks: data.completed_tasks || [],
            message: 'Task in progress...',
          };

          setStatus(newStatus);
          onStatusUpdate?.(newStatus);
        } catch (error) {
          console.error('Error parsing update event:', error);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          const newStatus: AgentExecutionStatus = {
            sessionId: data.session_id,
            status: data.final_status,
            completedTasks: [],
            message: 'Task completed',
          };

          setStatus(newStatus);
          setIsExecuting(false);
          onStatusUpdate?.(newStatus);

          cleanup();
        } catch (error) {
          console.error('Error parsing complete event:', error);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          const errorMessage =
            typeof data === 'string' ? data : data.message || 'Unknown error';

          const newStatus: AgentExecutionStatus = {
            sessionId: sessionId,
            status: 'error',
            completedTasks: [],
            error: errorMessage,
            message: `Error: ${errorMessage}`,
          };

          setStatus(newStatus);
          setIsExecuting(false);
          onError?.(errorMessage);
          onStatusUpdate?.(newStatus);

          cleanup();
        } catch (error) {
          console.error('Error parsing error event:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);

        const newStatus: AgentExecutionStatus = {
          sessionId: sessionId,
          status: 'error',
          completedTasks: [],
          error: 'Connection error',
          message: 'Lost connection to server',
        };

        setStatus(newStatus);
        setIsExecuting(false);
        onError?.('Connection error');
        onStatusUpdate?.(newStatus);

        cleanup();
      };
    },
    [enableRealTimeUpdates, onStatusUpdate, onError, cleanup]
  );

  // Execute an agent task
  const executeTask = useCallback(
    async (
      taskType: string,
      parameters: Record<string, any>,
      projectContext?: {
        projectId: string;
        deviceDescription: string;
        intendedUse: string;
        deviceType?: string;
      }
    ): Promise<AgentExecutionResult> => {
      setIsExecuting(true);
      setResult(null);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const initialStatus: AgentExecutionStatus = {
        status: 'processing',
        currentTask: taskType,
        completedTasks: [],
        message: `Starting ${taskType}...`,
      };

      setStatus(initialStatus);
      onStatusUpdate?.(initialStatus);

      try {
        const response = await fetch('/api/agent/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task_type: taskType,
            project_id: projectContext?.projectId || 'copilot-session',
            device_description:
              projectContext?.deviceDescription || 'Unknown device',
            intended_use: projectContext?.intendedUse || 'Unknown use',
            device_type: projectContext?.deviceType,
            parameters: parameters,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: AgentExecutionResult = await response.json();

        // Start monitoring if we have a session ID
        if (result.sessionId && enableRealTimeUpdates) {
          startStatusMonitoring(result.sessionId);
        }

        const completedStatus: AgentExecutionStatus = {
          sessionId: result.sessionId,
          status: result.status === 'completed' ? 'completed' : 'processing',
          currentTask: result.status === 'completed' ? undefined : taskType,
          completedTasks: result.status === 'completed' ? [taskType] : [],
          message:
            result.status === 'completed'
              ? 'Task completed successfully'
              : 'Task in progress...',
          executionTime: result.executionTime,
        };

        setStatus(completedStatus);
        setResult(result);
        setIsExecuting(result.status !== 'completed');

        onStatusUpdate?.(completedStatus);

        if (result.status === 'completed') {
          onComplete?.(result);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        const errorStatus: AgentExecutionStatus = {
          status: 'error',
          completedTasks: [],
          error: errorMessage,
          message: `Error: ${errorMessage}`,
        };

        setStatus(errorStatus);
        setIsExecuting(false);

        onError?.(errorMessage);
        onStatusUpdate?.(errorStatus);

        throw error;
      }
    },
    [
      enableRealTimeUpdates,
      startStatusMonitoring,
      onStatusUpdate,
      onComplete,
      onError,
    ]
  );

  // Cancel current execution
  const cancelExecution = useCallback(
    async (reason?: string) => {
      if (!status.sessionId) {
        return;
      }

      try {
        // Cancel the HTTP request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Send cancellation request to backend
        await fetch(`/api/agent/session/${status.sessionId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: status.sessionId,
            reason: reason || 'User cancelled',
          }),
        });

        const cancelledStatus: AgentExecutionStatus = {
          sessionId: status.sessionId,
          status: 'cancelled',
          completedTasks: status.completedTasks,
          message: 'Task cancelled by user',
        };

        setStatus(cancelledStatus);
        setIsExecuting(false);
        onStatusUpdate?.(cancelledStatus);

        cleanup();
      } catch (error) {
        console.error('Error cancelling execution:', error);
      }
    },
    [status.sessionId, status.completedTasks, onStatusUpdate, cleanup]
  );

  // Get session status
  const getSessionStatus = useCallback(
    async (sessionId: string): Promise<AgentExecutionStatus> => {
      try {
        const response = await fetch(`/api/agent/session/${sessionId}/status`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const sessionStatus: AgentExecutionStatus = {
          sessionId: data.session_id,
          status: data.status,
          currentTask: data.current_task,
          completedTasks: data.completed_tasks || [],
          message: `Session status: ${data.status}`,
        };

        return sessionStatus;
      } catch (error) {
        throw new Error(
          `Failed to get session status: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    status,
    isExecuting,
    result,
    executeTask,
    cancelExecution,
    getSessionStatus,
    startStatusMonitoring,
  };
}
