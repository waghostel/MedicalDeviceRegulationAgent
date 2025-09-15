/**
 * Streaming Response Component
 * Displays AI agent responses as they stream in real-time
 */

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStreamingResponse } from '@/hooks/use-websocket';
import { AgentTypingIndicator } from './typing-indicators';
import { StopCircle, RotateCcw } from 'lucide-react';

interface StreamingResponseProps {
  streamId?: string;
  className?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  showControls?: boolean;
  autoScroll?: boolean;
}

export function StreamingResponse({
  streamId,
  className,
  onStreamStart,
  onStreamEnd,
  onError,
  showControls = true,
  autoScroll = true,
}: StreamingResponseProps) {
  const { content, isStreaming, error, interrupt, restart, connectionStatus } =
    useStreamingResponse({
      streamId,
      onStreamStart,
      onStreamEnd,
      onError,
    });

  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Connection status warning */}
      {connectionStatus !== 'connected' && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          Real-time streaming unavailable - connection {connectionStatus}
        </div>
      )}

      {/* Streaming content */}
      <Card>
        <CardContent className="p-4">
          <div
            ref={contentRef}
            className="min-h-[100px] max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
          >
            {content || (
              <div className="text-muted-foreground italic">
                Waiting for response...
              </div>
            )}
          </div>

          {/* Typing indicator */}
          {isStreaming && (
            <div className="mt-3 pt-3 border-t">
              <AgentTypingIndicator isTyping={true} />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                Error: {error.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Button
              variant="outline"
              size="sm"
              onClick={interrupt}
              className="flex items-center gap-1"
            >
              <StopCircle className="h-3 w-3" />
              Stop
            </Button>
          )}

          {(error || (!isStreaming && content)) && (
            <Button
              variant="outline"
              size="sm"
              onClick={restart}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </Button>
          )}

          {/* Stream status */}
          <div className="text-xs text-muted-foreground">
            {isStreaming && 'Streaming...'}
            {error && 'Error occurred'}
            {!isStreaming && !error && content && 'Complete'}
            {!isStreaming && !error && !content && 'Ready'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact streaming response for inline use
 */
interface CompactStreamingResponseProps {
  streamId?: string;
  className?: string;
  placeholder?: string;
}

export function CompactStreamingResponse({
  streamId,
  className,
  placeholder = 'AI is thinking...',
}: CompactStreamingResponseProps) {
  const { content, isStreaming } = useStreamingResponse({ streamId });

  return (
    <div className={cn('text-sm', className)}>
      {content || (isStreaming ? placeholder : '')}
      {isStreaming && !content && (
        <span className="inline-flex items-center gap-1 ml-1">
          <div className="flex space-x-1">
            <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-1 w-1 bg-current rounded-full animate-bounce"></div>
          </div>
        </span>
      )}
    </div>
  );
}

/**
 * Streaming response with markdown support
 */
interface MarkdownStreamingResponseProps extends StreamingResponseProps {
  renderMarkdown?: boolean;
}

export function MarkdownStreamingResponse({
  renderMarkdown = true,
  ...props
}: MarkdownStreamingResponseProps) {
  // For now, we'll use the basic streaming response
  // In a full implementation, you'd integrate with a markdown renderer
  // like react-markdown or @uiw/react-md-editor

  return <StreamingResponse {...props} />;
}
