'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Search, 
  FileText, 
  Database,
  Brain
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
  error: AlertCircle
};

const statusColors = {
  pending: 'text-muted-foreground',
  'in-progress': 'text-blue-500',
  completed: 'text-green-500',
  error: 'text-destructive'
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  showEstimatedTime = true,
  className
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
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
                  <StepIcon className={cn('w-4 h-4', statusColors[step.status])} />
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
                  <h4 className={cn(
                    'font-medium text-sm',
                    step.status === 'completed' && 'text-green-700',
                    step.status === 'error' && 'text-destructive'
                  )}>
                    {step.title}
                  </h4>
                  {showEstimatedTime && step.estimatedTime && step.status === 'in-progress' && (
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
                
                {step.status === 'in-progress' && step.progress !== undefined && (
                  <Progress value={step.progress} className="w-full mt-2 h-1" />
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
  reportGeneration
}) => {
  const defaultSteps: ProgressStep[] = [
    {
      id: 'classification',
      title: 'Device Classification',
      description: 'Determining device class and product code',
      status: 'pending',
      estimatedTime: '30s',
      icon: FileText,
      ...deviceClassification
    },
    {
      id: 'search',
      title: 'Predicate Search',
      description: 'Searching FDA 510(k) database',
      status: 'pending',
      estimatedTime: '2-3 min',
      icon: Search,
      ...predicateSearch
    },
    {
      id: 'analysis',
      title: 'Similarity Analysis',
      description: 'Analyzing technological characteristics',
      status: 'pending',
      estimatedTime: '1-2 min',
      icon: Brain,
      ...similarityAnalysis
    },
    {
      id: 'report',
      title: 'Report Generation',
      description: 'Generating comparison report',
      status: 'pending',
      estimatedTime: '30s',
      icon: FileText,
      ...reportGeneration
    }
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
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
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

// Full page loading overlay
export const LoadingOverlay: React.FC<{
  message?: string;
  progress?: ProgressStep[];
  currentStep?: string;
}> = ({ message = 'Loading...', progress, currentStep }) => (
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
      </CardContent>
    </Card>
  </div>
);