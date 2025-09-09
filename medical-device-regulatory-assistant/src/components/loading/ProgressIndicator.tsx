'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  FileText,
  Database,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress?: number;
  estimatedTime?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  showEstimatedTime?: boolean;
  className?: string;
}

const statusIcons = {
  pending: Clock,
  'in-progress': Loader2,
  completed: CheckCircle,
  error: AlertCircle,
};

const statusColors = {
  pending: 'text-muted-foreground',
  'in-progress': 'text-blue-500',
  completed: 'text-green-500',
  error: 'text-destructive',
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  showEstimatedTime = true,
  className,
}) => {
  const completedSteps = steps.filter(
    (step) => step.status === 'completed'
  ).length;
  const totalProgress = (completedSteps / steps.length) * 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Progress</span>
          <Badge variant="outline">
            {completedSteps}/{steps.length} Complete
          </Badge>
        </CardTitle>
        <Progress value={totalProgress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const StatusIcon = statusIcons[step.status];
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg transition-colors',
                isActive && 'bg-muted/50 border border-border'
              )}
            >
              <div className="flex items-center space-x-2">
                {StepIcon && (
                  <StepIcon
                    className={cn('w-4 h-4', statusColors[step.status])}
                  />
                )}
                <StatusIcon
                  className={cn(
                    'w-4 h-4',
                    statusColors[step.status],
                    step.status === 'in-progress' && 'animate-spin'
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      'font-medium text-sm',
                      step.status === 'completed' && 'text-green-700',
                      step.status === 'error' && 'text-destructive'
                    )}
                  >
                    {step.title}
                  </h4>
                  {showEstimatedTime &&
                    step.estimatedTime &&
                    step.status === 'in-progress' && (
                      <span className="text-xs text-muted-foreground">
                        ~{step.estimatedTime}
                      </span>
                    )}
                </div>

                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}

                {step.status === 'in-progress' &&
                  step.progress !== undefined && (
                    <Progress
                      value={step.progress}
                      className="w-full mt-2 h-1"
                    />
                  )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// Predefined progress configurations for common workflows
export const PredicateSearchProgress: React.FC<{
  currentStep?: string;
  deviceClassification?: ProgressStep;
  predicateSearch?: ProgressStep;
  similarityAnalysis?: ProgressStep;
  reportGeneration?: ProgressStep;
}> = ({
  currentStep,
  deviceClassification,
  predicateSearch,
  similarityAnalysis,
  reportGeneration,
}) => {
  const defaultSteps: ProgressStep[] = [
    {
      id: 'classification',
      title: 'Device Classification',
      description: 'Determining device class and product code',
      status: 'pending',
      estimatedTime: '30s',
      icon: FileText,
      ...deviceClassification,
    },
    {
      id: 'search',
      title: 'Predicate Search',
      description: 'Searching FDA 510(k) database',
      status: 'pending',
      estimatedTime: '2-3 min',
      icon: Search,
      ...predicateSearch,
    },
    {
      id: 'analysis',
      title: 'Similarity Analysis',
      description: 'Analyzing technological characteristics',
      status: 'pending',
      estimatedTime: '1-2 min',
      icon: Brain,
      ...similarityAnalysis,
    },
    {
      id: 'report',
      title: 'Report Generation',
      description: 'Generating comparison report',
      status: 'pending',
      estimatedTime: '30s',
      icon: FileText,
      ...reportGeneration,
    },
  ];

  return (
    <ProgressIndicator
      steps={defaultSteps}
      currentStep={currentStep}
      showEstimatedTime={true}
    />
  );
};

// Simple loading spinner with message
export const LoadingSpinner: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ message = 'Loading...', size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn('flex items-center justify-center space-x-2', className)}
    >
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

// Inline loading state for buttons and small components
export const InlineLoader: React.FC<{
  text?: string;
  className?: string;
}> = ({ text = 'Loading', className }) => (
  <div className={cn('flex items-center space-x-2', className)}>
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-sm">{text}</span>
  </div>
);

// Enhanced Progress Bar with real-time updates
export const EnhancedProgressBar: React.FC<{
  value: number;
  max?: number;
  showPercentage?: boolean;
  showETA?: boolean;
  estimatedTimeRemaining?: string;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}> = ({
  value,
  max = 100,
  showPercentage = true,
  showETA = false,
  estimatedTimeRemaining,
  label,
  variant = 'default',
  animated = true,
  className,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage || showETA) && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <div className="flex items-center space-x-2 text-muted-foreground">
            {showPercentage && <span>{Math.round(percentage)}%</span>}
            {showETA && estimatedTimeRemaining && (
              <span>ETA: {estimatedTimeRemaining}</span>
            )}
          </div>
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Form Submission Progress
export const FormSubmissionProgress: React.FC<{
  isSubmitting: boolean;
  progress?: number;
  currentStep?: string;
  steps?: string[];
}> = ({
  isSubmitting,
  progress,
  currentStep,
  steps = ['Validating', 'Saving', 'Updating UI'],
}) => {
  if (!isSubmitting) return null;

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">
          {currentStep || 'Processing...'}
        </span>
      </div>

      {progress !== undefined && (
        <EnhancedProgressBar
          value={progress}
          showPercentage={true}
          animated={true}
          variant="default"
        />
      )}

      {steps && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <span
                className={cn(
                  step === currentStep && 'text-primary font-medium'
                )}
              >
                {step}
              </span>
              {index < steps.length - 1 && <span>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// Bulk Operations Progress
export const BulkOperationsProgress: React.FC<{
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  errors?: number;
  operation: string;
  onCancel?: () => void;
}> = ({
  totalItems,
  processedItems,
  currentItem,
  errors = 0,
  operation,
  onCancel,
}) => {
  const percentage = (processedItems / totalItems) * 100;
  const hasErrors = errors > 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{operation}</span>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EnhancedProgressBar
          value={processedItems}
          max={totalItems}
          label={`Processing ${processedItems} of ${totalItems} items`}
          showPercentage={true}
          variant={hasErrors ? 'warning' : 'default'}
        />

        {currentItem && (
          <div className="text-sm text-muted-foreground">
            Current: {currentItem}
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-green-600">
            ✓ {processedItems - errors} completed
          </span>
          {hasErrors && <span className="text-red-600">✗ {errors} errors</span>}
        </div>
      </CardContent>
    </Card>
  );
};

// Export Progress with real-time tracking
export const ExportProgress: React.FC<{
  exportType: 'json' | 'pdf' | 'csv';
  progress: number;
  currentStep?: string;
  fileName?: string;
  fileSize?: string;
  onCancel?: () => void;
  onDownload?: () => void;
}> = ({
  exportType,
  progress,
  currentStep,
  fileName,
  fileSize,
  onCancel,
  onDownload,
}) => {
  const isComplete = progress >= 100;

  const exportSteps = [
    'Collecting data',
    'Processing records',
    'Generating file',
    'Finalizing export',
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Exporting {exportType.toUpperCase()}</span>
          {!isComplete && onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EnhancedProgressBar
          value={progress}
          label={currentStep || 'Preparing export...'}
          showPercentage={true}
          showETA={!isComplete}
          estimatedTimeRemaining={progress < 50 ? '2-3 min' : '30s'}
          variant={isComplete ? 'success' : 'default'}
          animated={!isComplete}
        />

        {fileName && (
          <div className="text-sm space-y-1">
            <div className="font-medium">{fileName}</div>
            {fileSize && (
              <div className="text-muted-foreground">Size: {fileSize}</div>
            )}
          </div>
        )}

        {isComplete && onDownload && (
          <Button onClick={onDownload} className="w-full">
            Download File
          </Button>
        )}

        {!isComplete && (
          <div className="text-xs text-muted-foreground">
            {exportSteps.map((step, index) => {
              const stepProgress = (index + 1) * 25;
              const isActive =
                progress >= stepProgress - 25 && progress < stepProgress;
              const isCompleted = progress >= stepProgress;

              return (
                <div
                  key={step}
                  className={cn(
                    'flex items-center space-x-2',
                    isActive && 'text-primary font-medium',
                    isCompleted && 'text-green-600'
                  )}
                >
                  <span>{isCompleted ? '✓' : isActive ? '→' : '○'}</span>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Data Loading Progress with retry capability
export const DataLoadingProgress: React.FC<{
  isLoading: boolean;
  progress?: number;
  error?: string;
  onRetry?: () => void;
  loadingMessage?: string;
  retryCount?: number;
  maxRetries?: number;
}> = ({
  isLoading,
  progress,
  error,
  onRetry,
  loadingMessage = 'Loading data...',
  retryCount = 0,
  maxRetries = 3,
}) => {
  if (!isLoading && !error) return null;

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <div>
                <p className="font-medium text-red-700">Loading Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                {retryCount < maxRetries && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Retry {retryCount + 1} of {maxRetries}
                  </p>
                )}
              </div>
              {onRetry && retryCount < maxRetries && (
                <Button onClick={onRetry} variant="outline" size="sm">
                  Try Again
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <div>
                <p className="font-medium">{loadingMessage}</p>
                {progress !== undefined && (
                  <EnhancedProgressBar
                    value={progress}
                    showPercentage={true}
                    className="mt-3"
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{
  message?: string;
  progress?: ProgressStep[];
  currentStep?: string;
  canCancel?: boolean;
  onCancel?: () => void;
}> = ({
  message = 'Loading...',
  progress,
  currentStep,
  canCancel = false,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <Card className="w-full max-w-md mx-4">
      <CardContent className="pt-6">
        {progress ? (
          <ProgressIndicator steps={progress} currentStep={currentStep} />
        ) : (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}

        {canCancel && onCancel && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);
