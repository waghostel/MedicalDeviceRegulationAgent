/**
 * WebSocket Demo Component
 * Demonstrates the real-time WebSocket functionality
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { TypingIndicators } from '@/components/ui/typing-indicators';
import { StreamingResponse } from '@/components/ui/streaming-response';
import {
  useRealtimeMessaging,
  useTypingIndicators,
  useStreamingResponse,
} from '@/hooks/use-websocket';

export function WebSocketDemo() {
  const [message, setMessage] = useState('');
  const [userId] = useState(`user-${Math.random().toString(36).substr(2, 9)}`);

  const { connectionStatus, sendMessage, messages } = useRealtimeMessaging();

  const { startTyping, stopTyping, typingUsers } = useTypingIndicators();

  const {
    content: streamContent,
    isStreaming,
    restart: restartStream,
  } = useStreamingResponse({
    streamId: 'demo-stream',
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage('chat_message', {
        content: message,
        userId,
        timestamp: new Date().toISOString(),
      });
      setMessage('');
    }
  };

  const handleTyping = () => {
    startTyping(userId, `User ${userId.slice(-4)}`);
    setTimeout(() => stopTyping(userId), 3000);
  };

  const simulateAgentResponse = () => {
    // Simulate agent streaming response
    const responses = [
      'Based on your device description, I found several potential predicate devices.',
      ' The top match is K123456 - CardioMonitor Pro with 92% confidence.',
      ' This device shares similar intended use and technological characteristics.',
      ' I recommend reviewing the detailed comparison matrix for substantial equivalence assessment.',
    ];

    responses.forEach((chunk, index) => {
      setTimeout(() => {
        sendMessage('agent_response_stream', {
          chunk,
          streamId: 'demo-stream',
        });
      }, index * 500);
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">WebSocket Real-time Demo</h2>
        <ConnectionStatus />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge
                variant={
                  connectionStatus === 'connected' ? 'default' : 'secondary'
                }
              >
                {connectionStatus}
              </Badge>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">
                Messages received: {messages.length}
              </span>
            </div>

            {connectionStatus !== 'connected' && (
              <div className="text-sm text-muted-foreground">
                Real-time features require WebSocket connection
              </div>
            )}
          </CardContent>
        </Card>

        {/* Typing Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Typing Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TypingIndicators />

            <Button
              onClick={handleTyping}
              disabled={connectionStatus !== 'connected'}
              variant="outline"
              size="sm"
            >
              Simulate Typing
            </Button>

            <div className="text-xs text-muted-foreground">
              Active users: {typingUsers.length}
            </div>
          </CardContent>
        </Card>

        {/* Message Sending */}
        <Card>
          <CardHeader>
            <CardTitle>Send Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={connectionStatus !== 'connected'}
              />
              <Button
                onClick={handleSendMessage}
                disabled={connectionStatus !== 'connected' || !message.trim()}
              >
                Send
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Your ID: {userId}
            </div>
          </CardContent>
        </Card>

        {/* Agent Streaming */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Streaming Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={simulateAgentResponse}
                disabled={connectionStatus !== 'connected' || isStreaming}
                variant="outline"
              >
                Simulate Agent Response
              </Button>

              <Button
                onClick={restartStream}
                disabled={!streamContent}
                variant="ghost"
                size="sm"
              >
                Clear
              </Button>
            </div>

            <div className="min-h-[100px] p-3 border rounded bg-muted/50 text-sm">
              {streamContent || 'No response yet...'}
              {isStreaming && (
                <span className="inline-flex items-center gap-1 ml-1">
                  <div className="flex space-x-1">
                    <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-1 w-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-1 w-1 bg-current rounded-full animate-bounce"></div>
                  </div>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messages.slice(-10).map((msg, index) => (
              <div key={index} className="text-sm p-2 border rounded">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Badge variant="outline" className="text-xs">
                    {msg.type}
                  </Badge>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="font-mono text-xs">
                  {JSON.stringify(msg.data, null, 2)}
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Send a message or simulate an agent response to
                see real-time updates.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
