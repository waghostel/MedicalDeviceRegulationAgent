/**
 * Enhanced Toast notification hook for user feedback
 * Supports retry options, progress notifications, queuing, and rate limiting
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'progress';
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Enhanced features
  onRetry?: () => void;
  retryLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionUrl?: string;
  progress?: number;
  showProgress?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  category?: 'system' | 'user' | 'regulatory' | 'api' | 'validation';
  persistent?: boolean; // Don't auto-dismiss
  retryCount?: number;
  maxRetries?: number;
}

interface ToastState {
  toasts: Toast[];
  queue: Toast[];
  rateLimitCount: number;
  lastResetTime: number;
}

interface ToastContextualMessages {
  [key: string]: {
    title: string;
    description: string;
    actionLabel?: string;
    actionUrl?: string;
    retryLabel?: string;
  };
}

// Configuration constants
const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000; // 5 seconds default
const RATE_LIMIT_MAX = 10; // Max 10 toasts per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const QUEUE_PROCESS_INTERVAL = 500; // Process queue every 500ms

// Contextual error messages for medical device regulatory context
const CONTEXTUAL_MESSAGES: ToastContextualMessages = {
  'fda_api_error': {
    title: 'FDA API Connection Failed',
    description: 'Unable to connect to FDA database. This may affect predicate searches and device classifications.',
    actionLabel: 'Check FDA Status',
    actionUrl: 'https://open.fda.gov/status/',
    retryLabel: 'Retry Connection'
  },
  'predicate_search_failed': {
    title: 'Predicate Search Failed',
    description: 'Could not complete predicate device search. Please check your search criteria and try again.',
    retryLabel: 'Retry Search'
  },
  'classification_error': {
    title: 'Device Classification Error',
    description: 'Unable to classify your device. Please verify device description and intended use.',
    actionLabel: 'Classification Guide',
    actionUrl: 'https://www.fda.gov/medical-devices/classify-your-medical-device',
    retryLabel: 'Try Again'
  },
  'project_save_failed': {
    title: 'Project Save Failed',
    description: 'Your project changes could not be saved. Your work may be lost if you navigate away.',
    retryLabel: 'Save Again'
  },
  'export_failed': {
    title: 'Export Failed',
    description: 'Could not generate the requested export. Please try a different format or contact support.',
    retryLabel: 'Retry Export'
  },
  'validation_error': {
    title: 'Validation Error',
    description: 'Please check the highlighted fields and ensure all required information is provided.',
  },
  'auth_expired': {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again to continue.',
    actionLabel: 'Sign In'
  },
  'network_error': {
    title: 'Network Connection Error',
    description: 'Please check your internet connection and try again.',
    retryLabel: 'Retry'
  }
};

const TOAST_LIMIT_ENHANCED = 5;
const TOAST_REMOVE_DELAY_ENHANCED = 5000;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const progressIntervals = new Map<string, ReturnType<typeof setInterval>>();

const addToRemoveQueue = (toastId: string, duration?: number) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const delay = duration || TOAST_REMOVE_DELAY_ENHANCED;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    });
  }, delay);

  toastTimeouts.set(toastId, timeout);
};

const clearToastTimeout = (toastId: string) => {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
};

const processQueue = () => {
  if (memoryState.queue.length > 0 && memoryState.toasts.length < TOAST_LIMIT_ENHANCED) {
    const nextToast = memoryState.queue[0];
    dispatch({
      type: 'PROCESS_QUEUE',
      toast: nextToast,
    });
  }
};

// Process queue periodically
setInterval(processQueue, QUEUE_PROCESS_INTERVAL);

export const reducer = (state: ToastState, action: any): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST': {
      const now = Date.now();
      
      // Reset rate limit counter if window has passed
      if (now - state.lastResetTime > RATE_LIMIT_WINDOW) {
        state.rateLimitCount = 0;
        state.lastResetTime = now;
      }
      
      // Check rate limit
      if (state.rateLimitCount >= RATE_LIMIT_MAX) {
        console.warn('Toast rate limit exceeded. Toast queued.');
        return {
          ...state,
          queue: [...state.queue, action.toast],
        };
      }
      
      // If we're at the display limit, queue the toast
      if (state.toasts.length >= TOAST_LIMIT_ENHANCED) {
        return {
          ...state,
          queue: [...state.queue, action.toast],
        };
      }
      
      return {
        ...state,
        toasts: [action.toast, ...state.toasts],
        rateLimitCount: state.rateLimitCount + 1,
      };
    }

    case 'PROCESS_QUEUE': {
      const [nextToast, ...remainingQueue] = state.queue;
      if (!nextToast) return state;
      
      return {
        ...state,
        toasts: [nextToast, ...state.toasts].slice(0, TOAST_LIMIT_ENHANCED),
        queue: remainingQueue,
      };
    }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'UPDATE_PROGRESS': {
      const { toastId, progress } = action;
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, progress } : t
        ),
      };
    }

    case 'DISMISS_TOAST': {
      const { toastId } = action;

      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId);
        if (toast && !toast.persistent) {
          addToRemoveQueue(toastId, toast.duration);
        }
      } else {
        state.toasts.forEach((toast) => {
          if (!toast.persistent) {
            addToRemoveQueue(toast.id, toast.duration);
          }
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case 'REMOVE_TOAST': {
      const toastId = action.toastId;
      
      if (toastId === undefined) {
        // Clear all timeouts
        toastTimeouts.forEach((timeout) => clearTimeout(timeout));
        toastTimeouts.clear();
        progressIntervals.forEach((interval) => clearInterval(interval));
        progressIntervals.clear();
        
        return {
          ...state,
          toasts: [],
          queue: [],
        };
      }
      
      // Clear specific timeout and progress interval
      clearToastTimeout(toastId);
      const progressInterval = progressIntervals.get(toastId);
      if (progressInterval) {
        clearInterval(progressInterval);
        progressIntervals.delete(toastId);
      }
      
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      };
    }

    case 'RETRY_TOAST': {
      const { toastId } = action;
      const toast = state.toasts.find(t => t.id === toastId);
      
      if (toast && toast.onRetry) {
        const retryCount = (toast.retryCount || 0) + 1;
        const maxRetries = toast.maxRetries || 3;
        
        if (retryCount <= maxRetries) {
          // Execute retry action
          toast.onRetry();
          
          // Update toast with retry count
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId 
                ? { 
                    ...t, 
                    retryCount,
                    description: `${t.description} (Attempt ${retryCount}/${maxRetries})`
                  } 
                : t
            ),
          };
        } else {
          // Max retries reached, convert to error
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId 
                ? { 
                    ...t, 
                    variant: 'destructive' as const,
                    title: 'Max Retries Reached',
                    description: 'Please try again later or contact support.',
                    onRetry: undefined,
                    persistent: true
                  } 
                : t
            ),
          };
        }
      }
      
      return state;
    }

    default:
      return state;
  }
};

const listeners: Array<(state: ToastState) => void> = [];

let memoryState: ToastState = { 
  toasts: [], 
  queue: [], 
  rateLimitCount: 0, 
  lastResetTime: Date.now() 
};

function dispatch(action: unknown) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type ToastProps = Omit<Toast, 'id'>;

// Enhanced toast function with contextual messages and progress support
function toast({ ...props }: ToastProps) {
  const id = genId();

  const update = (updateProps: Partial<ToastProps>) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...updateProps, id },
    });

  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  const retry = () => dispatch({ type: 'RETRY_TOAST', toastId: id });

  const updateProgress = (progress: number) => 
    dispatch({ type: 'UPDATE_PROGRESS', toastId: id, progress });

  // Auto-dismiss logic (unless persistent)
  const shouldAutoDismiss = !props.persistent && props.variant !== 'progress';
  const duration = props.duration || (props.variant === 'destructive' ? 8000 : 5000);

  const toastData: Toast = {
    ...props,
    id,
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) dismiss();
    },
  };

  dispatch({
    type: 'ADD_TOAST',
    toast: toastData,
  });

  // Set up auto-dismiss if not persistent
  if (shouldAutoDismiss) {
    addToRemoveQueue(id, duration);
  }

  return {
    id,
    dismiss,
    update,
    retry,
    updateProgress,
  };
}

// Contextual toast helpers for common medical device regulatory scenarios
const contextualToast = {
  fdaApiError: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['fda_api_error'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      actionUrl: context.actionUrl,
      actionLabel: context.actionLabel,
      category: 'api',
      priority: 'high',
    });
  },

  predicateSearchFailed: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['predicate_search_failed'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      category: 'regulatory',
      priority: 'high',
    });
  },

  classificationError: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['classification_error'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      actionUrl: context.actionUrl,
      actionLabel: context.actionLabel,
      category: 'regulatory',
      priority: 'high',
    });
  },

  projectSaveFailed: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['project_save_failed'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      category: 'user',
      priority: 'critical',
      persistent: true, // Don't auto-dismiss critical save failures
    });
  },

  exportFailed: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['export_failed'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      category: 'user',
      priority: 'normal',
    });
  },

  validationError: (message?: string) => {
    const context = CONTEXTUAL_MESSAGES['validation_error'];
    return toast({
      variant: 'warning',
      title: context.title,
      description: message || context.description,
      category: 'validation',
      priority: 'normal',
    });
  },

  authExpired: (onAction?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['auth_expired'];
    return toast({
      variant: 'warning',
      title: context.title,
      description: context.description,
      onAction,
      actionLabel: context.actionLabel,
      category: 'system',
      priority: 'high',
      persistent: true,
    });
  },

  networkError: (onRetry?: () => void) => {
    const context = CONTEXTUAL_MESSAGES['network_error'];
    return toast({
      variant: 'destructive',
      title: context.title,
      description: context.description,
      onRetry,
      retryLabel: context.retryLabel,
      category: 'system',
      priority: 'high',
    });
  },

  // Progress toast for long-running operations
  progress: (title: string, description?: string) => {
    return toast({
      variant: 'progress',
      title,
      description,
      showProgress: true,
      progress: 0,
      persistent: true, // Don't auto-dismiss progress toasts
      category: 'system',
      priority: 'normal',
    });
  },

  // Success toast
  success: (title: string, description?: string) => {
    return toast({
      variant: 'success',
      title,
      description,
      category: 'user',
      priority: 'normal',
    });
  },

  // Info toast
  info: (title: string, description?: string, actionUrl?: string) => {
    return toast({
      variant: 'info',
      title,
      description,
      actionUrl,
      actionLabel: actionUrl ? 'Learn More' : undefined,
      category: 'system',
      priority: 'low',
    });
  },
};

function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const dismissAll = useCallback(() => {
    dispatch({ type: 'DISMISS_TOAST' });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'REMOVE_TOAST' });
  }, []);

  const getToastsByCategory = useCallback((category: string) => {
    return state.toasts.filter(t => t.category === category);
  }, [state.toasts]);

  const getToastsByPriority = useCallback((priority: 'low' | 'normal' | 'high' | 'critical') => {
    return state.toasts.filter(t => t.priority === priority);
  }, [state.toasts]);

  return {
    ...state,
    toast,
    contextualToast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    dismissAll,
    clearQueue,
    getToastsByCategory,
    getToastsByPriority,
  };
}

export { useToast, toast, contextualToast };