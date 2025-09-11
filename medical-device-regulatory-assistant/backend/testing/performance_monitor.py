"""
Test Performance Monitor

This module provides comprehensive performance monitoring for test execution,
including execution time tracking, memory usage monitoring, and database query counting.
"""

import asyncio
import time
import uuid
import psutil
import threading
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class TestPerformanceMetrics:
    """Performance metrics for a single test execution"""
    test_name: str
    execution_time: float
    memory_usage: float  # MB
    peak_memory_usage: float  # MB
    database_queries: int
    api_calls: int
    start_time: datetime
    end_time: datetime
    warnings: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceThresholds:
    """Performance thresholds for test validation"""
    max_execution_time: float = 5.0  # seconds
    max_memory_usage: float = 100.0  # MB
    max_database_queries: int = 50
    max_api_calls: int = 10
    memory_leak_threshold: float = 10.0  # MB


class TestPerformanceMonitor:
    """
    Monitor test performance including execution time, memory usage,
    and resource consumption with threshold validation.
    """
    
    def __init__(self, thresholds: Optional[PerformanceThresholds] = None):
        self.thresholds = thresholds or PerformanceThresholds()
        self.active_monitors: Dict[str, Dict[str, Any]] = {}
        self.performance_history: List[TestPerformanceMetrics] = []
        self._lock = threading.Lock()
        self._process = psutil.Process()
        
    def start_monitoring(self, test_name: str) -> str:
        """
        Start monitoring a test execution
        
        Args:
            test_name: Name of the test being monitored
            
        Returns:
            Monitor ID for tracking this test
        """
        monitor_id = str(uuid.uuid4())
        
        with self._lock:
            self.active_monitors[monitor_id] = {
                'test_name': test_name,
                'start_time': datetime.utcnow(),
                'start_wall_time': time.time(),
                'start_memory': self._get_memory_usage(),
                'peak_memory': self._get_memory_usage(),
                'database_queries': 0,
                'api_calls': 0,
                'warnings': []
            }
        
        logger.debug(f"Started monitoring test: {test_name} (ID: {monitor_id})")
        return monitor_id
    
    def stop_monitoring(self, monitor_id: str) -> TestPerformanceMetrics:
        """
        Stop monitoring and return performance metrics
        
        Args:
            monitor_id: Monitor ID returned from start_monitoring
            
        Returns:
            Performance metrics for the test
        """
        with self._lock:
            if monitor_id not in self.active_monitors:
                raise ValueError(f"Monitor ID {monitor_id} not found")
            
            monitor_data = self.active_monitors.pop(monitor_id)
        
        end_time = datetime.utcnow()
        end_wall_time = time.time()
        end_memory = self._get_memory_usage()
        
        execution_time = end_wall_time - monitor_data['start_wall_time']
        memory_usage = end_memory - monitor_data['start_memory']
        
        metrics = TestPerformanceMetrics(
            test_name=monitor_data['test_name'],
            execution_time=execution_time,
            memory_usage=memory_usage,
            peak_memory_usage=monitor_data['peak_memory'] - monitor_data['start_memory'],
            database_queries=monitor_data['database_queries'],
            api_calls=monitor_data['api_calls'],
            start_time=monitor_data['start_time'],
            end_time=end_time,
            warnings=monitor_data['warnings'],
            context={}
        )
        
        # Check thresholds and add warnings
        self._check_thresholds(metrics)
        
        # Store in history
        self.performance_history.append(metrics)
        
        logger.info(f"Test performance: {metrics.test_name} - "
                   f"{execution_time:.2f}s, {memory_usage:.2f}MB")
        
        return metrics
    
    @contextmanager
    def monitor_test(self, test_name: str):
        """
        Context manager for monitoring test performance
        
        Args:
            test_name: Name of the test being monitored
            
        Yields:
            Monitor ID for tracking database queries and API calls
        """
        monitor_id = self.start_monitoring(test_name)
        try:
            yield monitor_id
        finally:
            metrics = self.stop_monitoring(monitor_id)
            self._log_performance_summary(metrics)
    
    @asynccontextmanager
    async def monitor_async_test(self, test_name: str) -> AsyncGenerator[str, None]:
        """
        Async context manager for monitoring test performance
        
        Args:
            test_name: Name of the test being monitored
            
        Yields:
            Monitor ID for tracking database queries and API calls
        """
        monitor_id = self.start_monitoring(test_name)
        try:
            yield monitor_id
        finally:
            metrics = self.stop_monitoring(monitor_id)
            self._log_performance_summary(metrics)
    
    def record_database_query(self, monitor_id: str, query_info: Optional[Dict[str, Any]] = None):
        """
        Record a database query for the monitored test
        
        Args:
            monitor_id: Monitor ID from start_monitoring
            query_info: Optional information about the query
        """
        with self._lock:
            if monitor_id in self.active_monitors:
                self.active_monitors[monitor_id]['database_queries'] += 1
                
                # Update peak memory if needed
                current_memory = self._get_memory_usage()
                if current_memory > self.active_monitors[monitor_id]['peak_memory']:
                    self.active_monitors[monitor_id]['peak_memory'] = current_memory
    
    def record_api_call(self, monitor_id: str, api_info: Optional[Dict[str, Any]] = None):
        """
        Record an API call for the monitored test
        
        Args:
            monitor_id: Monitor ID from start_monitoring
            api_info: Optional information about the API call
        """
        with self._lock:
            if monitor_id in self.active_monitors:
                self.active_monitors[monitor_id]['api_calls'] += 1
                
                # Update peak memory if needed
                current_memory = self._get_memory_usage()
                if current_memory > self.active_monitors[monitor_id]['peak_memory']:
                    self.active_monitors[monitor_id]['peak_memory'] = current_memory
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get summary of all performance metrics
        
        Returns:
            Dictionary containing performance summary statistics
        """
        if not self.performance_history:
            return {
                'total_tests': 0,
                'average_execution_time': 0.0,
                'average_memory_usage': 0.0,
                'total_database_queries': 0,
                'total_api_calls': 0,
                'slow_tests': [],
                'memory_intensive_tests': [],
                'warnings': []
            }
        
        total_tests = len(self.performance_history)
        avg_execution_time = sum(m.execution_time for m in self.performance_history) / total_tests
        avg_memory_usage = sum(m.memory_usage for m in self.performance_history) / total_tests
        total_db_queries = sum(m.database_queries for m in self.performance_history)
        total_api_calls = sum(m.api_calls for m in self.performance_history)
        
        # Identify problematic tests
        slow_tests = [
            m for m in self.performance_history 
            if m.execution_time > self.thresholds.max_execution_time
        ]
        
        memory_intensive_tests = [
            m for m in self.performance_history 
            if m.memory_usage > self.thresholds.max_memory_usage
        ]
        
        all_warnings = []
        for metrics in self.performance_history:
            all_warnings.extend(metrics.warnings)
        
        return {
            'total_tests': total_tests,
            'average_execution_time': avg_execution_time,
            'average_memory_usage': avg_memory_usage,
            'total_database_queries': total_db_queries,
            'total_api_calls': total_api_calls,
            'slow_tests': [{'name': m.test_name, 'time': m.execution_time} for m in slow_tests],
            'memory_intensive_tests': [{'name': m.test_name, 'memory': m.memory_usage} for m in memory_intensive_tests],
            'warnings': all_warnings
        }
    
    def export_metrics(self, filepath: str):
        """
        Export performance metrics to JSON file
        
        Args:
            filepath: Path to save the metrics file
        """
        metrics_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'thresholds': {
                'max_execution_time': self.thresholds.max_execution_time,
                'max_memory_usage': self.thresholds.max_memory_usage,
                'max_database_queries': self.thresholds.max_database_queries,
                'max_api_calls': self.thresholds.max_api_calls
            },
            'summary': self.get_performance_summary(),
            'detailed_metrics': [
                {
                    'test_name': m.test_name,
                    'execution_time': m.execution_time,
                    'memory_usage': m.memory_usage,
                    'peak_memory_usage': m.peak_memory_usage,
                    'database_queries': m.database_queries,
                    'api_calls': m.api_calls,
                    'start_time': m.start_time.isoformat(),
                    'end_time': m.end_time.isoformat(),
                    'warnings': m.warnings
                }
                for m in self.performance_history
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(metrics_data, f, indent=2)
        
        logger.info(f"Performance metrics exported to {filepath}")
    
    def clear_history(self):
        """Clear performance history"""
        with self._lock:
            self.performance_history.clear()
        logger.info("Performance history cleared")
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            return self._process.memory_info().rss / 1024 / 1024
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return 0.0
    
    def _check_thresholds(self, metrics: TestPerformanceMetrics):
        """Check performance thresholds and add warnings"""
        if metrics.execution_time > self.thresholds.max_execution_time:
            warning = f"Slow test: {metrics.test_name} took {metrics.execution_time:.2f}s " \
                     f"(threshold: {self.thresholds.max_execution_time}s)"
            metrics.warnings.append(warning)
            logger.warning(warning)
        
        if metrics.memory_usage > self.thresholds.max_memory_usage:
            warning = f"High memory usage: {metrics.test_name} used {metrics.memory_usage:.2f}MB " \
                     f"(threshold: {self.thresholds.max_memory_usage}MB)"
            metrics.warnings.append(warning)
            logger.warning(warning)
        
        if metrics.database_queries > self.thresholds.max_database_queries:
            warning = f"Too many database queries: {metrics.test_name} made {metrics.database_queries} queries " \
                     f"(threshold: {self.thresholds.max_database_queries})"
            metrics.warnings.append(warning)
            logger.warning(warning)
        
        if metrics.api_calls > self.thresholds.max_api_calls:
            warning = f"Too many API calls: {metrics.test_name} made {metrics.api_calls} calls " \
                     f"(threshold: {self.thresholds.max_api_calls})"
            metrics.warnings.append(warning)
            logger.warning(warning)
    
    def _log_performance_summary(self, metrics: TestPerformanceMetrics):
        """Log performance summary for a test"""
        status = "✅" if not metrics.warnings else "⚠️"
        logger.info(f"{status} {metrics.test_name}: "
                   f"{metrics.execution_time:.2f}s, "
                   f"{metrics.memory_usage:.2f}MB, "
                   f"{metrics.database_queries} DB queries, "
                   f"{metrics.api_calls} API calls")
        
        for warning in metrics.warnings:
            logger.warning(f"  ⚠️  {warning}")


# Global performance monitor instance
_global_monitor: Optional[TestPerformanceMonitor] = None


def get_performance_monitor() -> TestPerformanceMonitor:
    """Get the global performance monitor instance"""
    global _global_monitor
    if _global_monitor is None:
        _global_monitor = TestPerformanceMonitor()
    return _global_monitor


def reset_performance_monitor():
    """Reset the global performance monitor"""
    global _global_monitor
    _global_monitor = None


# Convenience decorators for pytest fixtures
def performance_monitor_fixture():
    """Pytest fixture for performance monitoring"""
    monitor = get_performance_monitor()
    yield monitor
    # Optionally clear history after each test session
    # monitor.clear_history()


# Context manager for easy test monitoring
@contextmanager
def monitor_performance(test_name: str):
    """
    Simple context manager for monitoring test performance
    
    Args:
        test_name: Name of the test being monitored
    """
    monitor = get_performance_monitor()
    with monitor.monitor_test(test_name) as monitor_id:
        yield monitor_id