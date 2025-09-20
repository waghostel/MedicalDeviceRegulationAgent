/**
 * Test Compatible Streaming Component
 * Matches the test expectations while using the real WebSocket hooks
 */

import React, { useState, useEffect, useCallback } from 'react';

import { useWebSocket } from '@/hooks/use-websocket';
import { WebSocketMessage } from '@/types/project';

interface TestCompatibleStreamingComponentProps {
  className?: string;
}

export const TestCompatibleStreamingComponent = ({
  className,
}: TestCompatibleStreamingComponentProps) => {
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);

  const websocket = useWebSocket();

  // Subscribe to WebSocket events
  useEffect(() => {
    console.log(
      'Setting up WebSocket subscriptions, status:',
      websocket.connectionStatus
    );

    const unsubscribeTypingStart = websocket.subscribe(
      'agent_typing_start',
      (message: WebSocketMessage) => {
        console.log('Received typing start message:', message);
        setTypingIndicator(true);
        setIsStreaming(true);
      }
    );

    const unsubscribeChunk = websocket.subscribe(
      'agent_response_stream',
      (message: WebSocketMessage) => {
        const chunk = message.data?.chunk || '';
        setStreamingResponse((prev) => prev + chunk);
      }
    );

    const unsubscribeEnd = websocket.subscribe(
      'agent_typing_stop',
      (message: WebSocketMessage) => {
        setTypingIndicator(false);
        setIsStreaming(false);
      }
    );

    return () => {
      unsubscribeTypingStart();
      unsubscribeChunk();
      unsubscribeEnd();
    };
  }, [websocket]);

  const simulateAgentResponse = useCallback(() => {
    const response =
      'Based on your device description, I found 5 potential predicate devices with confidence scores ranging from 0.85 to 0.92. The top match is K123456 - CardioMonitor Pro, which shares similar intended use and technological characteristics.';

    console.log(
      'Simulating agent response, WebSocket status:',
      websocket.connectionStatus
    );

    // Start typing indicator
    const startMessage = {
      type: 'agent_typing_start',
      data: {},
      timestamp: new Date().toISOString(),
    };
    console.log('Sending typing start message:', startMessage);
    websocket.sendMessage(startMessage);

    // Stream response in chunks after a delay to show typing indicator
    setTimeout(() => {
      const chunks = response.match(/.{1,10}/g) || [];
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          websocket.sendMessage({
            type: 'agent_response_stream',
            data: { chunk },
            timestamp: new Date().toISOString(),
          });

          // Stop typing indicator after last chunk
          if (index === chunks.length - 1) {
            setTimeout(() => {
              websocket.sendMessage({
                type: 'agent_typing_stop',
                data: {},
                timestamp: new Date().toISOString(),
              });
            }, 100);
          }
        }, index * 100);
      });
    }, 200); // Give time for typing indicator to show
  }, [websocket]);

  const clearResponse = useCallback(() => {
    setStreamingResponse('');
    setIsStreaming(false);
    setTypingIndicator(false);
  }, []);

  return (
    <div data-testid="agent-streaming-component" className={className}>
      <div data-testid="typing-indicator">
        {typingIndicator && <div>Agent is typing...</div>}
      </div>

      <div data-testid="streaming-response">{streamingResponse}</div>

      <div data-testid="streaming-status">
        {isStreaming ? 'Streaming...' : 'Ready'}
      </div>

      <button
        type="button"
        data-testid="simulate-response-btn"
        onClick={simulateAgentResponse}
      >
        Simulate Agent Response
      </button>

      <button
        type="button"
        data-testid="clear-response-btn"
        onClick={clearResponse}
      >
        Clear Response
      </button>
    </div>
  );
}

export default TestCompatibleStreamingComponent;
