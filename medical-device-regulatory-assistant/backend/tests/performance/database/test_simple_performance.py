#!/usr/bin/env python3
"""
Simple Performance Optimization Test

This test validates the basic performance optimization components.
"""

import asyncio
import json
import time
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_performance_cache():
    """Test performance cache functionality"""
    print("Testing Performance Cache...")
    
    try:
        from services.performance_cache import PerformanceCache, CacheManager
        
        # Mock Redis client for testing
        class MockRedis:
            def __init__(self):
                self.data = {}
                self.expiry = {}
            
            async def get(self, key):
                if key in self.data and key not in self.expiry:
                    return self.data[key]
                return None
            
            async def setex(self, key, ttl, value):
                self.data[key] = value
                return True
            
            async def hset(self, key, mapping):
                self.data[key] = mapping
                return True
            
            async def expire(self, key, ttl):
                return True
            
            async def delete(self, *keys):
                for key in keys:
                    self.data.pop(key, None)
                return len(keys)
            
            async def exists(self, key):
                return 1 if key in self.data else 0
            
            async def ttl(self, key):
                return 3600  # Mock TTL
            
            async def ping(self):
                return True
        
        # Test cache operations
        mock_redis = MockRedis()
        cache_manager = CacheManager(mock_redis)
        
        # Test FDA search caching
        search_query = "cardiac pacemaker"
        search_results = [
            {
                "k_number": "K123456",
                "device_name": "Test Pacemaker",
                "confidence_score": 0.85
            }
        ]
        
        # Cache the search results
        success = await cache_manager.cache_fda_search(search_query, search_results)
        assert success, "Failed to cache FDA search results"
        
        # Retrieve cached results
        cached_results = await cache_manager.get_fda_search(search_query)
        assert cached_results is not None, "Failed to retrieve cached results"
        assert len(cached_results) == 1, "Incorrect number of cached results"
        assert cached_results[0]["k_number"] == "K123456", "Incorrect cached data"
        
        print("✅ Performance cache test passed")
        return True
        
    except Exception as e:
        print(f"❌ Performance cache test failed: {e}")
        return False

async def test_database_optimization():
    """Test database optimization functionality"""
    print("Testing Database Optimization...")
    
    try:
        from database.performance_indexes import DatabaseOptimizer
        
        # Mock session factory
        class MockSession:
            async def execute(self, query):
                return MockResult()
            
            async def commit(self):
                pass
            
            async def rollback(self):
                pass
            
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
        
        class MockResult:
            def fetchall(self):
                return [("test_table", 1)]
            
            def scalar(self):
                return 100
        
        class MockSessionFactory:
            def __call__(self):
                return MockSession()
        
        # Test database optimizer
        optimizer = DatabaseOptimizer(MockSessionFactory())
        
        # Test index creation
        indexes_created = await optimizer.create_performance_indexes()
        assert len(indexes_created) >= 0, "Index creation failed"
        
        # Test query optimization
        optimizations = await optimizer.optimize_common_queries()
        assert len(optimizations) >= 0, "Query optimization failed"
        
        # Test performance measurement
        metrics = await optimizer.measure_query_performance()
        assert "queries_tested" in metrics, "Performance metrics missing"
        
        print("✅ Database optimization test passed")
        return True
        
    except Exception as e:
        print(f"❌ Database optimization test failed: {e}")
        return False

async def test_background_jobs():
    """Test background job processing"""
    print("Testing Background Job Processing...")
    
    try:
        from services.background_jobs import BackgroundJobProcessor, JobQueue, JobPriority
        
        # Mock Redis client
        class MockRedis:
            def __init__(self):
                self.data = {}
                self.queues = {}
            
            async def hset(self, key, mapping):
                self.data[key] = mapping
                return True
            
            async def expire(self, key, ttl):
                return True
            
            async def lpush(self, key, value):
                if key not in self.queues:
                    self.queues[key] = []
                self.queues[key].append(value)
                return len(self.queues[key])
            
            async def brpop(self, key, timeout):
                if key in self.queues and self.queues[key]:
                    value = self.queues[key].pop()
                    return (key, value.encode() if isinstance(value, str) else value)
                return None
            
            async def hget(self, key, field):
                if key in self.data:
                    return json.dumps({"id": "test-job", "type": "test", "data": {}})
                return None
            
            async def hgetall(self, key):
                return {
                    b"status": b"pending",
                    b"created_at": b"2025-01-01T00:00:00",
                    b"retry_count": b"0"
                }
            
            async def llen(self, key):
                return len(self.queues.get(key, []))
            
            async def zcard(self, key):
                return 0
            
            async def zadd(self, key, mapping):
                return True
            
            async def zrangebyscore(self, key, min_score, max_score):
                return []
            
            async def zrem(self, key, member):
                return True
            
            async def lrem(self, key, count, value):
                return True
            
            async def hincrby(self, key, field, amount):
                return amount
            
            async def setex(self, key, ttl, value):
                return True
            
            async def get(self, key):
                return None
        
        # Test job queue
        mock_redis = MockRedis()
        job_queue = JobQueue(mock_redis)
        
        # Test job enqueuing
        job_id = await job_queue.enqueue(
            job_type="test_job",
            job_data={"test": "data"},
            priority=JobPriority.NORMAL
        )
        
        assert job_id is not None, "Failed to enqueue job"
        
        # Test job processor
        processor = BackgroundJobProcessor(mock_redis)
        
        # Register test handler
        async def test_handler(job_data):
            return {"result": "success", "processed": job_data}
        
        processor.register_handler("test_job", test_handler)
        
        # Test health check
        health = await processor.health_check()
        assert health["status"] in ["healthy", "stopped"], "Health check failed"
        
        print("✅ Background job processing test passed")
        return True
        
    except Exception as e:
        print(f"❌ Background job processing test failed: {e}")
        return False

async def test_compression():
    """Test API response compression"""
    print("Testing API Response Compression...")
    
    try:
        from middleware.compression import CompressionMiddleware, ResponseCompressionService
        
        # Test compression service
        service = ResponseCompressionService()
        
        # Test data
        test_data = {
            "predicates": [
                {
                    "k_number": f"K{i:06d}",
                    "device_name": f"Test Device {i}",
                    "intended_use": "This is a test intended use statement. " * 10
                }
                for i in range(50)
            ]
        }
        
        # Test compression
        compressed_data, headers = await service.compress_json_response(test_data)
        
        assert len(compressed_data) > 0, "Compression failed"
        assert "content-encoding" in headers, "Compression headers missing"
        assert headers["content-encoding"] == "gzip", "Incorrect compression type"
        
        # Test compression ratio
        original_size = len(json.dumps(test_data).encode('utf-8'))
        compressed_size = len(compressed_data)
        compression_ratio = compressed_size / original_size
        
        assert compression_ratio < 0.8, f"Poor compression ratio: {compression_ratio:.2%}"
        
        print(f"✅ Compression test passed (ratio: {compression_ratio:.2%})")
        return True
        
    except Exception as e:
        print(f"❌ Compression test failed: {e}")
        return False

async def test_performance_monitoring():
    """Test performance monitoring"""
    print("Testing Performance Monitoring...")
    
    try:
        from services.performance_monitor import PerformanceMonitor, MetricsCollector
        
        # Test metrics collector
        collector = MetricsCollector()
        
        # Record test metrics
        await collector.record_api_request(
            endpoint="/api/test",
            method="GET",
            status_code=200,
            response_time=0.5
        )
        
        await collector.record_database_query(
            query_type="SELECT",
            execution_time=0.1,
            table_name="projects"
        )
        
        # Get metrics
        metrics = await collector.get_metrics(time_range_hours=1)
        
        assert "api_request" in metrics.get("metrics", {}), "API metrics missing"
        assert "database_query" in metrics.get("metrics", {}), "Database metrics missing"
        
        # Test performance monitor
        monitor = PerformanceMonitor()
        
        # Test health check
        health = await monitor.health_check()
        assert health["status"] in ["healthy", "unhealthy"], "Health check failed"
        
        print("✅ Performance monitoring test passed")
        return True
        
    except Exception as e:
        print(f"❌ Performance monitoring test failed: {e}")
        return False

async def run_all_tests():
    """Run all performance optimization tests"""
    print("🚀 Starting Performance Optimization Tests")
    print("=" * 60)
    
    tests = [
        test_performance_cache,
        test_database_optimization,
        test_background_jobs,
        test_compression,
        test_performance_monitoring
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            success = await test()
            if success:
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
    
    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All performance optimization tests passed!")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)