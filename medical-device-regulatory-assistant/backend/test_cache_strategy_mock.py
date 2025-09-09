"""
Test script for backend caching strategy with mock Redis implementation.

This script tests the caching functionality using a mock Redis implementation
when Redis server is not available, demonstrating the caching logic works correctly.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from unittest.mock import AsyncMock, MagicMock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockRedis:
    """Mock Redis implementation for testing"""
    
    def __init__(self):
        self._data = {}
        self._ttl = {}
    
    async def ping(self):
        return True
    
    async def set(self, key: str, value: str, ex: Optional[int] = None):
        self._data[key] = value
        if ex:
            self._ttl[key] = time.time() + ex
        return True
    
    async def setex(self, key: str, ttl: int, value: str):
        self._data[key] = value
        self._ttl[key] = time.time() + ttl
        return True
    
    async def get(self, key: str):
        if key in self._ttl and time.time() > self._ttl[key]:
            del self._data[key]
            del self._ttl[key]
            return None
        return self._data.get(key)
    
    async def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self._data:
                del self._data[key]
                deleted += 1
            if key in self._ttl:
                del self._ttl[key]
        return deleted
    
    async def exists(self, key: str):
        if key in self._ttl and time.time() > self._ttl[key]:
            del self._data[key]
            del self._ttl[key]
            return 0
        return 1 if key in self._data else 0
    
    async def ttl(self, key: str):
        if key not in self._ttl:
            return -1
        remaining = self._ttl[key] - time.time()
        return int(remaining) if remaining > 0 else -2
    
    async def expire(self, key: str, ttl: int):
        if key in self._data:
            self._ttl[key] = time.time() + ttl
            return True
        return False
    
    async def hset(self, key: str, mapping: Dict[str, Any]):
        if key not in self._data:
            self._data[key] = {}
        if isinstance(self._data[key], str):
            self._data[key] = {}
        self._data[key].update(mapping)
        return len(mapping)
    
    async def hget(self, key: str, field: str):
        if key in self._data and isinstance(self._data[key], dict):
            return self._data[key].get(field)
        return None
    
    async def hincrby(self, key: str, field: str, amount: int = 1):
        if key not in self._data:
            self._data[key] = {}
        if isinstance(self._data[key], str):
            self._data[key] = {}
        current = int(self._data[key].get(field, 0))
        self._data[key][field] = str(current + amount)
        return current + amount
    
    async def scan_iter(self, match: str = "*"):
        """Mock scan_iter for pattern matching"""
        import fnmatch
        for key in self._data.keys():
            if fnmatch.fnmatch(key, match):
                yield key
    
    async def info(self):
        return {
            'redis_version': '7.0.0-mock',
            'connected_clients': 1,
            'used_memory_human': f'{len(str(self._data))}B',
            'db0': {'keys': len(self._data)}
        }
    
    async def type(self, key: str):
        if key not in self._data:
            return 'none'
        value = self._data[key]
        if isinstance(value, dict):
            return 'hash'
        return 'string'
    
    async def memory_usage(self, key: str):
        if key in self._data:
            return len(str(self._data[key]))
        return None
    
    async def close(self):
        pass


async def test_mock_redis():
    """Test mock Redis implementation"""
    print("\n=== Testing Mock Redis ===")
    
    try:
        redis_client = MockRedis()
        
        # Test basic operations
        await redis_client.set("test_key", "test_value", ex=60)
        value = await redis_client.get("test_key")
        
        if value != "test_value":
            print("❌ Mock Redis basic operations failed")
            return False
        
        # Test TTL
        ttl = await redis_client.ttl("test_key")
        if ttl <= 0:
            print("❌ Mock Redis TTL failed")
            return False
        
        # Test delete
        deleted = await redis_client.delete("test_key")
        if deleted != 1:
            print("❌ Mock Redis delete failed")
            return False
        
        print("✅ Mock Redis implementation working")
        return True
        
    except Exception as e:
        print(f"❌ Mock Redis test failed: {e}")
        return False


async def test_performance_cache_with_mock():
    """Test performance cache with mock Redis"""
    print("\n=== Testing Performance Cache with Mock Redis ===")
    
    try:
        from services.performance_cache import PerformanceCache
        
        mock_redis = MockRedis()
        cache = PerformanceCache(mock_redis)
        
        # Test caching operations
        test_data = {
            "project_id": 123,
            "name": "Test Project",
            "status": "draft",
            "timestamp": datetime.now().isoformat()
        }
        
        # Test set and get
        success = await cache.set("test_project", "123", test_data, ttl=300)
        if not success:
            print("❌ Failed to cache data")
            return False
        
        cached_data = await cache.get("test_project", "123")
        if not cached_data or cached_data.get("project_id") != 123:
            print("❌ Failed to retrieve cached data")
            return False
        
        # Test exists
        exists = await cache.exists("test_project", "123")
        if not exists:
            print("❌ Cache exists check failed")
            return False
        
        # Test delete
        deleted = await cache.delete("test_project", "123")
        if not deleted:
            print("❌ Cache delete failed")
            return False
        
        # Verify deletion
        cached_data_after = await cache.get("test_project", "123")
        if cached_data_after is not None:
            print("❌ Data still present after deletion")
            return False
        
        print("✅ Performance cache with mock Redis working")
        return True
        
    except Exception as e:
        print(f"❌ Performance cache with mock test failed: {e}")
        return False


async def test_project_cache_service_with_mock():
    """Test project cache service with mock Redis"""
    print("\n=== Testing Project Cache Service with Mock Redis ===")
    
    try:
        from services.project_cache import ProjectCacheService
        
        mock_redis = MockRedis()
        cache_service = ProjectCacheService(mock_redis)
        
        # Test project detail caching
        project_data = {
            "id": 456,
            "name": "Test Project Cache",
            "description": "Testing project cache functionality",
            "status": "in_progress",
            "created_at": datetime.now().isoformat()
        }
        
        success = await cache_service.cache_project_detail(456, project_data)
        if not success:
            print("❌ Failed to cache project detail")
            return False
        
        cached_project = await cache_service.get_project_detail(456)
        if not cached_project or cached_project.get("id") != 456:
            print("❌ Failed to retrieve cached project detail")
            return False
        
        # Test project list caching
        projects_list = [project_data]
        filters = {"search": None, "status": "in_progress", "limit": 50}
        
        success = await cache_service.cache_project_list("test_user", filters, projects_list)
        if not success:
            print("❌ Failed to cache project list")
            return False
        
        cached_list = await cache_service.get_project_list("test_user", filters)
        if not cached_list or len(cached_list) != 1:
            print("❌ Failed to retrieve cached project list")
            return False
        
        # Test project dashboard caching
        dashboard_data = {
            "project": project_data,
            "classification": None,
            "predicate_devices": [],
            "progress": {"overallProgress": 25.0}
        }
        
        success = await cache_service.cache_project_dashboard(456, dashboard_data)
        if not success:
            print("❌ Failed to cache project dashboard")
            return False
        
        cached_dashboard = await cache_service.get_project_dashboard(456)
        if not cached_dashboard or cached_dashboard.get("project", {}).get("id") != 456:
            print("❌ Failed to retrieve cached project dashboard")
            return False
        
        # Test cache invalidation
        invalidated_count = await cache_service.invalidate_project_cache(456, "test_user")
        if invalidated_count < 1:
            print("❌ Cache invalidation didn't remove expected keys")
            return False
        
        print("✅ Project cache service with mock Redis working")
        return True
        
    except Exception as e:
        print(f"❌ Project cache service with mock test failed: {e}")
        return False


async def test_cache_performance_with_mock():
    """Test cache performance with mock Redis"""
    print("\n=== Testing Cache Performance with Mock Redis ===")
    
    try:
        from services.project_cache import ProjectCacheService
        
        mock_redis = MockRedis()
        cache_service = ProjectCacheService(mock_redis)
        
        # Test data
        large_project_data = {
            "id": 789,
            "name": "Performance Test Project",
            "description": "A" * 1000,  # Large description
            "metadata": {"key" + str(i): "value" + str(i) for i in range(100)},
            "timestamp": datetime.now().isoformat()
        }
        
        # Test cache write performance
        start_time = time.time()
        for i in range(10):
            await cache_service.cache_project_detail(789 + i, large_project_data)
        write_time = time.time() - start_time
        
        # Test cache read performance
        start_time = time.time()
        for i in range(10):
            cached_data = await cache_service.get_project_detail(789 + i)
            if not cached_data:
                print(f"❌ Failed to read cached data for project {789 + i}")
                return False
        read_time = time.time() - start_time
        
        print(f"✅ Cache performance test completed:")
        print(f"   - Write time for 10 items: {write_time:.3f}s ({write_time/10:.3f}s per item)")
        print(f"   - Read time for 10 items: {read_time:.3f}s ({read_time/10:.3f}s per item)")
        
        # Performance should be very fast with mock
        if write_time > 1.0 or read_time > 1.0:
            print("❌ Performance seems slower than expected")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Cache performance with mock test failed: {e}")
        return False


async def test_cache_ttl_with_mock():
    """Test cache TTL with mock Redis"""
    print("\n=== Testing Cache TTL with Mock Redis ===")
    
    try:
        from services.project_cache import ProjectCacheService
        
        mock_redis = MockRedis()
        cache_service = ProjectCacheService(mock_redis)
        
        # Test short TTL
        test_data = {"id": 999, "test": "ttl_test"}
        
        # Cache with short TTL
        success = await cache_service.cache_project_detail(999, test_data)
        if not success:
            print("❌ Failed to cache data with TTL")
            return False
        
        # Verify data is cached
        cached_data = await cache_service.get_project_detail(999)
        if not cached_data:
            print("❌ Data not found immediately after caching")
            return False
        
        # Test TTL functionality by manipulating mock time
        # (In real Redis, we'd wait for expiration)
        mock_redis._ttl["mdra:project_detail:999"] = time.time() - 1  # Expired
        
        # Try to get expired data
        expired_data = await cache_service.get_project_detail(999)
        if expired_data is not None:
            print("❌ Expired data was still returned")
            return False
        
        print("✅ Cache TTL with mock Redis working")
        return True
        
    except Exception as e:
        print(f"❌ Cache TTL with mock test failed: {e}")
        return False


async def test_cache_invalidation_strategies():
    """Test different cache invalidation strategies"""
    print("\n=== Testing Cache Invalidation Strategies ===")
    
    try:
        from services.project_cache import ProjectCacheService, CacheInvalidationEvent
        
        mock_redis = MockRedis()
        cache_service = ProjectCacheService(mock_redis)
        
        # Set up test data
        project_data = {"id": 100, "name": "Invalidation Test"}
        dashboard_data = {"project": project_data, "progress": 50}
        
        # Cache multiple types of data
        await cache_service.cache_project_detail(100, project_data)
        await cache_service.cache_project_dashboard(100, dashboard_data)
        await cache_service.cache_project_export(100, "json", {"export": "data"})
        
        # Test project update invalidation event
        event = CacheInvalidationEvent(
            event_type='project_update',
            project_id=100,
            user_id='test_user',
            timestamp=datetime.now(timezone.utc)
        )
        
        result = await cache_service.handle_cache_invalidation_event(event)
        if not result.get('success'):
            print("❌ Cache invalidation event handling failed")
            return False
        
        # Test classification update invalidation (should preserve detail cache)
        await cache_service.cache_project_detail(100, project_data)
        await cache_service.cache_project_dashboard(100, dashboard_data)
        
        classification_event = CacheInvalidationEvent(
            event_type='classification_update',
            project_id=100,
            user_id='test_user',
            timestamp=datetime.now(timezone.utc)
        )
        
        result = await cache_service.handle_cache_invalidation_event(classification_event)
        if not result.get('success'):
            print("❌ Classification update invalidation failed")
            return False
        
        # Detail cache should still exist
        cached_detail = await cache_service.get_project_detail(100)
        if not cached_detail:
            print("❌ Detail cache was incorrectly invalidated")
            return False
        
        print("✅ Cache invalidation strategies working")
        return True
        
    except Exception as e:
        print(f"❌ Cache invalidation strategies test failed: {e}")
        return False


async def test_cache_warming_logic():
    """Test cache warming logic without database dependencies"""
    print("\n=== Testing Cache Warming Logic ===")
    
    try:
        from services.cache_warming import CacheWarmingService, CacheWarmingConfig
        
        # Test configuration
        config = CacheWarmingConfig()
        if config.DASHBOARD_WARMING_INTERVAL <= 0:
            print("❌ Invalid warming interval configuration")
            return False
        
        # Test warming service creation
        warming_service = CacheWarmingService()
        if not warming_service.config:
            print("❌ Warming service configuration not loaded")
            return False
        
        # Test health check (should work without Redis)
        health = await warming_service.health_check()
        if not health:
            print("❌ Warming service health check failed")
            return False
        
        print("✅ Cache warming logic working")
        return True
        
    except Exception as e:
        print(f"❌ Cache warming logic test failed: {e}")
        return False


async def run_all_mock_tests():
    """Run all cache strategy tests with mock implementations"""
    print("🚀 Starting Backend Caching Strategy Tests (Mock Redis)")
    print("=" * 60)
    
    tests = [
        ("Mock Redis Implementation", test_mock_redis),
        ("Performance Cache with Mock", test_performance_cache_with_mock),
        ("Project Cache Service with Mock", test_project_cache_service_with_mock),
        ("Cache Performance with Mock", test_cache_performance_with_mock),
        ("Cache TTL with Mock", test_cache_ttl_with_mock),
        ("Cache Invalidation Strategies", test_cache_invalidation_strategies),
        ("Cache Warming Logic", test_cache_warming_logic),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! Backend caching strategy logic is working correctly.")
        print("💡 Note: These tests use mock Redis. For full functionality, install and run Redis server.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the implementation.")
    
    return failed == 0


if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_mock_tests())
    exit(0 if success else 1)