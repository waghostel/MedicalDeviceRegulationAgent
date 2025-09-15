/**
 * Typing Indicators Component
 * Shows real-time typing indicators for collaborative editing
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTypingIndicators } from '@/hooks/use-websocket';

interface TypingIndicatorsProps {
  className?: string;
  maxVisible?: number;
  showAvatars?: boolean;
}

export function TypingIndicators({
  className,
  maxVisible = 3,
  showAvatars = false,
}: TypingIndicatorsProps) {
  const { typingUsers } = useTypingIndicators();

  if (typingUsers.length === 0) {
    return null;
  }

  const visibleUsers = typingUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, typingUsers.length - maxVisible);

  const formatTypingText = () => {
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

  return (
    <div className={cn('flex items-center gap-2 animate-fade-in', className)}>
      <div className="flex items-center gap-1">
        {showAvatars &&
          visibleUsers.map((user, index) => (
            <div
              key={user.userId}
              className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium"
              style={{ zIndex: visibleUsers.length - index }}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
          ))}

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
 * Individual typing indicator for specific users
 */
interface UserTypingIndicatorProps {
  userId: string;
  userName?: string;
  className?: string;
}

export function UserTypingIndicator({
  userId,
  userName,
  className,
}: UserTypingIndicatorProps) {
  const { isUserTyping } = useTypingIndicators();

  if (!isUserTyping(userId)) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}
    >
      <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-xs">
        {(userName || userId).charAt(0).toUpperCase()}
      </div>
      <span>{userName || userId} is typing</span>
      <TypingAnimation />
    </div>
  );
}

/**
 * Typing indicator for agent responses
 */
interface AgentTypingIndicatorProps {
  isTyping: boolean;
  className?: string;
  agentName?: string;
}

export function AgentTypingIndicator({
  isTyping,
  className,
  agentName = 'AI Assistant',
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
      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-medium">
        AI
      </div>
      <span>{agentName} is thinking</span>
      <TypingAnimation />
    </div>
  );
}
