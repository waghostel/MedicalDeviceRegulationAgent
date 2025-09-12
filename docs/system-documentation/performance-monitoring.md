# Performance Monitoring Documentation

## Overview

The Medical Device Regulatory Assistant includes comprehensive performance monitoring systems that track test execution performance, system resource usage, and application performance metrics. This documentation covers all performance monitoring utilities, metrics collection, and optimization strategies.

## Architecture

The performance monitoring system consists of several key components:

1. **Test Performance Monitoring** - Track test execution times, memory usage, and resource consumption
2. **System Performance Metrics** - Monitor application performance in real-time
3. **Resource Usage Tracking** - Database queries, API calls, and memory usage
4. **Performance Thresholds** - Automated detection of performance regressions
5. **Performance Analytics** - Trend analysis and optimization recommendations

## Backend Performance Monitoring

### Test Performance Monitor

**Location**: `backend/testing/performance_monitor.py`

The test performance monitor tracks execution time, memory usage, and resource consumption for all tests.

#### Core Components

##### TestPerformanceMonitor Class

```python
from backend.testing.performance_monitor import TestPerformanceMonitor, PerformanceThresholds

# Create monitor with custom thresholds
thresholds = PerformanceThresholds(
    max_execution_time=5.0,      # seconds
    max_memory_usage=100.0,      # MB
    max_database_queries=50,
    max_api_calls=10
)

monitor = TestPerformanceMonitor(thresholds)

# Context manager usage
async def test_with_monitoring():
    with monitor.monitor_test("database_operations_test") as monitor_id:
        # Perform operations
        async with isolation.isolated_session() as session:
            # Record database queries
            monitor.record_database_query(monitor_id, {
                "query": "SELECT * FROM projects WHERE user_id = ?",
                "execution_time": 0.05
            })
            
            # Perform database operations
            projects = await session.execute(select(Project))
            
            # Record API calls
            monitor.record_api_call(monitor_id, {
                "endpoint": "/api/external/fda",
                "response_time": 1.2
            })
```

##### Performance Metrics Collection

```python
@dataclass
class TestPerformanceMetrics:
    test_name: str
    execution_time: float           # Total test execution time
    memory_usage: float            # Memory used during test (MB)
    peak_memory_usage: float       # Peak memory usage (MB)
    database_queries: int          # Number of database queries
    api_calls: int                 # Number of API calls
    start_time: datetime
    end_time: datetime
    warnings: List[str]            # Performance warnings
    context: Dict[str, Any]        # Additional context

# Example usage
metrics = monitor.stop_monitoring(monitor_id)
print(f"Test: {metrics.test_name}")
print(f"Execution time: {metrics.execution_time:.2f}s")
print(f"Memory usage: {metrics.memory_usage:.2f}MB")
print(f"Database queries: {metrics.database_queries}")
print(f"Warnings: {metrics.warnings}")
```

##### Async Performance Monitoring

```python
# Async context manager for performance monitoring
async def test_async_operations():
    async with monitor.monitor_async_test("async_operations_test") as monitor_id:
        # Perform async operations
        tasks = []
        for i in range(10):
            task = asyncio.create_task(perform_async_operation(i))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # Record metrics for each operation
        for i, result in enumerate(results):
            monitor.record_database_query(monitor_id, {
                "operation": f"async_op_{i}",
                "result_size": len(result)
            })
```

##### Performance Analysis and Reporting

```python
# Get comprehensive performance summary
summary = monitor.get_performance_summary()

print(f"Total tests: {summary['total_tests']}")
print(f"Average execution time: {summary['average_execution_time']:.2f}s")
print(f"Average memory usage: {summary['average_memory_usage']:.2f}MB")
print(f"Total database queries: {summary['total_database_queries']}")
print(f"Slow tests: {len(summary['slow_tests'])}")

# Identify performance issues
for slow_test in summary['slow_tests']:
    print(f"⚠️  Slow test: {slow_test['name']} ({slow_test['time']:.2f}s)")

for memory_test in summary['memory_intensive_tests']:
    print(f"⚠️  Memory intensive: {memory_test['name']} ({memory_test['memory']:.2f}MB)")

# Export detailed metrics
monitor.export_metrics("performance-report.json")
```

### Performance Thresholds and Validation

```python
class PerformanceThresholds:
    max_execution_time: float = 5.0        # Maximum test execution time
    max_memory_usage: float = 100.0        # Maximum memory usage (MB)
    max_database_queries: int = 50         # Maximum database queries per test
    max_api_calls: int = 10               # Maximum API calls per test
    memory_leak_threshold: float = 10.0    # Memory leak detection threshold

# Automatic threshold validation
def _check_thresholds(self, metrics: TestPerformanceMetrics):
    if metrics.execution_time > self.thresholds.max_execution_time:
        warning = f"Slow test: {metrics.test_name} took {metrics.execution_time:.2f}s"
        metrics.warnings.append(warning)
        logger.warning(warning)
    
    if metrics.memory_usage > self.thresholds.max_memory_usage:
        warning = f"High memory usage: {metrics.test_name} used {metrics.memory_usage:.2f}MB"
        metrics.warnings.append(warning)
        logger.warning(warning)
```

### Database Performance Monitoring

```python
# Database query performance tracking
class DatabasePerformanceMonitor:
    def __init__(self):
        self.query_metrics = []
        self.slow_query_threshold = 1.0  # seconds
    
    async def track_query(self, query: str, params: dict, execution_time: float):
        metric = {
            "query": query,
            "params": params,
            "execution_time": execution_time,
            "timestamp": datetime.utcnow(),
            "is_slow": execution_time > self.slow_query_threshold
        }
        
        self.query_metrics.append(metric)
        
        if metric["is_slow"]:
            logger.warning(f"Slow query detected: {execution_time:.2f}s - {query}")
    
    def get_slow_queries(self) -> List[Dict[str, Any]]:
        return [m for m in self.query_metrics if m["is_slow"]]
    
    def get_query_statistics(self) -> Dict[str, Any]:
        if not self.query_metrics:
            return {"total_queries": 0, "average_time": 0, "slow_queries": 0}
        
        total_time = sum(m["execution_time"] for m in self.query_metrics)
        slow_queries = len(self.get_slow_queries())
        
        return {
            "total_queries": len(self.query_metrics),
            "average_time": total_time / len(self.query_metrics),
            "slow_queries": slow_queries,
            "slow_query_percentage": (slow_queries / len(self.query_metrics)) * 100
        }
```

## Frontend Performance Monitoring

### React Component Performance

**Location**: `src/lib/testing/performance-monitor.ts`

Frontend performance monitoring tracks component render times, memory usage, and user interaction performance.

#### Core Components

```typescript
interface ComponentPerformanceMetrics {
  componentName: string;
  renderTime: number;           // Component render time (ms)
  memoryUsage: number;         // Memory usage (MB)
  reRenderCount: number;       // Number of re-renders
  interactionTime: number;     // User interaction response time
  bundleSize?: number;         // Component bundle size
  warnings: string[];          // Performance warnings
}

class FrontendPerformanceMonitor {
  private metrics: ComponentPerformanceMetrics[] = [];
  private thresholds = {
    maxRenderTime: 100,        // ms
    maxMemoryUsage: 50,        // MB
    maxReRenderCount: 5,
    maxInteractionTime: 200    // ms
  };

  startMonitoring(componentName: string): string {
    const monitorId = `monitor_${Date.now()}_${Math.random()}`;
    
    // Start performance measurement
    performance.mark(`${monitorId}_start`);
    
    return monitorId;
  }

  stopMonitoring(monitorId: string, componentName: string): ComponentPerformanceMetrics {
    // End performance measurement
    performance.mark(`${monitorId}_end`);
    performance.measure(
      `${monitorId}_duration`,
      `${monitorId}_start`,
      `${monitorId}_end`
    );

    const measure = performance.getEntriesByName(`${monitorId}_duration`)[0];
    const renderTime = measure.duration;

    const metrics: ComponentPerformanceMetrics = {
      componentName,
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      reRenderCount: this.getReRenderCount(componentName),
      interactionTime: 0,
      warnings: []
    };

    this.checkThresholds(metrics);
    this.metrics.push(metrics);

    return metrics;
  }

  private checkThresholds(metrics: ComponentPerformanceMetrics): void {
    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      metrics.warnings.push(
        `Slow render: ${metrics.renderTime.toFixed(2)}ms > ${this.thresholds.maxRenderTime}ms`
      );
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      metrics.warnings.push(
        `High memory usage: ${metrics.memoryUsage.toFixed(2)}MB > ${this.thresholds.maxMemoryUsage}MB`
      );
    }

    if (metrics.reRenderCount > this.thresholds.maxReRenderCount) {
      metrics.warnings.push(
        `Excessive re-renders: ${metrics.reRenderCount} > ${this.thresholds.maxReRenderCount}`
      );
    }
  }
}
```

#### React Hook for Performance Monitoring

```typescript
// Custom hook for component performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const [metrics, setMetrics] = useState<ComponentPerformanceMetrics | null>(null);
  const monitorRef = useRef<string | null>(null);

  useEffect(() => {
    // Start monitoring on mount
    monitorRef.current = performanceMonitor.startMonitoring(componentName);

    return () => {
      // Stop monitoring on unmount
      if (monitorRef.current) {
        const finalMetrics = performanceMonitor.stopMonitoring(
          monitorRef.current,
          componentName
        );
        setMetrics(finalMetrics);
      }
    };
  }, [componentName]);

  const recordInteraction = useCallback((interactionName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      performanceMonitor.recordInteraction(componentName, interactionName, interactionTime);
    };
  }, [componentName]);

  return {
    metrics,
    recordInteraction
  };
}

// Usage in components
function MyComponent() {
  const { metrics, recordInteraction } = usePerformanceMonitoring('MyComponent');

  const handleClick = () => {
    const endInteraction = recordInteraction('button_click');
    
    // Perform action
    performAction();
    
    endInteraction();
  };

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      {process.env.NODE_ENV === 'development' && metrics && (
        <div>Render time: {metrics.renderTime.toFixed(2)}ms</div>
      )}
    </div>
  );
}
```

### Bundle Size and Loading Performance

```typescript
// Bundle size monitoring
class BundleSizeMonitor {
  private bundleMetrics: Map<string, number> = new Map();

  recordBundleSize(chunkName: string, size: number): void {
    this.bundleMetrics.set(chunkName, size);
    
    if (size > 1024 * 1024) { // 1MB threshold
      console.warn(`Large bundle detected: ${chunkName} (${(size / 1024 / 1024).toFixed(2)}MB)`);
    }
  }

  getBundleReport(): Record<string, any> {
    const totalSize = Array.from(this.bundleMetrics.values()).reduce((sum, size) => sum + size, 0);
    const largeChunks = Array.from(this.bundleMetrics.entries())
      .filter(([_, size]) => size > 500 * 1024) // 500KB threshold
      .map(([name, size]) => ({ name, size: (size / 1024).toFixed(2) + 'KB' }));

    return {
      totalSize: (totalSize / 1024 / 1024).toFixed(2) + 'MB',
      chunkCount: this.bundleMetrics.size,
      largeChunks
    };
  }
}

// Loading performance monitoring
class LoadingPerformanceMonitor {
  recordPageLoad(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
        largestContentfulPaint: this.getLargestContentfulPaint()
      };

      console.log('Page Load Metrics:', metrics);
      
      // Send to analytics
      this.sendToAnalytics(metrics);
    }
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }
}
```

## System Performance Monitoring

### Real-time Performance Metrics

```python
# System-wide performance monitoring
class SystemPerformanceMonitor:
    def __init__(self):
        self.metrics_history = []
        self.alert_thresholds = {
            'cpu_usage': 80.0,      # %
            'memory_usage': 85.0,   # %
            'disk_usage': 90.0,     # %
            'response_time': 2.0    # seconds
        }
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        import psutil
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_available = memory.available / (1024 ** 3)  # GB
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_free = disk.free / (1024 ** 3)  # GB
        
        # Network metrics
        network = psutil.net_io_counters()
        
        metrics = {
            'timestamp': datetime.utcnow(),
            'cpu': {
                'usage_percent': cpu_percent,
                'count': cpu_count
            },
            'memory': {
                'usage_percent': memory_percent,
                'available_gb': memory_available,
                'total_gb': memory.total / (1024 ** 3)
            },
            'disk': {
                'usage_percent': disk_percent,
                'free_gb': disk_free,
                'total_gb': disk.total / (1024 ** 3)
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv
            }
        }
        
        self.metrics_history.append(metrics)
        self.check_alert_thresholds(metrics)
        
        return metrics
    
    def check_alert_thresholds(self, metrics: Dict[str, Any]):
        alerts = []
        
        if metrics['cpu']['usage_percent'] > self.alert_thresholds['cpu_usage']:
            alerts.append(f"High CPU usage: {metrics['cpu']['usage_percent']:.1f}%")
        
        if metrics['memory']['usage_percent'] > self.alert_thresholds['memory_usage']:
            alerts.append(f"High memory usage: {metrics['memory']['usage_percent']:.1f}%")
        
        if metrics['disk']['usage_percent'] > self.alert_thresholds['disk_usage']:
            alerts.append(f"High disk usage: {metrics['disk']['usage_percent']:.1f}%")
        
        if alerts:
            logger.warning(f"System performance alerts: {', '.join(alerts)}")
            # Send alerts to monitoring system
            self.send_alerts(alerts)
```

### Application Performance Metrics

```python
# Application-specific performance monitoring
class ApplicationPerformanceMonitor:
    def __init__(self):
        self.request_metrics = []
        self.endpoint_stats = {}
    
    async def track_request(
        self,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int,
        user_id: Optional[str] = None
    ):
        metric = {
            'endpoint': endpoint,
            'method': method,
            'response_time': response_time,
            'status_code': status_code,
            'user_id': user_id,
            'timestamp': datetime.utcnow()
        }
        
        self.request_metrics.append(metric)
        self.update_endpoint_stats(endpoint, response_time, status_code)
        
        # Alert on slow requests
        if response_time > 5.0:
            logger.warning(f"Slow request: {method} {endpoint} took {response_time:.2f}s")
    
    def update_endpoint_stats(self, endpoint: str, response_time: float, status_code: int):
        if endpoint not in self.endpoint_stats:
            self.endpoint_stats[endpoint] = {
                'total_requests': 0,
                'total_response_time': 0.0,
                'error_count': 0,
                'min_response_time': float('inf'),
                'max_response_time': 0.0
            }
        
        stats = self.endpoint_stats[endpoint]
        stats['total_requests'] += 1
        stats['total_response_time'] += response_time
        stats['min_response_time'] = min(stats['min_response_time'], response_time)
        stats['max_response_time'] = max(stats['max_response_time'], response_time)
        
        if status_code >= 400:
            stats['error_count'] += 1
    
    def get_endpoint_performance_report(self) -> Dict[str, Any]:
        report = {}
        
        for endpoint, stats in self.endpoint_stats.items():
            avg_response_time = stats['total_response_time'] / stats['total_requests']
            error_rate = (stats['error_count'] / stats['total_requests']) * 100
            
            report[endpoint] = {
                'total_requests': stats['total_requests'],
                'average_response_time': round(avg_response_time, 3),
                'min_response_time': round(stats['min_response_time'], 3),
                'max_response_time': round(stats['max_response_time'], 3),
                'error_rate': round(error_rate, 2),
                'error_count': stats['error_count']
            }
        
        return report
```

## Performance Testing Integration

### Pytest Performance Fixtures

```python
# pytest fixtures for performance testing
import pytest
from backend.testing.performance_monitor import get_performance_monitor

@pytest.fixture(scope="session")
def performance_monitor():
    monitor = get_performance_monitor()
    yield monitor
    
    # Generate performance report at end of session
    summary = monitor.get_performance_summary()
    
    # Fail if performance thresholds exceeded
    if summary['warnings']:
        pytest.fail(f"Performance issues detected: {summary['warnings']}")

@pytest.fixture
def monitor_test_performance(request, performance_monitor):
    test_name = request.node.name
    
    with performance_monitor.monitor_test(test_name) as monitor_id:
        yield monitor_id

# Usage in tests
async def test_database_operations(monitor_test_performance):
    monitor_id = monitor_test_performance
    
    # Perform database operations
    async with isolation.isolated_session() as session:
        # This will be automatically tracked
        users = await session.execute(select(User))
        
        # Manually record specific operations
        performance_monitor = get_performance_monitor()
        performance_monitor.record_database_query(monitor_id, {
            "query": "Complex query with joins",
            "execution_time": 0.5
        })
```

### Continuous Performance Monitoring

```python
# CI/CD integration for performance monitoring
class ContinuousPerformanceMonitor:
    def __init__(self, baseline_file: str = "performance_baseline.json"):
        self.baseline_file = baseline_file
        self.baseline_metrics = self.load_baseline()
    
    def load_baseline(self) -> Dict[str, Any]:
        try:
            with open(self.baseline_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def save_baseline(self, metrics: Dict[str, Any]):
        with open(self.baseline_file, 'w') as f:
            json.dump(metrics, f, indent=2)
    
    def compare_with_baseline(self, current_metrics: Dict[str, Any]) -> Dict[str, Any]:
        comparison = {
            'regressions': [],
            'improvements': [],
            'new_tests': []
        }
        
        for test_name, current in current_metrics.items():
            if test_name not in self.baseline_metrics:
                comparison['new_tests'].append(test_name)
                continue
            
            baseline = self.baseline_metrics[test_name]
            
            # Check for performance regressions (>10% slower)
            if current['execution_time'] > baseline['execution_time'] * 1.1:
                comparison['regressions'].append({
                    'test': test_name,
                    'baseline': baseline['execution_time'],
                    'current': current['execution_time'],
                    'regression': ((current['execution_time'] / baseline['execution_time']) - 1) * 100
                })
            
            # Check for improvements (>10% faster)
            elif current['execution_time'] < baseline['execution_time'] * 0.9:
                comparison['improvements'].append({
                    'test': test_name,
                    'baseline': baseline['execution_time'],
                    'current': current['execution_time'],
                    'improvement': ((baseline['execution_time'] / current['execution_time']) - 1) * 100
                })
        
        return comparison
    
    def generate_performance_report(self, metrics: Dict[str, Any]) -> str:
        comparison = self.compare_with_baseline(metrics)
        
        report = ["# Performance Report\n"]
        
        if comparison['regressions']:
            report.append("## ⚠️ Performance Regressions")
            for reg in comparison['regressions']:
                report.append(f"- **{reg['test']}**: {reg['regression']:.1f}% slower "
                            f"({reg['baseline']:.2f}s → {reg['current']:.2f}s)")
            report.append("")
        
        if comparison['improvements']:
            report.append("## ✅ Performance Improvements")
            for imp in comparison['improvements']:
                report.append(f"- **{imp['test']}**: {imp['improvement']:.1f}% faster "
                            f"({imp['baseline']:.2f}s → {imp['current']:.2f}s)")
            report.append("")
        
        if comparison['new_tests']:
            report.append("## 🆕 New Tests")
            for test in comparison['new_tests']:
                report.append(f"- {test}: {metrics[test]['execution_time']:.2f}s")
        
        return "\n".join(report)
```

## Performance Optimization Strategies

### Database Query Optimization

```python
# Query performance optimization
class QueryOptimizer:
    def __init__(self):
        self.query_cache = {}
        self.slow_queries = []
    
    async def optimize_query(self, query: str, params: dict) -> str:
        # Analyze query for optimization opportunities
        optimizations = []
        
        # Check for missing indexes
        if "WHERE" in query.upper() and "INDEX" not in query.upper():
            optimizations.append("Consider adding index on WHERE clause columns")
        
        # Check for N+1 queries
        if "SELECT" in query.upper() and "IN (" in query.upper():
            optimizations.append("Potential N+1 query - consider using JOIN")
        
        # Check for unnecessary columns
        if "SELECT *" in query.upper():
            optimizations.append("Avoid SELECT * - specify only needed columns")
        
        if optimizations:
            logger.info(f"Query optimization suggestions: {optimizations}")
        
        return query
    
    def cache_query_result(self, query: str, params: dict, result: Any, ttl: int = 300):
        cache_key = self.generate_cache_key(query, params)
        self.query_cache[cache_key] = {
            'result': result,
            'expires_at': datetime.utcnow() + timedelta(seconds=ttl)
        }
    
    def get_cached_result(self, query: str, params: dict) -> Optional[Any]:
        cache_key = self.generate_cache_key(query, params)
        cached = self.query_cache.get(cache_key)
        
        if cached and cached['expires_at'] > datetime.utcnow():
            return cached['result']
        
        return None
```

### Frontend Performance Optimization

```typescript
// React performance optimization utilities
class ReactPerformanceOptimizer {
  // Memoization helpers
  static memoizeComponent<T extends React.ComponentType<any>>(
    Component: T,
    areEqual?: (prevProps: any, nextProps: any) => boolean
  ): T {
    return React.memo(Component, areEqual) as T;
  }

  // Bundle splitting helpers
  static lazyLoadComponent<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>
  ): React.LazyExoticComponent<T> {
    return React.lazy(importFunc);
  }

  // Performance monitoring for components
  static withPerformanceMonitoring<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
  ): React.ComponentType<P> {
    return (props: P) => {
      const { metrics, recordInteraction } = usePerformanceMonitoring(componentName);

      useEffect(() => {
        if (metrics && metrics.warnings.length > 0) {
          console.warn(`Performance issues in ${componentName}:`, metrics.warnings);
        }
      }, [metrics]);

      return <Component {...props} />;
    };
  }

  // Virtual scrolling for large lists
  static createVirtualizedList<T>(
    items: T[],
    renderItem: (item: T, index: number) => React.ReactNode,
    itemHeight: number = 50
  ): React.ComponentType<{ height: number }> {
    return ({ height }) => {
      const [scrollTop, setScrollTop] = useState(0);
      
      const visibleStart = Math.floor(scrollTop / itemHeight);
      const visibleEnd = Math.min(
        visibleStart + Math.ceil(height / itemHeight) + 1,
        items.length
      );

      const visibleItems = items.slice(visibleStart, visibleEnd);

      return (
        <div
          style={{ height, overflow: 'auto' }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <div style={{ height: items.length * itemHeight, position: 'relative' }}>
            {visibleItems.map((item, index) => (
              <div
                key={visibleStart + index}
                style={{
                  position: 'absolute',
                  top: (visibleStart + index) * itemHeight,
                  height: itemHeight,
                  width: '100%'
                }}
              >
                {renderItem(item, visibleStart + index)}
              </div>
            ))}
          </div>
        </div>
      );
    };
  }
}
```

## Performance Dashboards and Reporting

### Performance Dashboard

```typescript
// Performance dashboard component
interface PerformanceDashboardProps {
  metrics: PerformanceMetrics[];
  timeRange: 'hour' | 'day' | 'week' | 'month';
}

export function PerformanceDashboard({ metrics, timeRange }: PerformanceDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('response_time');
  
  const aggregatedMetrics = useMemo(() => {
    return aggregateMetricsByTimeRange(metrics, timeRange);
  }, [metrics, timeRange]);

  const chartData = useMemo(() => {
    return aggregatedMetrics.map(metric => ({
      timestamp: metric.timestamp,
      value: metric[selectedMetric],
      threshold: getThresholdForMetric(selectedMetric)
    }));
  }, [aggregatedMetrics, selectedMetric]);

  return (
    <div className="performance-dashboard">
      <div className="metrics-summary">
        <MetricCard
          title="Average Response Time"
          value={`${calculateAverage(metrics, 'response_time').toFixed(2)}ms`}
          trend={calculateTrend(metrics, 'response_time')}
        />
        <MetricCard
          title="Memory Usage"
          value={`${calculateAverage(metrics, 'memory_usage').toFixed(1)}MB`}
          trend={calculateTrend(metrics, 'memory_usage')}
        />
        <MetricCard
          title="Error Rate"
          value={`${calculateErrorRate(metrics).toFixed(2)}%`}
          trend={calculateTrend(metrics, 'error_rate')}
        />
      </div>

      <div className="performance-chart">
        <PerformanceChart
          data={chartData}
          metric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
      </div>

      <div className="performance-alerts">
        <PerformanceAlerts metrics={metrics} />
      </div>
    </div>
  );
}
```

### Automated Performance Reports

```python
# Automated performance reporting
class PerformanceReporter:
    def __init__(self, email_service, slack_service=None):
        self.email_service = email_service
        self.slack_service = slack_service
    
    async def generate_daily_report(self):
        # Collect performance data from last 24 hours
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=1)
        
        metrics = await self.collect_metrics(start_time, end_time)
        
        # Generate report
        report = self.create_performance_report(metrics)
        
        # Send via email
        await self.email_service.send_email(
            to=["dev-team@company.com"],
            subject="Daily Performance Report",
            body=report,
            html=True
        )
        
        # Send critical alerts to Slack
        critical_issues = self.identify_critical_issues(metrics)
        if critical_issues:
            await self.slack_service.send_message(
                channel="#alerts",
                message=f"🚨 Critical performance issues detected:\n{critical_issues}"
            )
    
    def create_performance_report(self, metrics: Dict[str, Any]) -> str:
        template = """
        <h1>Performance Report</h1>
        
        <h2>Summary</h2>
        <ul>
            <li>Total Tests: {total_tests}</li>
            <li>Average Execution Time: {avg_execution_time:.2f}s</li>
            <li>Memory Usage: {avg_memory_usage:.2f}MB</li>
            <li>Slow Tests: {slow_tests_count}</li>
        </ul>
        
        <h2>Performance Trends</h2>
        <p>Compared to previous day:</p>
        <ul>
            <li>Execution Time: {execution_time_trend}</li>
            <li>Memory Usage: {memory_usage_trend}</li>
            <li>Error Rate: {error_rate_trend}</li>
        </ul>
        
        <h2>Top Issues</h2>
        {top_issues}
        
        <h2>Recommendations</h2>
        {recommendations}
        """
        
        return template.format(**metrics)
```

This comprehensive performance monitoring system provides detailed insights into test execution, system performance, and application behavior, enabling proactive optimization and issue resolution across the Medical Device Regulatory Assistant application.