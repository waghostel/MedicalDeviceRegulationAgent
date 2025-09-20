/**
 * Offline support hook with local caching and sync capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  pendingActions: PendingAction[];
  syncInProgress: boolean;
}

interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

interface UseOfflineOptions {
  maxRetries?: number;
  retryDelay?: number;
  syncOnReconnect?: boolean;
  showOfflineToast?: boolean;
}

export function useOffline(options: UseOfflineOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 5000,
    syncOnReconnect = true,
    showOfflineToast = true,
  } = options;

  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    pendingActions: [],
    syncInProgress: false,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownOfflineToast = useRef(false);

  // Load pending actions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pendingActions');
    if (stored) {
      try {
        const pendingActions = JSON.parse(stored);
        setState((prev) => ({ ...prev, pendingActions }));
      } catch (error) {
        console.error('Failed to load pending actions:', error);
        localStorage.removeItem('pendingActions');
      }
    }
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      'pendingActions',
      JSON.stringify(state.pendingActions)
    );
  }, [state.pendingActions]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true, isOffline: false }));

      if (hasShownOfflineToast.current && showOfflineToast) {
        toast({
          title: 'Back Online',
          description: 'Connection restored. Syncing pending changes...',
        });
        hasShownOfflineToast.current = false;
      }

      if (syncOnReconnect) {
        syncPendingActions();
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false, isOffline: true }));

      if (showOfflineToast && !hasShownOfflineToast.current) {
        toast({
          title: 'Offline Mode',
          description:
            'You are currently offline. Changes will be synced when connection is restored.',
          variant: 'destructive',
        });
        hasShownOfflineToast.current = true;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOnReconnect, showOfflineToast]);

  const addPendingAction = useCallback(
    (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
      const pendingAction: PendingAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setState((prev) => ({
        ...prev,
        pendingActions: [...prev.pendingActions, pendingAction],
      }));

      return pendingAction.id;
    },
    []
  );

  const removePendingAction = useCallback((actionId: string) => {
    setState((prev) => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(
        (action) => action.id !== actionId
      ),
    }));
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (
      !state.isOnline ||
      state.syncInProgress ||
      state.pendingActions.length === 0
    ) {
      return;
    }

    setState((prev) => ({ ...prev, syncInProgress: true }));

    const actionsToSync = [...state.pendingActions];
    const successfulActions: string[] = [];
    const failedActions: PendingAction[] = [];

    for (const action of actionsToSync) {
      try {
        // Simulate API call based on action type
        const response = await fetch(action.endpoint, {
          method:
            action.type === 'create'
              ? 'POST'
              : action.type === 'update'
                ? 'PUT'
                : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: action.data ? JSON.stringify(action.data) : undefined,
        });

        if (response.ok) {
          successfulActions.push(action.id);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);

        if (action.retryCount < maxRetries) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        } else {
          console.error(
            `Max retries exceeded for action ${action.id}, discarding`
          );
        }
      }
    }

    // Update state with results
    setState((prev) => ({
      ...prev,
      pendingActions: failedActions,
      syncInProgress: false,
    }));

    if (successfulActions.length > 0) {
      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${successfulActions.length} pending changes.`,
      });
    }

    if (failedActions.length > 0) {
      // Schedule retry for failed actions
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncPendingActions();
      }, retryDelay);
    }
  }, [
    state.isOnline,
    state.syncInProgress,
    state.pendingActions,
    maxRetries,
    retryDelay,
  ]);

  const clearPendingActions = useCallback(() => {
    setState((prev) => ({ ...prev, pendingActions: [] }));
    localStorage.removeItem('pendingActions');
  }, []);

  const forcSync = useCallback(() => {
    if (state.isOnline) {
      syncPendingActions();
    } else {
      toast({
        title: 'Cannot Sync',
        description:
          'You are currently offline. Sync will happen automatically when connection is restored.',
        variant: 'destructive',
      });
    }
  }, [state.isOnline, syncPendingActions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    addPendingAction,
    removePendingAction,
    syncPendingActions,
    clearPendingActions,
    forcSync,
  };
}

/**
 * Hook for offline-aware API operations
 */
export function useOfflineApi() {
  const offline = useOffline();

  const makeRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}, fallbackData?: any) => {
      if (offline.isOffline) {
        // Queue the action for later sync
        const actionId = offline.addPendingAction({
          type: (options.method as any) || 'GET',
          endpoint,
          data: options.body ? JSON.parse(options.body as string) : undefined,
        });

        // Return fallback data or throw error
        if (fallbackData !== undefined) {
          return { data: fallbackData, offline: true, actionId };
        } else {
          throw new Error('Operation queued for sync when online');
        }
      }

      // Make normal request when online
      const response = await fetch(endpoint, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, offline: false };
    },
    [offline]
  );

  return {
    ...offline,
    makeRequest,
  };
}
