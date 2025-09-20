'use client';

import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Settings,
  RefreshCw,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SourceCitation } from '@/types/copilot';

import { CitationCard } from './citation-card';
import { CitationExporter } from './citation-exporter';
import { CitationSearch } from './citation-search';
import { CitationFormat, validateSourceUrl } from './citation-utils';

interface CitationPanelProps {
  citations: SourceCitation[];
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  projectName?: string;
  onRefresh?: () => void;
  className?: string;
}

export const CitationPanel = ({
  citations,
  isOpen = true,
  onToggle,
  projectName = 'Current Project',
  onRefresh,
  className = '',
}: CitationPanelProps) => {
  const [filteredCitations, setFilteredCitations] =
    useState<SourceCitation[]>(citations);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('APA');
  const [validatingUrls, setValidatingUrls] = useState(false);

  // Update filtered citations when citations prop changes
  React.useEffect(() => {
    setFilteredCitations(citations);
  }, [citations]);

  // Group citations by document type
  const groupedCitations = useMemo(() => {
    const groups: Record<string, SourceCitation[]> = {};

    filteredCitations.forEach((citation) => {
      const type = citation.documentType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(citation);
    });

    return groups;
  }, [filteredCitations]);

  const handleValidateAllUrls = async () => {
    setValidatingUrls(true);

    try {
      const validationPromises = citations.map(async (citation) => {
        const isValid = await validateSourceUrl(citation.url);
        return { citation, isValid };
      });

      const results = await Promise.all(validationPromises);

      // In a real implementation, you would update the citation validation status
      // For now, we'll just log the results
      console.log('URL validation results:', results);
    } catch (error) {
      console.error('Failed to validate URLs:', error);
    } finally {
      setValidatingUrls(false);
    }
  };

  const handleCitationCopy = (citation: SourceCitation) => {
    // You could add a toast notification here
    console.log('Citation copied:', citation.title);
  };

  const handleCitationVisit = (citation: SourceCitation) => {
    // Track citation visits for analytics
    console.log('Citation visited:', citation.url);
  };

  return (
    <div className={`border-l bg-background ${className}`}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">Citations & Sources</span>
              <span className="text-xs text-muted-foreground">
                ({citations.length})
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-2">
              <Select
                value={citationFormat}
                onValueChange={(value: CitationFormat) =>
                  setCitationFormat(value)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="MLA">MLA</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    title="Refresh citations"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleValidateAllUrls}
                  disabled={validatingUrls}
                  title="Validate all URLs"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <CitationSearch
              citations={citations}
              onFilteredResults={setFilteredCitations}
            />

            {/* Export */}
            <CitationExporter
              citations={filteredCitations}
              projectName={projectName}
              className="w-full"
            />

            <Separator />

            {/* Citations List */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {Object.keys(groupedCitations).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No citations found</p>
                    <p className="text-xs mt-1">
                      Citations will appear here as you interact with the AI
                      assistant
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedCitations).map(
                    ([documentType, typeCitations]) => (
                      <div key={documentType} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {documentType.replace('_', ' ')} (
                          {typeCitations.length})
                        </h4>

                        <div className="space-y-3">
                          {typeCitations.map((citation, index) => (
                            <CitationCard
                              key={`${citation.url}-${index}`}
                              citation={citation}
                              format={citationFormat}
                              onCopy={handleCitationCopy}
                              onVisit={handleCitationVisit}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
