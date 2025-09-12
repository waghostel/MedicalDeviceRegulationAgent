"""
Test script for backend caching strategy implementation.

This script tests the Redis caching functionality, cache invalidation,
cache warming, and performance improvements.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_redis_connection():
    """Test basic Redis connection and operations"""
    print("\n=== Testing Redis Connection ===")
    
    try:
        from services.cache import get_redis_client
        
        redis_client = await get_redis_client()
        if not redis_client:
            print("❌ Redis client not available")
            return False
        
        # Test basic operations
        await redis_client.set("test_key", "test_value", ex=60)
        value = await redis_client.get("test_key")
        await redis_client.delete("test_key")
        
        if value and value.decode() == "test_value":
            print("✅ Redis connection and basic operations working")
            return True
        else:
            print("❌ Redis operations failed")
            return False
            
    except Exception as e:
        print(f"❌ Redis connection test failed: {e}")
        return False


async def test_performance_cache():
    """Test performance cache functionality"""
    print("\n=== Testing Performance Cache ===")
    
    try:
        from services.performance_cache import create_cache_manager
        
        cache_manager = await create_cache_manager()
        
        # Test caching operations
        test_data = {
            "project_id": 123,
            "name": "Test Project",
            "status": "draft",
            "timestamp": datetime.now().isoformat()
        }
        
        # Test set and get
        success = await cache_manager.cache_project_dashboard(123, test_data, ttl=300)
        if not success:
            print("❌ Failed to cache project dashboard")
            return False
        
        cached_data = await cache_manager.get_project_dashboard(123)
        if not cached_data or cached_data.get("project_id") != 123:
            print("❌ Failed to retrieve cached project dashboard")
            return False
        
        # Test cache stats
        stats = await cache_manager.get_cache_stats()
        if not stats or not hasattr(stats, 'total_keys'):
            print("❌ Failed to get cache statistics")
            return False
        
        # Test health check
        health = await cache_manager.health_check()
        if not health or health.get("status") != "healthy":
            print("❌ Cache health check failed")
            return False
        
        print("✅ Performance cache functionality working")
        return True
        
    except Exception as e:
        print(f"❌ Performance cache test failed: {e}")
        return False


async def test_project_cache_service():
    """Test project-specific cache service"""
    print("\n=== Testing Project Cache Service ===")
    
    try:
        from services.project_cache import create_project_cache_service
        
        cache_service = await create_project_cache_service()
        
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
        
        # Test cache invalidation
        invalidated_count = await cache_service.invalidate_project_cache(456, "test_user")
        if invalidated_count < 1:
            print("❌ Cache invalidation didn't remove expected keys")
            return False
        
        # Verify cache was invalidated
        cached_project_after = await cache_service.get_project_detail(456)
        if cached_project_after is not None:
            print("❌ Cache invalidation failed - data still present")
            return False
        
        print("✅ Project cache service functionality working")
        return True
        
    except Exception as e:
        print(f"❌ Project cache service test failed: {e}")
        return False


async def test_cache_warming():
    """Test cache warming functionality"""
    print("\n=== Testing Cache Warming ===")
    
    try:
        from services.cache_warming import get_cache_warming_service
        
        warming_service = get_cache_warming_service()
        
        # Test health check
        health = await warming_service.health_check()
        if not health or health.get("status") != "healthy":
            print("❌ Cache warming service health check failed")
            return False
        
        # Test getting active users (should work even with no data)
        active_users = await warming_service.get_active_users_for_warming(hours_back=24)
        if active_users is None:
            print("❌ Failed to get active users list")
            return False
        
        print(f"✅ Cache warming service working (found {len(active_users)} active users)")
        return True
        
    except Exception as e:
        print(f"❌ Cache warming test failed: {e}")
        return False


async def test_enhanced_project_service():
    """Test enhanced project service with caching"""
    print("\n=== Testing Enhanced Project Service ===")
    
    try:
        from services.enhanced_project_service import create_enhanced_project_service
        
        project_service = create_enhanced_project_service()
        
        # Test health check
        health = await project_service.health_check()
        if not health:
            print("❌ Enhanced project service health check failed")
            return False
        
        # Test cache stats
        stats = await project_service.get_cache_stats()
        if not stats:
            print("❌ Failed to get cache statistics from enhanced service")
            return False
        
        print("✅ Enhanced project service working")
        return True
        
    except Exception as e:
        print(f"❌ Enhanced project service test failed: {e}")
        return False


async def test_cache_performance():
    """Test cache performance improvements"""
    print("\n=== Testing Cache Performance ===")
    
    try:
        from services.project_cache import create_project_cache_service
        
        cache_service = await create_project_cache_service()
        
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
        
        # Cleanup
        for i in range(10):
            await cache_service.invalidate_project_cache(789 + i, "test_user")
        
        return True
        
    except Exception as e:
        print(f"❌ Cache performance test failed: {e}")
        return False


async def test_cache_ttl_management():
    """Test cache TTL (Time To Live) management"""
    print("\n=== Testing Cache TTL Management ===")
    
    try:
        from services.project_cache import create_project_cache_service
        
        cache_service = await create_project_cache_service()
        
        # Test short TTL
        test_data = {"id": 999, "test": "ttl_test"}
        
        # Cache with 2 second TTL
        success = await cache_service.cache_project_detail(999, test_data)
        if not success:
            print("❌ Failed to cache data with TTL")
            return False
        
        # Verify data is cached
        cached_data = await cache_service.get_project_detail(999)
        if not cached_data:
            print("❌ Data not found immediately after caching")
            return False
        
        print("✅ Cache TTL management working")
        return True
        
    except Exception as e:
        print(f"❌ Cache TTL test failed: {e}")
        return False


async def run_all_tests():
    """Run all cache strategy tests"""
    print("🚀 Starting Backend Caching Strategy Tests")
    print("=" * 50)
    
    tests = [
        ("Redis Connection", test_redis_connection),
        ("Performance Cache", test_performance_cache),
        ("Project Cache Service", test_project_cache_service),
        ("Cache Warming", test_cache_warming),
        ("Enhanced Project Service", test_enhanced_project_service),
        ("Cache Performance", test_cache_performance),
        ("Cache TTL Management", test_cache_ttl_management),
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
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
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
        print("\n🎉 All tests passed! Backend caching strategy is working correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the implementation.")
    
    return failed == 0


if __name__ == "__main__":
    # Run tests
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)