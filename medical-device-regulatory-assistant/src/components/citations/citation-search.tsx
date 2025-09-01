'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { SourceCitation } from '@/types/copilot';
import { getDocumentTypeDisplayName } from './citation-utils';

interface CitationSearchProps {
  citations: SourceCitation[];
  onFilteredResults: (filtered: SourceCitation[]) => void;
  placeholder?: string;
}

interface SearchFilters {
  query: string;
  documentType: SourceCitation['documentType'] | 'all';
  dateRange: 'all' | 'last-year' | 'last-month' | 'custom';
  validOnly: boolean;
}

export function CitationSearch({
  citations,
  onFilteredResults,
  placeholder = "Search citations..."
}: CitationSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    documentType: 'all',
    dateRange: 'all',
    validOnly: false
  });

  const [showFilters, setShowFilters] = useState(false);

  // Filter citations based on current filters
  const filteredCitations = useMemo(() => {
    let filtered = [...citations];

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(citation =>
        citation.title.toLowerCase().includes(query) ||
        citation.url.toLowerCase().includes(query)
      );
    }

    // Document type filter
    if (filters.documentType !== 'all') {
      filtered = filtered.filter(citation =>
        citation.documentType === filters.documentType
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'last-year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'last-month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      if (filters.dateRange !== 'custom') {
        filtered = filtered.filter(citation => {
          const effectiveDate = new Date(citation.effectiveDate);
          return effectiveDate >= cutoffDate;
        });
      }
    }

    return filtered;
  }, [citations, filters]);

  // Update parent component when filtered results change
  React.useEffect(() => {
    onFilteredResults(filteredCitations);
  }, [filteredCitations, onFilteredResults]);

  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  const handleDocumentTypeChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      documentType: value as SearchFilters['documentType']
    }));
  };

  const handleDateRangeChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      dateRange: value as SearchFilters['dateRange']
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      documentType: 'all',
      dateRange: 'all',
      validOnly: false
    });
  };

  const hasActiveFilters = 
    filters.query.trim() !== '' ||
    filters.documentType !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.validOnly;

  const documentTypes: SourceCitation['documentType'][] = [
    'FDA_510K',
    'FDA_GUIDANCE', 
    'CFR_SECTION',
    'FDA_DATABASE'
  ];

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={filters.query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 ${hasActiveFilters ? 'text-primary' : ''}`}
                title="Filter citations"
                data-testid="filter-button"
              >
                <Filter className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-6 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Document Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Type</label>
                  <Select
                    value={filters.documentType}
                    onValueChange={handleDocumentTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {documentTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {getDocumentTypeDisplayName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={handleDateRangeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="last-year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.query && (
            <Badge variant="secondary" className="text-xs">
              Search: "{filters.query}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => handleQueryChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.documentType !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Type: {getDocumentTypeDisplayName(filters.documentType)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => handleDocumentTypeChange('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.dateRange !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Date: {filters.dateRange.replace('-', ' ')}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => handleDateRangeChange('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-xs text-muted-foreground">
        {filteredCitations.length} of {citations.length} citations
      </div>
    </div>
  );
}