'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service (e.g., Sentry)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isAuthError = error.message.includes('auth') || error.message.includes('unauthorized');
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {isNetworkError && "Unable to connect to the server. Please check your internet connection."}
              {isAuthError && "Authentication failed. Please sign in again."}
              {!isNetworkError && !isAuthError && "An unexpected error occurred in the regulatory assistant."}
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
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
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

// Specialized error boundaries for different contexts
export const RegulatoryErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={RegulatoryErrorFallback}>
    {children}
  </ErrorBoundary>
);

const RegulatoryErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Regulatory Assistant Error</AlertTitle>
    <AlertDescription className="mt-2">
      The regulatory assistant encountered an error. This might affect predicate searches or device classification.
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium">Suggested actions:</p>
        <ul className="text-sm space-y-1">
          <li>• Try the operation again</li>
          <li>• Check if FDA services are available</li>
          <li>• Use manual search as a backup</li>
        </ul>
        <Button onClick={resetError} size="sm" className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Operation
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);

export const AgentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={AgentErrorFallback}>
    {children}
  </ErrorBoundary>
);

const AgentErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
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
          <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  </div>
);