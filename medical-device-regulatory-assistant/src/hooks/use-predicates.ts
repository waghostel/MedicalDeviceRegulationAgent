/**
 * Hook for managing predicate devices with real API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dashboardService } from '@/lib/services/dashboard-service';
import { PredicateDevice } from '@/types/dashboard';

interface UsePredicatesOptions {
  projectId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface PredicatesState {
  predicates: PredicateDevice[];
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

export function usePredicates({ 
  projectId, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UsePredicatesOptions) {
  const [state, setState] = useState<PredicatesState>({
    predicates: [],
    loading: true,
  });

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadPredicates = useCallback(async (showLoading = true) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: undefined }));
    }

    try {
      const predicates = await dashboardService.getPredicateDevices(projectId);
      
      setState({
        predicates: predicates || [],
        loading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load predicate devices',
        }));
      }
    }
  }, [projectId]);

  const searchPredicates = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));
      
      const result = await dashboardService.startPredicateSearch(projectId);
      
      toast({
        title: 'Predicate Search Started',
        description: result.message || 'Searching FDA database for predicate devices.',
      });
      
      // Poll for updates after starting search
      setTimeout(() => {
        loadPredicates(false);
      }, 3000);
      
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false }));
      
      toast({
        title: 'Predicate Search Failed',
        description: error.message || 'Failed to start predicate search.',
        variant: 'destructive',
      });
    }
  }, [projectId, toast, loadPredicates]);

  const selectPredicate = useCallback(async (predicate: PredicateDevice) => {
    try {
      const newSelection = !predicate.isSelected;
      
      // Optimistic update
      setState(prev => ({
        ...prev,
        predicates: prev.predicates.map(p =>
          p.id === predicate.id ? { ...p, isSelected: newSelection } : p
        ),
      }));
      
      await dashboardService.updatePredicateSelection(
        projectId, 
        predicate.id, 
        newSelection
      );
      
      toast({
        title: newSelection ? 'Predicate Selected' : 'Predicate Deselected',
        description: `${predicate.deviceName} has been ${newSelection ? 'selected' : 'deselected'}.`,
      });
      
      // Refresh to get updated data
      setTimeout(() => {
        loadPredicates(false);
      }, 1000);
      
    } catch (error: any) {
      // Revert optimistic update
      await loadPredicates(false);
      
      toast({
        title: 'Selection Failed',
        description: error.message || 'Failed to update predicate selection.',
        variant: 'destructive',
      });
    }
  }, [projectId, toast, loadPredicates]);

  const refreshPredicates = useCallback(async () => {
    try {
      await loadPredicates(false);
      toast({
        title: 'Predicates Refreshed',
        description: 'Predicate devices have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh predicate devices.',
        variant: 'destructive',
      });
    }
  }, [loadPredicates, toast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        loadPredicates(false);
        scheduleRefresh();
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, loadPredicates]);

  // Load initial data
  useEffect(() => {
    loadPredicates();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadPredicates]);

  // Computed values
  const selectedPredicates = state.predicates.filter(p => p.isSelected);
  const topMatches = [...state.predicates]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5);
  const averageConfidence = state.predicates.length > 0 
    ? state.predicates.reduce((sum, p) => sum + p.confidenceScore, 0) / state.predicates.length
    : 0;

  return {
    ...state,
    selectedPredicates,
    topMatches,
    averageConfidence,
    searchPredicates,
    selectPredicate,
    refreshPredicates,
  };
}