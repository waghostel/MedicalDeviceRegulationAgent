'use client';

import {
  AlertTriangle,
  RefreshCw,
  Home,
  ExternalLink,
  FileText,
  Database,
  Wifi,
  Shield,
  Clock,
  Bot,
  Search,
  Upload,
  Download,
  Settings,
  HelpCircle,
} from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { APIError } from '@/types/error';

interface ErrorFallbackProps {
  error: APIError | Error;
  resetError: () => void;
  context?: string;
  showDetails?: boolean;
  actions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  }>;
}

/**
 * Generic error fallback component with customizable actions
 */
export const GenericErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  context = 'operation',
  showDetails = false,
  actions = [],
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
      case 'validation':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const ErrorIcon = getErrorIcon();

  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <ErrorIcon className="w-6 h-6 text-destructive" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{context} Error</h3>

      <p className="text-muted-foreground mb-4">{apiError.userMessage}</p>

      {apiError.suggestions.length > 0 && (
        <div className="text-left mb-4 p-3 bg-muted rounded-lg">
          <p className="font-medium text-sm mb-2">Suggested actions:</p>
          <ul className="text-sm space-y-1">
            {apiError.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={resetError}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>

        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outline'}
            onClick={action.onClick}
          >
            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
            {action.label}
          </Button>
        ))}
      </div>

      {showDetails && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Show technical details
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(apiError.toJSON(), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * Network error fallback with connectivity checks
 */
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Alert variant="destructive" className="m-4">
      <Wifi className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        Connection Error
        <Badge variant={isOnline ? 'default' : 'destructive'}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          {isOnline
            ? 'Unable to connect to the server. The service may be temporarily unavailable.'
            : 'You appear to be offline. Please check your internet connection.'}
        </p>

        <div className="flex gap-2">
          <Button onClick={resetError} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>

          {!isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * FDA API error fallback with service status
 */
export const FDAAPIErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          FDA Database Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          The FDA database is temporarily unavailable. This affects predicate
          searches and device classification.
        </p>

        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Available alternatives:</h4>
          <ul className="text-sm space-y-1">
            <li>• Use cached search results if available</li>
            <li>• Perform manual searches on FDA.gov</li>
            <li>• Continue with other project tasks</li>
            <li>• Try again in a few minutes</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button onClick={resetError}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry FDA Connection
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open('https://www.fda.gov', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit FDA.gov
          </Button>
        </div>

        {apiError.retryAfter && (
          <p className="text-xs text-muted-foreground">
            Automatic retry in {apiError.retryAfter} seconds
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Agent error fallback with alternative actions
 */
export const AgentErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
      <div className="flex items-start gap-3">
        <Bot className="w-5 h-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-orange-800">AI Assistant Error</h3>
          <p className="text-sm text-orange-700 mt-1">{apiError.userMessage}</p>

          <div className="mt-3 p-2 bg-white rounded border">
            <p className="text-xs font-medium text-orange-800 mb-1">
              Alternative actions:
            </p>
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={resetError}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
              <Button size="sm" variant="outline">
                <Search className="w-3 h-3 mr-1" />
                Manual Search
              </Button>
              <Button size="sm" variant="outline">
                <FileText className="w-3 h-3 mr-1" />
                View Docs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Validation error fallback with field-specific guidance
 */
export const ValidationErrorFallback: React.FC<
  ErrorFallbackProps & {
    fieldErrors?: Record<string, string[]>;
  }
> = ({ error, resetError, fieldErrors }) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Validation Error</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{apiError.userMessage}</p>

        {fieldErrors && Object.keys(fieldErrors).length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm">Field errors:</p>
            {Object.entries(fieldErrors).map(([field, errors]) => (
              <div key={field} className="p-2 bg-muted rounded">
                <p className="font-medium text-xs capitalize">{field}:</p>
                <ul className="text-xs mt-1 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <Button onClick={resetError} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
};

/**
 * File operation error fallback
 */
export const FileOperationErrorFallback: React.FC<
  ErrorFallbackProps & {
    operation: 'upload' | 'download' | 'export';
    fileName?: string;
  }
> = ({ error, resetError, operation, fileName }) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  const getOperationIcon = () => {
    switch (operation) {
      case 'upload':
        return Upload;
      case 'download':
        return Download;
      case 'export':
        return FileText;
      default:
        return FileText;
    }
  };

  const OperationIcon = getOperationIcon();

  return (
    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-start gap-3">
        <OperationIcon className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-800">File {operation} Failed</h3>
          {fileName && (
            <p className="text-sm text-blue-600 mt-1">File: {fileName}</p>
          )}
          <p className="text-sm text-blue-700 mt-1">{apiError.userMessage}</p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={resetError}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry {operation}
            </Button>

            {operation === 'upload' && (
              <Button size="sm" variant="outline">
                <Upload className="w-3 h-3 mr-1" />
                Choose Different File
              </Button>
            )}

            {operation === 'export' && (
              <Button size="sm" variant="outline">
                <Settings className="w-3 h-3 mr-1" />
                Export Options
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Search error fallback with query suggestions
 */
export const SearchErrorFallback: React.FC<
  ErrorFallbackProps & {
    query?: string;
    suggestions?: string[];
  }
> = ({ error, resetError, query, suggestions = [] }) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <div className="p-6 text-center">
      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

      <h3 className="text-lg font-semibold mb-2">Search Failed</h3>

      {query && (
        <p className="text-muted-foreground mb-2">
          Could not search for:{' '}
          <code className="bg-muted px-1 rounded">{query}</code>
        </p>
      )}

      <p className="text-muted-foreground mb-4">{apiError.userMessage}</p>

      {suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-muted rounded-lg text-left">
          <p className="font-medium text-sm mb-2">Try searching for:</p>
          <div className="flex gap-1 flex-wrap">
            {suggestions.map((suggestion, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer">
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={resetError}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>

        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          New Search
        </Button>
      </div>
    </div>
  );
};

/**
 * Help and support error fallback
 */
export const HelpErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const apiError =
    error instanceof APIError ? error : APIError.fromError(error);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Need Help?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{apiError.userMessage}</p>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium">Get Support:</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              View Documentation
            </Button>

            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Contact Support
            </Button>

            <Button variant="outline" size="sm" onClick={resetError}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <>
            <Separator />
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(apiError.toJSON(), null, 2)}
              </pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
};
