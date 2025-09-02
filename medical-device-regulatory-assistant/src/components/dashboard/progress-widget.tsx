/**
 * Progress Widget Component
 * Displays project progress across regulatory milestones
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Loader2,
  TrendingUp,
  FileText,
  Search,
  BarChart3
} from 'lucide-react';
import { ProjectProgress, ProgressWidgetProps, ProgressStep } from '@/types/dashboard';

export function ProgressWidget({
  progress,
  loading = false,
  error,
  onStepClick,
  onRefresh
}: ProgressWidgetProps) {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepBadgeVariant = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStepTitle = (stepKey: string) => {
    const titles = {
      classification: 'Device Classification',
      predicateSearch: 'Predicate Search',
      comparisonAnalysis: 'Comparison Analysis',
      submissionReadiness: 'Submission Readiness'
    };
    return titles[stepKey as keyof typeof titles] || stepKey;
  };

  const getStepDescription = (stepKey: string, step: ProgressStep) => {
    const descriptions = {
      classification: step.status === 'completed' 
        ? 'FDA device class and product code determined'
        : 'Determine FDA device classification and regulatory pathway',
      predicateSearch: step.status === 'completed'
        ? 'Predicate devices identified and analyzed'
        : 'Search FDA database for similar predicate devices',
      comparisonAnalysis: step.status === 'completed'
        ? 'Substantial equivalence analysis completed'
        : 'Compare device characteristics with predicates',
      submissionReadiness: step.status === 'completed'
        ? 'Ready for 510(k) submission preparation'
        : 'Prepare documentation for regulatory submission'
    };
    return descriptions[stepKey as keyof typeof descriptions] || '';
  };

  const getStepIconComponent = (stepKey: string) => {
    const icons = {
      classification: FileText,
      predicateSearch: Search,
      comparisonAnalysis: BarChart3,
      submissionReadiness: TrendingUp
    };
    const IconComponent = icons[stepKey as keyof typeof icons] || Clock;
    return IconComponent;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Project Progress
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Project Progress
            <Badge variant="outline">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full mb-4"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = [
    { key: 'classification', step: progress.classification },
    { key: 'predicateSearch', step: progress.predicateSearch },
    { key: 'comparisonAnalysis', step: progress.comparisonAnalysis },
    { key: 'submissionReadiness', step: progress.submissionReadiness }
  ];

  const completedSteps = steps.filter(s => s.step.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          Project Progress
          <Badge variant="secondary">
            {completedSteps}/{steps.length} Complete
          </Badge>
        </CardTitle>
        <CardDescription>
          Regulatory milestone completion tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-blue-600">
              {Math.round(progress.overallProgress)}%
            </span>
          </div>
          <Progress 
            value={progress.overallProgress} 
            className="h-3"
          />
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map(({ key, step }, index) => {
            const IconComponent = getStepIconComponent(key);
            const isClickable = onStepClick && (step.status === 'completed' || step.status === 'pending');
            
            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isClickable 
                    ? 'cursor-pointer hover:bg-gray-50 border-gray-200' 
                    : 'border-gray-100'
                } ${step.status === 'completed' ? 'bg-green-50 border-green-200' : ''}`}
                onClick={() => isClickable && onStepClick(key as any)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{getStepTitle(key)}</h4>
                    <Badge variant={getStepBadgeVariant(step)} className="text-xs">
                      {step.status}
                    </Badge>
                    {step.confidenceScore && (
                      <span className={`text-xs font-medium ${getConfidenceColor(step.confidenceScore)}`}>
                        {Math.round(step.confidenceScore * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">
                    {getStepDescription(key, step)}
                  </p>
                  
                  {step.completedAt && (
                    <p className="text-xs text-gray-500">
                      Completed: {new Date(step.completedAt).toLocaleDateString()}
                    </p>
                  )}
                  
                  {step.errorMessage && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {step.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Actions */}
        {progress.nextActions && progress.nextActions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Next Actions</h4>
            <ul className="space-y-1">
              {progress.nextActions.map((action, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{completedSteps}</div>
            <div className="text-xs text-gray-600">Steps Complete</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {steps.filter(s => s.step.confidenceScore).length}
            </div>
            <div className="text-xs text-gray-600">With Confidence</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Last updated: {new Date(progress.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}