/**
 * Error Boundary Component
 * Catches and handles React errors with proper logging and user-friendly display
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring system
    this.logErrorToService(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send to error tracking service (e.g., Sentry)
        // This would be implemented based on the chosen error tracking service
        const errorReport = {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          errorId: this.state.errorId,
        };

        // Example: Send to monitoring endpoint
        // fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(errorReport)
        // }).catch(console.error);

        console.log('Error report prepared:', errorReport);
      } catch (loggingError) {
        console.error('Failed to log error:', loggingError);
      }
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  We're sorry, but something unexpected happened. The error has
                  been logged and we'll look into it.
                </AlertDescription>
              </Alert>

              {this.props.showDetails && this.state.error && (
                <div className="space-y-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                      Error Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded border text-xs font-mono">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.errorId && (
                        <div className="mb-2">
                          <strong>Error ID:</strong> {this.state.errorId}
                        </div>
                      )}
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  Reload Page
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                If this problem persists, please contact support with Error ID:{' '}
                {this.state.errorId}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error handled by hook:', error, errorInfo);

    // In a real implementation, this would trigger error reporting
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
    }
  };
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;
