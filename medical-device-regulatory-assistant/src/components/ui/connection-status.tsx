/**
 * Connection Status Indicator Component
 * Shows real-time WebSocket connection status with visual feedback
 */

import { Wifi, WifiOff, AlertCircle, RotateCcw } from 'lucide-react';
import React from 'react';

import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showReconnectButton?: boolean;
  compact?: boolean;
}

export const ConnectionStatus = ({
  className,
  showReconnectButton = true,
  compact = false,
}: ConnectionStatusProps) => {
  const { connectionStatus } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          description: 'Real-time updates active',
          variant: 'success' as const,
          color: 'text-green-600',
        };
      case 'connecting':
        return {
          icon: Wifi,
          label: 'Connecting',
          description: 'Establishing connection...',
          variant: 'secondary' as const,
          color: 'text-yellow-600',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Disconnected',
          description: 'Real-time updates unavailable',
          variant: 'secondary' as const,
          color: 'text-gray-600',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          description: 'Connection failed',
          variant: 'destructive' as const,
          color: 'text-red-600',
        };
      default:
        return {
          icon: WifiOff,
          label: 'Unknown',
          description: 'Connection status unknown',
          variant: 'secondary' as const,
          color: 'text-gray-600',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1', className)}>
              <Icon
                className={cn('h-4 w-4', config.color)}
                aria-label={`Connection status: ${config.label}`}
              />
              {connectionStatus === 'connecting' && (
                <div className="animate-pulse">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
        {connectionStatus === 'connecting' && (
          <div className="animate-spin ml-1">
            <RotateCcw className="h-3 w-3" />
          </div>
        )}
      </Badge>

      {showReconnectButton &&
        (connectionStatus === 'disconnected' ||
          connectionStatus === 'error') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Trigger reconnection through WebSocket service
                    window.location.reload(); // Simple approach for now
                  }}
                  className="h-6 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reconnect</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
    </div>
  );
}

/**
 * Detailed connection status component for debugging/admin views
 */
export const DetailedConnectionStatus = ({
  className,
}: {
  className?: string;
}) => {
  const { connectionStatus, messages } = useWebSocketContext();

  const getLastMessageTime = () => {
    if (messages.length === 0) return 'No messages';
    const lastMessage = messages[messages.length - 1];
    return new Date(lastMessage.timestamp).toLocaleTimeString();
  };

  return (
    <div
      className={cn('space-y-2 p-3 border rounded-lg bg-muted/50', className)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Connection Status</span>
        <ConnectionStatus compact />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium">Status:</span> {connectionStatus}
        </div>
        <div>
          <span className="font-medium">Messages:</span> {messages.length}
        </div>
        <div className="col-span-2">
          <span className="font-medium">Last Message:</span>{' '}
          {getLastMessageTime()}
        </div>
      </div>
    </div>
  );
}
