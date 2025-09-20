/**
 * Collaboration Toolbar Component
 * Shows online users, typing indicators, and collaboration controls
 */

import {
  Users,
  Wifi,
  WifiOff,
  Circle,
  MessageCircle,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import React, { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TypingIndicators,
  UserPresenceIndicator,
} from '@/components/ui/typing-indicators';
import { cn } from '@/lib/utils';

import { useCollaboration } from './CollaborationProvider';

interface CollaborationToolbarProps {
  className?: string;
  projectId?: number;
  showTypingIndicators?: boolean;
  showPresenceIndicators?: boolean;
  compact?: boolean;
}

export const CollaborationToolbar = ({
  className,
  projectId,
  showTypingIndicators = true,
  showPresenceIndicators = true,
  compact = false,
}: CollaborationToolbarProps) => {
  const {
    currentUser,
    onlineUsers,
    typingUsers,
    isConnected,
    connectionStatus,
    getUsersInProject,
  } = useCollaboration();

  const [showOfflineUsers, setShowOfflineUsers] = useState(false);

  const projectUsers = projectId ? getUsersInProject(projectId) : onlineUsers;
  const projectTypingUsers = projectId
    ? typingUsers.filter((user) => user.projectId === projectId)
    : typingUsers;

  const onlineCount = projectUsers.filter((user) => user.isOnline).length;
  const totalUsers = projectUsers.length;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Connection status */}
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          ) : (
            <Circle className="h-2 w-2 fill-red-500 text-red-500" />
          )}
        </div>

        {/* Online users count */}
        {onlineCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {onlineCount} online
          </Badge>
        )}

        {/* Typing indicators */}
        {showTypingIndicators && projectTypingUsers.length > 0 && (
          <TypingIndicators projectId={projectId} compact maxVisible={2} />
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-3 p-2 bg-background border rounded-lg',
          className
        )}
      >
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {connectionStatus}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connection status: {connectionStatus}</p>
          </TooltipContent>
        </Tooltip>

        {/* Online Users */}
        {showPresenceIndicators && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {onlineCount} online
                  {totalUsers > onlineCount && ` of ${totalUsers}`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Collaboration</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOfflineUsers(!showOfflineUsers)}
                  >
                    {showOfflineUsers ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Current User */}
                {currentUser && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      You
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {currentUser.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{currentUser.userName}</span>
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Online Users */}
                {projectUsers.filter(
                  (user) => user.isOnline && user.userId !== currentUser?.userId
                ).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Online
                    </p>
                    <div className="space-y-1">
                      {projectUsers
                        .filter(
                          (user) =>
                            user.isOnline && user.userId !== currentUser?.userId
                        )
                        .map((user) => (
                          <div
                            key={user.userId}
                            className="flex items-center gap-2"
                          >
                            <div className="relative">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-green-500 text-white text-xs">
                                  {user.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 border border-background rounded-full" />
                            </div>
                            <span className="text-sm">{user.userName}</span>
                            {typingUsers.some(
                              (tu) => tu.userId === user.userId
                            ) && (
                              <Badge variant="outline" className="text-xs">
                                typing...
                              </Badge>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Offline Users */}
                {showOfflineUsers &&
                  projectUsers.filter((user) => !user.isOnline).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Offline
                      </p>
                      <div className="space-y-1">
                        {projectUsers
                          .filter((user) => !user.isOnline)
                          .map((user) => (
                            <div
                              key={user.userId}
                              className="flex items-center gap-2 opacity-60"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {user.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.userName}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.lastSeen
                                  ? `Last seen ${formatRelativeTime(user.lastSeen)}`
                                  : 'Offline'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {projectUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other users in this project
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Typing Indicators */}
        {showTypingIndicators && (
          <div className="flex items-center gap-2">
            {projectTypingUsers.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <TypingIndicators
                  projectId={projectId}
                  maxVisible={3}
                  showAvatars={false}
                />
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Collaboration settings</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Floating collaboration indicator for minimal UI
 */
interface FloatingCollaborationIndicatorProps {
  className?: string;
  projectId?: number;
}

export const FloatingCollaborationIndicator = ({
  className,
  projectId,
}: FloatingCollaborationIndicatorProps) => {
  const { onlineUsers, typingUsers, isConnected, getUsersInProject } =
    useCollaboration();

  const projectUsers = projectId ? getUsersInProject(projectId) : onlineUsers;
  const onlineCount = projectUsers.filter((user) => user.isOnline).length;
  const hasTypingUsers = projectId
    ? typingUsers.some((user) => user.projectId === projectId)
    : typingUsers.length > 0;

  if (!isConnected && onlineCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 bg-background border rounded-full shadow-lg p-2',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* Connection indicator */}
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )}
        />

        {/* Online users count */}
        {onlineCount > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="text-xs">{onlineCount}</span>
          </div>
        )}

        {/* Typing indicator */}
        {hasTypingUsers && (
          <MessageCircle className="h-3 w-3 text-blue-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
