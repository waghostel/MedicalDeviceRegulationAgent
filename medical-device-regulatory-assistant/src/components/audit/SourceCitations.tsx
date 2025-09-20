'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ExternalLink,
  FileText,
  Calendar,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { SourceCitation } from '@/types/audit';

interface SourceCitationsProps {
  sources: SourceCitation[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const getDocumentTypeIcon = (type: SourceCitation['documentType']) => {
    switch (type) {
      case 'FDA_510K':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'FDA_GUIDANCE':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'CFR_SECTION':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'FDA_DATABASE':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDocumentTypeLabel = (type: SourceCitation['documentType']) => {
    switch (type) {
      case 'FDA_510K':
        return '510(k) Summary';
      case 'FDA_GUIDANCE':
        return 'FDA Guidance';
      case 'CFR_SECTION':
        return 'CFR Section';
      case 'FDA_DATABASE':
        return 'FDA Database';
      default:
        return 'Document';
    }
  };

  const getDocumentTypeColor = (type: SourceCitation['documentType']) => {
    switch (type) {
      case 'FDA_510K':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FDA_GUIDANCE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CFR_SECTION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FDA_DATABASE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatCitation = (source: SourceCitation) => {
    const accessDate = format(new Date(source.accessedDate), 'MMMM dd, yyyy');
    const effectiveDate = format(
      new Date(source.effectiveDate),
      'MMMM dd, yyyy'
    );

    return `${source.title}. ${getDocumentTypeLabel(source.documentType)}. Effective Date: ${effectiveDate}. Retrieved ${accessDate}, from ${source.url}`;
  };

  if (sources.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No sources cited for this interaction</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Document Type Icon */}
            <div className="flex-shrink-0 mt-1">
              {getDocumentTypeIcon(source.documentType)}
            </div>

            {/* Source Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Type */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h6 className="font-medium text-sm leading-tight">
                  {source.title}
                </h6>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${getDocumentTypeColor(source.documentType)}`}
                >
                  {getDocumentTypeLabel(source.documentType)}
                </Badge>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Effective:{' '}
                          {format(
                            new Date(source.effectiveDate),
                            'MMM dd, yyyy'
                          )}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Document effective date</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Accessed:{' '}
                          {format(
                            new Date(source.accessedDate),
                            'MMM dd, yyyy'
                          )}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Date when this source was accessed by the AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* URL */}
              <div className="flex items-center gap-2 mb-3">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {source.url}
                </code>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(source.url, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Source
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(formatCitation(source), index)
                        }
                        className="flex items-center gap-1"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedIndex === index ? 'Copied!' : 'Copy Citation'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy formatted citation to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Full Citation Preview */}
          <details className="mt-3 pt-3 border-t">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View formatted citation
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <p className="italic">{formatCitation(source)}</p>
            </div>
          </details>
        </div>
      ))}

      {/* Citation Summary */}
      <div className="border-t pt-3 mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {sources.length} source{sources.length !== 1 ? 's' : ''} cited
          </span>
          <div className="flex items-center gap-4">
            {Object.entries(
              sources.reduce(
                (acc, source) => {
                  acc[source.documentType] =
                    (acc[source.documentType] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )
            ).map(([type, count]) => (
              <span key={type} className="flex items-center gap-1">
                {getDocumentTypeIcon(type as SourceCitation['documentType'])}
                {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
