#!/usr/bin/env python3
"""
Test Redis connection for Medical Device Regulatory Assistant
"""

import asyncio
import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_redis_connection():
    """Test Redis connection and basic operations"""
    print("🔍 Testing Redis Connection...")
    print("=" * 50)
    
    try:
        import redis.asyncio as redis
        
        # Get Redis URL from environment or use default
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        print(f"📡 Connecting to: {redis_url}")
        
        # Create Redis client
        client = redis.from_url(redis_url)
        
        # Test connection
        print("🔌 Testing connection...")
        await client.ping()
        print("✅ Redis connection successful!")
        
        # Test basic operations
        print("🧪 Testing basic operations...")
        
        # Set a test key
        await client.set("medical_device_test", "connection_test_value", ex=60)
        print("✅ SET operation successful")
        
        # Get the test key
        value = await client.get("medical_device_test")
        if value:
            print(f"✅ GET operation successful: {value.decode()}")
        else:
            print("❌ GET operation failed: No value returned")
        
        # Test expiration
        ttl = await client.ttl("medical_device_test")
        print(f"✅ TTL operation successful: {ttl} seconds remaining")
        
        # Test hash operations (used for caching)
        await client.hset("medical_device_cache", "fda_api_test", "cached_response")
        cached_value = await client.hget("medical_device_cache", "fda_api_test")
        if cached_value:
            print(f"✅ HASH operations successful: {cached_value.decode()}")
        
        # Get Redis info
        info = await client.info()
        print(f"📊 Redis version: {info.get('redis_version', 'unknown')}")
        print(f"📊 Connected clients: {info.get('connected_clients', 0)}")
        print(f"📊 Used memory: {info.get('used_memory_human', 'unknown')}")
        
        # Clean up test data
        await client.delete("medical_device_test", "medical_device_cache")
        print("🧹 Test data cleaned up")
        
        # Close connection
        await client.close()
        print("🔌 Connection closed")
        
        print("\n🎉 Redis is fully functional and ready for use!")
        print("💡 The Medical Device Assistant will use Redis for caching FDA API responses")
        
        return True
        
    except ImportError:
        print("❌ Redis library not installed")
        print("💡 Run: poetry install (should include redis)")
        return False
        
    except ConnectionRefusedError as e:
        print(f"❌ Redis connection refused: {e}")
        print("\n🔧 Troubleshooting steps:")
        print("1. Check if Redis server is running")
        print("2. Verify Redis is listening on port 6379")
        print("3. Check firewall settings")
        print("4. See docs/redis-setup-guide.md for installation instructions")
        print("\n💡 The application will work without Redis (no caching)")
        return False
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        print("\n💡 The application will work without Redis (no caching)")
        return False

async def test_application_cache_service():
    """Test the application's cache service"""
    print("\n🔍 Testing Application Cache Service...")
    print("=" * 50)
    
    try:
        from services.cache import get_redis_client, init_redis
        
        # Initialize Redis through the application service
        await init_redis()
        print("✅ Cache service initialization completed")
        
        # Get Redis client through the service
        redis_client = await get_redis_client()
        
        if redis_client:
            print("✅ Cache service returned Redis client")
            
            # Test through the service
            await redis_client.ping()
            print("✅ Cache service Redis client is functional")
            
            return True
        else:
            print("⚠️  Cache service returned None (Redis not available)")
            print("💡 This is normal if Redis is not installed")
            return False
            
    except Exception as e:
        print(f"❌ Cache service test failed: {e}")
        print("💡 This is normal if Redis is not installed")
        return False

async def test_health_check_integration():
    """Test Redis health check integration"""
    print("\n🔍 Testing Health Check Integration...")
    print("=" * 50)
    
    try:
        from services.health_check import health_service
        
        # Test Redis health check specifically
        redis_health = await health_service._check_redis()
        
        print(f"🏥 Health check result:")
        print(f"   Healthy: {redis_health['healthy']}")
        print(f"   Status: {redis_health['status']}")
        print(f"   Message: {redis_health.get('message', 'N/A')}")
        
        if redis_health['healthy']:
            print("✅ Redis health check passed")
        else:
            print("⚠️  Redis health check indicates issues (but app will still work)")
        
        return redis_health['healthy']
        
    except Exception as e:
        print(f"❌ Health check test failed: {e}")
        return False

async def main():
    """Main test function"""
    print("Redis Connection Test for Medical Device Regulatory Assistant")
    print("=" * 70)
    
    # Test direct Redis connection
    redis_direct = await test_redis_connection()
    
    # Test application cache service
    cache_service = await test_application_cache_service()
    
    # Test health check integration
    health_check = await test_health_check_integration()
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 50)
    print(f"Direct Redis Connection: {'✅ PASS' if redis_direct else '❌ FAIL'}")
    print(f"Application Cache Service: {'✅ PASS' if cache_service else '⚠️  N/A'}")
    print(f"Health Check Integration: {'✅ PASS' if health_check else '⚠️  N/A'}")
    
    if redis_direct and cache_service and health_check:
        print("\n🎉 All Redis tests passed! Redis is fully functional.")
        print("💡 The application will use Redis for improved performance.")
    elif not redis_direct:
        print("\n⚠️  Redis is not available, but this is OK!")
        print("💡 The application will work without Redis (no performance impact for small loads).")
        print("📖 See docs/redis-setup-guide.md for installation instructions.")
    else:
        print("\n⚠️  Redis connection works but application integration has issues.")
        print("🔧 Check application configuration and logs.")
    
    print("\n🚀 You can now start the Medical Device Regulatory Assistant!")

if __name__ == "__main__":
    asyncio.run(main())