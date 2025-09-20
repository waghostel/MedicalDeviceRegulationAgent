/**
 * Hook for managing device classification with real API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dashboardService } from '@/lib/services/dashboard-service';
import { DeviceClassification } from '@/types/dashboard';

interface UseClassificationOptions {
  projectId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ClassificationState {
  classification?: DeviceClassification;
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

export function useClassification({
  projectId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseClassificationOptions) {
  const [state, setState] = useState<ClassificationState>({
    loading: true,
  });

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadClassification = useCallback(
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
        const classification =
          await dashboardService.getClassification(projectId);

        setState({
          classification: classification || undefined,
          loading: false,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Failed to load classification data',
          }));
        }
      }
    },
    [projectId]
  );

  const startClassification = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      const result = await dashboardService.startClassification(projectId);

      toast({
        title: 'Classification Started',
        description:
          result.message ||
          'Device classification analysis has been initiated.',
      });

      // Poll for updates after starting classification
      setTimeout(() => {
        loadClassification(false);
      }, 2000);
    } catch (error: any) {
      setState((prev) => ({ ...prev, loading: false }));

      toast({
        title: 'Classification Failed',
        description:
          error.message || 'Failed to start classification analysis.',
        variant: 'destructive',
      });
    }
  }, [projectId, toast, loadClassification]);

  const refreshClassification = useCallback(async () => {
    try {
      await loadClassification(false);
      toast({
        title: 'Classification Refreshed',
        description: 'Classification data has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh classification data.',
        variant: 'destructive',
      });
    }
  }, [loadClassification, toast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        loadClassification(false);
        scheduleRefresh();
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, loadClassification]);

  // Load initial data
  useEffect(() => {
    loadClassification();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadClassification]);

  return {
    ...state,
    startClassification,
    refreshClassification,
  };
}
