/**
 * Performance Dashboard Component
 *
 * Displays performance metrics and trends for test execution monitoring.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Memory,
  Database,
  Globe,
} from 'lucide-react';

export interface PerformanceMetrics {
  testName: string;
  executionTime: number;
  renderTime: number;
  memoryUsage: number;
  peakMemoryUsage: number;
  componentCount: number;
  rerenderCount: number;
  domUpdates: number;
  warnings: string[];
  timestamp: string;
}

export interface PerformanceSummary {
  totalTests: number;
  averageExecutionTime: number;
  averageRenderTime: number;
  averageMemoryUsage: number;
  slowTests: Array<{ name: string; time: number }>;
  memoryIntensiveTests: Array<{ name: string; memory: number }>;
  testsWithWarnings: Array<{ name: string; warnings: string[] }>;
  memoryLeaks: Array<{ name: string; leakSize: number }>;
}

export interface PerformanceDashboardProps {
  metrics: PerformanceMetrics[];
  summary: PerformanceSummary;
  thresholds?: {
    maxExecutionTime: number;
    maxRenderTime: number;
    maxMemoryUsage: number;
    maxComponentCount: number;
    maxRerenderCount: number;
  };
  onRefresh?: () => void;
  isLoading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  summary,
  thresholds = {
    maxExecutionTime: 1000,
    maxRenderTime: 100,
    maxMemoryUsage: 20,
    maxComponentCount: 500,
    maxRerenderCount: 5,
  },
  onRefresh,
  isLoading = false,
}) => {
  const getStatusColor = (value: number, threshold: number) => {
    if (value <= threshold * 0.7) return 'text-green-600';
    if (value <= threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (value: number, threshold: number) => {
    if (value <= threshold * 0.7)
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Good
        </Badge>
      );
    if (value <= threshold)
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Warning
        </Badge>
      );
    return <Badge variant="destructive">Critical</Badge>;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)}KB`;
    return `${mb.toFixed(2)}MB`;
  };

  // Prepare chart data
  const executionTimeData = metrics.slice(-10).map((metric, index) => ({
    name: `Test ${index + 1}`,
    executionTime: metric.executionTime,
    renderTime: metric.renderTime,
    threshold: thresholds.maxExecutionTime,
  }));

  const memoryUsageData = metrics.slice(-10).map((metric, index) => ({
    name: `Test ${index + 1}`,
    memoryUsage: metric.memoryUsage,
    peakMemory: metric.peakMemoryUsage,
    threshold: thresholds.maxMemoryUsage,
  }));

  const testDistributionData = [
    {
      name: 'Passed',
      value: summary.totalTests - summary.testsWithWarnings.length,
      color: '#00C49F',
    },
    {
      name: 'With Warnings',
      value: summary.testsWithWarnings.length,
      color: '#FFBB28',
    },
    { name: 'Slow Tests', value: summary.slowTests.length, color: '#FF8042' },
    {
      name: 'Memory Issues',
      value: summary.memoryIntensiveTests.length,
      color: '#8884D8',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor test execution performance and identify bottlenecks
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              {summary.testsWithWarnings.length} with warnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Execution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(summary.averageExecutionTime, thresholds.maxExecutionTime)}`}
            >
              {formatTime(summary.averageExecutionTime)}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(
                summary.averageExecutionTime,
                thresholds.maxExecutionTime
              )}
              <Progress
                value={
                  (summary.averageExecutionTime / thresholds.maxExecutionTime) *
                  100
                }
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Memory Usage
            </CardTitle>
            <Memory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(summary.averageMemoryUsage, thresholds.maxMemoryUsage)}`}
            >
              {formatMemory(summary.averageMemoryUsage)}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(
                summary.averageMemoryUsage,
                thresholds.maxMemoryUsage
              )}
              <Progress
                value={
                  (summary.averageMemoryUsage / thresholds.maxMemoryUsage) * 100
                }
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.slowTests.length +
                summary.memoryIntensiveTests.length +
                summary.memoryLeaks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Performance issues detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(summary.slowTests.length > 0 || summary.memoryLeaks.length > 0) && (
        <div className="space-y-2">
          {summary.slowTests.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {summary.slowTests.length} slow test(s) detected. Consider
                optimizing:{' '}
                {summary.slowTests
                  .slice(0, 3)
                  .map((t) => t.name)
                  .join(', ')}
                {summary.slowTests.length > 3 &&
                  ` and ${summary.slowTests.length - 3} more`}
              </AlertDescription>
            </Alert>
          )}

          {summary.memoryLeaks.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {summary.memoryLeaks.length} potential memory leak(s) detected
                in: {summary.memoryLeaks.map((l) => l.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="execution-time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="execution-time">Execution Time</TabsTrigger>
          <TabsTrigger value="memory-usage">Memory Usage</TabsTrigger>
          <TabsTrigger value="test-distribution">Test Distribution</TabsTrigger>
          <TabsTrigger value="detailed-metrics">Detailed Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="execution-time">
          <Card>
            <CardHeader>
              <CardTitle>Execution Time Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={executionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatTime(value)} />
                  <Bar
                    dataKey="executionTime"
                    fill="#8884d8"
                    name="Execution Time"
                  />
                  <Bar dataKey="renderTime" fill="#82ca9d" name="Render Time" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory-usage">
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={memoryUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatMemory(value)} />
                  <Line
                    type="monotone"
                    dataKey="memoryUsage"
                    stroke="#8884d8"
                    name="Memory Usage"
                  />
                  <Line
                    type="monotone"
                    dataKey="peakMemory"
                    stroke="#82ca9d"
                    name="Peak Memory"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test-distribution">
          <Card>
            <CardHeader>
              <CardTitle>Test Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={testDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {testDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed-metrics">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.slice(-10).map((metric, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{metric.testName}</h3>
                      <Badge
                        variant={
                          metric.warnings.length > 0
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {metric.warnings.length > 0
                          ? `${metric.warnings.length} warnings`
                          : 'OK'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Execution:
                        </span>
                        <div
                          className={getStatusColor(
                            metric.executionTime,
                            thresholds.maxExecutionTime
                          )}
                        >
                          {formatTime(metric.executionTime)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <div
                          className={getStatusColor(
                            metric.memoryUsage,
                            thresholds.maxMemoryUsage
                          )}
                        >
                          {formatMemory(metric.memoryUsage)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Components:
                        </span>
                        <div>{metric.componentCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Re-renders:
                        </span>
                        <div
                          className={getStatusColor(
                            metric.rerenderCount,
                            thresholds.maxRerenderCount
                          )}
                        >
                          {metric.rerenderCount}
                        </div>
                      </div>
                    </div>

                    {metric.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {metric.warnings.map((warning, wIndex) => (
                          <div
                            key={wIndex}
                            className="text-sm text-red-600 flex items-center"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
