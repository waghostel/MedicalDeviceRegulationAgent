/**
 * Agent Streaming Interface Component
 * Comprehensive interface for agent response streaming with typing indicators
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWebSocket } from '@/hooks/use-websocket';
import {
  AgentTypingIndicator,
  TypingAnimation,
} from '@/components/ui/typing-indicators';
import { EnhancedStreamingResponse } from '@/components/ui/enhanced-streaming-response';
import {
  MessageSquare,
  StopCircle,
  RotateCcw,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { WebSocketMessage } from '@/types/project';

interface AgentStreamingInterfaceProps {
  projectId?: number;
  className?: string;
  onResponseComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  enableInterruption?: boolean;
  showMetadata?: boolean;
  agentName?: string;
}

export function AgentStreamingInterface({
  projectId,
  className,
  onResponseComplete,
  onError,
  enableInterruption = true,
  showMetadata = true,
  agentName = 'Regulatory Assistant',
}: AgentStreamingInterfaceProps) {
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [responseMetadata, setResponseMetadata] = useState<{
    confidence?: number;
    sources?: string[];
    reasoning?: string;
  }>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const websocket = useWebSocket();

  // Subscribe to agent streaming events
  useEffect(() => {
    const unsubscribeTypingStart = websocket.subscribe(
      'agent_typing_start',
      (message: WebSocketMessage) => {
        if (projectId && message.project_id !== projectId) return;

        setIsTyping(true);
        setIsStreaming(true);
        setError(null);
        setStreamId(message.stream_id || message.data?.streamId || null);
        setStartTime(Date.now());
        setEndTime(null);
        setStreamingResponse('');
        setResponseMetadata({});
      }
    );

    const unsubscribeChunk = websocket.subscribe(
      'agent_response_stream',
      (message: WebSocketMessage) => {
        if (projectId && message.project_id !== projectId) return;

        const chunk = message.data?.chunk || message.data || '';
        setStreamingResponse((prev) => prev + chunk);
        setIsTyping(false); // Stop typing indicator when content starts arriving
      }
    );

    const unsubscribeEnd = websocket.subscribe(
      'agent_typing_stop',
      (message: WebSocketMessage) => {
        if (projectId && message.project_id !== projectId) return;

        setIsTyping(false);
        setIsStreaming(false);
        setEndTime(Date.now());

        // Extract metadata if available
        if (message.data) {
          setResponseMetadata({
            confidence: message.data.confidence,
            sources: message.data.sources,
            reasoning: message.data.reasoning,
          });
        }

        onResponseComplete?.(streamingResponse);
      }
    );

    const unsubscribeError = websocket.subscribe(
      'agent_stream_error',
      (message: WebSocketMessage) => {
        if (projectId && message.project_id !== projectId) return;

        const error = new Error(message.data?.error || 'Agent streaming error');
        setError(error);
        setIsTyping(false);
        setIsStreaming(false);
        setEndTime(Date.now());
        onError?.(error);
      }
    );

    return () => {
      unsubscribeTypingStart();
      unsubscribeChunk();
      unsubscribeEnd();
      unsubscribeError();
    };
  }, [websocket, projectId, onResponseComplete, onError, streamingResponse]);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingResponse]);

  const handleInterrupt = useCallback(() => {
    if (isStreaming && enableInterruption && streamId) {
      websocket.sendMessage({
        type: 'interrupt_stream',
        data: { streamId },
        timestamp: new Date().toISOString(),
        project_id: projectId,
      });
      setIsStreaming(false);
      setIsTyping(false);
      setEndTime(Date.now());
    }
  }, [websocket, isStreaming, enableInterruption, streamId, projectId]);

  const handleClear = useCallback(() => {
    setStreamingResponse('');
    setError(null);
    setIsStreaming(false);
    setIsTyping(false);
    setStreamId(null);
    setStartTime(null);
    setEndTime(null);
    setResponseMetadata({});
  }, []);

  const simulateAgentResponse = useCallback(() => {
    // For testing purposes - simulate an agent response
    const testStreamId = `stream_${Date.now()}`;
    setStreamId(testStreamId);

    // Start typing
    websocket.sendMessage({
      type: 'agent_typing_start',
      data: { streamId: testStreamId },
      timestamp: new Date().toISOString(),
      project_id: projectId,
      stream_id: testStreamId,
    });

    // Simulate streaming response
    const response =
      'Based on your device description, I found 5 potential predicate devices with confidence scores ranging from 0.85 to 0.92. The top match is K123456 - CardioMonitor Pro, which shares similar intended use and technological characteristics.';
    const chunks = response.match(/.{1,10}/g) || [];

    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        websocket.sendMessage({
          type: 'agent_response_stream',
          data: { chunk, streamId: testStreamId },
          timestamp: new Date().toISOString(),
          project_id: projectId,
          stream_id: testStreamId,
        });

        // End streaming after last chunk
        if (index === chunks.length - 1) {
          setTimeout(() => {
            websocket.sendMessage({
              type: 'agent_typing_stop',
              data: {
                streamId: testStreamId,
                confidence: 0.89,
                sources: ['FDA 510(k) Database', 'CFR Title 21'],
                reasoning:
                  'High similarity in intended use and core technology',
              },
              timestamp: new Date().toISOString(),
              project_id: projectId,
              stream_id: testStreamId,
            });
          }, 100);
        }
      }, index * 100);
    });
  }, [websocket, projectId]);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (isStreaming)
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (streamingResponse && !isStreaming)
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isTyping) return 'Thinking...';
    if (isStreaming) return 'Streaming...';
    if (streamingResponse && !isStreaming) return 'Complete';
    return 'Ready';
  };

  const getDuration = () => {
    if (!startTime) return null;
    const end = endTime || Date.now();
    return Math.round(((end - startTime) / 1000) * 10) / 10;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection Status */}
      {websocket.connectionStatus !== 'connected' && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          Real-time streaming unavailable - WebSocket{' '}
          {websocket.connectionStatus}
        </div>
      )}

      {/* Main Streaming Interface */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-base">{agentName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getStatusText()}
              </Badge>
              {showMetadata && getDuration() && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {getDuration()}s
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <AgentTypingIndicator
                isTyping={true}
                agentName={agentName}
                showAvatar={false}
                className="text-sm"
              />
            </div>
          )}

          {/* Streaming Content */}
          <div
            ref={contentRef}
            className="min-h-[150px] max-h-[400px] overflow-y-auto p-4 bg-muted/20 rounded-lg border"
          >
            {streamingResponse ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {streamingResponse}
                  {isStreaming && !isTyping && (
                    <span className="inline-flex items-center ml-1">
                      <TypingAnimation />
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isStreaming ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for response...
                  </div>
                ) : (
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm">Ready for agent response</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {error.message}</span>
            </div>
          )}

          {/* Response Metadata */}
          {showMetadata && responseMetadata.confidence && (
            <div className="space-y-2">
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Confidence Score:</span>
                  <Badge variant="outline">
                    {(responseMetadata.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
                {responseMetadata.sources &&
                  responseMetadata.sources.length > 0 && (
                    <div>
                      <span>
                        Sources: {responseMetadata.sources.join(', ')}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming && enableInterruption && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInterrupt}
              className="flex items-center gap-1"
            >
              <StopCircle className="h-3 w-3" />
              Stop
            </Button>
          )}

          {(streamingResponse || error) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </Button>
          )}

          {/* Test button for development */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              size="sm"
              onClick={simulateAgentResponse}
              disabled={isStreaming}
              className="flex items-center gap-1"
            >
              <Send className="h-3 w-3" />
              Test Response
            </Button>
          )}
        </div>

        {/* Stream Info */}
        {streamId && (
          <div className="text-xs text-muted-foreground font-mono">
            Stream: {streamId.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentStreamingInterface;
