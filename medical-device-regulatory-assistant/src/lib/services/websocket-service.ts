/**
 * Comprehensive WebSocket Service for Real-time Updates
 * Handles connection management, message routing, and state synchronization
 */

import { WebSocketMessage } from '@/types/project';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageQueueSize: number;
}

export interface MessageHandler<T = any> {
  (message: WebSocketMessage<T>): void;
}

export interface ConnectionStatusHandler {
  (status: ConnectionStatus, error?: Error): void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;

  private config: WebSocketConfig;

  private reconnectAttempts = 0;

  private reconnectTimeout: NodeJS.Timeout | null = null;

  private heartbeatInterval: NodeJS.Timeout | null = null;

  private messageQueue: WebSocketMessage[] = [];

  private messageHandlers = new Map<string, Set<MessageHandler>>();

  private statusHandlers = new Set<ConnectionStatusHandler>();

  private connectionStatus: ConnectionStatus = 'disconnected';

  private isDestroyed = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
      maxReconnectAttempts: 5,
      reconnectInterval: 1000,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
      ...config,
    };
  }

  /**
   * Establish WebSocket connection
   */
  public connect(): void {
    if (
      this.isDestroyed ||
      this.connectionStatus === 'connected' ||
      this.connectionStatus === 'connecting'
    ) {
      return;
    }

    this.setConnectionStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    this.clearReconnectTimeout();
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    this.setConnectionStatus('disconnected');
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.messageHandlers.clear();
    this.statusHandlers.clear();
    this.messageQueue = [];
  }

  /**
   * Send message through WebSocket
   */
  public sendMessage<T = any>(message: WebSocketMessage<T>): boolean {
    if (this.connectionStatus === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Subscribe to specific message types
   */
  public subscribe<T = any>(
    messageType: string,
    handler: MessageHandler<T>
  ): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onStatusChange(handler: ConnectionStatusHandler): () => void {
    this.statusHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Force reconnection
   */
  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 100);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.clearHeartbeat();

      if (event.code === 1000) {
        // Normal closure
        this.setConnectionStatus('disconnected');
      } else {
        // Abnormal closure - attempt reconnection
        this.setConnectionStatus('disconnected');
        this.attemptReconnection();
      }
    };

    this.ws.onerror = (error) => {
      this.handleConnectionError(new Error('WebSocket connection error'));
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  /**
   * Set connection status and notify handlers
   */
  private setConnectionStatus(status: ConnectionStatus, error?: Error): void {
    this.connectionStatus = status;
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status, error);
      } catch (err) {
        console.error('Error in status handler:', err);
      }
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    console.error('WebSocket connection error:', error);
    this.setConnectionStatus('error', error);
    this.attemptReconnection();
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (
      this.isDestroyed ||
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * 2**(this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.sendMessage({
          type: 'ping',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push(message);
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (
      this.messageQueue.length > 0 &&
      this.connectionStatus === 'connected'
    ) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }
}

// Singleton instance for global use
let globalWebSocketService: WebSocketService | null = null;

/**
 * Get or create global WebSocket service instance
 */
export function getWebSocketService(
  config?: Partial<WebSocketConfig>
): WebSocketService {
  if (!globalWebSocketService) {
    globalWebSocketService = new WebSocketService(config);
  }
  return globalWebSocketService;
}

/**
 * Cleanup global WebSocket service
 */
export function destroyWebSocketService(): void {
  if (globalWebSocketService) {
    globalWebSocketService.destroy();
    globalWebSocketService = null;
  }
}
