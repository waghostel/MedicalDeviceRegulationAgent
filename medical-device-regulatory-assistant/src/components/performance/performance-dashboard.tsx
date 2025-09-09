/**
 * Performance Dashboard Component for monitoring frontend optimizations
 */

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Zap,
  Package,
  Image,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  usePerformanceMonitor,
  useMemoryMonitoring,
} from '@/lib/performance/optimization';
import { useBundleAnalysis } from '@/lib/performance/bundle-analyzer';
import { cn } from '@/lib/utils';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'poor';
  threshold: number;
  trend?: 'up' | 'down' | 'stable';
}

const PerformanceMetricCard = memo(
  ({ metric }: { metric: PerformanceMetric }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'good':
          return 'text-green-600 bg-green-50 border-green-200';
        case 'warning':
          return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'poor':
          return 'text-red-600 bg-red-50 border-red-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'good':
          return <CheckCircle className="h-4 w-4" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4" />;
        case 'poor':
          return <AlertTriangle className="h-4 w-4" />;
        default:
          return <Activity className="h-4 w-4" />;
      }
    };

    const getTrendIcon = (trend?: string) => {
      switch (trend) {
        case 'up':
          return <TrendingUp className="h-3 w-3 text-red-500" />;
        case 'down':
          return <TrendingDown className="h-3 w-3 text-green-500" />;
        default:
          return null;
      }
    };

    return (
      <Card className={cn('border-l-4', getStatusColor(metric.status))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(metric.status)}
              <span className="font-medium text-sm">{metric.name}</span>
            </div>
            {getTrendIcon(metric.trend)}
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">
              {metric.value.toFixed(1)}
              {metric.unit}
            </div>
            <Progress
              value={(metric.value / metric.threshold) * 100}
              className="mt-2 h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Threshold: {metric.threshold}
              {metric.unit}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
PerformanceMetricCard.displayName = 'PerformanceMetricCard';

export const PerformanceDashboard = memo(function PerformanceDashboard() {
  const { metrics, recordMetric } = usePerformanceMonitor();
  const memoryInfo = useMemoryMonitoring();
  const {
    analysis: bundleAnalysis,
    loading: bundleLoading,
    refresh: refreshBundle,
  } = useBundleAnalysis();
  const [refreshing, setRefreshing] = useState(false);

  const performanceMetrics: PerformanceMetric[] = [
    {
      name: 'Page Load Time',
      value: metrics.page_load_time?.avg || 0,
      unit: 'ms',
      status:
        (metrics.page_load_time?.avg || 0) < 3000
          ? 'good'
          : (metrics.page_load_time?.avg || 0) < 5000
            ? 'warning'
            : 'poor',
      threshold: 3000,
      trend: 'stable',
    },
    {
      name: 'Largest Contentful Paint',
      value: metrics.largest_contentful_paint?.avg || 0,
      unit: 'ms',
      status:
        (metrics.largest_contentful_paint?.avg || 0) < 2500
          ? 'good'
          : (metrics.largest_contentful_paint?.avg || 0) < 4000
            ? 'warning'
            : 'poor',
      threshold: 2500,
      trend: 'down',
    },
    {
      name: 'First Input Delay',
      value: metrics.first_input_delay?.avg || 0,
      unit: 'ms',
      status:
        (metrics.first_input_delay?.avg || 0) < 100
          ? 'good'
          : (metrics.first_input_delay?.avg || 0) < 300
            ? 'warning'
            : 'poor',
      threshold: 100,
      trend: 'stable',
    },
    {
      name: 'API Response Time',
      value: metrics.api_request?.avg || 0,
      unit: 'ms',
      status:
        (metrics.api_request?.avg || 0) < 1000
          ? 'good'
          : (metrics.api_request?.avg || 0) < 2000
            ? 'warning'
            : 'poor',
      threshold: 1000,
      trend: 'up',
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBundle();
      // Trigger a performance measurement
      recordMetric('dashboard_refresh', performance.now());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor frontend performance optimizations and bundle analysis
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || bundleLoading}
          variant="outline"
        >
          <RefreshCw
            className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4 mr-2" />
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="bundle">
            <Package className="h-4 w-4 mr-2" />
            Bundle Analysis
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Zap className="h-4 w-4 mr-2" />
            Memory Usage
          </TabsTrigger>
          <TabsTrigger value="optimizations">
            <Image className="h-4 w-4 mr-2" />
            Optimizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {performanceMetrics.map((metric) => (
              <PerformanceMetricCard key={metric.name} metric={metric} />
            ))}
          </div>

          {/* Detailed metrics table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <span className="font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        Avg: {value.avg?.toFixed(1)}ms
                      </div>
                      <div className="text-xs text-muted-foreground">
                        P95: {value.p95?.toFixed(1)}ms | Count: {value.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundle" className="space-y-4">
          {bundleAnalysis ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bundle Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bundleAnalysis.score}/100
                    </div>
                    <Progress value={bundleAnalysis.score} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(bundleAnalysis.totalSize / 1024)}KB
                    </div>
                    <Badge
                      variant={
                        bundleAnalysis.totalSize > 1000 * 1024
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {bundleAnalysis.totalSize > 1000 * 1024
                        ? 'Large'
                        : 'Optimal'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Chunks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bundleAnalysis.chunks.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bundleAnalysis.chunks.filter((c) => c.isAsync).length}{' '}
                      async
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {bundleAnalysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      Optimization Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {bundleAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Chunk details */}
              <Card>
                <CardHeader>
                  <CardTitle>Chunk Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {bundleAnalysis.chunks.map((chunk, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b"
                      >
                        <div>
                          <span className="font-medium">{chunk.name}</span>
                          {chunk.isAsync && (
                            <Badge variant="outline" className="ml-2">
                              Async
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {Math.round(chunk.size / 1024)}KB
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(chunk.loadTime)}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {bundleLoading
                      ? 'Analyzing bundle...'
                      : 'Bundle analysis not available'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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
                  <CardTitle>Memory Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Usage Percentage</span>
                      <Badge
                        variant={
                          memoryInfo.usagePercentage > 80
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {Math.round(memoryInfo.usagePercentage)}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {memoryInfo.usagePercentage > 80
                        ? 'High memory usage detected. Consider optimizing components.'
                        : 'Memory usage is within normal limits.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Memory information not available in this browser
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Optimizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">React.memo Components</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">useMemo Optimizations</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Virtual Scrolling</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lazy Image Loading</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code Splitting</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Debounced Search</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    • Use React.memo for components that render frequently
                  </div>
                  <div>
                    • Implement virtual scrolling for large lists (&gt;100
                    items)
                  </div>
                  <div>• Lazy load images and components below the fold</div>
                  <div>• Debounce user input handlers (search, filters)</div>
                  <div>• Split code by routes and features</div>
                  <div>
                    • Monitor bundle size and remove unused dependencies
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});
