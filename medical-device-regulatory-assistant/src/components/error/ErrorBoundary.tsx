'use client';

import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Send,
  Copy,
  CheckCircle,
} from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { APIError } from '@/types/error';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  isReporting: boolean;
  reportSent: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  enableReporting?: boolean;
  component?: string;
  userId?: string;
  projectId?: number;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  maxRetries: number;
  onReport?: () => void;
  isReporting?: boolean;
  reportSent?: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isReporting: false,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = await this.trackError(error, errorInfo);
    this.setState({ errorInfo, errorId });

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry for certain error types
    this.scheduleAutoRetry(error);
  }

  private async trackError(
    error: Error,
    errorInfo: React.ErrorInfo
  ): Promise<string> {
    try {
      // Create error report for backend tracking
      const errorReport = {
        error: APIError.fromError(error),
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: this.props.userId,
          projectId: this.props.projectId,
          component: this.props.component || 'unknown',
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      };

      // Send to backend error tracking service
      const response = await fetch('/api/errors/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (response.ok) {
        const result = await response.json();
        return result.errorId;
      }
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }

    return `local-${Date.now()}`;
  }

  private scheduleAutoRetry(error: Error) {
    const { maxRetries = 3 } = this.props;

    // Only auto-retry for network or temporary errors
    const isRetryable =
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout');

    if (isRetryable && this.state.retryCount < maxRetries) {
      const retryDelay = Math.min(
        1000 * 2**this.state.retryCount,
        10000
      ); // Exponential backoff

      const timeout = setTimeout(() => {
        this.setState((prevState) => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
        }));
      }, retryDelay);

      this.retryTimeouts.push(timeout);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  resetError = () => {
    // Clear any pending retries
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts = [];

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isReporting: false,
      reportSent: false,
    });
  };

  reportError = async () => {
    if (!this.state.error || this.state.isReporting || this.state.reportSent)
      return;

    this.setState({ isReporting: true });

    try {
      // Send detailed error report
      const detailedReport = {
        errorId: this.state.errorId,
        error: {
          name: this.state.error.name,
          message: this.state.error.message,
          stack: this.state.error.stack,
        },
        errorInfo: this.state.errorInfo,
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: this.props.userId,
          projectId: this.props.projectId,
          component: this.props.component,
          retryCount: this.state.retryCount,
        },
        userFeedback: 'User manually reported error',
      };

      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detailedReport),
      });

      if (response.ok) {
        this.setState({ reportSent: true });
      }
    } catch (reportingError) {
      console.error('Failed to send error report:', reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
          onReport={this.reportError}
          isReporting={this.state.isReporting}
          reportSent={this.state.reportSent}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  errorId,
  retryCount,
  maxRetries,
  onReport,
  isReporting,
  reportSent,
}) => {
  const [copied, setCopied] = React.useState(false);

  const isNetworkError =
    error.message.includes('fetch') || error.message.includes('network');
  const isAuthError =
    error.message.includes('auth') || error.message.includes('unauthorized');
  const canRetry = retryCount < maxRetries;

  const copyErrorDetails = async () => {
    const errorDetails = `Error ID: ${errorId}\nError: ${error.name}\nMessage: ${error.message}\nTimestamp: ${new Date().toISOString()}`;

    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          {errorId && (
            <p className="text-sm text-muted-foreground">Error ID: {errorId}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {isNetworkError &&
                'Unable to connect to the server. Please check your internet connection.'}
              {isAuthError && 'Authentication failed. Please sign in again.'}
              {!isNetworkError &&
                !isAuthError &&
                'An unexpected error occurred in the regulatory assistant.'}

              {retryCount > 0 && (
                <div className="mt-2 text-sm">
                  Retry attempt: {retryCount}/{maxRetries}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">What you can do:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {isNetworkError && (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Wait a moment and try again</li>
                </>
              )}
              {isAuthError && (
                <>
                  <li>• Sign out and sign back in</li>
                  <li>• Clear your browser cache</li>
                  <li>• Contact support if the issue persists</li>
                </>
              )}
              {!isNetworkError && !isAuthError && (
                <>
                  <li>• Refresh the page to try again</li>
                  <li>• Go back to the dashboard</li>
                  <li>• Contact support with the error details</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={resetError}
              className="flex-1"
              disabled={!canRetry && isNetworkError}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {canRetry ? 'Try Again' : 'Reset'}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>

          {/* Error reporting and copying */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyErrorDetails}
              className="flex-1"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Details
                </>
              )}
            </Button>

            {onReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReport}
                disabled={isReporting || reportSent}
                className="flex-1"
              >
                {isReporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : reportSent ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reported
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Report
                  </>
                )}
              </Button>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Developer Details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced specialized error boundaries with monitoring integration
export const RegulatoryErrorBoundary: React.FC<{
  children: React.ReactNode;
  userId?: string;
  projectId?: number;
}> = ({ children, userId, projectId }) => (
  <ErrorBoundary
    fallback={RegulatoryErrorFallback}
    component="regulatory-assistant"
    userId={userId}
    projectId={projectId}
    maxRetries={2}
    enableReporting={true}
  >
    {children}
  </ErrorBoundary>
);

const RegulatoryErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  onReport,
  isReporting,
  reportSent,
}) => (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Regulatory Assistant Error</AlertTitle>
    <AlertDescription className="mt-2">
      The regulatory assistant encountered an error. This might affect predicate
      searches or device classification.
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium">Suggested actions:</p>
        <ul className="text-sm space-y-1">
          <li>• Try the operation again</li>
          <li>• Check if FDA services are available</li>
          <li>• Use manual search as a backup</li>
        </ul>
        <div className="flex gap-2 mt-2">
          <Button onClick={resetError} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Operation
          </Button>
          {onReport && (
            <Button
              onClick={onReport}
              size="sm"
              variant="outline"
              disabled={isReporting || reportSent}
            >
              {isReporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : reportSent ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reported
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Report Issue
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AlertDescription>
  </Alert>
);

export const AgentErrorBoundary: React.FC<{
  children: React.ReactNode;
  userId?: string;
  projectId?: number;
}> = ({ children, userId, projectId }) => (
  <ErrorBoundary
    fallback={AgentErrorFallback}
    component="agent-workflow"
    userId={userId}
    projectId={projectId}
    maxRetries={1}
    enableReporting={true}
  >
    {children}
  </ErrorBoundary>
);

const AgentErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  onReport,
  isReporting,
  reportSent,
}) => (
  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
      <div className="flex-1">
        <h3 className="font-medium text-destructive">Agent Workflow Error</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The AI agent encountered an error while processing your request.
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            Try Again
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
          {onReport && (
            <Button
              onClick={onReport}
              size="sm"
              variant="ghost"
              disabled={isReporting || reportSent}
            >
              {reportSent ? 'Reported' : 'Report'}
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Hook for programmatic error reporting
export const useErrorReporting = () => {
  const reportError = async (error: Error, context?: unknown) => {
    try {
      const errorReport = {
        error: APIError.fromError(error),
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ...context,
        },
      };

      await fetch('/api/errors/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  return { reportError };
};
