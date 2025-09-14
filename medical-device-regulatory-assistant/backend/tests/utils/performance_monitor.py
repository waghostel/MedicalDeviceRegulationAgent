"""
Performance Monitoring Utilities for Test Infrastructure

This module provides utilities for monitoring and optimizing test performance,
including execution time tracking, resource usage monitoring, and performance
regression detection.
"""

import asyncio
import functools
import gc
import psutil
import time
import tracemalloc
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path
import json


@dataclass
class PerformanceMetrics:
    """Container for performance metrics"""
    test_name: str
    execution_time: float
    memory_usage: float
    peak_memory: float
    cpu_usage: float
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "test_name": self.test_name,
            "execution_time": self.execution_time,
            "memory_usage": self.memory_usage,
            "peak_memory": self.peak_memory,
            "cpu_usage": self.cpu_usage,
            "timestamp": self.timestamp.isoformat()
        }


class PerformanceMonitor:
    """Monitor and track test performance metrics"""
    
    def __init__(self, metrics_file: Optional[str] = None):
        self.metrics_file = metrics_file or "tests/performance_metrics.json"
        self.current_metrics: List[PerformanceMetrics] = []
        self.process = psutil.Process()
        
    def start_monitoring(self):
        """Start performance monitoring"""
        tracemalloc.start()
        gc.collect()  # Clean up before monitoring
        
    def stop_monitoring(self):
        """Stop performance monitoring"""
        if tracemalloc.is_tracing():
            tracemalloc.stop()
    
    @asynccontextmanager
    async def monitor_test(self, test_name: str):
        """Context manager for monitoring individual test performance"""
        # Start monitoring
        start_time = time.time()
        start_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        start_cpu = self.process.cpu_percent()
        
        # Start memory tracing if not already started
        if not tracemalloc.is_tracing():
            tracemalloc.start()
        
        peak_memory = start_memory
        
        try:
            yield
        finally:
            # Calculate metrics
            end_time = time.time()
            end_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            end_cpu = self.process.cpu_percent()
            
            # Get peak memory if tracing
            if tracemalloc.is_tracing():
                current, peak = tracemalloc.get_traced_memory()
                peak_memory = max(peak_memory, peak / 1024 / 1024)  # MB
            
            # Create metrics
            metrics = PerformanceMetrics(
                test_name=test_name,
                execution_time=end_time - start_time,
                memory_usage=end_memory,
                peak_memory=peak_memory,
                cpu_usage=max(start_cpu, end_cpu)
            )
            
            self.current_metrics.append(metrics)
    
    def performance_test(self, test_name: Optional[str] = None):
        """Decorator for monitoring test performance"""
        def decorator(func: Callable):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                name = test_name or f"{func.__module__}.{func.__name__}"
                async with self.monitor_test(name):
                    return await func(*args, **kwargs)
            
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                name = test_name or f"{func.__module__}.{func.__name__}"
                # For sync functions, we need to handle the context manager differently
                start_time = time.time()
                start_memory = self.process.memory_info().rss / 1024 / 1024
                
                try:
                    result = func(*args, **kwargs)
                finally:
                    end_time = time.time()
                    end_memory = self.process.memory_info().rss / 1024 / 1024
                    
                    metrics = PerformanceMetrics(
                        test_name=name,
                        execution_time=end_time - start_time,
                        memory_usage=end_memory,
                        peak_memory=end_memory,
                        cpu_usage=self.process.cpu_percent()
                    )
                    self.current_metrics.append(metrics)
                
                return result
            
            # Return appropriate wrapper based on function type
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    def save_metrics(self, append: bool = True):
        """Save performance metrics to file"""
        metrics_path = Path(self.metrics_file)
        metrics_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert metrics to dictionaries
        metrics_data = [m.to_dict() for m in self.current_metrics]
        
        if append and metrics_path.exists():
            # Load existing metrics
            try:
                with open(metrics_path, 'r') as f:
                    existing_data = json.load(f)
                if isinstance(existing_data, list):
                    metrics_data = existing_data + metrics_data
            except (json.JSONDecodeError, FileNotFoundError):
                pass  # Start fresh if file is corrupted or missing
        
        # Save metrics
        with open(metrics_path, 'w') as f:
            json.dump(metrics_data, f, indent=2)
    
    def load_metrics(self) -> List[PerformanceMetrics]:
        """Load performance metrics from file"""
        metrics_path = Path(self.metrics_file)
        if not metrics_path.exists():
            return []
        
        try:
            with open(metrics_path, 'r') as f:
                data = json.load(f)
            
            metrics = []
            for item in data:
                metrics.append(PerformanceMetrics(
                    test_name=item["test_name"],
                    execution_time=item["execution_time"],
                    memory_usage=item["memory_usage"],
                    peak_memory=item["peak_memory"],
                    cpu_usage=item["cpu_usage"],
                    timestamp=datetime.fromisoformat(item["timestamp"])
                ))
            
            return metrics
        
        except (json.JSONDecodeError, KeyError, ValueError):
            return []
    
    def analyze_performance(self, days: int = 7) -> Dict[str, Any]:
        """Analyze performance trends over specified days"""
        metrics = self.load_metrics()
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Filter recent metrics
        recent_metrics = [m for m in metrics if m.timestamp >= cutoff_date]
        
        if not recent_metrics:
            return {"error": "No recent metrics available"}
        
        # Group by test name
        test_groups = {}
        for metric in recent_metrics:
            if metric.test_name not in test_groups:
                test_groups[metric.test_name] = []
            test_groups[metric.test_name].append(metric)
        
        # Analyze each test
        analysis = {
            "period_days": days,
            "total_tests": len(recent_metrics),
            "unique_tests": len(test_groups),
            "test_analysis": {},
            "overall_trends": {},
            "recommendations": []
        }
        
        all_times = [m.execution_time for m in recent_metrics]
        all_memory = [m.memory_usage for m in recent_metrics]
        
        analysis["overall_trends"] = {
            "avg_execution_time": sum(all_times) / len(all_times),
            "max_execution_time": max(all_times),
            "avg_memory_usage": sum(all_memory) / len(all_memory),
            "max_memory_usage": max(all_memory)
        }
        
        # Analyze individual tests
        for test_name, test_metrics in test_groups.items():
            times = [m.execution_time for m in test_metrics]
            memories = [m.memory_usage for m in test_metrics]
            
            test_analysis = {
                "runs": len(test_metrics),
                "avg_time": sum(times) / len(times),
                "max_time": max(times),
                "min_time": min(times),
                "avg_memory": sum(memories) / len(memories),
                "max_memory": max(memories),
                "trend": "stable"
            }
            
            # Detect trends (simple linear trend)
            if len(times) >= 3:
                recent_avg = sum(times[-3:]) / 3
                older_avg = sum(times[:-3]) / len(times[:-3]) if len(times) > 3 else recent_avg
                
                if recent_avg > older_avg * 1.2:
                    test_analysis["trend"] = "degrading"
                elif recent_avg < older_avg * 0.8:
                    test_analysis["trend"] = "improving"
            
            analysis["test_analysis"][test_name] = test_analysis
        
        # Generate recommendations
        slow_tests = [
            name for name, data in analysis["test_analysis"].items()
            if data["avg_time"] > 5.0  # Tests taking more than 5 seconds
        ]
        
        memory_heavy_tests = [
            name for name, data in analysis["test_analysis"].items()
            if data["avg_memory"] > 100  # Tests using more than 100MB
        ]
        
        degrading_tests = [
            name for name, data in analysis["test_analysis"].items()
            if data["trend"] == "degrading"
        ]
        
        if slow_tests:
            analysis["recommendations"].append(f"Optimize slow tests: {', '.join(slow_tests[:3])}")
        
        if memory_heavy_tests:
            analysis["recommendations"].append(f"Review memory usage in: {', '.join(memory_heavy_tests[:3])}")
        
        if degrading_tests:
            analysis["recommendations"].append(f"Investigate performance degradation in: {', '.join(degrading_tests[:3])}")
        
        if analysis["overall_trends"]["avg_execution_time"] > 2.0:
            analysis["recommendations"].append("Consider parallelizing tests or optimizing fixtures")
        
        return analysis
    
    def generate_performance_report(self) -> str:
        """Generate a formatted performance report"""
        analysis = self.analyze_performance(days=30)  # 30-day analysis
        
        if "error" in analysis:
            return f"Performance Report Error: {analysis['error']}"
        
        report = f"""# Test Performance Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Analysis Period: {analysis['period_days']} days

## Overall Statistics
- Total Test Runs: {analysis['total_tests']}
- Unique Tests: {analysis['unique_tests']}
- Average Execution Time: {analysis['overall_trends']['avg_execution_time']:.2f}s
- Maximum Execution Time: {analysis['overall_trends']['max_execution_time']:.2f}s
- Average Memory Usage: {analysis['overall_trends']['avg_memory_usage']:.2f} MB
- Maximum Memory Usage: {analysis['overall_trends']['max_memory_usage']:.2f} MB

## Test Performance Analysis

### Top 5 Slowest Tests
"""
        
        # Sort tests by average time
        sorted_tests = sorted(
            analysis['test_analysis'].items(),
            key=lambda x: x[1]['avg_time'],
            reverse=True
        )
        
        for i, (test_name, data) in enumerate(sorted_tests[:5], 1):
            trend_icon = {"stable": "→", "improving": "↗", "degrading": "↘"}[data["trend"]]
            report += f"{i}. {test_name}: {data['avg_time']:.2f}s {trend_icon}\n"
        
        report += "\n### Memory Usage Leaders\n"
        
        # Sort tests by memory usage
        sorted_memory = sorted(
            analysis['test_analysis'].items(),
            key=lambda x: x[1]['avg_memory'],
            reverse=True
        )
        
        for i, (test_name, data) in enumerate(sorted_memory[:5], 1):
            report += f"{i}. {test_name}: {data['avg_memory']:.2f} MB\n"
        
        if analysis['recommendations']:
            report += "\n## Recommendations\n"
            for i, rec in enumerate(analysis['recommendations'], 1):
                report += f"{i}. {rec}\n"
        
        report += f"""
## Performance Targets
- Target execution time per test: < 2.0s
- Target memory usage per test: < 50 MB
- Target full suite time: < 60s

## Next Steps
1. Review and optimize identified slow tests
2. Monitor memory usage trends
3. Consider test parallelization for large suites
4. Regular performance regression testing
"""
        
        return report
    
    def clear_metrics(self):
        """Clear current metrics"""
        self.current_metrics.clear()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of current metrics"""
        if not self.current_metrics:
            return {"error": "No metrics available"}
        
        times = [m.execution_time for m in self.current_metrics]
        memories = [m.memory_usage for m in self.current_metrics]
        
        return {
            "total_tests": len(self.current_metrics),
            "total_time": sum(times),
            "avg_time": sum(times) / len(times),
            "max_time": max(times),
            "avg_memory": sum(memories) / len(memories),
            "max_memory": max(memories),
            "tests": [m.test_name for m in self.current_metrics]
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


# Convenience decorators
def monitor_performance(test_name: Optional[str] = None):
    """Decorator to monitor test performance"""
    return performance_monitor.performance_test(test_name)


@asynccontextmanager
async def monitor_test_execution(test_name: str):
    """Context manager for monitoring test execution"""
    async with performance_monitor.monitor_test(test_name):
        yield


# Pytest plugin integration
def pytest_runtest_setup(item):
    """Pytest hook to start monitoring before each test"""
    performance_monitor.start_monitoring()


def pytest_runtest_teardown(item, nextitem):
    """Pytest hook to record metrics after each test"""
    test_name = f"{item.module.__name__}::{item.name}"
    
    # Create a simple metric for the test that just ran
    # This is a basic implementation - more sophisticated tracking
    # would require integration with pytest's timing mechanisms
    pass


def pytest_sessionfinish(session, exitstatus):
    """Pytest hook to save metrics at the end of test session"""
    if performance_monitor.current_metrics:
        performance_monitor.save_metrics()
        
        # Print summary
        summary = performance_monitor.get_summary()
        if "error" not in summary:
            print(f"\n📊 Performance Summary:")
            print(f"   Total Tests: {summary['total_tests']}")
            print(f"   Total Time: {summary['total_time']:.2f}s")
            print(f"   Average Time: {summary['avg_time']:.2f}s")
            print(f"   Max Time: {summary['max_time']:.2f}s")
            print(f"   Average Memory: {summary['avg_memory']:.2f} MB")