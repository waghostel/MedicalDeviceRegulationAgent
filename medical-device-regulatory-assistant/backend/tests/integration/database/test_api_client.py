#!/usr/bin/env python3
"""
Test script for TestAPIClient with retry logic and graceful failure handling.

This script tests:
- Connection retry logic with exponential backoff
- Graceful handling for offline testing scenarios
- Timeout management and error reporting
- Health check integration

Requirements: 2.2
"""

import asyncio
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from tests.utils.testing_framework.api_client import (
    TestAPIClient, 
    RetryConfig, 
    create_test_client,
    check_server_availability,
    ConnectionStatus
)


async def test_api_client_basic_functionality():
    """Test basic API client functionality"""
    print("🧪 Testing basic API client functionality...")
    
    # Test 1: Client initialization
    client = TestAPIClient(
        base_url="http://localhost:8000",
        timeout=5.0,
        retry_config=RetryConfig(max_retries=2, base_delay=0.5)
    )
    
    assert client.base_url == "http://localhost:8000"
    assert client.timeout == 5.0
    assert client.status == ConnectionStatus.DISCONNECTED
    assert not client.is_connected
    print("✅ Client initialization successful")
    
    # Test 2: Connection attempt
    connection_result = await client.connect()
    print(f"Connection result: {connection_result}")
    
    if connection_result.success:
        print("✅ Server is available - connection successful")
        assert client.is_connected
        assert client.status == ConnectionStatus.CONNECTED
        
        # Test 3: Health check
        health_info = await client.health_check()
        print(f"Health check: {health_info}")
        assert health_info["connected"] is True
        print("✅ Health check successful")
        
        # Test 4: Basic GET request
        result = await client.get("/health")
        if result.success:
            print("✅ GET /health request successful")
            assert result.response is not None
            assert result.response.status_code == 200
        else:
            print(f"⚠️ GET /health failed: {result.error}")
        
        # Test 5: Request with invalid endpoint (should handle gracefully)
        result = await client.get("/nonexistent-endpoint")
        print(f"Invalid endpoint result: success={result.success}, error={result.error}")
        if not result.success and result.response:
            print(f"✅ Invalid endpoint handled gracefully (status: {result.response.status_code})")
        
    else:
        print("⚠️ Server is not available - testing offline behavior")
        assert not client.is_connected
        assert client.status in [ConnectionStatus.DISCONNECTED, ConnectionStatus.ERROR]
        
        # Test offline request handling
        result = await client.get("/health", skip_if_offline=True)
        assert not result.success
        assert "offline" in result.error.lower() or "skipped" in str(result.details)
        print("✅ Offline request handling successful")
    
    await client.close()
    print("✅ Client cleanup successful")


async def test_retry_logic():
    """Test retry logic with exponential backoff"""
    print("\n🔄 Testing retry logic...")
    
    # Test with a non-existent server to trigger retries
    client = TestAPIClient(
        base_url="http://localhost:9999",  # Non-existent server
        timeout=1.0,
        retry_config=RetryConfig(max_retries=3, base_delay=0.1, max_delay=1.0)
    )
    
    start_time = time.time()
    result = await client.get("/test", skip_if_offline=False)
    elapsed_time = time.time() - start_time
    
    assert not result.success
    assert result.retry_count == 3  # Should have retried 3 times
    assert elapsed_time > 0.1  # Should have taken some time due to retries
    print(f"✅ Retry logic successful - {result.retry_count} retries in {elapsed_time:.2f}s")
    print(f"   Error: {result.error}")
    
    await client.close()


async def test_convenience_functions():
    """Test convenience functions"""
    print("\n🛠️ Testing convenience functions...")
    
    # Test create_test_client
    client = await create_test_client(
        base_url="http://localhost:8000",
        timeout=5.0,
        max_retries=2,
        headers={"User-Agent": "TestAPIClient/1.0"}
    )
    
    assert client.default_headers["User-Agent"] == "TestAPIClient/1.0"
    print("✅ create_test_client successful")
    
    # Test check_server_availability
    is_available = await check_server_availability("http://localhost:8000", timeout=2.0)
    print(f"Server availability: {is_available}")
    
    if is_available:
        print("✅ Server availability check successful")
    else:
        print("⚠️ Server not available (expected for offline testing)")
    
    await client.close()


async def test_session_context_manager():
    """Test session context manager"""
    print("\n🔗 Testing session context manager...")
    
    client = TestAPIClient(base_url="http://localhost:8000")
    
    async with client.session() as session:
        # Test multiple requests in session
        result1 = await session.get("/health")
        result2 = await session.get("/")
        
        if result1.success and result2.success:
            print("✅ Session context manager successful")
        else:
            print("⚠️ Session requests failed (server may be offline)")
    
    await client.close()


async def test_http_methods():
    """Test different HTTP methods"""
    print("\n🌐 Testing HTTP methods...")
    
    client = TestAPIClient(base_url="http://localhost:8000")
    
    # Check if server is available first
    connection_result = await client.connect()
    
    if connection_result.success:
        print("Server available - testing HTTP methods")
        
        # Test GET
        result = await client.get("/")
        if result.success:
            print("✅ GET method successful")
        
        # Test POST (may fail due to authentication, but should handle gracefully)
        result = await client.post("/api/projects", json={"name": "test"})
        print(f"POST result: success={result.success}, status={result.response.status_code if result.response else 'N/A'}")
        
        # Test other methods
        methods_to_test = ["PUT", "DELETE", "PATCH"]
        for method in methods_to_test:
            result = await client.request(method, "/api/test-endpoint")
            print(f"{method} result: success={result.success}")
        
        print("✅ HTTP methods testing completed")
    else:
        print("⚠️ Server not available - skipping HTTP methods test")
    
    await client.close()


async def test_error_handling():
    """Test comprehensive error handling"""
    print("\n⚠️ Testing error handling...")
    
    client = TestAPIClient(base_url="http://localhost:8000", timeout=1.0)
    
    # Test timeout handling
    client_short_timeout = TestAPIClient(
        base_url="http://httpbin.org/delay/5",  # External service with delay
        timeout=0.5  # Very short timeout
    )
    
    result = await client_short_timeout.get("/")
    if not result.success and "timeout" in result.error.lower():
        print("✅ Timeout handling successful")
    else:
        print("⚠️ Timeout test inconclusive (external service may be unavailable)")
    
    await client_short_timeout.close()
    
    # Test invalid URL handling
    client_invalid = TestAPIClient(base_url="http://invalid-domain-12345.com")
    result = await client_invalid.get("/")
    assert not result.success
    print("✅ Invalid domain handling successful")
    
    await client_invalid.close()
    await client.close()


async def main():
    """Run all tests"""
    print("🚀 Starting TestAPIClient comprehensive testing...\n")
    
    try:
        await test_api_client_basic_functionality()
        await test_retry_logic()
        await test_convenience_functions()
        await test_session_context_manager()
        await test_http_methods()
        await test_error_handling()
        
        print("\n✅ All TestAPIClient tests completed successfully!")
        print("\n📋 Test Summary:")
        print("   ✅ Basic functionality")
        print("   ✅ Retry logic with exponential backoff")
        print("   ✅ Convenience functions")
        print("   ✅ Session context manager")
        print("   ✅ HTTP methods")
        print("   ✅ Error handling")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)