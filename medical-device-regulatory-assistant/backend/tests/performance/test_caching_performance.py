"""
Caching Performance Tests

Tests for intelligent caching system performance, optimization strategies,
and background cache warming functionality.
"""

import asyncio
import pytest
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch, MagicMock

from services.intelligent_cache import (
    IntelligentCache, CacheStrategy, DataFreshness, QueryPattern, CacheMetrics
)
from services.enhanced_openfda import EnhancedOpenFDAService, QueryOptimization, PerformanceMetrics
from services.openfda import OpenFDAService, FDASearchResult


@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing"""
    mock_client = AsyncMock()
    
    # Mock Redis operations
    mock_client.ping = AsyncMock(return_value=True)
    mock_client.get = AsyncMock(return_value=None)
    mock_client.setex = AsyncMock(return_value=True)
    mock_client.hgetall = AsyncMock(return_value={})
    mock_client.hset = AsyncMock(return_value=True)
    mock_client.expire = AsyncMock(return_value=True)
    mock_client.delete = AsyncMock(return_value=1)
    mock_client.scan_iter = AsyncMock(return_value=iter([]))
    mock_client.pipeline = MagicMock()
    
    # Mock pipeline
    mock_pipeline = AsyncMock()
    mock_pipeline.get = AsyncMock()
    mock_pipeline.hgetall = AsyncMock()
    mock_pipeline.setex = AsyncMock()
    mock_pipeline.hset = AsyncMock()
    mock_pipeline.expire = AsyncMock()
    mock_pipeline.execute = AsyncMock(return_value=[None, {}])
    mock_client.pipeline.return_value = mock_pipeline
    
    return mock_client


@pytest.fixture
def intelligent_cache(mock_redis_client):
    """Create intelligent cache instance for testing"""
    cache = IntelligentCache(
        redis_client=mock_redis_client,
        default_ttl=3600,
        max_memory_mb=64,  # Small for testing
        key_prefix="test_cache"
    )
    return cache


@pytest.fixture
def mock_fda_service():
    """Mock FDA service for testing"""
    service = AsyncMock(spec=OpenFDAService)
    
    # Mock search results
    mock_results = [
        FDASearchResult(
            k_number="K123456",
            device_name="Test Device 1",
            intended_use="Test indication 1",
            product_code="ABC",
            clearance_date="2023-01-01",
            confidence_score=0.9
        ),
        FDASearchResult(
            k_number="K789012",
            device_name="Test Device 2",
            intended_use="Test indication 2",
            product_code="DEF",
            clearance_date="2023-02-01",
            confidence_score=0.8
        )
    ]
    
    service.search_predicates = AsyncMock(return_value=mock_results)
    service.get_device_details = AsyncMock(return_value=mock_results[0])
    service.lookup_device_classification = AsyncMock(return_value=[])
    service.health_check = AsyncMock(return_value={"status": "healthy"})
    
    return service


@pytest.fixture
def enhanced_fda_service(mock_fda_service, intelligent_cache):
    """Create enhanced FDA service for testing"""
    optimization_config = QueryOptimization(
        use_compression=True,
        batch_size=50,
        parallel_requests=2,
        cache_strategy=CacheStrategy.ADAPTIVE,
        freshness_requirement=DataFreshness.RECENT
    )
    
    service = EnhancedOpenFDAService(
        base_service=mock_fda_service,
        intelligent_cache=intelligent_cache,
        optimization_config=optimization_config
    )
    
    return service


class TestIntelligentCache:
    """Test intelligent caching functionality"""
    
    @pytest.mark.asyncio
    async def test_basic_cache_operations(self, intelligent_cache):
        """Test basic cache set/get operations"""
        # Test data
        test_data = {"key": "value", "number": 42, "list": [1, 2, 3]}
        
        # Set data
        success = await intelligent_cache.set_with_strategy(
            "test_namespace",
            "test_key",
            test_data,
            ttl=300,
            strategy=CacheStrategy.LRU
        )
        assert success
        
        # Mock successful cache retrieval
        intelligent_cache.redis_client.get.return_value = json.dumps(test_data)
        intelligent_cache.redis_client.hgetall.return_value = {
            b'created_at': str(time.time()),
            b'expires_at': str(time.time() + 300),
            b'size_bytes': '100',
            b'access_count': '0'
        }
        
        # Get data
        retrieved_data = await intelligent_cache.get_with_freshness_check(
            "test_namespace",
            "test_key",
            required_freshness=DataFreshness.FRESH
        )
        
        assert retrieved_data == test_data
        assert intelligent_cache.metrics.hit_count == 1
    
    @pytest.mark.asyncio
    async def test_freshness_validation(self, intelligent_cache):
        """Test data freshness validation"""
        test_data = {"timestamp": datetime.now().isoformat()}
        
        # Mock stale data (2 hours old)
        old_timestamp = time.time() - 7200  # 2 hours ago
        intelligent_cache.redis_client.get.return_value = json.dumps(test_data)
        intelligent_cache.redis_client.hgetall.return_value = {
            b'created_at': str(old_timestamp),
            b'expires_at': str(old_timestamp + 3600),
            b'size_bytes': '50'
        }
        
        # Should return None for fresh data requirement
        result = await intelligent_cache.get_with_freshness_check(
            "test_namespace",
            "stale_key",
            required_freshness=DataFreshness.FRESH
        )
        assert result is None
        
        # Should return data for stale data requirement
        result = await intelligent_cache.get_with_freshness_check(
            "test_namespace",
            "stale_key",
            required_freshness=DataFreshness.STALE
        )
        assert result == test_data
    
    @pytest.mark.asyncio
    async def test_adaptive_ttl_calculation(self, intelligent_cache):
        """Test adaptive TTL calculation based on usage patterns"""
        # Create a high-frequency pattern
        pattern = QueryPattern(
            pattern_id="test_pattern",
            query_template="search:{STRING}",
            frequency=100,
            avg_response_time=2000.0,  # 2 seconds
            last_accessed=datetime.now(),
            cache_hit_rate=0.8,
            data_size_bytes=1024,
            freshness_requirement=DataFreshness.RECENT
        )
        
        intelligent_cache.query_patterns["test_pattern"] = pattern
        
        # Test adaptive TTL calculation
        ttl = await intelligent_cache._calculate_adaptive_ttl(
            "test_namespace",
            "search:medical_device",
            None,
            CacheStrategy.ADAPTIVE,
            1024
        )
        
        # Should be higher than default due to high frequency and slow response
        assert ttl > intelligent_cache.default_ttl
    
    @pytest.mark.asyncio
    async def test_memory_management(self, intelligent_cache):
        """Test cache memory management and eviction"""
        # Fill cache beyond memory limit
        large_data = {"data": "x" * 1000}  # 1KB of data
        
        # Mock memory usage
        intelligent_cache.metrics.total_size_bytes = intelligent_cache.max_memory_bytes - 500
        
        # Mock scan_iter to return some keys for eviction
        mock_keys = [b"test_cache:ns1:key1", b"test_cache:ns1:key2"]
        intelligent_cache.redis_client.scan_iter.return_value = iter(mock_keys)
        
        # Mock metadata for eviction scoring
        intelligent_cache.redis_client.hgetall.side_effect = [
            {
                b'created_at': str(time.time() - 3600),  # 1 hour old
                b'access_count': '1',
                b'size_bytes': '1000',
                b'priority': '1'
            },
            {
                b'created_at': str(time.time() - 7200),  # 2 hours old
                b'access_count': '0',
                b'size_bytes': '2000',
                b'priority': '1'
            }
        ]
        
        # Set new data that should trigger eviction
        success = await intelligent_cache.set_with_strategy(
            "test_namespace",
            "new_key",
            large_data,
            strategy=CacheStrategy.LRU
        )
        
        assert success
        # Verify eviction was attempted
        assert intelligent_cache.redis_client.delete.called
    
    @pytest.mark.asyncio
    async def test_pattern_analysis(self, intelligent_cache):
        """Test query pattern analysis"""
        # Simulate multiple accesses
        for i in range(10):
            await intelligent_cache._record_access(
                "search_namespace",
                f"search:device_{i % 3}",  # Create patterns
                100.0 + i * 10,  # Varying response times
                i % 2 == 0  # Alternating cache hits
            )
        
        # Get pattern analysis
        analysis = await intelligent_cache.get_pattern_analysis()
        
        assert analysis["total_patterns"] > 0
        assert "top_patterns" in analysis
        assert "recommendations" in analysis
        assert len(analysis["recommendations"]) > 0
    
    @pytest.mark.asyncio
    async def test_background_tasks(self, intelligent_cache):
        """Test background analysis and cleanup tasks"""
        # Start background tasks
        await intelligent_cache.start_background_tasks()
        assert intelligent_cache._running
        
        # Stop background tasks
        await intelligent_cache.stop_background_tasks()
        assert not intelligent_cache._running
    
    @pytest.mark.asyncio
    async def test_health_check(self, intelligent_cache):
        """Test cache health check"""
        health = await intelligent_cache.health_check()
        
        assert "status" in health
        assert "response_time_ms" in health
        assert "metrics" in health
        assert "pattern_count" in health
        assert "memory_usage_bytes" in health


class TestEnhancedOpenFDAService:
    """Test enhanced OpenFDA service with caching"""
    
    @pytest.mark.asyncio
    async def test_optimized_predicate_search_cache_miss(self, enhanced_fda_service):
        """Test optimized predicate search with cache miss"""
        search_terms = ["cardiac", "pacemaker"]
        
        # Mock cache miss
        enhanced_fda_service.cache.get_with_freshness_check = AsyncMock(return_value=None)
        enhanced_fda_service.cache.set_with_strategy = AsyncMock(return_value=True)
        
        results = await enhanced_fda_service.search_predicates_optimized(
            search_terms=search_terms,
            product_code="DXX",
            limit=50
        )
        
        assert len(results) == 2
        assert enhanced_fda_service.metrics.cache_misses == 1
        assert enhanced_fda_service.metrics.total_requests == 1
        
        # Verify cache was called
        enhanced_fda_service.cache.set_with_strategy.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_optimized_predicate_search_cache_hit(self, enhanced_fda_service):
        """Test optimized predicate search with cache hit"""
        search_terms = ["orthopedic", "implant"]
        
        # Mock cache hit
        cached_data = [
            {
                "k_number": "K111111",
                "device_name": "Cached Device",
                "intended_use": "Cached indication",
                "product_code": "XYZ",
                "clearance_date": "2023-03-01",
                "confidence_score": 0.95
            }
        ]
        enhanced_fda_service.cache.get_with_freshness_check = AsyncMock(return_value=cached_data)
        
        results = await enhanced_fda_service.search_predicates_optimized(
            search_terms=search_terms,
            product_code="KWP",
            limit=50
        )
        
        assert len(results) == 1
        assert results[0].k_number == "K111111"
        assert enhanced_fda_service.metrics.cache_hits == 1
        
        # Verify base service was not called
        enhanced_fda_service.base_service.search_predicates.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_device_details_optimization(self, enhanced_fda_service):
        """Test optimized device details retrieval"""
        k_number = "K123456"
        
        # Mock cache miss
        enhanced_fda_service.cache.get_with_freshness_check = AsyncMock(return_value=None)
        enhanced_fda_service.cache.set_with_strategy = AsyncMock(return_value=True)
        
        result = await enhanced_fda_service.get_device_details_optimized(
            k_number=k_number,
            freshness=DataFreshness.FRESH
        )
        
        assert result is not None
        assert result.k_number == k_number
        assert enhanced_fda_service.metrics.cache_misses == 1
        
        # Verify caching with high priority
        enhanced_fda_service.cache.set_with_strategy.assert_called_once()
        call_args = enhanced_fda_service.cache.set_with_strategy.call_args
        assert call_args[1]["priority"] == 3  # High priority for device details
    
    @pytest.mark.asyncio
    async def test_batch_search_predicates(self, enhanced_fda_service):
        """Test batch predicate search with parallel processing"""
        search_requests = [
            {"search_terms": ["cardiac"], "product_code": "DXX", "limit": 25},
            {"search_terms": ["orthopedic"], "product_code": "KWP", "limit": 25},
            {"search_terms": ["surgical"], "product_code": "GEI", "limit": 25}
        ]
        
        # Mock cache misses for all requests
        enhanced_fda_service.cache.get_with_freshness_check = AsyncMock(return_value=None)
        enhanced_fda_service.cache.set_with_strategy = AsyncMock(return_value=True)
        
        start_time = time.time()
        results = await enhanced_fda_service.batch_search_predicates(
            search_requests=search_requests,
            max_parallel=2
        )
        end_time = time.time()
        
        assert len(results) == 3
        assert all(len(result) == 2 for result in results)  # Mock returns 2 results each
        
        # Should be faster than sequential processing
        assert end_time - start_time < 2.0  # Should complete quickly with mocking
    
    @pytest.mark.asyncio
    async def test_cache_warming(self, enhanced_fda_service):
        """Test cache warming functionality"""
        # Mock cache misses for warming queries
        enhanced_fda_service.cache.get_with_freshness_check = AsyncMock(return_value=None)
        enhanced_fda_service.cache.set_with_strategy = AsyncMock(return_value=True)
        
        warming_results = await enhanced_fda_service.warm_popular_caches()
        
        assert "queries_warmed" in warming_results
        assert "queries_failed" in warming_results
        assert warming_results["queries_warmed"] > 0
        assert enhanced_fda_service.metrics.background_updates > 0
    
    @pytest.mark.asyncio
    async def test_background_cache_warming(self, enhanced_fda_service):
        """Test background cache warming task"""
        # Start background warming with short interval
        await enhanced_fda_service.start_background_cache_warming(interval_minutes=0.01)  # 0.6 seconds
        
        assert enhanced_fda_service._running
        assert len(enhanced_fda_service._warming_tasks) > 0
        
        # Wait a bit for warming to occur
        await asyncio.sleep(0.1)
        
        # Stop background warming
        await enhanced_fda_service.stop_background_cache_warming()
        
        assert not enhanced_fda_service._running
        assert len(enhanced_fda_service._warming_tasks) == 0
    
    @pytest.mark.asyncio
    async def test_compression_functionality(self, enhanced_fda_service):
        """Test data compression for large result sets"""
        # Large test data
        large_data = [{"key": f"value_{i}", "data": "x" * 100} for i in range(50)]
        
        # Test compression
        compressed = await enhanced_fda_service._compress_data(large_data)
        assert isinstance(compressed, str)
        assert len(compressed) > 0
        
        # Test decompression
        decompressed = await enhanced_fda_service._decompress_data(compressed)
        assert decompressed == large_data
        
        # Verify compression ratio is tracked
        assert enhanced_fda_service.metrics.compression_ratio > 0
    
    @pytest.mark.asyncio
    async def test_performance_metrics(self, enhanced_fda_service):
        """Test performance metrics collection"""
        # Simulate some operations
        enhanced_fda_service.metrics.total_requests = 100
        enhanced_fda_service.metrics.cache_hits = 70
        enhanced_fda_service.metrics.cache_misses = 30
        enhanced_fda_service.metrics.avg_response_time_ms = 150.0
        
        metrics = await enhanced_fda_service.get_performance_metrics()
        
        assert "api_metrics" in metrics
        assert "cache_analysis" in metrics
        assert "optimization_config" in metrics
        assert "background_tasks" in metrics
        
        api_metrics = metrics["api_metrics"]
        assert api_metrics["cache_hit_rate"] == 0.7  # 70/100
        assert api_metrics["total_requests"] == 100
        assert api_metrics["avg_response_time_ms"] == 150.0
    
    @pytest.mark.asyncio
    async def test_health_check_comprehensive(self, enhanced_fda_service):
        """Test comprehensive health check"""
        # Mock health checks
        enhanced_fda_service.base_service.health_check = AsyncMock(
            return_value={"status": "healthy", "response_time": 100}
        )
        enhanced_fda_service.cache.health_check = AsyncMock(
            return_value={"status": "healthy", "memory_usage": 50}
        )
        
        health = await enhanced_fda_service.health_check()
        
        assert health["status"] == "healthy"
        assert "base_service" in health
        assert "intelligent_cache" in health
        assert "performance" in health
        assert "timestamp" in health
    
    @pytest.mark.asyncio
    async def test_cache_priority_calculation(self, enhanced_fda_service):
        """Test cache priority calculation"""
        # Test with common medical terms
        priority1 = enhanced_fda_service._calculate_cache_priority(
            ["cardiac", "pacemaker"], 25
        )
        
        # Test with uncommon terms
        priority2 = enhanced_fda_service._calculate_cache_priority(
            ["unusual", "device"], 5
        )
        
        # Common terms with many results should have higher priority
        assert priority1 > priority2
        assert priority1 <= 5  # Should not exceed max priority
    
    @pytest.mark.asyncio
    async def test_query_optimization_config(self, enhanced_fda_service):
        """Test query optimization configuration"""
        config = enhanced_fda_service.config
        
        assert config.use_compression is True
        assert config.batch_size == 50
        assert config.parallel_requests == 2
        assert config.cache_strategy == CacheStrategy.ADAPTIVE
        assert config.freshness_requirement == DataFreshness.RECENT


class TestCachePerformanceBenchmarks:
    """Performance benchmark tests for caching system"""
    
    @pytest.mark.asyncio
    async def test_cache_response_time_benchmark(self, intelligent_cache):
        """Benchmark cache response times"""
        test_data = {"benchmark": "data", "size": "medium"}
        
        # Mock successful operations
        intelligent_cache.redis_client.get.return_value = json.dumps(test_data)
        intelligent_cache.redis_client.hgetall.return_value = {
            b'created_at': str(time.time()),
            b'expires_at': str(time.time() + 3600),
            b'size_bytes': '100'
        }
        
        # Benchmark cache get operations
        start_time = time.time()
        iterations = 100
        
        for _ in range(iterations):
            await intelligent_cache.get_with_freshness_check(
                "benchmark",
                "test_key",
                required_freshness=DataFreshness.RECENT
            )
        
        end_time = time.time()
        avg_time_ms = ((end_time - start_time) / iterations) * 1000
        
        # Cache operations should be fast (< 10ms per operation with mocking)
        assert avg_time_ms < 10.0
        print(f"Average cache get time: {avg_time_ms:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_memory_usage_efficiency(self, intelligent_cache):
        """Test memory usage efficiency"""
        # Test with various data sizes
        data_sizes = [100, 1000, 10000, 100000]  # bytes
        
        for size in data_sizes:
            test_data = {"data": "x" * size}
            
            success = await intelligent_cache.set_with_strategy(
                "memory_test",
                f"key_{size}",
                test_data,
                strategy=CacheStrategy.LRU
            )
            
            assert success
        
        # Memory tracking should be working
        assert intelligent_cache.metrics.total_size_bytes > 0
    
    @pytest.mark.asyncio
    async def test_concurrent_access_performance(self, intelligent_cache):
        """Test performance under concurrent access"""
        test_data = {"concurrent": "test"}
        
        # Mock cache operations
        intelligent_cache.redis_client.get.return_value = json.dumps(test_data)
        intelligent_cache.redis_client.hgetall.return_value = {
            b'created_at': str(time.time()),
            b'expires_at': str(time.time() + 3600),
            b'size_bytes': '50'
        }
        
        async def concurrent_operation(key_suffix: int):
            return await intelligent_cache.get_with_freshness_check(
                "concurrent_test",
                f"key_{key_suffix}",
                required_freshness=DataFreshness.RECENT
            )
        
        # Run concurrent operations
        start_time = time.time()
        tasks = [concurrent_operation(i) for i in range(50)]
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # All operations should succeed
        assert all(result == test_data for result in results)
        
        # Should complete quickly even with concurrency
        total_time = end_time - start_time
        assert total_time < 1.0  # Should complete within 1 second with mocking
        print(f"50 concurrent operations completed in {total_time:.3f}s")


if __name__ == "__main__":
    # Run performance tests
    pytest.main([__file__, "-v", "--tb=short"])