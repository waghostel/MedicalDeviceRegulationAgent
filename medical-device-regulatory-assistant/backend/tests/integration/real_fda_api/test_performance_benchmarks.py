"""
FDA API Performance Benchmarking Tests

This module contains performance benchmarking tests for the real FDA API integration.
It measures response times, throughput, and resource usage to optimize production performance.
"""

import asyncio
import time
import pytest
import pytest_asyncio
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import psutil
import os

from services.openfda import (
    OpenFDAService,
    create_production_openfda_service,
    FDAAPIError,
    RateLimitExceededError
)


pytestmark = pytest.mark.real_api


class PerformanceMetrics:
    """Utility class for collecting and analyzing performance metrics"""
    
    def __init__(self):
        self.measurements = []
        self.start_time = None
        self.end_time = None
    
    def start_measurement(self):
        """Start a performance measurement"""
        self.start_time = time.time()
    
    def end_measurement(self, operation: str, metadata: Dict[str, Any] = None):
        """End a performance measurement and record it"""
        if self.start_time is None:
            raise ValueError("Must call start_measurement() first")
        
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        
        self.measurements.append({
            "operation": operation,
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
        
        self.start_time = None
        return duration
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistical summary of measurements"""
        if not self.measurements:
            return {"count": 0}
        
        durations = [m["duration_seconds"] for m in self.measurements]
        
        return {
            "count": len(durations),
            "total_time": sum(durations),
            "mean": statistics.mean(durations),
            "median": statistics.median(durations),
            "min": min(durations),
            "max": max(durations),
            "std_dev": statistics.stdev(durations) if len(durations) > 1 else 0,
            "percentile_95": statistics.quantiles(durations, n=20)[18] if len(durations) >= 20 else max(durations)
        }


class TestFDAAPIPerformanceBenchmarks:
    """Performance benchmarking tests for FDA API"""
    
    @pytest_asyncio.fixture(scope="class")
    async def performance_service(self):
        """Create service for performance testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_predicate_search_response_time(self, performance_service):
        """Benchmark predicate search response times"""
        metrics = PerformanceMetrics()
        
        # Test different search scenarios
        test_cases = [
            {"search_terms": ["pacemaker"], "device_class": "II", "limit": 10},
            {"search_terms": ["cardiac monitor"], "device_class": "II", "limit": 5},
            {"search_terms": ["defibrillator"], "device_class": "III", "limit": 3},
        ]
        
        for i, test_case in enumerate(test_cases):
            metrics.start_measurement()
            
            try:
                results = await performance_service.search_predicates(**test_case)
                duration = metrics.end_measurement(
                    f"predicate_search_{i}",
                    {"test_case": test_case, "result_count": len(results)}
                )
                
                # Individual response time assertion
                assert duration < 15.0, f"Search should complete within 15 seconds, took {duration:.2f}s"
                
            except (FDAAPIError, RateLimitExceededError) as e:
                # Record the error but don't fail the test
                metrics.end_measurement(f"predicate_search_{i}_error", {"error": str(e)})
        
        # Analyze overall performance
        stats = metrics.get_statistics()
        print(f"Predicate search performance stats: {stats}")
        
        if stats["count"] > 0:
            assert stats["mean"] < 10.0, f"Average response time should be under 10s, got {stats['mean']:.2f}s"
            assert stats["percentile_95"] < 20.0, f"95th percentile should be under 20s, got {stats['percentile_95']:.2f}s"
    
    @pytest.mark.asyncio
    async def test_device_classification_response_time(self, performance_service):
        """Benchmark device classification response times"""
        metrics = PerformanceMetrics()
        
        # Test with different product codes
        product_codes = ["DQO", "LLZ", "MHX"]  # Common product codes
        
        for product_code in product_codes:
            metrics.start_measurement()
            
            try:
                results = await performance_service.lookup_device_classification(
                    product_code=product_code
                )
                duration = metrics.end_measurement(
                    f"classification_{product_code}",
                    {"product_code": product_code, "result_count": len(results)}
                )
                
                # Individual response time assertion
                assert duration < 10.0, f"Classification lookup should complete within 10 seconds, took {duration:.2f}s"
                
            except (FDAAPIError, RateLimitExceededError) as e:
                metrics.end_measurement(f"classification_{product_code}_error", {"error": str(e)})
        
        # Analyze performance
        stats = metrics.get_statistics()
        print(f"Classification lookup performance stats: {stats}")
        
        if stats["count"] > 0:
            assert stats["mean"] < 5.0, f"Average classification lookup should be under 5s, got {stats['mean']:.2f}s"
    
    @pytest.mark.asyncio
    async def test_concurrent_request_performance(self, performance_service):
        """Benchmark concurrent request performance"""
        # Create multiple concurrent requests
        concurrent_requests = 3  # Conservative to avoid rate limits
        
        async def make_request(request_id: int) -> Tuple[int, float, int]:
            """Make a single request and return timing info"""
            start_time = time.time()
            try:
                results = await performance_service.search_predicates(
                    search_terms=[f"device_{request_id}"],
                    limit=5
                )
                duration = time.time() - start_time
                return request_id, duration, len(results)
            except Exception as e:
                duration = time.time() - start_time
                return request_id, duration, -1  # -1 indicates error
        
        # Execute concurrent requests
        start_time = time.time()
        tasks = [make_request(i) for i in range(concurrent_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Analyze results
        successful_requests = [r for r in results if not isinstance(r, Exception) and r[2] >= 0]
        
        assert len(successful_requests) > 0, "At least one concurrent request should succeed"
        
        # Performance assertions
        assert total_time < 30.0, f"Concurrent requests should complete within 30 seconds, took {total_time:.2f}s"
        
        if successful_requests:
            avg_individual_time = sum(r[1] for r in successful_requests) / len(successful_requests)
            assert avg_individual_time < 15.0, f"Average individual request time should be under 15s, got {avg_individual_time:.2f}s"
        
        print(f"Concurrent request performance: {len(successful_requests)}/{concurrent_requests} successful in {total_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_cache_performance_impact(self, performance_service):
        """Test performance impact of caching"""
        # Make the same request twice to test cache performance
        search_params = {
            "search_terms": ["cardiac pacemaker"],
            "device_class": "II",
            "limit": 5
        }
        
        # First request (cache miss)
        start_time = time.time()
        results1 = await performance_service.search_predicates(**search_params)
        first_request_time = time.time() - start_time
        
        # Small delay to ensure cache is set
        await asyncio.sleep(0.1)
        
        # Second request (should hit cache if caching is enabled)
        start_time = time.time()
        results2 = await performance_service.search_predicates(**search_params)
        second_request_time = time.time() - start_time
        
        # Validate results are consistent
        assert len(results1) == len(results2), "Cached results should be consistent"
        
        # Performance analysis
        print(f"Cache performance - First: {first_request_time:.3f}s, Second: {second_request_time:.3f}s")
        
        # If caching is working, second request should be faster (but this is not guaranteed with real API)
        # We just ensure both requests complete in reasonable time
        assert first_request_time < 15.0, f"First request should complete within 15s, took {first_request_time:.2f}s"
        assert second_request_time < 15.0, f"Second request should complete within 15s, took {second_request_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_large_result_set_performance(self, performance_service):
        """Test performance with large result sets"""
        metrics = PerformanceMetrics()
        
        # Test with different result set sizes
        test_limits = [10, 50, 100]
        
        for limit in test_limits:
            metrics.start_measurement()
            
            try:
                results = await performance_service.search_predicates(
                    search_terms=["device"],  # Broad search to get many results
                    limit=limit
                )
                duration = metrics.end_measurement(
                    f"large_result_set_{limit}",
                    {"limit": limit, "actual_count": len(results)}
                )
                
                # Performance should scale reasonably with result set size
                expected_max_time = 5.0 + (limit / 20)  # Base time + scaling factor
                assert duration < expected_max_time, f"Large result set ({limit}) should complete within {expected_max_time:.1f}s, took {duration:.2f}s"
                
            except (FDAAPIError, RateLimitExceededError) as e:
                metrics.end_measurement(f"large_result_set_{limit}_error", {"error": str(e)})
        
        # Analyze scaling performance
        stats = metrics.get_statistics()
        print(f"Large result set performance stats: {stats}")


class TestFDAAPIResourceUsage:
    """Test resource usage during FDA API operations"""
    
    @pytest_asyncio.fixture(scope="class")
    async def resource_service(self):
        """Create service for resource usage testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_memory_usage_during_requests(self, resource_service):
        """Test memory usage during API requests"""
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make several requests
        for i in range(5):
            await resource_service.search_predicates(
                search_terms=[f"test_device_{i}"],
                limit=10
            )
            
            # Small delay between requests
            await asyncio.sleep(0.5)
        
        # Check final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Memory usage - Initial: {initial_memory:.1f}MB, Final: {final_memory:.1f}MB, Increase: {memory_increase:.1f}MB")
        
        # Memory increase should be reasonable (allowing for some growth)
        assert memory_increase < 100, f"Memory increase should be under 100MB, got {memory_increase:.1f}MB"
    
    @pytest.mark.asyncio
    async def test_connection_pool_efficiency(self, resource_service):
        """Test HTTP connection pool efficiency"""
        # Make multiple requests to test connection reuse
        request_count = 5
        start_time = time.time()
        
        tasks = []
        for i in range(request_count):
            task = resource_service.search_predicates(
                search_terms=[f"device_{i}"],
                limit=3
            )
            tasks.append(task)
        
        # Execute requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        successful_requests = [r for r in results if not isinstance(r, Exception)]
        
        # Connection pooling should make concurrent requests efficient
        if successful_requests:
            avg_time_per_request = total_time / len(successful_requests)
            print(f"Connection pool efficiency: {len(successful_requests)} requests in {total_time:.2f}s (avg: {avg_time_per_request:.2f}s per request)")
            
            # With good connection pooling, average time per request should be reasonable
            assert avg_time_per_request < 10.0, f"Average time per request should be under 10s with connection pooling, got {avg_time_per_request:.2f}s"


class TestFDAAPIThroughputLimits:
    """Test throughput limits and rate limiting behavior"""
    
    @pytest_asyncio.fixture(scope="class")
    async def throughput_service(self):
        """Create service for throughput testing"""
        # Use service without API key to hit rate limits faster
        from services.openfda import create_openfda_service
        service = await create_openfda_service(api_key=None)
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_rate_limiting_behavior(self, throughput_service):
        """Test rate limiting behavior with real API"""
        # Make requests at a controlled rate
        request_times = []
        successful_requests = 0
        rate_limited_requests = 0
        
        # Make a small number of requests to test rate limiting without hitting hard limits
        for i in range(10):
            start_time = time.time()
            
            try:
                await throughput_service.search_predicates(
                    search_terms=[f"test_{i}"],
                    limit=1
                )
                request_time = time.time() - start_time
                request_times.append(request_time)
                successful_requests += 1
                
            except RateLimitExceededError:
                rate_limited_requests += 1
                # If we hit rate limit, wait a bit before continuing
                await asyncio.sleep(2)
                
            except FDAAPIError:
                # Other API errors are acceptable for this test
                pass
            
            # Small delay between requests to be respectful of API limits
            await asyncio.sleep(0.5)
        
        print(f"Rate limiting test: {successful_requests} successful, {rate_limited_requests} rate limited")
        
        # Should make at least some successful requests
        assert successful_requests > 0, "Should make at least some successful requests"
        
        # If we have request times, analyze them
        if request_times:
            avg_time = sum(request_times) / len(request_times)
            print(f"Average request time: {avg_time:.3f}s")
            assert avg_time < 15.0, f"Average request time should be reasonable, got {avg_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_burst_request_handling(self, throughput_service):
        """Test handling of burst requests"""
        # Make several requests in quick succession
        burst_size = 5
        start_time = time.time()
        
        tasks = []
        for i in range(burst_size):
            task = throughput_service.search_predicates(
                search_terms=[f"burst_{i}"],
                limit=1
            )
            tasks.append(task)
        
        # Execute burst requests
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Analyze burst performance
        successful_results = [r for r in results if not isinstance(r, Exception)]
        error_results = [r for r in results if isinstance(r, Exception)]
        
        print(f"Burst test: {len(successful_results)} successful, {len(error_results)} errors in {total_time:.2f}s")
        
        # Should handle burst requests reasonably
        assert total_time < 60.0, f"Burst requests should complete within 60s, took {total_time:.2f}s"
        
        # At least some requests should succeed (rate limiting may cause some to fail)
        success_rate = len(successful_results) / burst_size
        assert success_rate > 0.2, f"At least 20% of burst requests should succeed, got {success_rate:.1%}"


class TestFDAAPIOptimizationOpportunities:
    """Identify optimization opportunities for FDA API usage"""
    
    @pytest_asyncio.fixture(scope="class")
    async def optimization_service(self):
        """Create service for optimization testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_query_optimization_impact(self, optimization_service):
        """Test impact of query optimization on performance"""
        # Test different query strategies
        test_cases = [
            {
                "name": "broad_search",
                "params": {"search_terms": ["device"], "limit": 10}
            },
            {
                "name": "specific_search",
                "params": {"search_terms": ["cardiac pacemaker"], "device_class": "II", "limit": 10}
            },
            {
                "name": "product_code_search",
                "params": {"search_terms": ["pacemaker"], "product_code": "DQO", "limit": 10}
            }
        ]
        
        performance_results = {}
        
        for test_case in test_cases:
            start_time = time.time()
            
            try:
                results = await optimization_service.search_predicates(**test_case["params"])
                duration = time.time() - start_time
                
                performance_results[test_case["name"]] = {
                    "duration": duration,
                    "result_count": len(results),
                    "efficiency": len(results) / duration if duration > 0 else 0
                }
                
            except Exception as e:
                performance_results[test_case["name"]] = {
                    "duration": time.time() - start_time,
                    "error": str(e)
                }
        
        # Analyze optimization opportunities
        print("Query optimization analysis:")
        for name, result in performance_results.items():
            if "error" not in result:
                print(f"  {name}: {result['duration']:.2f}s, {result['result_count']} results, {result['efficiency']:.1f} results/sec")
            else:
                print(f"  {name}: Error - {result['error']}")
        
        # More specific searches should generally be faster
        if "broad_search" in performance_results and "specific_search" in performance_results:
            broad = performance_results["broad_search"]
            specific = performance_results["specific_search"]
            
            if "error" not in broad and "error" not in specific:
                # Specific searches should be more efficient (results per second)
                print(f"Optimization insight: Specific search efficiency: {specific['efficiency']:.1f}, Broad search efficiency: {broad['efficiency']:.1f}")
    
    @pytest.mark.asyncio
    async def test_pagination_vs_large_limits(self, optimization_service):
        """Test pagination vs large limit strategies"""
        # Compare getting 20 results via pagination vs single large request
        
        # Strategy 1: Single large request
        start_time = time.time()
        large_request_results = await optimization_service.search_predicates(
            search_terms=["pacemaker"],
            limit=20
        )
        large_request_time = time.time() - start_time
        
        # Strategy 2: Two paginated requests
        start_time = time.time()
        page1 = await optimization_service.search_predicates(
            search_terms=["pacemaker"],
            limit=10,
            skip=0
        )
        page2 = await optimization_service.search_predicates(
            search_terms=["pacemaker"],
            limit=10,
            skip=10
        )
        paginated_results = page1 + page2
        paginated_time = time.time() - start_time
        
        # Compare strategies
        print(f"Pagination comparison:")
        print(f"  Large request: {len(large_request_results)} results in {large_request_time:.2f}s")
        print(f"  Paginated: {len(paginated_results)} results in {paginated_time:.2f}s")
        
        # Both strategies should work
        assert len(large_request_results) > 0 or len(paginated_results) > 0, "At least one strategy should return results"
        
        # Performance comparison (no strict assertion as it depends on API behavior)
        if len(large_request_results) > 0 and len(paginated_results) > 0:
            efficiency_large = len(large_request_results) / large_request_time
            efficiency_paginated = len(paginated_results) / paginated_time
            print(f"  Efficiency - Large: {efficiency_large:.1f} results/sec, Paginated: {efficiency_paginated:.1f} results/sec")


# Utility functions for performance testing
def measure_execution_time(func):
    """Decorator to measure execution time of async functions"""
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        execution_time = time.time() - start_time
        print(f"{func.__name__} executed in {execution_time:.3f} seconds")
        return result
    return wrapper


def get_system_resources() -> Dict[str, Any]:
    """Get current system resource usage"""
    process = psutil.Process(os.getpid())
    
    return {
        "memory_mb": process.memory_info().rss / 1024 / 1024,
        "cpu_percent": process.cpu_percent(),
        "open_files": len(process.open_files()),
        "connections": len(process.connections()),
        "threads": process.num_threads()
    }