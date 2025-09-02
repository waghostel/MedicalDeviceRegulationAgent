/**
 * Project List Component with search, filtering, and infinite scroll
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectCard, ProjectCardSkeleton } from './project-card';
import { useProjects } from '@/hooks/use-projects';
import { useProjectWebSocket } from '@/hooks/use-websocket';
import { useOffline } from '@/hooks/use-offline';
import { Project, ProjectStatus, WebSocketMessage } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  onCreateProject?: () => void;
  onSelectProject?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  className?: string;
}

export function ProjectList({
  onCreateProject,
  onSelectProject,
  onEditProject,
  className,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    projects,
    loading,
    error,
    hasMore,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    filterProjects,
    loadMore,
    refreshProjects,
  } = useProjects();

  const { isOffline, pendingActions } = useOffline();

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'project_updated') {
      // Refresh projects when updates come through WebSocket
      refreshProjects();
    }
  }, [refreshProjects]);

  useProjectWebSocket(null, handleWebSocketMessage);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchProjects(searchQuery);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery]);

  // Filter changes
  useEffect(() => {
    const filters: any = {};
    
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    if (deviceTypeFilter !== 'all') {
      filters.device_type = deviceTypeFilter;
    }

    filterProjects(filters);
  }, [statusFilter, deviceTypeFilter, filterProjects]);

  const handleProjectExport = useCallback(async (project: Project) => {
    try {
      // This would typically call the project service export method
      console.log('Exporting project:', project.id);
    } catch (error) {
      console.error('Failed to export project:', error);
    }
  }, []);

  // Get unique device types for filter
  const deviceTypes = Array.from(
    new Set(projects.map(p => p.device_type).filter(Boolean))
  );

  const pendingProjectActions = pendingActions.filter(action => 
    action.endpoint.includes('/projects')
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your medical device regulatory projects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isOffline && (
            <Badge variant="destructive" className="mr-2">
              Offline ({pendingProjectActions.length} pending)
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshProjects}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button onClick={onCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name, description, or device type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}
              >
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={ProjectStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={deviceTypeFilter}
                onValueChange={setDeviceTypeFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Device Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {deviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-medium">Error loading projects:</span>
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshProjects}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Loading Skeletons */}
        {loading && projects.length === 0 && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </>
        )}

        {/* Project Cards */}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSelect={onSelectProject}
            onEdit={onEditProject}
            onDelete={deleteProject}
            onExport={handleProjectExport}
            loading={loading}
          />
        ))}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="col-span-full">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium">No projects found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || deviceTypeFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first project'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && deviceTypeFilter === 'all' && (
                    <Button onClick={onCreateProject} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            Load More Projects
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && projects.length > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading more projects...</span>
          </div>
        </div>
      )}
    </div>
  );
}