/**
 * User Presence Hook for Multi-user Collaboration
 * Manages user presence, online status, and activity tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

export interface UserPresence {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: Date;
  currentProject?: number;
  isTyping?: boolean;
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
}

interface UseUserPresenceOptions {
  userId: string;
  userName: string;
  projectId?: number;
  trackCursor?: boolean;
  heartbeatInterval?: number;
}

export function useUserPresence({
  userId,
  userName,
  projectId,
  trackCursor = false,
  heartbeatInterval = 30000, // 30 seconds
}: UseUserPresenceOptions) {
  const [users, setUsers] = useState<Map<string, UserPresence>>(new Map());
  const [isOnline, setIsOnline] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const cursorTimeoutRef = useRef<NodeJS.Timeout>();

  const websocket = useWebSocket();

  // Initialize presence when component mounts
  useEffect(() => {
    if (websocket.connectionStatus === 'connected') {
      announcePresence();
      startHeartbeat();
      setIsOnline(true);
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      announceLeave();
    };
  }, [websocket.connectionStatus, projectId]);

  // Subscribe to presence events
  useEffect(() => {
    const unsubscribePresenceAnnounce = websocket.subscribe('presence_announce', (message) => {
      const { user } = message.data || {};
      if (user && user.userId !== userId) {
        setUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(user.userId, {
            ...user,
            lastSeen: new Date(user.lastSeen),
            isOnline: true,
          });
          return newMap;
        });
      }
    });

    const unsubscribePresenceUpdate = websocket.subscribe('presence_update', (message) => {
      const { user } = message.data || {};
      if (user && user.userId !== userId) {
        setUsers(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(user.userId);
          newMap.set(user.userId, {
            ...existing,
            ...user,
            lastSeen: new Date(user.lastSeen),
          });
          return newMap;
        });
      }
    });

    const unsubscribePresenceLeave = websocket.subscribe('presence_leave', (message) => {
      const { userId: leavingUserId } = message.data || {};
      if (leavingUserId && leavingUserId !== userId) {
        setUsers(prev => {
          const newMap = new Map(prev);
          const user = newMap.get(leavingUserId);
          if (user) {
            newMap.set(leavingUserId, {
              ...user,
              isOnline: false,
              lastSeen: new Date(),
            });
          }
          return newMap;
        });
      }
    });

    const unsubscribeCursorMove = websocket.subscribe('cursor_move', (message) => {
      const { userId: movingUserId, cursor } = message.data || {};
      if (movingUserId && movingUserId !== userId && cursor) {
        setUsers(prev => {
          const newMap = new Map(prev);
          const user = newMap.get(movingUserId);
          if (user) {
            newMap.set(movingUserId, {
              ...user,
              cursor,
              lastSeen: new Date(),
            });
          }
          return newMap;
        });
      }
    });

    const unsubscribeHeartbeat = websocket.subscribe('presence_heartbeat', (message) => {
      const { userId: heartbeatUserId } = message.data || {};
      if (heartbeatUserId && heartbeatUserId !== userId) {
        setUsers(prev => {
          const newMap = new Map(prev);
          const user = newMap.get(heartbeatUserId);
          if (user) {
            newMap.set(heartbeatUserId, {
              ...user,
              lastSeen: new Date(),
              isOnline: true,
            });
          }
          return newMap;
        });
      }
    });

    return () => {
      unsubscribePresenceAnnounce();
      unsubscribePresenceUpdate();
      unsubscribePresenceLeave();
      unsubscribeCursorMove();
      unsubscribeHeartbeat();
    };
  }, [websocket, userId]);

  const announcePresence = useCallback(() => {
    if (websocket.connectionStatus === 'connected') {
      websocket.sendMessage({
        type: 'presence_announce',
        data: {
          user: {
            userId,
            userName,
            currentProject: projectId,
            lastSeen: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
        project_id: projectId,
      });
    }
  }, [websocket, userId, userName, projectId]);

  const announceLeave = useCallback(() => {
    if (websocket.connectionStatus === 'connected') {
      websocket.sendMessage({
        type: 'presence_leave',
        data: { userId },
        timestamp: new Date().toISOString(),
        project_id: projectId,
      });
    }
  }, [websocket, userId, projectId]);

  const updatePresence = useCallback((updates: Partial<UserPresence>) => {
    if (websocket.connectionStatus === 'connected') {
      websocket.sendMessage({
        type: 'presence_update',
        data: {
          user: {
            userId,
            userName,
            currentProject: projectId,
            lastSeen: new Date().toISOString(),
            ...updates,
          },
        },
        timestamp: new Date().toISOString(),
        project_id: projectId,
      });
    }
  }, [websocket, userId, userName, projectId]);

  const updateCursor = useCallback((x: number, y: number, elementId?: string) => {
    if (!trackCursor || websocket.connectionStatus !== 'connected') return;

    // Throttle cursor updates
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }

    cursorTimeoutRef.current = setTimeout(() => {
      websocket.sendMessage({
        type: 'cursor_move',
        data: {
          userId,
          cursor: { x, y, elementId },
        },
        timestamp: new Date().toISOString(),
        project_id: projectId,
      });
    }, 100); // Throttle to 10 updates per second
  }, [websocket, userId, projectId, trackCursor]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (websocket.connectionStatus === 'connected') {
        websocket.sendMessage({
          type: 'presence_heartbeat',
          data: { userId },
          timestamp: new Date().toISOString(),
          project_id: projectId,
        });
      }
    }, heartbeatInterval);
  }, [websocket, userId, projectId, heartbeatInterval]);

  const getOnlineUsers = useCallback(() => {
    return Array.from(users.values()).filter(user => user.isOnline);
  }, [users]);

  const getUsersInProject = useCallback((targetProjectId: number) => {
    return Array.from(users.values()).filter(
      user => user.isOnline && user.currentProject === targetProjectId
    );
  }, [users]);

  const isUserOnline = useCallback((targetUserId: string) => {
    const user = users.get(targetUserId);
    return user?.isOnline || false;
  }, [users]);

  // Track mouse movement for cursor sharing
  useEffect(() => {
    if (!trackCursor) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateCursor(event.clientX, event.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [trackCursor, updateCursor]);

  return {
    users: Array.from(users.values()),
    isOnline,
    announcePresence,
    announceLeave,
    updatePresence,
    updateCursor,
    getOnlineUsers,
    getUsersInProject,
    isUserOnline,
    connectionStatus: websocket.connectionStatus,
  };
}