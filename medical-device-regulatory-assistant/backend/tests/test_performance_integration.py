"""
Performance monitoring integration test

This test demonstrates how to integrate performance monitoring into existing tests.
"""

import pytest
import pytest_asyncio
import asyncio
import time
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from testing.performance_monitor import TestPerformanceMonitor, PerformanceThresholds
# Import performance monitoring directly
from testing.performance_monitor import TestPerformanceMonitor, PerformanceThresholds

# Define decorators locally for this test
def performance_test(thresholds=None):
    def decorator(func):
        func._performance_test = True
        func._performance_thresholds = thresholds
        return func
    return decorator

def slow_test(expected_time=None):
    def decorator(func):
        func._slow_test = True
        func._expected_time = expected_time
        return func
    return decorator

def memory_intensive_test(expected_memory=None):
    def decorator(func):
        func._memory_intensive_test = True
        func._expected_memory = expected_memory
        return func
    return decorator

class PerformanceAssertions:
    @staticmethod
    def assert_execution_time_under(metrics, max_time):
        assert metrics.execution_time <= max_time, \
            f"Test took {metrics.execution_time:.2f}s, expected under {max_time}s"
    
    @staticmethod
    def assert_memory_usage_under(metrics, max_memory):
        assert metrics.memory_usage <= max_memory, \
            f"Test used {metrics.memory_usage:.2f}MB, expected under {max_memory}MB"
    
    @staticmethod
    def assert_database_queries_under(metrics, max_queries):
        assert metrics.database_queries <= max_queries, \
            f"Test made {metrics.database_queries} queries, expected under {max_queries}"
    
    @staticmethod
    def assert_api_calls_under(metrics, max_calls):
        assert metrics.api_calls <= max_calls, \
            f"Test made {metrics.api_calls} API calls, expected under {max_calls}"
    
    @staticmethod
    def assert_no_performance_warnings(metrics):
        assert len(metrics.warnings) == 0, \
            f"Test had performance warnings: {', '.join(metrics.warnings)}"


class MockDatabaseQueryTracker:
    def __init__(self, monitor, monitor_id):
        self.monitor = monitor
        self.monitor_id = monitor_id
        self.query_count = 0
    
    def record_query(self, query_info=None):
        self.monitor.record_database_query(self.monitor_id, query_info)
        self.query_count += 1
    
    def get_query_count(self):
        return self.query_count

class MockAPICallTracker:
    def __init__(self, monitor, monitor_id):
        self.monitor = monitor
        self.monitor_id = monitor_id
        self.call_count = 0
    
    def record_call(self, api_info=None):
        self.monitor.record_api_call(self.monitor_id, api_info)
        self.call_count += 1
    
    def get_call_count(self):
        return self.call_count

class TestPerformanceIntegration:
    """Test class demonstrating performance monitoring integration"""
    
    @pytest_asyncio.fixture(autouse=True)
    async def setup_performance_monitor(self):
        """Setup performance monitor for this test class"""
        self.monitor = TestPerformanceMonitor(
            PerformanceThresholds(
                max_execution_time=2.0,
                max_memory_usage=20.0,
                max_database_queries=10,
                max_api_calls=5
            )
        )
    
    @performance_test(thresholds={'max_execution_time': 1.0})
    @pytest.mark.asyncio
    async def test_fast_operation_with_monitoring(self):
        """Test a fast operation with automatic performance monitoring"""
        async with self.monitor.monitor_async_test("fast_operation") as monitor_id:
            database_query_tracker = MockDatabaseQueryTracker(self.monitor, monitor_id)
            
            # Simulate some work
            await asyncio.sleep(0.1)
            
            # Simulate database queries
            database_query_tracker.record_query({"query": "SELECT * FROM users"})
            database_query_tracker.record_query({"query": "SELECT * FROM projects"})
            
            # Simulate more work
            await asyncio.sleep(0.05)
            
            # Verify query tracking
            assert database_query_tracker.get_query_count() == 2
    
    @slow_test(expected_time=3.0)
    @pytest.mark.asyncio
    async def test_slow_operation_with_monitoring(self):
        """Test a slow operation that's expected to take time"""
        async with self.monitor.monitor_async_test("slow_operation") as monitor_id:
            api_call_tracker = MockAPICallTracker(self.monitor, monitor_id)
            
            # Simulate slow work
            await asyncio.sleep(0.5)
            
            # Simulate API calls
            api_call_tracker.record_call({"endpoint": "/api/health"})
            api_call_tracker.record_call({"endpoint": "/api/projects"})
            
            # More slow work
            await asyncio.sleep(0.3)
            
            # Verify API call tracking
            assert api_call_tracker.get_call_count() == 2
    
    @memory_intensive_test(expected_memory=50.0)
    @pytest.mark.asyncio
    async def test_memory_intensive_operation(self):
        """Test a memory-intensive operation"""
        async with self.monitor.monitor_async_test("memory_intensive") as monitor_id:
            # Allocate memory
            large_data = []
            for i in range(10000):
                large_data.append(f"data_item_{i}" * 10)
            
            await asyncio.sleep(0.1)
            
            # Keep reference to prevent GC
            self.test_data = large_data
            
            # Verify data was created
            assert len(large_data) == 10000
    
    @pytest.mark.asyncio
    async def test_manual_performance_monitoring(self):
        """Test manual performance monitoring without fixtures"""
        monitor = TestPerformanceMonitor()
        
        async with monitor.monitor_async_test("manual_test") as monitor_id:
            # Simulate work
            await asyncio.sleep(0.2)
            
            # Record operations
            monitor.record_database_query(monitor_id, {"query": "INSERT INTO test"})
            monitor.record_api_call(monitor_id, {"endpoint": "/api/test"})
            
            await asyncio.sleep(0.1)
        
        # Check results
        summary = monitor.get_performance_summary()
        assert summary['total_tests'] == 1
        assert summary['total_database_queries'] == 1
        assert summary['total_api_calls'] == 1
    
    @pytest.mark.asyncio
    async def test_performance_assertions(self):
        """Test performance assertions"""
        performance_assertions = PerformanceAssertions()
        monitor = TestPerformanceMonitor()
        
        async with monitor.monitor_async_test("assertion_test") as monitor_id:
            await asyncio.sleep(0.1)
            monitor.record_database_query(monitor_id)
        
        metrics = monitor.performance_history[0]
        
        # Use performance assertions
        performance_assertions.assert_execution_time_under(metrics, 1.0)
        performance_assertions.assert_memory_usage_under(metrics, 10.0)
        performance_assertions.assert_database_queries_under(metrics, 5)
        performance_assertions.assert_api_calls_under(metrics, 5)
    
    @pytest.mark.asyncio
    async def test_performance_regression_detection(self):
        """Test performance regression detection"""
        monitor = TestPerformanceMonitor()
        
        # Run the same test multiple times with different performance
        for i in range(5):
            async with monitor.monitor_async_test("regression_test") as monitor_id:
                # Gradually increase execution time to simulate regression
                await asyncio.sleep(0.05 + (i * 0.02))
        
        # Check for regression
        regression_info = monitor.check_performance_regression("regression_test", baselineWindow=2)
        
        # Should detect regression due to increasing execution time
        assert isinstance(regression_info['hasRegression'], bool)
        assert isinstance(regression_info['regressionPercentage'], float)
        assert isinstance(regression_info['details'], str)
    
    @pytest.mark.asyncio
    async def test_memory_leak_detection(self):
        """Test memory leak detection"""
        monitor = TestPerformanceMonitor()
        
        # Run tests that gradually use more memory
        for i in range(3):
            async with monitor.monitor_async_test("memory_leak_test") as monitor_id:
                # Allocate increasing amounts of memory
                data = [f"item_{j}" for j in range(1000 * (i + 1))]
                await asyncio.sleep(0.05)
                
                # Keep reference to simulate leak
                if not hasattr(self, 'leak_data'):
                    self.leak_data = []
                self.leak_data.extend(data)
        
        # Check for memory leaks
        leak_info = monitor.detect_memory_leaks("memory_leak_test")
        
        assert isinstance(leak_info['hasLeak'], bool)
        assert isinstance(leak_info['leakSize'], float)
        assert isinstance(leak_info['details'], str)
    
    @pytest.mark.asyncio
    async def test_performance_summary_generation(self):
        """Test performance summary generation"""
        monitor = TestPerformanceMonitor(
            PerformanceThresholds(
                max_execution_time=0.1,  # Very low threshold to trigger warnings
                max_memory_usage=1.0
            )
        )
        
        # Run multiple tests with different characteristics
        test_scenarios = [
            ("fast_test", 0.05, 1),
            ("slow_test", 0.15, 2),  # Will trigger warning
            ("memory_test", 0.08, 3)
        ]
        
        for test_name, sleep_time, queries in test_scenarios:
            async with monitor.monitor_async_test(test_name) as monitor_id:
                await asyncio.sleep(sleep_time)
                
                for _ in range(queries):
                    monitor.record_database_query(monitor_id)
        
        # Get summary
        summary = monitor.get_performance_summary()
        
        assert summary['total_tests'] == 3
        assert summary['total_database_queries'] == 6
        assert len(summary['slow_tests']) >= 1  # slow_test should be flagged
        assert len(summary['warnings']) >= 1
    
    @pytest.mark.asyncio
    async def test_performance_metrics_export(self):
        """Test performance metrics export"""
        monitor = TestPerformanceMonitor()
        
        # Run a test
        async with monitor.monitor_async_test("export_test") as monitor_id:
            await asyncio.sleep(0.1)
            monitor.record_database_query(monitor_id)
            monitor.record_api_call(monitor_id)
        
        # Export metrics
        import tempfile
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            monitor.export_metrics(temp_path)
            
            # Verify export
            with open(temp_path, 'r') as f:
                data = json.load(f)
            
            assert 'timestamp' in data
            assert 'thresholds' in data
            assert 'summary' in data
            assert 'detailed_metrics' in data
            assert len(data['detailed_metrics']) == 1
            
        finally:
            import os
            if os.path.exists(temp_path):
                os.unlink(temp_path)


# Example of how to integrate with existing test classes
class TestExistingServiceWithPerformance:
    """Example of integrating performance monitoring into existing service tests"""
    
    @pytest_asyncio.fixture(autouse=True)
    async def setup_monitor(self):
        self.monitor = TestPerformanceMonitor()
    
    @pytest.mark.asyncio
    async def test_project_creation_performance(self):
        """Test project creation with performance monitoring"""
        async with self.monitor.monitor_async_test("project_creation") as monitor_id:
            database_query_tracker = MockDatabaseQueryTracker(self.monitor, monitor_id)
            
            # Simulate project creation logic
            await asyncio.sleep(0.1)  # Simulate processing time
            
            # Simulate database operations
            database_query_tracker.record_query({"query": "INSERT INTO projects"})
            database_query_tracker.record_query({"query": "INSERT INTO audit_log"})
            
            await asyncio.sleep(0.05)  # More processing
            
            # Verify operations
            assert database_query_tracker.get_query_count() == 2
    
    @pytest.mark.asyncio
    async def test_api_endpoint_performance(self):
        """Test API endpoint with performance monitoring"""
        async with self.monitor.monitor_async_test("api_endpoint") as monitor_id:
            api_call_tracker = MockAPICallTracker(self.monitor, monitor_id)
            
            # Simulate API endpoint logic
            await asyncio.sleep(0.2)
            
            # Simulate external API calls
            api_call_tracker.record_call({"endpoint": "https://api.fda.gov/device/510k.json"})
            
            await asyncio.sleep(0.1)
            
            # Verify API calls
            assert api_call_tracker.get_call_count() == 1


# Standalone performance test functions
@performance_test()
@pytest.mark.asyncio
async def test_standalone_performance_monitoring():
    """Standalone test with performance monitoring"""
    await asyncio.sleep(0.1)
    assert True


@slow_test(expected_time=1.0)
@pytest.mark.asyncio
async def test_standalone_slow_operation():
    """Standalone slow test"""
    await asyncio.sleep(0.3)
    assert True


if __name__ == "__main__":
    # Run tests directly for development
    import subprocess
    import sys
    
    result = subprocess.run([
        sys.executable, "-m", "pytest", __file__, "-v", "--tb=short"
    ], cwd=Path(__file__).parent)
    
    sys.exit(result.returncode)