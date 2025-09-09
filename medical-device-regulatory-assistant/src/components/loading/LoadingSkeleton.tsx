'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

// Project Card Skeleton
export const ProjectCardSkeleton: React.FC = () => (
  <div className="p-6 border rounded-lg space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);

// Dashboard Widget Skeleton
export const DashboardWidgetSkeleton: React.FC = () => (
  <div className="p-6 border rounded-lg space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  </div>
);

// Predicate Search Results Skeleton
export const PredicateResultsSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="p-4 border rounded-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-18" />
        </div>
      </div>
    ))}
  </div>
);

// Agent Chat Skeleton
export const AgentChatSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex justify-start">
      <div className="max-w-xs space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="bg-muted p-3 rounded-lg space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className="max-w-xs space-y-2">
        <Skeleton className="h-4 w-12 ml-auto" />
        <div className="bg-primary/10 p-3 rounded-lg">
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-3">
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Enhanced Project List Skeleton with shimmer effect
export const ProjectListSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="project-card-skeleton"
          className="p-6 border rounded-lg space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Enhanced Form Skeleton with field-specific loading
export const EnhancedFormSkeleton: React.FC<{
  fields?: number;
  showButtons?: boolean;
  showProgress?: boolean;
}> = ({ fields = 4, showButtons = true, showProgress = false }) => (
  <div className="space-y-6">
    {showProgress && (
      <div className="space-y-2">
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    )}

    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton
          className={cn(
            'w-full',
            i % 3 === 0 ? 'h-24' : 'h-10' // Some fields are textareas
          )}
        />
        <Skeleton className="h-3 w-48" />
      </div>
    ))}

    {showButtons && (
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    )}
  </div>
);

// Bulk Operations Skeleton
export const BulkOperationsSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

// Export Progress Skeleton
export const ExportProgressSkeleton: React.FC = () => (
  <div className="space-y-4 p-6 border rounded-lg">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-5 w-16" />
    </div>
    <Skeleton className="h-2 w-full" />
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  </div>
);

// Page Loading Skeleton
export const PageLoadingSkeleton: React.FC<{
  title?: boolean;
  breadcrumb?: boolean;
}> = ({ title = true, breadcrumb = true }) => (
  <div className="space-y-6">
    {breadcrumb && (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-20" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-24" />
      </div>
    )}

    {title && (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <DashboardWidgetSkeleton key={i} />
      ))}
    </div>
  </div>
);
