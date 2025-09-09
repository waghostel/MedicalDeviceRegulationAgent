'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  FileText,
  Database,
  Wifi,
  Shield,
  Clock,
  Bot,
} from 'lucide-react';
import { APIError } from '@/types/error';

interface ProjectErrorBoundaryState {
  hasError: boolean;
  error?: APIError | Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface ProjectErrorBoundaryProps {
  children: React.ReactNode;
  projectId?: number;
  fallback?: React.ComponentType<ProjectErrorFallbackProps>;
  onError?: (error: APIError | Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
}

interface ProjectErrorFallbackProps {
  error: APIError | Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
  projectId?: number;
  onRetry?: () => void;
}

export class ProjectErrorBoundary extends React.Component<
  ProjectErrorBoundaryProps,
  ProjectErrorBoundaryState
> {
  constructor(props: ProjectErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ProjectErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Convert to APIError if needed
    const apiError =
      error instanceof APIError
        ? error
        : APIError.fromError(error, {
            type: 'project',
            operation: 'read',
            projectId: this.props.projectId,
          });

    // Log error for monitoring
    console.error('ProjectErrorBoundary caught an error:', apiError, errorInfo);

    // Report error to monitoring service
    this.reportError(apiError, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(apiError, errorInfo);
  }

  private reportError = (error: APIError, errorInfo: React.ErrorInfo) => {
    // In production, send to error reporting service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service
      console.log('Error reported:', {
        error: error.toJSON(),
        errorInfo,
        projectId: this.props.projectId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });

    // Call custom retry handler if provided
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ProjectErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
          projectId={this.props.projectId}
          onRetry={this.props.onRetry}
        />
      );
    }

    return this.props.children;
  }
}

const ProjectErrorFallback: React.FC<ProjectErrorFallbackProps> = ({
  error,
  resetError,
  errorInfo,
  projectId,
  onRetry,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  const getErrorIcon = () => {
    switch (apiError.type) {
      case 'network':
        return Wifi;
      case 'auth':
        return Shield;
      case 'fda-api':
        return Database;
      case 'timeout':
        return Clock;
      case 'agent':
        return Bot;
      default:
        return AlertTriangle;
    }
  };

  const getErrorColor = () => {
    switch (apiError.type) {
      case 'network':
        return 'bg-blue-500/10 text-blue-600';
      case 'auth':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'fda-api':
        return 'bg-purple-500/10 text-purple-600';
      case 'timeout':
        return 'bg-orange-500/10 text-orange-600';
      case 'agent':
        return 'bg-green-500/10 text-green-600';
      default:
        return 'bg-red-500/10 text-red-600';
    }
  };

  const ErrorIcon = getErrorIcon();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${getErrorColor()}`}
          >
            <ErrorIcon className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl">Project Error</CardTitle>
          {projectId && (
            <Badge variant="outline" className="mx-auto">
              Project ID: {projectId}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              {apiError.userMessage || 'An error occurred'}
              <Badge variant="secondary" className="text-xs">
                {apiError.type.toUpperCase()}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-2">
              {apiError.message}
              {apiError.code && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Error Code: {apiError.code}
                </div>
              )}
            </AlertDescription>
          </Alert>

          {apiError.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">What you can do:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {apiError.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              {apiError.retryable ? 'Retry' : 'Try Again'}
            </Button>

            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Data
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => (window.location.href = '/projects')}
            >
              <Home className="w-4 h-4 mr-2" />
              Projects
            </Button>
          </div>

          {apiError.type === 'fda-api' && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">FDA Database Unavailable</p>
                  <p className="text-muted-foreground mt-1">
                    You can continue working with cached data or manual searches
                    while we restore the connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {apiError.type === 'agent' && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">AI Assistant Error</p>
                  <p className="text-muted-foreground mt-1">
                    The AI assistant encountered an issue. You can try manual
                    operations or contact support.
                  </p>
                </div>
              </div>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Developer Details
              </summary>
              <div className="mt-2 space-y-2">
                <div className="p-2 bg-muted rounded text-xs">
                  <strong>Error Details:</strong>
                  <pre className="mt-1 overflow-auto max-h-32">
                    {JSON.stringify(apiError.toJSON(), null, 2)}
                  </pre>
                </div>
                {errorInfo && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                <div className="p-2 bg-muted rounded text-xs">
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Specialized error boundaries for different project contexts
export const ProjectListErrorBoundary: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ProjectErrorBoundary fallback={ProjectListErrorFallback}>
    {children}
  </ProjectErrorBoundary>
);

const ProjectListErrorFallback: React.FC<ProjectErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Unable to Load Projects</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{apiError.userMessage}</p>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">You can:</p>
          <ul className="text-sm space-y-1">
            {apiError.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
          <Button onClick={resetError} size="sm" className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const ProjectFormErrorBoundary: React.FC<{
  children: React.ReactNode;
  projectId?: number;
}> = ({ children, projectId }) => (
  <ProjectErrorBoundary
    projectId={projectId}
    fallback={ProjectFormErrorFallback}
  >
    {children}
  </ProjectErrorBoundary>
);

const ProjectFormErrorFallback: React.FC<ProjectErrorFallbackProps> = ({
  error,
  resetError,
  projectId,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-destructive">Form Error</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {apiError.userMessage}
          </p>
          {apiError.type === 'validation' && apiError.suggestions && (
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              {apiError.suggestions.slice(0, 2).map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={resetError} size="sm" variant="outline">
              Try Again
            </Button>
            {projectId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                Refresh Form
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
