"""
Performance monitoring fixtures and configuration for pytest
"""

import pytest
import pytest_asyncio
import asyncio
from typing import Generator, AsyncGenerator
from pathlib import Path
import json
import tempfile
import os

# Import the performance monitor
import sys
sys.path.append(str(Path(__file__).parent.parent))
from testing.performance_monitor import (
    TestPerformanceMonitor, 
    PerformanceThresholds,
    get_performance_monitor,
    reset_performance_monitor
)


@pytest.fixture(scope="session")
def performance_thresholds() -> PerformanceThresholds:
    """Default performance thresholds for tests"""
    return PerformanceThresholds(
        max_execution_time=5.0,  # 5 seconds
        max_memory_usage=50.0,   # 50MB
        max_database_queries=20,
        max_api_calls=10,
        memory_leak_threshold=10.0  # 10MB
    )


@pytest.fixture(scope="session")
def session_performance_monitor(performance_thresholds) -> Generator[TestPerformanceMonitor, None, None]:
    """Session-scoped performance monitor for collecting metrics across all tests"""
    monitor = TestPerformanceMonitor(performance_thresholds)
    yield monitor
    
    # Export session metrics at the end
    session_summary = monitor.get_performance_summary()
    print(f"\n📊 Session Performance Summary:")
    print(f"   Total tests: {session_summary['total_tests']}")
    print(f"   Average execution time: {session_summary['average_execution_time']:.2f}s")
    print(f"   Average memory usage: {session_summary['average_memory_usage']:.2f}MB")
    print(f"   Slow tests: {len(session_summary['slow_tests'])}")
    print(f"   Memory intensive tests: {len(session_summary['memory_intensive_tests'])}")
    print(f"   Tests with warnings: {len(session_summary['tests_with_warnings'])}")
    
    # Export detailed metrics to file
    timestamp = int(asyncio.get_event_loop().time())
    metrics_file = f"test_performance_metrics_{timestamp}.json"
    monitor.export_metrics(metrics_file)
    print(f"   📁 Detailed metrics exported to: {metrics_file}")


@pytest.fixture(scope="function")
def performance_monitor(session_performance_monitor) -> Generator[TestPerformanceMonitor, None, None]:
    """Function-scoped performance monitor for individual tests"""
    yield session_performance_monitor


@pytest.fixture(scope="function")
def monitored_test(performance_monitor, request):
    """Fixture that automatically monitors test performance"""
    test_name = f"{request.module.__name__}::{request.function.__name__}"
    
    with performance_monitor.monitor_test(test_name) as monitor_id:
        yield monitor_id


@pytest_asyncio.fixture(scope="function")
async def async_monitored_test(performance_monitor, request):
    """Async fixture that automatically monitors test performance"""
    test_name = f"{request.module.__name__}::{request.function.__name__}"
    
    async with performance_monitor.monitor_async_test(test_name) as monitor_id:
        yield monitor_id


@pytest.fixture(scope="function")
def database_query_tracker(performance_monitor, monitored_test):
    """Fixture for tracking database queries in tests"""
    monitor_id = monitored_test
    
    class QueryTracker:
        def __init__(self, monitor, monitor_id):
            self.monitor = monitor
            self.monitor_id = monitor_id
            self.query_count = 0
        
        def record_query(self, query_info=None):
            self.monitor.record_database_query(self.monitor_id, query_info)
            self.query_count += 1
        
        def get_query_count(self):
            return self.query_count
    
    return QueryTracker(performance_monitor, monitor_id)


@pytest.fixture(scope="function")
def api_call_tracker(performance_monitor, monitored_test):
    """Fixture for tracking API calls in tests"""
    monitor_id = monitored_test
    
    class APICallTracker:
        def __init__(self, monitor, monitor_id):
            self.monitor = monitor
            self.monitor_id = monitor_id
            self.call_count = 0
        
        def record_call(self, api_info=None):
            self.monitor.record_api_call(self.monitor_id, api_info)
            self.call_count += 1
        
        def get_call_count(self):
            return self.call_count
    
    return APICallTracker(performance_monitor, monitor_id)


def pytest_configure(config):
    """Configure pytest with performance monitoring markers"""
    config.addinivalue_line(
        "markers", "performance: mark test for performance monitoring"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow (expected to take longer)"
    )
    config.addinivalue_line(
        "markers", "memory_intensive: mark test as memory intensive"
    )


def pytest_runtest_setup(item):
    """Setup performance monitoring for marked tests"""
    if item.get_closest_marker("performance"):
        # Ensure performance monitoring is enabled for this test
        pass


def pytest_runtest_teardown(item, nextitem):
    """Teardown performance monitoring after each test"""
    # Check if test had performance issues and log warnings
    if hasattr(item, 'performance_warnings'):
        for warning in item.performance_warnings:
            print(f"⚠️  Performance Warning: {warning}")


@pytest.fixture(scope="function")
def performance_test_wrapper():
    """Wrapper for creating performance-monitored tests"""
    def create_performance_test(test_name, test_func, thresholds=None):
        """
        Create a performance-monitored test function
        
        Args:
            test_name: Name of the test
            test_func: Test function to monitor
            thresholds: Optional custom thresholds
        
        Returns:
            Wrapped test function
        """
        async def wrapped_test(*args, **kwargs):
            monitor = TestPerformanceMonitor(thresholds)
            
            async with monitor.monitor_async_test(test_name) as monitor_id:
                # Add monitor_id to kwargs if test function accepts it
                import inspect
                sig = inspect.signature(test_func)
                if 'monitor_id' in sig.parameters:
                    kwargs['monitor_id'] = monitor_id
                
                result = await test_func(*args, **kwargs)
                return result
        
        return wrapped_test
    
    return create_performance_test


# Performance assertion helpers
class PerformanceAssertions:
    """Helper class for performance-related assertions"""
    
    @staticmethod
    def assert_execution_time_under(metrics, max_time):
        """Assert that execution time is under the specified limit"""
        assert metrics.execution_time <= max_time, \
            f"Test took {metrics.execution_time:.2f}s, expected under {max_time}s"
    
    @staticmethod
    def assert_memory_usage_under(metrics, max_memory):
        """Assert that memory usage is under the specified limit"""
        assert metrics.memory_usage <= max_memory, \
            f"Test used {metrics.memory_usage:.2f}MB, expected under {max_memory}MB"
    
    @staticmethod
    def assert_database_queries_under(metrics, max_queries):
        """Assert that database queries are under the specified limit"""
        assert metrics.database_queries <= max_queries, \
            f"Test made {metrics.database_queries} queries, expected under {max_queries}"
    
    @staticmethod
    def assert_api_calls_under(metrics, max_calls):
        """Assert that API calls are under the specified limit"""
        assert metrics.api_calls <= max_calls, \
            f"Test made {metrics.api_calls} API calls, expected under {max_calls}"
    
    @staticmethod
    def assert_no_performance_warnings(metrics):
        """Assert that there are no performance warnings"""
        assert len(metrics.warnings) == 0, \
            f"Test had performance warnings: {', '.join(metrics.warnings)}"


@pytest.fixture(scope="function")
def performance_assertions():
    """Fixture providing performance assertion helpers"""
    return PerformanceAssertions()


# Hooks for automatic performance monitoring
def pytest_runtest_call(item):
    """Hook to automatically monitor test performance"""
    # Only monitor tests marked with @pytest.mark.performance
    if item.get_closest_marker("performance"):
        # Performance monitoring is handled by fixtures
        pass


def pytest_sessionfinish(session, exitstatus):
    """Hook called after test session finishes"""
    # Generate performance report
    if hasattr(session, 'performance_data'):
        print("\n" + "="*50)
        print("PERFORMANCE REPORT")
        print("="*50)
        # Report would be generated here
        pass


# Custom pytest markers for performance testing
def performance_test(thresholds=None):
    """
    Decorator for marking tests as performance tests
    
    Usage:
        @performance_test(thresholds={'max_execution_time': 2.0})
        async def test_my_function():
            pass
    """
    def decorator(func):
        func = pytest.mark.performance(func)
        if thresholds:
            func._performance_thresholds = thresholds
        return func
    return decorator


def slow_test(expected_time=None):
    """
    Decorator for marking tests as intentionally slow
    
    Usage:
        @slow_test(expected_time=10.0)
        async def test_long_operation():
            pass
    """
    def decorator(func):
        func = pytest.mark.slow(func)
        if expected_time:
            func._expected_time = expected_time
        return func
    return decorator


def memory_intensive_test(expected_memory=None):
    """
    Decorator for marking tests as memory intensive
    
    Usage:
        @memory_intensive_test(expected_memory=100.0)
        async def test_large_data_processing():
            pass
    """
    def decorator(func):
        func = pytest.mark.memory_intensive(func)
        if expected_memory:
            func._expected_memory = expected_memory
        return func
    return decorator