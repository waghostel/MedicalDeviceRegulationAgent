/**
 * Enhanced Streaming Response Component
 * Provides comprehensive streaming interface with typing indicators and interruption handling
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { AgentTypingIndicator, TypingAnimation } from './typing-indicators';
import { StopCircle, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { WebSocketMessage } from '@/types/project';

interface EnhancedStreamingResponseProps {
  streamId?: string;
  className?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
  showControls?: boolean;
  autoScroll?: boolean;
  agentName?: string;
  showTypingIndicator?: boolean;
  enableInterruption?: boolean;
}

export function EnhancedStreamingResponse({
  streamId,
  className,
  onStreamStart,
  onStreamEnd,
  onError,
  showControls = true,
  autoScroll = true,
  agentName = 'AI Assistant',
  showTypingIndicator = true,
  enableInterruption = true,
}: EnhancedStreamingResponseProps) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamStatus, setStreamStatus] = useState<
    'ready' | 'streaming' | 'complete' | 'error' | 'interrupted'
  >('ready');

  const contentRef = useRef<HTMLDivElement>(null);
  const websocket = useWebSocket();

  // Subscribe to streaming events
  useEffect(() => {
    const unsubscribeTypingStart = websocket.subscribe(
      'agent_typing_start',
      (message: WebSocketMessage) => {
        if (
          !streamId ||
          message.data?.streamId === streamId ||
          message.stream_id === streamId
        ) {
          setIsTyping(true);
          setIsStreaming(true);
          setStreamStatus('streaming');
          setError(null);
          onStreamStart?.();
        }
      }
    );

    const unsubscribeChunk = websocket.subscribe(
      'agent_response_stream',
      (message: WebSocketMessage) => {
        if (
          !streamId ||
          message.data?.streamId === streamId ||
          message.stream_id === streamId
        ) {
          const chunk = message.data?.chunk || message.data || '';
          setContent((prev) => prev + chunk);
          setIsTyping(false); // Stop typing indicator when content starts arriving
        }
      }
    );

    const unsubscribeEnd = websocket.subscribe(
      'agent_typing_stop',
      (message: WebSocketMessage) => {
        if (
          !streamId ||
          message.data?.streamId === streamId ||
          message.stream_id === streamId
        ) {
          setIsTyping(false);
          setIsStreaming(false);
          setStreamStatus('complete');
          onStreamEnd?.();
        }
      }
    );

    const unsubscribeError = websocket.subscribe(
      'agent_stream_error',
      (message: WebSocketMessage) => {
        if (
          !streamId ||
          message.data?.streamId === streamId ||
          message.stream_id === streamId
        ) {
          const error = new Error(message.data?.error || 'Streaming error');
          setError(error);
          setIsTyping(false);
          setIsStreaming(false);
          setStreamStatus('error');
          onError?.(error);
        }
      }
    );

    return () => {
      unsubscribeTypingStart();
      unsubscribeChunk();
      unsubscribeEnd();
      unsubscribeError();
    };
  }, [websocket, streamId, onStreamStart, onStreamEnd, onError]);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  const interrupt = useCallback(() => {
    if (isStreaming && enableInterruption) {
      if (streamId) {
        websocket.sendMessage({
          type: 'interrupt_stream',
          data: { streamId },
          timestamp: new Date().toISOString(),
        });
      }
      setIsStreaming(false);
      setIsTyping(false);
      setStreamStatus('interrupted');
    }
  }, [websocket, isStreaming, streamId, enableInterruption]);

  const restart = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(false);
    setIsTyping(false);
    setStreamStatus('ready');
  }, []);

  const getStatusText = () => {
    switch (streamStatus) {
      case 'streaming':
        return isTyping ? 'Thinking...' : 'Streaming...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error occurred';
      case 'interrupted':
        return 'Interrupted';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (streamStatus) {
      case 'streaming':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'interrupted':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Connection status warning */}
      {websocket.connectionStatus !== 'connected' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          <AlertCircle className="h-4 w-4" />
          Real-time streaming unavailable - connection{' '}
          {websocket.connectionStatus}
        </div>
      )}

      {/* Streaming content card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {agentName} Response
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', getStatusColor())} />
              <Badge variant="secondary" className="text-xs">
                {getStatusText()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Typing indicator */}
          {showTypingIndicator && isTyping && (
            <div className="mb-3 pb-3 border-b">
              <AgentTypingIndicator
                isTyping={true}
                agentName={agentName}
                className="text-xs"
              />
            </div>
          )}

          {/* Content area */}
          <div
            ref={contentRef}
            className="min-h-[120px] max-h-[500px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
          >
            {content ? (
              <div className="prose prose-sm max-w-none">
                {content}
                {isStreaming && !isTyping && (
                  <span className="inline-flex items-center ml-1">
                    <div className="flex space-x-1">
                      <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="h-1 w-1 bg-current rounded-full animate-bounce"></div>
                    </div>
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground italic">
                {isStreaming ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for response...
                  </div>
                ) : (
                  'Ready for agent response'
                )}
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                Error: {error.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreaming && enableInterruption && (
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

            {(error ||
              streamStatus === 'complete' ||
              streamStatus === 'interrupted') && (
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
          </div>

          {/* Stream metadata */}
          <div className="text-xs text-muted-foreground">
            {streamId && (
              <span className="font-mono">Stream: {streamId.slice(-8)}</span>
            )}
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
  maxLength?: number;
}

export function CompactStreamingResponse({
  streamId,
  className,
  placeholder = 'AI is thinking...',
  maxLength = 100,
}: CompactStreamingResponseProps) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const websocket = useWebSocket();

  useEffect(() => {
    const unsubscribeStart = websocket.subscribe(
      'agent_typing_start',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setIsStreaming(true);
        }
      }
    );

    const unsubscribeChunk = websocket.subscribe(
      'agent_response_stream',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          const chunk = message.data?.chunk || '';
          setContent((prev) => {
            const newContent = prev + chunk;
            return newContent.length > maxLength
              ? newContent.slice(0, maxLength) + '...'
              : newContent;
          });
        }
      }
    );

    const unsubscribeEnd = websocket.subscribe(
      'agent_typing_stop',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setIsStreaming(false);
        }
      }
    );

    return () => {
      unsubscribeStart();
      unsubscribeChunk();
      unsubscribeEnd();
    };
  }, [websocket, streamId, maxLength]);

  return (
    <div className={cn('text-sm', className)}>
      {content || (isStreaming ? placeholder : '')}
      {isStreaming && !content && (
        <span className="inline-flex items-center gap-1 ml-1">
          <TypingAnimation />
        </span>
      )}
    </div>
  );
}

/**
 * Hook for managing streaming response state
 */
export function useEnhancedStreamingResponse(streamId?: string) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const websocket = useWebSocket();

  useEffect(() => {
    const unsubscribeStart = websocket.subscribe(
      'agent_typing_start',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setIsTyping(true);
          setIsStreaming(true);
          setError(null);
        }
      }
    );

    const unsubscribeChunk = websocket.subscribe(
      'agent_response_stream',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setContent((prev) => prev + (message.data?.chunk || ''));
          setIsTyping(false);
        }
      }
    );

    const unsubscribeEnd = websocket.subscribe(
      'agent_typing_stop',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setIsTyping(false);
          setIsStreaming(false);
        }
      }
    );

    const unsubscribeError = websocket.subscribe(
      'agent_stream_error',
      (message: WebSocketMessage) => {
        if (!streamId || message.data?.streamId === streamId) {
          setError(new Error(message.data?.error || 'Streaming error'));
          setIsTyping(false);
          setIsStreaming(false);
        }
      }
    );

    return () => {
      unsubscribeStart();
      unsubscribeChunk();
      unsubscribeEnd();
      unsubscribeError();
    };
  }, [websocket, streamId]);

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
    setIsTyping(false);
  }, []);

  return {
    content,
    isStreaming,
    isTyping,
    error,
    interrupt,
    restart,
    connectionStatus: websocket.connectionStatus,
  };
}
