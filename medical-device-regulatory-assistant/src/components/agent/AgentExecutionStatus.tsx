/**
 * Agent Execution Status Component
 * Displays real-time status updates for agent task execution
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  StopCircle
} from 'lucide-react';
import { AgentExecutionStatus } from '@/hooks/useAgentExecution';

interface AgentExecutionStatusProps {
  status: AgentExecutionStatus;
  onCancel?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function AgentExecutionStatusComponent({
  status,
  onCancel,
  onRetry,
  showDetails = true,
  className = ''
}: AgentExecutionStatusProps) {
  
  const getStatusIcon = () => {
    switch (status.status) {
      case 'idle':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'idle':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'idle':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const formatExecutionTime = (timeMs?: number) => {
    if (!timeMs) return null;
    
    if (timeMs < 1000) {
      return `${timeMs}ms`;
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeMs / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  const canCancel = status.status === 'processing' && onCancel;
  const canRetry = (status.status === 'error' || status.status === 'cancelled') && onRetry;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Agent Status</span>
            <Badge variant={getStatusColor() as any} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-7 px-2 text-xs"
              >
                <StopCircle className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
            
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 px-2 text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Current Task */}
        {status.currentTask && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current Task:</span>
            <span className="ml-2 font-medium">
              {status.currentTask.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        )}
        
        {/* Progress Bar */}
        {status.status === 'processing' && (
          <div className="space-y-2">
            <Progress 
              value={status.progress || undefined} 
              className="h-2"
            />
            {status.progress && (
              <div className="text-xs text-muted-foreground text-right">
                {Math.round(status.progress)}%
              </div>
            )}
          </div>
        )}
        
        {/* Status Message */}
        {status.message && (
          <div className="text-sm text-muted-foreground">
            {status.message}
          </div>
        )}
        
        {/* Error Display */}
        {status.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {status.error}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Completed Tasks */}
        {showDetails && status.completedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Completed Tasks:</div>
            <div className="space-y-1">
              {status.completedTasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">
                    {task.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Execution Time */}
        {status.executionTime && (
          <div className="text-xs text-muted-foreground">
            Execution time: {formatExecutionTime(status.executionTime)}
          </div>
        )}
        
        {/* Session ID (for debugging) */}
        {showDetails && status.sessionId && (
          <div className="text-xs text-muted-foreground font-mono">
            Session: {status.sessionId.slice(-8)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function AgentExecutionStatusInline({
  status,
  onCancel,
  className = ''
}: Pick<AgentExecutionStatusProps, 'status' | 'onCancel' | 'className'>) {
  
  const getStatusIcon = () => {
    switch (status.status) {
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-600" />;
      case 'cancelled':
        return <StopCircle className="h-3 w-3 text-orange-600" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {getStatusIcon()}
      
      <span className="text-muted-foreground">
        {status.message || status.status}
      </span>
      
      {status.status === 'processing' && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 px-2 text-xs"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}