/**
 * Performance Monitoring Component
 *
 * Provides real-time performance monitoring and metrics display
 * for tracking application performance and identifying bottlenecks.
 */

import {
  Activity,
  Zap,
  Clock,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, memo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiCache, memoryCache, getCacheSize } from '@/lib/performance/caching';
import {
  usePerformanceMonitor,
  useMemoryMonitoring,
  performanceMonitor,
} from '@/lib/performance/optimization';
import { cn } from '@/lib/utils';
import { useWebVitals } from '@/lib/web-vitals';

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
  threshold?: number;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  page_load_time: 3000,
  largest_contentful_paint: 2500,
  first_input_delay: 100,
  cumulative_layout_shift: 0.1,
  api_request: 2000,
  component_render: 16,
  memory_usage: 100, // MB
  bundle_size: 1000, // KB
};

const PerformanceMetricCard = memo(
  ({
    title,
    value,
    unit,
    threshold,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: number;
    unit: string;
    threshold: number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down' | 'stable';
  }) => {
    const getStatus = () => {
      if (value <= threshold * 0.7) return 'good';
      if (value <= threshold) return 'warning';
      return 'poor';
    };

    const status = getStatus();
    const percentage = Math.min((value / threshold) * 100, 100);

    const statusColors = {
      good: 'text-green-600 border-green-200 bg-green-50',
      warning: 'text-yellow-600 border-yellow-200 bg-yellow-50',
      poor: 'text-red-600 border-red-200 bg-red-50',
    };

    const trendIcons = {
      up: <TrendingUp className="h-3 w-3 text-red-500" />,
      down: <TrendingDown className="h-3 w-3 text-green-500" />,
      stable: null,
    };

    return (
      <Card className={cn('border-l-4', statusColors[status])}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{title}</span>
            </div>
            {trend && trendIcons[trend]}
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {value.toFixed(1)}
              {unit}
            </div>

            <Progress value={percentage} className="h-2" />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current</span>
              <span>
                Threshold: {threshold}
                {unit}
              </span>
            </div>

            <Badge
              variant={
                status === 'good'
                  ? 'default'
                  : status === 'warning'
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-xs"
            >
              {status === 'good'
                ? 'Good'
                : status === 'warning'
                  ? 'Needs Improvement'
                  : 'Poor'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }
);
PerformanceMetricCard.displayName = 'PerformanceMetricCard';

const AlertsList = memo(({ alerts }: { alerts: PerformanceAlert[] }) => {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No performance issues detected
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.type === 'error' ? 'destructive' : 'default'}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-start">
              <div>
                <strong>{alert.title}</strong>
                <p className="text-sm mt-1">{alert.message}</p>
                {alert.metric && alert.value && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.metric}: {alert.value.toFixed(1)}
                    {alert.threshold && ` (threshold: ${alert.threshold})`}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
});
AlertsList.displayName = 'AlertsList';

export const PerformanceMonitor = memo(() => {
  const { metrics, recordMetric } = usePerformanceMonitor();
  const { metrics: webVitals, scores } = useWebVitals();
  const memoryInfo = useMemoryMonitoring();
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isRecording, setIsRecording] = useState(true);

  // Generate performance alerts
  const generateAlerts = useCallback(() => {
    const newAlerts: PerformanceAlert[] = [];
    const now = Date.now();

    // Check each metric against thresholds
    Object.entries(metrics).forEach(([metricName, metricData]) => {
      const threshold =
        PERFORMANCE_THRESHOLDS[
          metricName as keyof typeof PERFORMANCE_THRESHOLDS
        ];
      if (threshold && metricData.avg > threshold) {
        newAlerts.push({
          id: `${metricName}-${now}`,
          type: metricData.avg > threshold * 1.5 ? 'error' : 'warning',
          title: `High ${metricName.replace(/_/g, ' ')}`,
          message: `Average ${metricName.replace(/_/g, ' ')} is ${metricData.avg.toFixed(1)}ms, exceeding threshold of ${threshold}ms`,
          timestamp: now,
          metric: metricName,
          value: metricData.avg,
          threshold,
        });
      }
    });

    // Check Web Vitals
    if (
      webVitals.lcp &&
      webVitals.lcp > PERFORMANCE_THRESHOLDS.largest_contentful_paint
    ) {
      newAlerts.push({
        id: `lcp-${now}`,
        type: 'warning',
        title: 'Poor Largest Contentful Paint',
        message: `LCP is ${webVitals.lcp.toFixed(1)}ms. Consider optimizing images and critical resources.`,
        timestamp: now,
        metric: 'lcp',
        value: webVitals.lcp,
        threshold: PERFORMANCE_THRESHOLDS.largest_contentful_paint,
      });
    }

    if (
      webVitals.fid &&
      webVitals.fid > PERFORMANCE_THRESHOLDS.first_input_delay
    ) {
      newAlerts.push({
        id: `fid-${now}`,
        type: 'warning',
        title: 'High First Input Delay',
        message: `FID is ${webVitals.fid.toFixed(1)}ms. Consider reducing JavaScript execution time.`,
        timestamp: now,
        metric: 'fid',
        value: webVitals.fid,
        threshold: PERFORMANCE_THRESHOLDS.first_input_delay,
      });
    }

    // Check memory usage
    if (memoryInfo && memoryInfo.usagePercentage > 80) {
      newAlerts.push({
        id: `memory-${now}`,
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is at ${memoryInfo.usagePercentage.toFixed(1)}%. Consider optimizing components.`,
        timestamp: now,
        metric: 'memory_usage',
        value: memoryInfo.usagePercentage,
        threshold: 80,
      });
    }

    // Keep only recent alerts (last 10 minutes)
    const cutoff = now - 10 * 60 * 1000;
    const recentAlerts = alerts.filter((alert) => alert.timestamp > cutoff);

    setAlerts([...recentAlerts, ...newAlerts]);
  }, [metrics, webVitals, memoryInfo, alerts]);

  // Update alerts periodically
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(generateAlerts, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [generateAlerts, isRecording]);

  const handleExportData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      webVitals,
      memoryInfo,
      alerts,
      cacheStats: {
        api: apiCache.getStats(),
        memory: memoryCache.getStats(),
        sizes: getCacheSize(),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, webVitals, memoryInfo, alerts]);

  const handleClearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
  }, []);

  // Calculate overall performance score
  const calculateOverallScore = useCallback(() => {
    const webVitalScores = Object.values(scores).filter(
      (score) => score !== null
    );
    const goodScores = webVitalScores.filter(
      (score) => score === 'good'
    ).length;
    const totalScores = webVitalScores.length;

    if (totalScores === 0) return 0;
    return Math.round((goodScores / totalScores) * 100);
  }, [scores]);

  const overallScore = calculateOverallScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Performance Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and optimization insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isRecording ? 'default' : 'secondary'}>
            {isRecording ? 'Recording' : 'Paused'}
          </Badge>

          <Button variant="outline" size="sm" onClick={toggleRecording}>
            {isRecording ? 'Pause' : 'Resume'}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Overall Performance Score
              </h3>
              <p className="text-sm text-muted-foreground">
                Based on Core Web Vitals and custom metrics
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{overallScore}/100</div>
              <Badge
                variant={
                  overallScore >= 80
                    ? 'default'
                    : overallScore >= 60
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {overallScore >= 80
                  ? 'Good'
                  : overallScore >= 60
                    ? 'Needs Improvement'
                    : 'Poor'}
              </Badge>
            </div>
          </div>
          <Progress value={overallScore} className="mt-4" />
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="web-vitals">
            <Zap className="h-4 w-4 mr-2" />
            Web Vitals
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Database className="h-4 w-4 mr-2" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(metrics).map(([key, value]) => {
              const threshold =
                PERFORMANCE_THRESHOLDS[
                  key as keyof typeof PERFORMANCE_THRESHOLDS
                ] || 1000;
              return (
                <PerformanceMetricCard
                  key={key}
                  title={key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                  value={value.avg || 0}
                  unit="ms"
                  threshold={threshold}
                  icon={Clock}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="web-vitals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {webVitals.lcp && (
              <PerformanceMetricCard
                title="Largest Contentful Paint"
                value={webVitals.lcp}
                unit="ms"
                threshold={PERFORMANCE_THRESHOLDS.largest_contentful_paint}
                icon={Activity}
              />
            )}
            {webVitals.fid && (
              <PerformanceMetricCard
                title="First Input Delay"
                value={webVitals.fid}
                unit="ms"
                threshold={PERFORMANCE_THRESHOLDS.first_input_delay}
                icon={Zap}
              />
            )}
            {webVitals.cls && (
              <PerformanceMetricCard
                title="Cumulative Layout Shift"
                value={webVitals.cls * 1000} // Convert to more readable number
                unit=""
                threshold={
                  PERFORMANCE_THRESHOLDS.cumulative_layout_shift * 1000
                }
                icon={Activity}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          {memoryInfo ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Used JS Heap</span>
                        <span>
                          {Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}
                          MB
                        </span>
                      </div>
                      <Progress
                        value={
                          (memoryInfo.usedJSHeapSize /
                            memoryInfo.totalJSHeapSize) *
                          100
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Total JS Heap</span>
                        <span>
                          {Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)}
                          MB
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Heap Limit</span>
                        <span>
                          {Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)}
                          MB
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cache Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Memory Cache</span>
                      <span>{memoryCache.getStats().size} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Persistent Cache</span>
                      <span>{getCacheSize().persistent} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Cache Hit Rate</span>
                      <span>
                        {Math.round(apiCache.getStats().memory.hitRate * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  Memory information not available in this browser
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Performance Alerts</h3>
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAlerts}>
                Clear All
              </Button>
            )}
          </div>
          <AlertsList alerts={alerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
});
