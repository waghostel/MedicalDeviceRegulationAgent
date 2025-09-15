/**
 * Enhanced WebSocket hooks for real-time updates
 * Uses the comprehensive WebSocketService for connection management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types/project';
import { 
  WebSocketService, 
  ConnectionStatus, 
  MessageHandler, 
  getWebSocketService 
} from '@/lib/services/websocket-service';

// Enhanced WebSocket state interface
interface WebSocketState {
  connectionStatus: ConnectionStatus;
  lastMessage?: WebSocketMessage;
  reconnectAttempts: number;
  error?: Error;
}

// Options for the main WebSocket hook
interface UseWebSocketOptions {
  url?: string;
  protocols?: string | string[];
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  enabled?: boolean;
  autoConnect?: boolean;
}

/**
 * Main WebSocket hook with comprehensive connection management
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url,
    protocols,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    heartbeatInterval = 30000,
    enabled = true,
    autoConnect = true,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connectionStatus: 'disconnected',
    reconnectAttempts: 0,
  });

  const serviceRef = useRef<WebSocketService | null>(null);
  const mountedRef = useRef(true);
  const subscriptionsRef = useRef<(() => void)[]>([]);

  // Initialize WebSocket service
  useEffect(() => {
    if (!enabled) return;

    const config = {
      ...(url && { url }),
      ...(protocols && { protocols }),
      maxReconnectAttempts,
      reconnectInterval,
      heartbeatInterval,
    };

    serviceRef.current = getWebSocketService(config);

    // Subscribe to status changes
    const unsubscribeStatus = serviceRef.current.onStatusChange((status, error) => {
      if (!mountedRef.current) return;
      
      setState(prev => ({
        ...prev,
        connectionStatus: status,
        error,
      }));

      // Call user callbacks
      switch (status) {
        case 'connected':
          onConnect?.();
          break;
        case 'disconnected':
          onDisconnect?.();
          break;
        case 'error':
          onError?.(error || new Error('WebSocket error'));
          break;
      }
    });

    subscriptionsRef.current.push(unsubscribeStatus);

    // Subscribe to all messages if handler provided
    if (onMessage) {
      const unsubscribeMessage = serviceRef.current.subscribe('*', onMessage);
      subscriptionsRef.current.push(unsubscribeMessage);
    }

    // Auto-connect if enabled
    if (autoConnect) {
      serviceRef.current.connect();
    }

    return () => {
      mountedRef.current = false;
      subscriptionsRef.current.forEach(unsub => unsub());
      subscriptionsRef.current = [];
    };
  }, [enabled, url, protocols, maxReconnectAttempts, reconnectInterval, heartbeatInterval, autoConnect, onMessage, onConnect, onDisconnect, onError]);

  // Connection control functions
  const connect = useCallback(() => {
    serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    serviceRef.current?.reconnect();
  }, []);

  const sendMessage = useCallback(<T = any>(message: WebSocketMessage<T>): boolean => {
    return serviceRef.current?.sendMessage(message) || false;
  }, []);

  const subscribe = useCallback(<T = any>(messageType: string, handler: MessageHandler<T>): (() => void) => {
    return serviceRef.current?.subscribe(messageType, handler) || (() => {});
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribe,
  };
}

/**
 * Hook for real-time messaging with message routing
 */
export function useRealtimeMessaging() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  const websocket = useWebSocket({
    onMessage: (message) => {
      setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
    },
  });

  const sendMessage = useCallback(<T = any>(type: string, data: T, projectId?: number): boolean => {
    const message: WebSocketMessage<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      ...(projectId && { project_id: projectId }),
    };
    return websocket.sendMessage(message);
  }, [websocket]);

  const subscribe = useCallback(<T = any>(messageType: string, handler: MessageHandler<T>): (() => void) => {
    const unsubscribe = websocket.subscribe(messageType, handler);
    subscriptionsRef.current.set(messageType, unsubscribe);
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(messageType);
    };
  }, [websocket]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsub => unsub());
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    ...websocket,
    messages,
    sendMessage,
    subscribe,
    clearMessages,
  };
}

/**
 * Hook for project-specific WebSocket updates
 */
export function useProjectWebSocket(projectId: number | null, onUpdate?: (message: WebSocketMessage) => void) {
  const [projectMessages, setProjectMessages] = useState<WebSocketMessage[]>([]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Only process messages for the current project
    if (projectId && message.project_id === projectId) {
      setProjectMessages(prev => [...prev.slice(-49), message]); // Keep last 50 project messages
      onUpdate?.(message);
    }
  }, [projectId, onUpdate]);

  const websocket = useWebSocket({
    onMessage: handleMessage,
    enabled: projectId !== null,
  });

  const subscribeToProject = useCallback((id: number) => {
    if (websocket.connectionStatus === 'connected') {
      websocket.sendMessage({
        type: 'subscribe_project',
        data: { project_id: id },
        timestamp: new Date().toISOString(),
      });
    }
  }, [websocket]);

  const unsubscribeFromProject = useCallback((id: number) => {
    if (websocket.connectionStatus === 'connected') {
      websocket.sendMessage({
        type: 'unsubscribe_project',
        data: { project_id: id },
        timestamp: new Date().toISOString(),
      });
    }
  }, [websocket]);

  // Subscribe/unsubscribe when project ID or connection status changes
  useEffect(() => {
    if (projectId && websocket.connectionStatus === 'connected') {
      subscribeToProject(projectId);
      
      return () => {
        unsubscribeFromProject(projectId);
      };
    }
  }, [projectId, websocket.connectionStatus, subscribeToProject, unsubscribeFromProject]);

  return {
    ...websocket,
    projectMessages,
    subscribeToProject,
    unsubscribeFromProject,
  };
}

/**
 * Hook for streaming AI agent responses
 */
export function useStreamingResponse(options: { streamId?: string; onStreamStart?: () => void; onStreamEnd?: () => void; onError?: (error: Error) => void } = {}) {
  const { streamId, onStreamStart, onStreamEnd, onError } = options;
  
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const websocket = useWebSocket();

  // Subscribe to streaming events
  useEffect(() => {
    const unsubscribeStart = websocket.subscribe('agent_typing_start', (message) => {
      if (!streamId || message.data?.streamId === streamId) {
        setIsStreaming(true);
        setError(null);
        onStreamStart?.();
      }
    });

    const unsubscribeChunk = websocket.subscribe('agent_response_stream', (message) => {
      if (!streamId || message.data?.streamId === streamId) {
        setContent(prev => prev + (message.data?.chunk || ''));
      }
    });

    const unsubscribeEnd = websocket.subscribe('agent_typing_stop', (message) => {
      if (!streamId || message.data?.streamId === streamId) {
        setIsStreaming(false);
        onStreamEnd?.();
      }
    });

    const unsubscribeError = websocket.subscribe('agent_stream_error', (message) => {
      if (!streamId || message.data?.streamId === streamId) {
        const error = new Error(message.data?.error || 'Streaming error');
        setError(error);
        setIsStreaming(false);
        onError?.(error);
      }
    });

    return () => {
      unsubscribeStart();
      unsubscribeChunk();
      unsubscribeEnd();
      unsubscribeError();
    };
  }, [websocket, streamId, onStreamStart, onStreamEnd, onError]);

  const interrupt = useCallback(() => {
    if (isStreaming && streamId) {
      websocket.sendMessage({
        type: 'interrupt_stream',
        data: { streamId },
        timestamp: new Date().toISOString(),
      });
    }
  }, [websocket, isStreaming, streamId]);

  const restart = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    content,
    isStreaming,
    error,
    interrupt,
    restart,
    connectionStatus: websocket.connectionStatus,
  };
}

/**
 * Hook for typing indicators in collaborative editing
 */
export function useTypingIndicators() {
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string; timestamp: number }>>([]);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const websocket = useWebSocket();

  // Subscribe to typing events
  useEffect(() => {
    const unsubscribeTypingStart = websocket.subscribe('user_typing_start', (message) => {
      const { userId, userName } = message.data || {};
      if (userId) {
        setTypingUsers(prev => {
          const existing = prev.find(u => u.userId === userId);
          if (existing) {
            return prev.map(u => u.userId === userId ? { ...u, timestamp: Date.now() } : u);
          }
          return [...prev, { userId, userName: userName || userId, timestamp: Date.now() }];
        });

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutRef.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
          typingTimeoutRef.current.delete(userId);
        }, 3000); // Remove after 3 seconds of inactivity

        typingTimeoutRef.current.set(userId, timeout);
      }
    });

    const unsubscribeTypingStop = websocket.subscribe('user_typing_stop', (message) => {
      const { userId } = message.data || {};
      if (userId) {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        
        const timeout = typingTimeoutRef.current.get(userId);
        if (timeout) {
          clearTimeout(timeout);
          typingTimeoutRef.current.delete(userId);
        }
      }
    });

    return () => {
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      
      // Clear all timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [websocket]);

  const startTyping = useCallback((userId: string, userName?: string) => {
    websocket.sendMessage({
      type: 'user_typing_start',
      data: { userId, userName },
      timestamp: new Date().toISOString(),
    });
  }, [websocket]);

  const stopTyping = useCallback((userId: string) => {
    websocket.sendMessage({
      type: 'user_typing_stop',
      data: { userId },
      timestamp: new Date().toISOString(),
    });
  }, [websocket]);

  const isUserTyping = useCallback((userId: string): boolean => {
    return typingUsers.some(u => u.userId === userId);
  }, [typingUsers]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isUserTyping,
    connectionStatus: websocket.connectionStatus,
  };
}