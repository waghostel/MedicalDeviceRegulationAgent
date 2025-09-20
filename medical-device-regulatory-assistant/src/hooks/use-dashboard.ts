/**
 * Dashboard hook for managing dashboard data with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/lib/services/project-service';
import { DashboardData, DashboardUpdate } from '@/types/dashboard';

interface UseDashboardOptions {
  projectId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface DashboardState {
  data?: DashboardData;
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

export function useDashboard({
  projectId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseDashboardOptions) {
  const [state, setState] = useState<DashboardState>({
    loading: true,
  });

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket(
    `/projects/${projectId}/dashboard`
  );

  const loadDashboardData = useCallback(
    async (showLoading = true) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (showLoading) {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));
      }

      try {
        // Load both project and dashboard data
        const [project, dashboardData] = await Promise.all([
          projectService.getProject(parseInt(projectId)),
          projectService.getProjectDashboard(parseInt(projectId)),
        ]);

        // Transform backend data to frontend format
        const transformedData: DashboardData = {
          project: {
            id: project.id.toString(),
            name: project.name,
            description: project.description || '',
            deviceType: project.device_type || '',
            intendedUse: project.intended_use || '',
            status: project.status,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
          },
          classification: dashboardData.classification || undefined,
          predicateDevices: dashboardData.predicate_devices || [],
          progress: dashboardData.progress || {
            projectId: projectId,
            classification: { status: 'pending' },
            predicateSearch: { status: 'pending' },
            comparisonAnalysis: { status: 'pending' },
            submissionReadiness: { status: 'pending' },
            overallProgress: 0,
            nextActions: [],
            lastUpdated: new Date().toISOString(),
          },
          recentActivity: dashboardData.recent_activity || [],
          statistics: dashboardData.statistics || {
            totalPredicates: 0,
            selectedPredicates: 0,
            averageConfidence: 0,
            completionPercentage: 0,
            documentsCount: 0,
            agentInteractions: 0,
          },
        };

        setState({
          data: transformedData,
          loading: false,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Failed to load dashboard data',
          }));
        }
      }
    },
    [projectId]
  );

  const refreshDashboard = useCallback(async () => {
    try {
      await loadDashboardData(false);
      toast({
        title: 'Dashboard Updated',
        description: 'Dashboard data has been refreshed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh dashboard data.',
        variant: 'destructive',
      });
    }
  }, [loadDashboardData, toast]);

  const exportDashboard = useCallback(
    async (format: 'json' | 'pdf' = 'json') => {
      try {
        const blob = await projectService.exportProject(
          parseInt(projectId),
          format
        );

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_${projectId}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Complete',
          description: `Dashboard has been exported as ${format.toUpperCase()}.`,
        });
      } catch (error: any) {
        toast({
          title: 'Export Failed',
          description: error.message || 'Failed to export dashboard.',
          variant: 'destructive',
        });
      }
    },
    [projectId, toast]
  );

  // Handle real-time WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update: DashboardUpdate = JSON.parse(lastMessage);

        if (update.projectId === projectId) {
          // Refresh dashboard data when updates are received
          loadDashboardData(false);

          // Show notification for specific update types
          const notifications = {
            classification_updated: 'Device classification has been updated',
            predicate_added: 'New predicate device has been added',
            progress_updated: 'Project progress has been updated',
            activity_added: 'New activity has been recorded',
          };

          const message = notifications[update.type];
          if (message) {
            toast({
              title: 'Real-time Update',
              description: message,
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, projectId, loadDashboardData, toast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshDashboard();
        scheduleRefresh();
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshDashboard]);

  // Load initial data
  useEffect(() => {
    loadDashboardData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadDashboardData]);

  // Agent action handlers
  const startClassification = useCallback(async () => {
    try {
      // This would trigger the agent to start classification
      // For now, we'll just show a toast and refresh
      toast({
        title: 'Classification Started',
        description: 'Device classification analysis has been initiated.',
      });

      // In a real implementation, this would call the agent API
      // await agentService.startClassification(projectId);

      setTimeout(() => {
        refreshDashboard();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Classification Failed',
        description: error.message || 'Failed to start classification.',
        variant: 'destructive',
      });
    }
  }, [projectId, toast, refreshDashboard]);

  const searchPredicates = useCallback(async () => {
    try {
      toast({
        title: 'Predicate Search Started',
        description: 'Searching FDA database for predicate devices.',
      });

      // In a real implementation, this would call the agent API
      // await agentService.searchPredicates(projectId);

      setTimeout(() => {
        refreshDashboard();
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Predicate Search Failed',
        description: error.message || 'Failed to search predicates.',
        variant: 'destructive',
      });
    }
  }, [projectId, toast, refreshDashboard]);

  const selectPredicate = useCallback(
    async (predicate: any) => {
      try {
        // Toggle selection status
        const newSelection = !predicate.isSelected;

        toast({
          title: newSelection ? 'Predicate Selected' : 'Predicate Deselected',
          description: `${predicate.deviceName} has been ${newSelection ? 'selected' : 'deselected'}.`,
        });

        // In a real implementation, this would update the backend
        // await projectService.updatePredicateSelection(predicate.id, newSelection);

        setTimeout(() => {
          refreshDashboard();
        }, 1000);
      } catch (error: any) {
        toast({
          title: 'Selection Failed',
          description: error.message || 'Failed to update predicate selection.',
          variant: 'destructive',
        });
      }
    },
    [toast, refreshDashboard]
  );

  const handleStepClick = useCallback(
    async (step: string) => {
      try {
        toast({
          title: 'Step Navigation',
          description: `Navigating to ${step} workflow.`,
        });

        // In a real implementation, this would navigate to the appropriate workflow
        // router.push(`/projects/${projectId}/${step}`);
      } catch (error: any) {
        toast({
          title: 'Navigation Failed',
          description: error.message || 'Failed to navigate to step.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return {
    ...state,
    isConnected,
    refreshDashboard,
    exportDashboard,
    startClassification,
    searchPredicates,
    selectPredicate,
    handleStepClick,
  };
}
