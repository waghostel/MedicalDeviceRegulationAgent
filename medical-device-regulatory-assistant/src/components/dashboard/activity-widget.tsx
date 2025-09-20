/**
 * Activity Widget Component
 * Displays recent project activity and agent interactions
 */

'use client';

import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Activity,
  Loader2,
  FileText,
  Search,
  BarChart3,
  Upload,
  Bot,
} from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ActivityItem, ActivityWidgetProps } from '@/types/dashboard';

export const ActivityWidget = ({
  activities,
  loading = false,
  error,
  onRefresh,
}: ActivityWidgetProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'classification':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'predicate_search':
        return <Search className="h-4 w-4 text-green-500" />;
      case 'comparison':
        return <BarChart3 className="h-4 w-4 text-purple-500" />;
      case 'document_upload':
        return <Upload className="h-4 w-4 text-orange-500" />;
      case 'agent_interaction':
        return <Bot className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } 
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Recent Activity
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recent Activity
            <Badge variant="outline">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            Recent Activity
            <Badge variant="outline">Empty</Badge>
          </CardTitle>
          <CardDescription>
            Project activity and agent interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No recent activity to display. Activity will appear here as you
              work on your project.
            </p>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          Recent Activity
          <Badge variant="secondary">{activities.length} Items</Badge>
        </CardTitle>
        <CardDescription>
          Latest project activity and agent interactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* Activity Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">
                    {activity.title}
                  </h4>
                  <Badge
                    variant={getStatusBadgeVariant(activity.status)}
                    className="text-xs"
                  >
                    {activity.status}
                  </Badge>
                </div>

                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {activity.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(activity.timestamp)}
                  </span>

                  {/* Metadata */}
                  {activity.metadata && (
                    <div className="flex items-center gap-2">
                      {activity.metadata.confidence_score && (
                        <span className="text-xs text-gray-500">
                          {Math.round(activity.metadata.confidence_score * 100)}
                          %
                        </span>
                      )}
                      {activity.metadata.execution_time_ms && (
                        <span className="text-xs text-gray-500">
                          {activity.metadata.execution_time_ms}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(activity.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <span className="text-xs text-gray-500">
            Showing {activities.length} recent activities
          </span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
