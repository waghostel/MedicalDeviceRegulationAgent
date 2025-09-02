/**
 * Project Card Component with loading states and optimistic updates
 */

import { useState } from 'react';
import { MoreHorizontal, Calendar, FileText, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project, ProjectStatus } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onSelect?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onExport?: (project: Project) => void;
  loading?: boolean;
  className?: string;
}

const statusConfig = {
  [ProjectStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    color: 'bg-gray-100 text-gray-800',
  },
  [ProjectStatus.IN_PROGRESS]: {
    label: 'In Progress',
    variant: 'default' as const,
    color: 'bg-blue-100 text-blue-800',
  },
  [ProjectStatus.COMPLETED]: {
    label: 'Completed',
    variant: 'default' as const,
    color: 'bg-green-100 text-green-800',
  },
};

export function ProjectCard({
  project,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  loading = false,
  className,
}: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(project);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    
    setIsExporting(true);
    try {
      await onExport(project);
    } finally {
      setIsExporting(false);
    }
  };

  const statusInfo = statusConfig[project.status];
  const createdDate = new Date(project.created_at);
  const updatedDate = new Date(project.updated_at);
  const isRecentlyUpdated = Date.now() - updatedDate.getTime() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <Card
      data-testid="project-card"
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
        loading && 'opacity-50 pointer-events-none',
        isDeleting && 'opacity-50',
        className
      )}
      onClick={() => !loading && onSelect?.(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {project.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={statusInfo.variant}
                className={cn('text-xs', statusInfo.color)}
              >
                {statusInfo.label}
              </Badge>
              {isRecentlyUpdated && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  Recent
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
                disabled={loading || isDeleting}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit?.(project);
              }}>
                <FileText className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport();
                }}
                disabled={isExporting}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-red-600 focus:text-red-600"
                disabled={isDeleting}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          
          {project.device_type && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Device Type:</span>
              <Badge variant="outline" className="text-xs">
                {project.device_type}
              </Badge>
            </div>
          )}
          
          {project.intended_use && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Intended Use:</span>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {project.intended_use}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created {createdDate.toLocaleDateString()}</span>
            </div>
            {updatedDate.getTime() !== createdDate.getTime() && (
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Updated {updatedDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for project cards
 */
export function ProjectCardSkeleton({ className }: { className?: string }) {
  return (
    <Card data-testid="project-card-skeleton" className={cn('animate-pulse', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="flex gap-2">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="h-3 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}