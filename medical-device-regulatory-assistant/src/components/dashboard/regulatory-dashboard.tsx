/**
 * Regulatory Dashboard Component
 * Main dashboard layout combining all dashboard widgets
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Download, 
  Settings, 
  AlertCircle,
  Loader2,
  LayoutDashboard,
  TrendingUp
} from 'lucide-react';

import { ClassificationWidget } from './classification-widget';
import { PredicateWidget } from './predicate-widget';
import { ProgressWidget } from './progress-widget';
import { ActivityWidget } from './activity-widget';

import { DashboardData, DashboardConfig } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';

interface RegulatoryDashboardProps {
  projectId: string;
  dashboardData?: DashboardData;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: (format: 'json' | 'pdf') => void;
  onStartClassification?: () => void;
  onSearchPredicates?: () => void;
  onSelectPredicate?: (predicate: any) => void;
  onStepClick?: (step: string) => void;
}

export function RegulatoryDashboard({
  projectId,
  dashboardData,
  loading = false,
  error,
  onRefresh,
  onExport,
  onStartClassification,
  onSearchPredicates,
  onSelectPredicate,
  onStepClick
}: RegulatoryDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>({
    widgets: {
      classification: { visible: true, position: 1, size: 'medium' },
      predicates: { visible: true, position: 2, size: 'medium' },
      progress: { visible: true, position: 3, size: 'medium' },
      activity: { visible: true, position: 4, size: 'medium' }
    },
    layout: 'default',
    refreshInterval: 30000, // 30 seconds
    autoRefresh: false
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!config.autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, onRefresh]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: "Dashboard Refreshed",
        description: "All dashboard data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async (format: 'json' | 'pdf') => {
    if (!onExport) return;
    
    try {
      await onExport(format);
      toast({
        title: "Export Started",
        description: `Dashboard export in ${format.toUpperCase()} format has been initiated.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export dashboard in ${format.toUpperCase()} format.`,
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Regulatory Dashboard</h2>
            <p className="text-gray-600">Project regulatory strategy overview</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data: {error}
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Regulatory Dashboard</h2>
            <p className="text-gray-600">Loading project data...</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const completionPercentage = dashboardData?.statistics?.completionPercentage || 0;
  const totalPredicates = dashboardData?.statistics?.totalPredicates || 0;
  const selectedPredicates = dashboardData?.statistics?.selectedPredicates || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Regulatory Dashboard
          </h2>
          <p className="text-gray-600">
            {dashboardData?.project?.name || 'Project'} regulatory strategy overview
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {Math.round(completionPercentage)}% Complete
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Classification</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.classification ? 'Complete' : 'Pending'}
                </p>
              </div>
              <div className={`w-2 h-8 rounded ${dashboardData?.classification ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Predicates</p>
                <p className="text-2xl font-bold">{totalPredicates}</p>
              </div>
              <div className={`w-2 h-8 rounded ${totalPredicates > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-2xl font-bold">{selectedPredicates}</p>
              </div>
              <div className={`w-2 h-8 rounded ${selectedPredicates > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold">{Math.round(completionPercentage)}%</p>
              </div>
              <div className={`w-2 h-8 rounded ${completionPercentage > 50 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Classification Widget */}
            {config.widgets.classification.visible && (
              <ClassificationWidget
                classification={dashboardData?.classification}
                loading={loading}
                onStartClassification={onStartClassification}
                onRefresh={handleRefresh}
              />
            )}

            {/* Progress Widget */}
            {config.widgets.progress.visible && dashboardData?.progress && (
              <ProgressWidget
                progress={dashboardData.progress}
                loading={loading}
                onStepClick={onStepClick}
                onRefresh={handleRefresh}
              />
            )}

            {/* Predicate Widget */}
            {config.widgets.predicates.visible && (
              <PredicateWidget
                predicates={dashboardData?.predicate_devices || []}
                loading={loading}
                onSearchPredicates={onSearchPredicates}
                onSelectPredicate={onSelectPredicate}
                onRefresh={handleRefresh}
              />
            )}

            {/* Activity Widget */}
            {config.widgets.activity.visible && (
              <ActivityWidget
                activities={dashboardData?.recent_activity || []}
                loading={loading}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="space-y-6">
            {/* Full-width widgets for detailed view */}
            {config.widgets.progress.visible && dashboardData?.progress && (
              <ProgressWidget
                progress={dashboardData.progress}
                loading={loading}
                onStepClick={onStepClick}
                onRefresh={handleRefresh}
              />
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {config.widgets.classification.visible && (
                <ClassificationWidget
                  classification={dashboardData?.classification}
                  loading={loading}
                  onStartClassification={onStartClassification}
                  onRefresh={handleRefresh}
                />
              )}

              {config.widgets.activity.visible && (
                <ActivityWidget
                  activities={dashboardData?.recent_activity || []}
                  loading={loading}
                  onRefresh={handleRefresh}
                />
              )}
            </div>

            {config.widgets.predicates.visible && (
              <PredicateWidget
                predicates={dashboardData?.predicate_devices || []}
                loading={loading}
                onSearchPredicates={onSearchPredicates}
                onSelectPredicate={onSelectPredicate}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}