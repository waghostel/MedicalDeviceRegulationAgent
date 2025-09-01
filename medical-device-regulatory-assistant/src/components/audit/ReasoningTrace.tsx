'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { ExpandedReasoning, ReasoningStep } from '@/types/audit';

interface ReasoningTraceProps {
  reasoning: ExpandedReasoning;
}

export function ReasoningTrace({ reasoning }: ReasoningTraceProps) {
  const getStepIcon = (step: ReasoningStep, index: number) => {
    if (step.confidence && step.confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (step.confidence && step.confidence < 0.6) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-200';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Reasoning Steps */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground">Analysis Steps</h5>
        
        {reasoning.steps.map((step, index) => (
          <div key={step.step} className="flex gap-3">
            {/* Step Number and Icon */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {step.step}
              </div>
              {index < reasoning.steps.length - 1 && (
                <div className="w-px h-6 bg-border mt-2" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start gap-2 mb-2">
                {getStepIcon(step, index)}
                <p className="text-sm flex-1">{step.description}</p>
              </div>

              {/* Step Confidence */}
              {step.confidence !== undefined && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getConfidenceColor(step.confidence)} transition-all duration-300`}
                              style={{ width: `${step.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(step.confidence * 100)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Step confidence: {step.confidence.toFixed(3)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Step Data */}
              {step.data && Object.keys(step.data).length > 0 && (
                <div className="bg-background border rounded-md p-2 mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View step data
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {JSON.stringify(step.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {/* Step Sources */}
              {step.sources && step.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {step.sources.map((source, sourceIndex) => (
                    <TooltipProvider key={sourceIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-muted"
                            onClick={() => window.open(source.url, '_blank')}
                          >
                            <ExternalLink className="h-2 w-2 mr-1" />
                            {source.documentType}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-medium">{source.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Effective: {source.effectiveDate}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      <div className="border-t pt-4">
        <h5 className="text-sm font-medium text-muted-foreground mb-2">Conclusion</h5>
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <p className="text-sm">{reasoning.conclusion}</p>
        </div>
      </div>

      {/* Limitations */}
      {reasoning.limitations.length > 0 && (
        <div className="border-t pt-4">
          <h5 className="text-sm font-medium text-muted-foreground mb-2">Limitations & Disclaimers</h5>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <ul className="space-y-1">
              {reasoning.limitations.map((limitation, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Analysis Metadata */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Analysis Method:</span>
            <p>Multi-step regulatory pathway analysis</p>
          </div>
          <div>
            <span className="font-medium">Data Sources:</span>
            <p>FDA databases, CFR sections, guidance documents</p>
          </div>
        </div>
      </div>
    </div>
  );
}