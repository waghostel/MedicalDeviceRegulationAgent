/**
 * Project Detail Page with Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProjects } from '@/hooks/use-projects';
import { useDashboard } from '@/hooks/use-dashboard';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useOffline } from '@/hooks/use-offline';
import { Project, ProjectStatus } from '@/types/project';
import { RegulatoryDashboard } from '@/components/dashboard/regulatory-dashboard';

interface ProjectDetailPageProps {
  params: { id: string };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOffline();
  const { projects, loading, error, updateProject, refreshProjects } =
    useProjects();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Find the current project
  const project = projects.find((p) => p.id === params.id);

  // Dashboard data and functionality
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    isConnected,
    refreshDashboard,
    exportDashboard,
    startClassification,
    searchPredicates,
    selectPredicate,
    handleStepClick,
  } = useDashboard({
    projectId: params.id,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // WebSocket connection for real-time updates (legacy)
  const { lastMessage } = useWebSocket(`/projects/${params.id}`);

  useEffect(() => {
    if (lastMessage) {
      // Handle real-time project updates
      try {
        const update = JSON.parse(lastMessage);
        if (
          update.type === 'project_updated' &&
          update.projectId === params.id
        ) {
          refreshProjects();
          toast({
            title: 'Project Updated',
            description: 'Project data has been updated in real-time.',
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, params.id, refreshProjects, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProjects();
      toast({
        title: 'Refreshed',
        description: 'Project data has been refreshed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh project data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    if (!project) return;

    try {
      await updateProject(project.id, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Project status changed to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update project status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'on-hold':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'on-hold':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load project data: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Project not found. It may have been deleted or you may not have
              access to it.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push('/projects')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projects')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="text-gray-600">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOffline && <Badge variant="destructive">Offline</Badge>}
            {!isConnected && !isOffline && (
              <Badge variant="outline">Disconnected</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Status and Progress */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(project.status)}
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(project.status)} text-white`}
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium">Device Type</p>
                <p className="text-lg font-semibold">
                  {project.deviceType || 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-lg font-semibold">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-lg font-semibold">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Dashboard */}
        <div className="w-full">
          <RegulatoryDashboard
            projectId={params.id}
            dashboardData={dashboardData}
            loading={dashboardLoading}
            error={dashboardError}
            onRefresh={refreshDashboard}
            onExport={exportDashboard}
            onStartClassification={startClassification}
            onSearchPredicates={searchPredicates}
            onSelectPredicate={selectPredicate}
            onStepClick={handleStepClick}
          />
        </div>
      </div>
    </div>
  );
}
