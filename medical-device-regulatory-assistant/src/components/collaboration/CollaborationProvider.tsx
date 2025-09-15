/**
 * Collaboration Provider Component
 * Provides multi-user collaboration context and real-time features
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import { useUserPresence, UserPresence } from '@/hooks/use-user-presence';
import { useTypingIndicators } from '@/hooks/use-websocket';

interface CollaborationContextType {
  // User presence
  currentUser: {
    userId: string;
    userName: string;
  } | null;
  onlineUsers: UserPresence[];
  isUserOnline: (userId: string) => boolean;
  getUsersInProject: (projectId: number) => UserPresence[];

  // Typing indicators
  typingUsers: Array<{
    userId: string;
    userName: string;
    timestamp: number;
    projectId?: number;
  }>;
  startTyping: (projectId?: number) => void;
  stopTyping: (projectId?: number) => void;
  isUserTyping: (userId: string, projectId?: number) => boolean;

  // Project collaboration
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  currentProject: number | null;

  // Connection status
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const CollaborationContext = createContext<CollaborationContextType | null>(
  null
);

interface CollaborationProviderProps {
  children: React.ReactNode;
  projectId?: number;
  enableCursorTracking?: boolean;
}

export function CollaborationProvider({
  children,
  projectId,
  enableCursorTracking = false,
}: CollaborationProviderProps) {
  const { data: session } = useSession();
  const [currentProject, setCurrentProject] = useState<number | null>(
    projectId || null
  );

  // Get user info from session
  const currentUser = session?.user
    ? {
        userId: session.user.id || session.user.email || 'anonymous',
        userName: session.user.name || session.user.email || 'Anonymous User',
      }
    : null;

  // Initialize presence tracking
  const {
    users: onlineUsers,
    isOnline,
    getOnlineUsers,
    getUsersInProject,
    isUserOnline,
    connectionStatus,
    announcePresence,
    announceLeave,
  } = useUserPresence({
    userId: currentUser?.userId || 'anonymous',
    userName: currentUser?.userName || 'Anonymous User',
    projectId: currentProject || undefined,
    trackCursor: enableCursorTracking,
  });

  // Initialize typing indicators
  const {
    typingUsers,
    startTyping: startTypingRaw,
    stopTyping: stopTypingRaw,
    isUserTyping,
    joinProject: joinProjectRaw,
    leaveProject: leaveProjectRaw,
  } = useTypingIndicators();

  // Wrapped functions that include current user context
  const startTyping = useCallback(
    (projectId?: number) => {
      if (currentUser) {
        startTypingRaw(
          currentUser.userId,
          currentUser.userName,
          projectId || currentProject || undefined
        );
      }
    },
    [currentUser, startTypingRaw, currentProject]
  );

  const stopTyping = useCallback(
    (projectId?: number) => {
      if (currentUser) {
        stopTypingRaw(
          currentUser.userId,
          projectId || currentProject || undefined
        );
      }
    },
    [currentUser, stopTypingRaw, currentProject]
  );

  const joinProject = useCallback(
    (projectId: number) => {
      if (currentUser) {
        setCurrentProject(projectId);
        joinProjectRaw(currentUser.userId, currentUser.userName, projectId);
      }
    },
    [currentUser, joinProjectRaw]
  );

  const leaveProject = useCallback(
    (projectId: number) => {
      if (currentUser) {
        leaveProjectRaw(currentUser.userId, projectId);
        if (currentProject === projectId) {
          setCurrentProject(null);
        }
      }
    },
    [currentUser, leaveProjectRaw, currentProject]
  );

  // Auto-join project when projectId prop changes
  useEffect(() => {
    if (projectId && projectId !== currentProject && currentUser) {
      joinProject(projectId);
    }
  }, [projectId, currentProject, currentUser, joinProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentProject && currentUser) {
        leaveProject(currentProject);
      }
    };
  }, [currentProject, currentUser, leaveProject]);

  const contextValue: CollaborationContextType = {
    currentUser,
    onlineUsers,
    isUserOnline,
    getUsersInProject,
    typingUsers,
    startTyping,
    stopTyping,
    isUserTyping,
    joinProject,
    leaveProject,
    currentProject,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      'useCollaboration must be used within a CollaborationProvider'
    );
  }
  return context;
}

/**
 * Hook for project-specific collaboration features
 */
export function useProjectCollaboration(projectId: number) {
  const collaboration = useCollaboration();

  const projectUsers = collaboration.getUsersInProject(projectId);
  const projectTypingUsers = collaboration.typingUsers.filter(
    (user) => user.projectId === projectId
  );

  const startTyping = useCallback(() => {
    collaboration.startTyping(projectId);
  }, [collaboration, projectId]);

  const stopTyping = useCallback(() => {
    collaboration.stopTyping(projectId);
  }, [collaboration, projectId]);

  const joinProject = useCallback(() => {
    collaboration.joinProject(projectId);
  }, [collaboration, projectId]);

  const leaveProject = useCallback(() => {
    collaboration.leaveProject(projectId);
  }, [collaboration, projectId]);

  return {
    ...collaboration,
    projectUsers,
    projectTypingUsers,
    startTyping,
    stopTyping,
    joinProject,
    leaveProject,
    isCurrentProject: collaboration.currentProject === projectId,
  };
}
