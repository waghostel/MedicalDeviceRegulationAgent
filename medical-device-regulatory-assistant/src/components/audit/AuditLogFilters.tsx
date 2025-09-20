'use client';

import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditLogFilter } from '@/types/audit';

interface AuditLogFiltersProps {
  filters: AuditLogFilter;
  onFiltersChange: (filters: AuditLogFilter) => void;
}

export const AuditLogFilters = ({
  filters,
  onFiltersChange,
}: AuditLogFiltersProps) => {
  const handleFilterChange = (key: keyof AuditLogFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleDateRangeChange = (
    field: 'start' | 'end',
    date: Date | undefined
  ) => {
    if (!date) return;

    const currentRange = filters.dateRange || {
      start: new Date(),
      end: new Date(),
    };
    onFiltersChange({
      ...filters,
      dateRange: {
        ...currentRange,
        [field]: date,
      },
    });
  };

  const handleConfidenceRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const currentRange = filters.confidenceRange || { min: 0, max: 1 };
    onFiltersChange({
      ...filters,
      confidenceRange: {
        ...currentRange,
        [field]: numValue,
      },
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter Options</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Agent Action Filter */}
        <div className="space-y-2">
          <Label htmlFor="agent-action">Agent Action</Label>
          <Select
            value={filters.agentAction || ''}
            onValueChange={(value) =>
              handleFilterChange('agentAction', value || undefined)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="predicate-search">Predicate Search</SelectItem>
              <SelectItem value="classify-device">
                Device Classification
              </SelectItem>
              <SelectItem value="compare-predicate">
                Predicate Comparison
              </SelectItem>
              <SelectItem value="find-guidance">Guidance Search</SelectItem>
              <SelectItem value="generate-checklist">
                Generate Checklist
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status || ''}
            onValueChange={(value) =>
              handleFilterChange('status', value || undefined)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.start
                    ? format(filters.dateRange.start, 'MMM dd')
                    : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.start}
                  onSelect={(date) => handleDateRangeChange('start', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.end
                    ? format(filters.dateRange.end, 'MMM dd')
                    : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange?.end}
                  onSelect={(date) => handleDateRangeChange('end', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Confidence Range Filter */}
        <div className="space-y-2">
          <Label>Confidence Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              min="0"
              max="1"
              step="0.1"
              value={filters.confidenceRange?.min || ''}
              onChange={(e) =>
                handleConfidenceRangeChange('min', e.target.value)
              }
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Max"
              min="0"
              max="1"
              step="0.1"
              value={filters.confidenceRange?.max || ''}
              onChange={(e) =>
                handleConfidenceRangeChange('max', e.target.value)
              }
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.agentAction && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              Action: {filters.agentAction}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => handleFilterChange('agentAction', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {filters.status && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              Status: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => handleFilterChange('status', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {filters.dateRange && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              Date: {format(filters.dateRange.start, 'MMM dd')} -{' '}
              {format(filters.dateRange.end, 'MMM dd')}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => handleFilterChange('dateRange', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {filters.confidenceRange && (
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              Confidence: {filters.confidenceRange.min} -{' '}
              {filters.confidenceRange.max}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => handleFilterChange('confidenceRange', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
