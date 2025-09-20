'use client';

import {
  AlertTriangle,
  Wifi,
  Shield,
  Database,
  Clock,
  RefreshCw,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface ErrorMessageProps {
  type: 'network' | 'auth' | 'fda-api' | 'validation' | 'timeout' | 'generic';
  title?: string;
  message?: string;
  details?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onHelp?: () => void;
  className?: string;
}

const errorConfig = {
  network: {
    icon: Wifi,
    title: 'Connection Error',
    defaultMessage:
      'Unable to connect to the server. Please check your internet connection.',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again',
      'Contact your IT administrator if using a corporate network',
    ],
  },
  auth: {
    icon: Shield,
    title: 'Authentication Error',
    defaultMessage: 'Your session has expired or authentication failed.',
    suggestions: [
      'Sign out and sign back in',
      'Clear your browser cache and cookies',
      'Disable browser extensions temporarily',
      'Contact support if the issue persists',
    ],
  },
  'fda-api': {
    icon: Database,
    title: 'FDA Database Unavailable',
    defaultMessage:
      'Unable to access FDA database. This may affect predicate searches and device classification.',
    suggestions: [
      'Try again in a few minutes',
      'Use cached results if available',
      'Perform manual searches as backup',
      'Check FDA.gov status page for known issues',
    ],
  },
  validation: {
    icon: AlertTriangle,
    title: 'Validation Error',
    defaultMessage:
      'The information provided does not meet the required format.',
    suggestions: [
      'Check all required fields are filled',
      'Ensure data formats are correct',
      'Review field-specific requirements',
      'Contact support for validation rules',
    ],
  },
  timeout: {
    icon: Clock,
    title: 'Request Timeout',
    defaultMessage: 'The operation took too long to complete.',
    suggestions: [
      'Try the operation again',
      'Break down large requests into smaller parts',
      'Check your internet connection speed',
      'Contact support for complex operations',
    ],
  },
  generic: {
    icon: AlertTriangle,
    title: 'Unexpected Error',
    defaultMessage: 'An unexpected error occurred.',
    suggestions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try again in a few minutes',
      'Contact support with error details',
    ],
  },
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type,
  title,
  message,
  details,
  suggestions,
  onRetry,
  onHelp,
  className,
}) => {
  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.defaultMessage;
  const displaySuggestions = suggestions || config.suggestions;

  return (
    <Alert variant="destructive" className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {displayTitle}
        {onHelp && (
          <Button variant="ghost" size="sm" onClick={onHelp}>
            <HelpCircle className="w-4 h-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{displayMessage}</p>

        {details && (
          <div className="p-2 bg-muted rounded text-sm">
            <strong>Details:</strong> {details}
          </div>
        )}

        <div>
          <p className="font-medium text-sm mb-2">What you can do:</p>
          <ul className="text-sm space-y-1">
            {displaySuggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          {onRetry && (
            <Button onClick={onRetry} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {type === 'fda-api' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://www.fda.gov', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Check FDA Status
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Specialized error components for common scenarios
export const NetworkError: React.FC<Omit<ErrorMessageProps, 'type'>> = (
  props
) => <ErrorMessage type="network" {...props} />;

export const AuthError: React.FC<Omit<ErrorMessageProps, 'type'>> = (props) => (
  <ErrorMessage type="auth" {...props} />
);

export const FDAAPIError: React.FC<Omit<ErrorMessageProps, 'type'>> = (
  props
) => <ErrorMessage type="fda-api" {...props} />;

export const ValidationError: React.FC<Omit<ErrorMessageProps, 'type'>> = (
  props
) => <ErrorMessage type="validation" {...props} />;

export const TimeoutError: React.FC<Omit<ErrorMessageProps, 'type'>> = (
  props
) => <ErrorMessage type="timeout" {...props} />;
