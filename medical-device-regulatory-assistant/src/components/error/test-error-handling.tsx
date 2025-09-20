'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useErrorHandling } from '@/hooks/use-error-handling';
import { APIError } from '@/types/error';

import { ProjectErrorBoundary } from './ProjectErrorBoundary';


/**
 * Test component for error handling functionality
 * This component is for development/testing purposes only
 */

const ErrorThrowingComponent: React.FC<{ errorType: string }> = ({
  errorType,
}) => {
  const throwError = () => {
    switch (errorType) {
      case 'network':
        throw APIError.network('Test network error');
      case 'auth':
        throw APIError.auth('Test authentication error');
      case 'validation':
        throw APIError.validation('Test validation error', {
          fieldErrors: {
            name: ['Name is required'],
            email: ['Invalid email format'],
          },
        });
      case 'fda-api':
        throw APIError.fdaAPI('Test FDA API error');
      case 'project':
        throw APIError.project('read', 'Test project error', {
          projectId: 123,
        });
      case 'agent':
        throw APIError.agent('Test agent error', {
          agentType: 'predicate-search',
        });
      default:
        throw new Error('Generic test error');
    }
  };

  React.useEffect(() => {
    throwError();
  }, [errorType]);

  return <div>This should not render</div>;
};

const AsyncErrorTest: React.FC = () => {
  const errorHandling = useErrorHandling(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      throw APIError.network('Async operation failed');
    },
    {
      maxRetries: 2,
      context: 'async test operation',
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Async Error Handling Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorHandling.error && (
          <div className="p-3 bg-destructive/10 rounded">
            <p className="text-sm font-medium text-destructive">
              Error: {errorHandling.error.userMessage}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Retry count: {errorHandling.retryCount}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => errorHandling.retry()}
            disabled={errorHandling.isRetrying || !errorHandling.canRetry}
          >
            {errorHandling.isRetrying ? 'Retrying...' : 'Test Async Error'}
          </Button>

          <Button variant="outline" onClick={() => errorHandling.clearError()}>
            Clear Error
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ErrorHandlingTest: React.FC = () => {
  const [selectedError, setSelectedError] = React.useState<string | null>(null);
  const [showAsyncTest, setShowAsyncTest] = React.useState(false);

  const errorTypes = [
    { key: 'network', label: 'Network Error' },
    { key: 'auth', label: 'Authentication Error' },
    { key: 'validation', label: 'Validation Error' },
    { key: 'fda-api', label: 'FDA API Error' },
    { key: 'project', label: 'Project Error' },
    { key: 'agent', label: 'Agent Error' },
    { key: 'generic', label: 'Generic Error' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Test Error Boundary:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {errorTypes.map(({ key, label }) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedError(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Test Async Error Handling:</h3>
            <Button
              variant="outline"
              onClick={() => setShowAsyncTest(!showAsyncTest)}
            >
              {showAsyncTest ? 'Hide' : 'Show'} Async Test
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setSelectedError(null);
              setShowAsyncTest(false);
            }}
          >
            Reset All Tests
          </Button>
        </CardContent>
      </Card>

      {selectedError && (
        <ProjectErrorBoundary
          key={selectedError} // Force remount to trigger error
          onError={(error) => {
            console.log('Error caught by boundary:', error);
          }}
          onRetry={() => {
            setSelectedError(null);
          }}
        >
          <ErrorThrowingComponent errorType={selectedError} />
        </ProjectErrorBoundary>
      )}

      {showAsyncTest && <AsyncErrorTest />}
    </div>
  );
};

export default ErrorHandlingTest;
