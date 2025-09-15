'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import {
  useRealtimeMessaging,
  useProjectWebSocket,
} from '@/hooks/use-websocket';
import { useProjectContext } from './ProjectContextProvider';
import {
  WebSocketMessage,
  ProjectUpdateMessage,
  AgentResponseMessage,
} from '@/types/project';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: <T = any>(type: string, data: T, projectId?: number) => boolean;
  subscribe: <T = any>(
    messageType: string,
    handler: (message: WebSocketMessage<T>) => void
  ) => () => void;
  messages: WebSocketMessage[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { state: projectState, setProject } = useProjectContext();
  const { toast } = useToast();

  const { connectionStatus, sendMessage, subscribe, messages } =
    useRealtimeMessaging();

  // Handle project updates
  useEffect(() => {
    const unsubscribe = subscribe<ProjectUpdateMessage['data']>(
      'project_updated',
      (message) => {
        if (
          projectState.currentProject &&
          message.project_id === parseInt(projectState.currentProject.id)
        ) {
          // Update current project with new data
          const updatedProject = {
            ...projectState.currentProject,
            ...message.data,
          };
          setProject(updatedProject);

          // Show toast notification for project updates
          toast.success(
            'Project Updated',
            `Project "${updatedProject.name}" has been updated`
          );
        }
      }
    );

    return unsubscribe;
  }, [subscribe, projectState.currentProject, setProject, toast]);

  // Handle agent responses
  useEffect(() => {
    const unsubscribe = subscribe<AgentResponseMessage['data']>(
      'agent_response',
      (message) => {
        if (
          projectState.currentProject &&
          message.project_id === parseInt(projectState.currentProject.id)
        ) {
          // Add agent response to messages
          // This could be handled by the chat interface directly
          console.log('Received agent response:', message.data);
        }
      }
    );

    return unsubscribe;
  }, [subscribe, projectState.currentProject]);

  // Handle connection status changes
  useEffect(() => {
    switch (connectionStatus) {
      case 'connected':
        toast.success('Connected', 'Real-time updates are now active');
        break;
      case 'disconnected':
        toast.warning(
          'Disconnected',
          'Real-time updates are temporarily unavailable'
        );
        break;
      case 'error':
        toast.error(
          'Connection Error',
          'Failed to establish real-time connection'
        );
        break;
    }
  }, [connectionStatus, toast]);

  const value: WebSocketContextType = {
    connectionStatus,
    sendMessage,
    subscribe,
    messages,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }
  return context;
}
