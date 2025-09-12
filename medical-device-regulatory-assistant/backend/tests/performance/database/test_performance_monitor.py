#!/usr/bin/env python3
"""
Test script for TestPerformanceMonitor

This script tests the performance monitoring functionality to ensure it works correctly.
"""

import asyncio
import time
import tempfile
import os
from testing.performance_monitor import (
    TestPerformanceMonitor, 
    PerformanceThresholds,
    get_performance_monitor,
    monitor_performance
)


def test_basic_monitoring():
    """Test basic performance monitoring functionality"""
    print("🧪 Testing basic performance monitoring...")
    
    # Create monitor with custom thresholds
    thresholds = PerformanceThresholds(
        max_execution_time=2.0,
        max_memory_usage=50.0,
        max_database_queries=10,
        max_api_calls=5
    )
    
    monitor = TestPerformanceMonitor(thresholds)
    
    # Test context manager
    with monitor.monitor_test("test_basic_functionality") as monitor_id:
        # Simulate some work
        time.sleep(0.1)
        
        # Record some database queries and API calls
        monitor.record_database_query(monitor_id, {"query": "SELECT * FROM users"})
        monitor.record_database_query(monitor_id, {"query": "SELECT * FROM projects"})
        monitor.record_api_call(monitor_id, {"endpoint": "/api/health"})
        
        # Simulate more work
        time.sleep(0.1)
    
    # Check results
    assert len(monitor.performance_history) == 1
    metrics = monitor.performance_history[0]
    
    print(f"✅ Test completed in {metrics.execution_time:.3f}s")
    print(f"✅ Memory usage: {metrics.memory_usage:.2f}MB")
    print(f"✅ Database queries: {metrics.database_queries}")
    print(f"✅ API calls: {metrics.api_calls}")
    print(f"✅ Warnings: {len(metrics.warnings)}")
    
    return True


async def test_async_monitoring():
    """Test async performance monitoring"""
    print("\n🧪 Testing async performance monitoring...")
    
    monitor = TestPerformanceMonitor()
    
    async with monitor.monitor_async_test("test_async_functionality") as monitor_id:
        # Simulate async work
        await asyncio.sleep(0.1)
        
        # Record some operations
        monitor.record_database_query(monitor_id)
        monitor.record_api_call(monitor_id)
        
        await asyncio.sleep(0.1)
    
    # Check results
    assert len(monitor.performance_history) == 1
    metrics = monitor.performance_history[0]
    
    print(f"✅ Async test completed in {metrics.execution_time:.3f}s")
    print(f"✅ Memory usage: {metrics.memory_usage:.2f}MB")
    
    return True


def test_threshold_warnings():
    """Test threshold warning generation"""
    print("\n🧪 Testing threshold warnings...")
    
    # Create monitor with very low thresholds to trigger warnings
    thresholds = PerformanceThresholds(
        max_execution_time=0.05,  # Very low threshold
        max_memory_usage=1.0,     # Very low threshold
        max_database_queries=1,   # Very low threshold
        max_api_calls=1           # Very low threshold
    )
    
    monitor = TestPerformanceMonitor(thresholds)
    
    with monitor.monitor_test("test_threshold_warnings") as monitor_id:
        # Sleep to exceed time threshold
        time.sleep(0.1)
        
        # Exceed query and API call thresholds
        for i in range(3):
            monitor.record_database_query(monitor_id)
            monitor.record_api_call(monitor_id)
    
    # Check that warnings were generated
    metrics = monitor.performance_history[0]
    print(f"✅ Generated {len(metrics.warnings)} warnings:")
    for warning in metrics.warnings:
        print(f"   ⚠️  {warning}")
    
    assert len(metrics.warnings) > 0, "Expected warnings to be generated"
    
    return True


def test_performance_summary():
    """Test performance summary generation"""
    print("\n🧪 Testing performance summary...")
    
    monitor = TestPerformanceMonitor()
    
    # Run multiple tests
    test_names = ["test_1", "test_2", "test_3"]
    for test_name in test_names:
        with monitor.monitor_test(test_name) as monitor_id:
            time.sleep(0.05)
            monitor.record_database_query(monitor_id)
            monitor.record_api_call(monitor_id)
    
    # Get summary
    summary = monitor.get_performance_summary()
    
    print(f"✅ Total tests: {summary['total_tests']}")
    print(f"✅ Average execution time: {summary['average_execution_time']:.3f}s")
    print(f"✅ Average memory usage: {summary['average_memory_usage']:.2f}MB")
    print(f"✅ Total database queries: {summary['total_database_queries']}")
    print(f"✅ Total API calls: {summary['total_api_calls']}")
    
    assert summary['total_tests'] == 3
    assert summary['total_database_queries'] == 3
    assert summary['total_api_calls'] == 3
    
    return True


def test_export_metrics():
    """Test metrics export functionality"""
    print("\n🧪 Testing metrics export...")
    
    monitor = TestPerformanceMonitor()
    
    # Run a test
    with monitor.monitor_test("test_export") as monitor_id:
        time.sleep(0.05)
        monitor.record_database_query(monitor_id)
    
    # Export metrics to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name
    
    try:
        monitor.export_metrics(temp_path)
        
        # Verify file was created and contains data
        assert os.path.exists(temp_path)
        
        with open(temp_path, 'r') as f:
            import json
            data = json.load(f)
        
        assert 'timestamp' in data
        assert 'thresholds' in data
        assert 'summary' in data
        assert 'detailed_metrics' in data
        assert len(data['detailed_metrics']) == 1
        
        print(f"✅ Metrics exported successfully to {temp_path}")
        print(f"✅ Export contains {len(data['detailed_metrics'])} test metrics")
        
    finally:
        # Clean up
        if os.path.exists(temp_path):
            os.unlink(temp_path)
    
    return True


def test_global_monitor():
    """Test global monitor functionality"""
    print("\n🧪 Testing global monitor...")
    
    # Test global monitor access
    monitor1 = get_performance_monitor()
    monitor2 = get_performance_monitor()
    
    assert monitor1 is monitor2, "Global monitor should return same instance"
    
    # Test convenience context manager
    with monitor_performance("test_global") as monitor_id:
        time.sleep(0.05)
    
    summary = monitor1.get_performance_summary()
    print(f"✅ Global monitor tracked {summary['total_tests']} tests")
    
    return True


def test_memory_tracking():
    """Test memory usage tracking"""
    print("\n🧪 Testing memory tracking...")
    
    monitor = TestPerformanceMonitor()
    
    with monitor.monitor_test("test_memory_tracking") as monitor_id:
        # Allocate some memory to see if it's tracked
        large_list = [i for i in range(10000)]
        time.sleep(0.1)
        
        # Record operations to update peak memory
        monitor.record_database_query(monitor_id)
        
        # Keep the list in memory
        _ = len(large_list)
    
    metrics = monitor.performance_history[0]
    print(f"✅ Memory usage: {metrics.memory_usage:.2f}MB")
    print(f"✅ Peak memory usage: {metrics.peak_memory_usage:.2f}MB")
    
    # Memory usage should be tracked (might be positive or negative depending on GC)
    assert isinstance(metrics.memory_usage, float)
    assert isinstance(metrics.peak_memory_usage, float)
    
    return True


async def main():
    """Run all tests"""
    print("🚀 Starting TestPerformanceMonitor tests...\n")
    
    tests = [
        test_basic_monitoring,
        test_async_monitoring,
        test_threshold_warnings,
        test_performance_summary,
        test_export_metrics,
        test_global_monitor,
        test_memory_tracking
    ]
    
    passed = 0
    failed = 0
    
    for test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
                print(f"✅ {test_func.__name__} PASSED")
            else:
                failed += 1
                print(f"❌ {test_func.__name__} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test_func.__name__} FAILED: {e}")
    
    print(f"\n📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return True
    else:
        print("💥 Some tests failed!")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)