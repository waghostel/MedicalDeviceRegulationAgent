/**
 * Enhanced Multi-user Typing Indicators Component
 * Shows real-time typing indicators for collaborative editing with improved multi-user support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTypingIndicators } from '@/hooks/use-websocket';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
  color?: string;
}

interface TypingIndicatorsProps {
  className?: string;
  maxVisible?: number;
  showAvatars?: boolean;
  showUserColors?: boolean;
  projectId?: number;
  compact?: boolean;
}

// Generate consistent colors for users
const getUserColor = (userId: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-red-500',
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
};

export function TypingIndicators({
  className,
  maxVisible = 3,
  showAvatars = true,
  showUserColors = true,
  projectId,
  compact = false,
}: TypingIndicatorsProps) {
  const { typingUsers, connectionStatus } = useTypingIndicators();
  const [displayUsers, setDisplayUsers] = useState<TypingUser[]>([]);

  // Filter and enhance typing users with colors
  useEffect(() => {
    const enhancedUsers = typingUsers
      .filter((user) => !projectId || user.projectId === projectId)
      .map((user) => ({
        ...user,
        color: showUserColors ? getUserColor(user.userId) : undefined,
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by when they started typing

    setDisplayUsers(enhancedUsers);
  }, [typingUsers, projectId, showUserColors]);

  if (displayUsers.length === 0 || connectionStatus !== 'connected') {
    return null;
  }

  const visibleUsers = displayUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, displayUsers.length - maxVisible);

  const formatTypingText = () => {
    if (compact) {
      return displayUsers.length === 1
        ? `${visibleUsers[0].userName} typing...`
        : `${displayUsers.length} typing...`;
    }

    if (visibleUsers.length === 1) {
      return `${visibleUsers[0].userName} is typing...`;
    } else if (visibleUsers.length === 2) {
      return `${visibleUsers[0].userName} and ${visibleUsers[1].userName} are typing...`;
    } else if (visibleUsers.length === 3 && hiddenCount === 0) {
      return `${visibleUsers[0].userName}, ${visibleUsers[1].userName}, and ${visibleUsers[2].userName} are typing...`;
    } else {
      const names = visibleUsers
        .slice(0, 2)
        .map((u) => u.userName)
        .join(', ');
      const additional = hiddenCount > 0 ? hiddenCount + 1 : 1;
      return `${names} and ${additional} other${additional > 1 ? 's' : ''} are typing...`;
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 text-xs text-muted-foreground',
          className
        )}
      >
        {showAvatars && visibleUsers.length <= 3 && (
          <div className="flex -space-x-1">
            {visibleUsers.map((user) => (
              <Avatar
                key={user.userId}
                className="h-4 w-4 border border-background"
              >
                <AvatarFallback
                  className={cn('text-xs text-white', user.color)}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
        <span>{formatTypingText()}</span>
        <TypingAnimation className="scale-75" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 animate-fade-in', className)}>
      <div className="flex items-center gap-2">
        {showAvatars && (
          <div className="flex -space-x-2">
            {visibleUsers.map((user, index) => (
              <Avatar
                key={user.userId}
                className="h-6 w-6 border-2 border-background"
                style={{ zIndex: visibleUsers.length - index }}
              >
                <AvatarFallback
                  className={cn('text-xs text-white', user.color)}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {hiddenCount > 0 && (
              <Avatar className="h-6 w-6 border-2 border-background bg-muted">
                <AvatarFallback className="text-xs">
                  +{hiddenCount}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        <Badge variant="secondary" className="text-xs">
          {formatTypingText()}
        </Badge>
      </div>

      <TypingAnimation />
    </div>
  );
}

/**
 * Animated typing dots indicator
 */
export function TypingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex space-x-1">
        <div className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}

/**
 * Individual typing indicator for specific users with enhanced styling
 */
interface UserTypingIndicatorProps {
  userId: string;
  userName?: string;
  className?: string;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function UserTypingIndicator({
  userId,
  userName,
  className,
  showAvatar = true,
  size = 'md',
}: UserTypingIndicatorProps) {
  const { isUserTyping } = useTypingIndicators();

  if (!isUserTyping(userId)) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const avatarSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-muted-foreground animate-fade-in',
        sizeClasses[size],
        className
      )}
    >
      {showAvatar && (
        <Avatar className={avatarSizes[size]}>
          <AvatarFallback
            className={cn('text-xs text-white', getUserColor(userId))}
          >
            {(userName || userId).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <span>{userName || userId} is typing</span>
      <TypingAnimation className={size === 'sm' ? 'scale-75' : ''} />
    </div>
  );
}

/**
 * Enhanced typing indicator for agent responses
 */
interface AgentTypingIndicatorProps {
  isTyping: boolean;
  className?: string;
  agentName?: string;
  showAvatar?: boolean;
  progress?: number; // 0-100 for progress indication
}

export function AgentTypingIndicator({
  isTyping,
  className,
  agentName = 'AI Assistant',
  showAvatar = true,
  progress,
}: AgentTypingIndicatorProps) {
  if (!isTyping) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground animate-fade-in',
        className
      )}
    >
      {showAvatar && (
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium">
            AI
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col gap-1">
        <span>{agentName} is typing...</span>
        {progress !== undefined && (
          <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
      <TypingAnimation />
    </div>
  );
}

/**
 * Multi-user presence indicator showing who's currently active
 */
interface UserPresenceIndicatorProps {
  users: Array<{
    userId: string;
    userName: string;
    isOnline: boolean;
    lastSeen?: Date;
  }>;
  maxVisible?: number;
  className?: string;
}

export function UserPresenceIndicator({
  users,
  maxVisible = 5,
  className,
}: UserPresenceIndicatorProps) {
  const onlineUsers = users.filter((user) => user.isOnline);
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, onlineUsers.length - maxVisible);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div key={user.userId} className="relative">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback
                className={cn('text-xs text-white', getUserColor(user.userId))}
              >
                {user.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
          </div>
        ))}
        {hiddenCount > 0 && (
          <Avatar className="h-8 w-8 border-2 border-background bg-muted">
            <AvatarFallback className="text-xs">+{hiddenCount}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {onlineUsers.length} online
      </span>
    </div>
  );
}

/**
 * Collaborative typing input with real-time indicators
 */
interface CollaborativeInputProps {
  value: string;
  onChange: (value: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  className?: string;
  projectId?: number;
  userId: string;
  userName: string;
}

export function CollaborativeInput({
  value,
  onChange,
  onTypingStart,
  onTypingStop,
  placeholder,
  className,
  projectId,
  userId,
  userName,
}: CollaborativeInputProps) {
  const { startTyping, stopTyping } = useTypingIndicators();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Start typing indicator
      if (!isTyping) {
        setIsTyping(true);
        startTyping(userId, userName);
        onTypingStart?.();
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(userId);
        onTypingStop?.();
      }, 2000);
    },
    [
      isTyping,
      startTyping,
      stopTyping,
      userId,
      userName,
      onChange,
      onTypingStart,
      onTypingStop,
    ]
  );

  const handleBlur = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(userId);
      onTypingStop?.();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [isTyping, stopTyping, userId, onTypingStop]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping(userId);
      }
    };
  }, [isTyping, stopTyping, userId]);

  return (
    <div className={cn('relative', className)}>
      <textarea
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {/* Show typing indicators for other users */}
      <div className="mt-2">
        <TypingIndicators
          projectId={projectId}
          compact
          className="justify-start"
        />
      </div>
    </div>
  );
}
