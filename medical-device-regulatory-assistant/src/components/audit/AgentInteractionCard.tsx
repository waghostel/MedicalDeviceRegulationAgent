'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { format } from 'date-fns';
import { AgentInteraction, ExpandedReasoning } from '@/types/audit';
import { ReasoningTrace } from './ReasoningTrace';
import { SourceCitations } from './SourceCitations';

interface AgentInteractionCardProps {
  interaction: AgentInteraction;
}

export function AgentInteractionCard({
  interaction,
}: AgentInteractionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const getStatusIcon = (status: AgentInteraction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: AgentInteraction['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatActionName = (action: string) => {
    return action
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    if (score >= 0.4) return 'Low';
    return 'Very Low';
  };

  // Parse reasoning into structured format for display
  const parseReasoning = (reasoning: string): ExpandedReasoning => {
    // This is a simplified parser - in a real implementation,
    // the reasoning would be structured from the backend
    const sentences = reasoning.split('. ');
    const steps = sentences.map((sentence, index) => ({
      step: index + 1,
      description: sentence.trim() + (sentence.endsWith('.') ? '' : '.'),
      confidence: interaction.confidenceScore,
    }));

    return {
      summary: sentences[0] || reasoning,
      steps,
      conclusion: sentences[sentences.length - 1] || reasoning,
      limitations: [
        'Analysis based on publicly available data only',
        'Human expert review recommended for final decisions',
      ],
    };
  };

  const expandedReasoning = parseReasoning(interaction.reasoning);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(interaction.status)}
            <div>
              <h3 className="font-semibold text-lg">
                {formatActionName(interaction.agentAction)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(interaction.createdAt, 'MMM dd, yyyy at h:mm a')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(interaction.status)}>
              {interaction.status}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {(interaction.executionTimeMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Execution time: {interaction.executionTimeMs}ms</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Details
            </Button>
          </div>
        </div>

        {/* Confidence Score Visualization */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Confidence Score</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm font-bold ${getConfidenceColor(interaction.confidenceScore)}`}
                    >
                      {Math.round(interaction.confidenceScore * 100)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({getConfidenceLabel(interaction.confidenceScore)})
                    </span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-medium mb-1">
                      Confidence Score: {interaction.confidenceScore.toFixed(3)}
                    </p>
                    <p className="text-xs">
                      This score reflects the AI's confidence in its analysis
                      based on available data and regulatory precedent. Higher
                      scores indicate stronger evidence and clearer regulatory
                      pathways.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Progress value={interaction.confidenceScore * 100} className="h-2" />
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Input Data */}
              <div>
                <h4 className="font-medium mb-2">Input Data</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(interaction.inputData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Output Summary */}
              <div>
                <h4 className="font-medium mb-2">Output Summary</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(interaction.outputData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Reasoning Trace */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Reasoning Trace</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-1"
                  >
                    {showReasoning ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {showReasoning ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm mb-2">{expandedReasoning.summary}</p>

                  <Collapsible
                    open={showReasoning}
                    onOpenChange={setShowReasoning}
                  >
                    <CollapsibleContent>
                      <ReasoningTrace reasoning={expandedReasoning} />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>

              {/* Source Citations */}
              {interaction.sources.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      Source Citations ({interaction.sources.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSources(!showSources)}
                      className="flex items-center gap-1"
                    >
                      {showSources ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {showSources ? 'Hide' : 'Show'} Sources
                    </Button>
                  </div>

                  <Collapsible open={showSources} onOpenChange={setShowSources}>
                    <CollapsibleContent>
                      <SourceCitations sources={interaction.sources} />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
