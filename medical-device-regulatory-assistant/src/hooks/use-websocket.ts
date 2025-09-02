/**
 * WebSocket hook for real-time updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types/project';

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastMessage?: WebSocketMessage;
}

interface UseWebSocketOptions {
  url?: string;
  protocols?: string | string[];
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    protocols,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    enabled = true,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || state.connecting || state.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: undefined }));

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          error: undefined 
        }));
        
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false 
        }));
        
        onDisconnect?.();
        
        // Attempt to reconnect if enabled and within retry limits
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          connecting: false, 
          error: 'WebSocket connection error' 
        }));
        
        onError?.(error);
      };
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: 'Failed to create WebSocket connection' 
      }));
    }
  }, [enabled, state.connecting, state.connected, url, protocols, onConnect, onMessage, onDisconnect, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      connected: false, 
      connecting: false 
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && state.connected) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, [state.connected]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    sendMessage,
  };
}

/**
 * Hook for project-specific WebSocket updates
 */
export function useProjectWebSocket(projectId: number | null, onUpdate?: (message: WebSocketMessage) => void) {
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Only process messages for the current project
    if (projectId && message.project_id === projectId) {
      onUpdate?.(message);
    }
  }, [projectId, onUpdate]);

  const websocket = useWebSocket({
    onMessage: handleMessage,
    enabled: projectId !== null,
  });

  const subscribeToProject = useCallback((id: number) => {
    if (websocket.connected) {
      websocket.sendMessage({
        type: 'subscribe',
        project_id: id,
      });
    }
  }, [websocket]);

  const unsubscribeFromProject = useCallback((id: number) => {
    if (websocket.connected) {
      websocket.sendMessage({
        type: 'unsubscribe',
        project_id: id,
      });
    }
  }, [websocket]);

  // Subscribe/unsubscribe when project ID changes
  useEffect(() => {
    if (projectId && websocket.connected) {
      subscribeToProject(projectId);
      
      return () => {
        unsubscribeFromProject(projectId);
      };
    }
  }, [projectId, websocket.connected, subscribeToProject, unsubscribeFromProject]);

  return {
    ...websocket,
    subscribeToProject,
    unsubscribeFromProject,
  };
}