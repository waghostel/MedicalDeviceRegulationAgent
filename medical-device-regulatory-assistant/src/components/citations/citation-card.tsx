'use client';

import React from 'react';
import { ExternalLink, Copy, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SourceCitation } from '@/types/copilot';
import {
  getDocumentTypeDisplayName,
  getDocumentTypeIcon,
  validateCitation,
  formatCitation,
  CitationFormat,
} from './citation-utils';

interface CitationCardProps {
  citation: SourceCitation;
  format?: CitationFormat;
  showValidation?: boolean;
  onCopy?: (citation: SourceCitation) => void;
  onVisit?: (citation: SourceCitation) => void;
  className?: string;
}

export function CitationCard({
  citation,
  format = 'APA',
  showValidation = true,
  onCopy,
  onVisit,
  className = '',
}: CitationCardProps) {
  const validation = validateCitation(citation);
  const formattedCitation = formatCitation(citation, format);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCitation);
      onCopy?.(citation);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  };

  const handleVisit = () => {
    window.open(citation.url, '_blank', 'noopener,noreferrer');
    onVisit?.(citation);
  };

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-lg"
              role="img"
              aria-label={getDocumentTypeDisplayName(citation.documentType)}
            >
              {getDocumentTypeIcon(citation.documentType)}
            </span>
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-sm leading-tight truncate"
                title={citation.title}
              >
                {citation.title}
              </h3>
              <Badge variant="secondary" className="mt-1 text-xs">
                {getDocumentTypeDisplayName(citation.documentType)}
              </Badge>
            </div>
          </div>

          {showValidation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0" data-testid="validation-icon">
                    {validation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {validation.isValid ? (
                    <p>Citation is valid</p>
                  ) : (
                    <div>
                      <p className="font-medium">Citation issues:</p>
                      <ul className="list-disc list-inside text-xs mt-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Formatted Citation */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="leading-relaxed">{formattedCitation}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Effective:</span>{' '}
              {citation.effectiveDate}
            </div>
            <div>
              <span className="font-medium">Accessed:</span>{' '}
              {citation.accessedDate}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVisit}
              className="flex-1"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Visit Source
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Citation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
