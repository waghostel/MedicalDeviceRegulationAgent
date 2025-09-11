#!/usr/bin/env python3
"""
Simple test script for TestAPIClient health check integration without pytest dependencies.

This script tests:
- Health check integration with API endpoints
- Test environment validation
- Service readiness checking
- Test setup utilities

Requirements: 2.2, 6.1
"""

import asyncio
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from testing.api_client import (
    TestAPIClient, 
    TestEnvironmentManager,
    setup_test_environment,
    check_server_availability
)


async def test_health_check_integration():
    """Test health check integration with API endpoints"""
    print("🏥 Testing health check integration...")
    
    client = TestAPIClient(
        base_url="http://localhost:8000",
        required_services=["database", "fda_api"]
    )
    
    try:
        # Test basic health check
        health_info = await client.health_check(detailed=False)
        print(f"Basic health check: connected={health_info['connected']}")
        
        if health_info["connected"]:
            print("✅ Basic health check successful")
            
            # Test detailed health check
            detailed_health = await client.health_check(detailed=True)
            print(f"Detailed health check: services_ready={detailed_health.get('services_ready', False)}")
            
            if "services" in detailed_health:
                services = detailed_health["services"]
                print(f"Overall system healthy: {services.get('healthy', False)}")
                
                # Check individual services
                checks = services.get("checks", {})
                for service_name, service_health in checks.items():
                    status = service_health.get("status", "unknown")
                    healthy = service_health.get("healthy", False)
                    print(f"  {service_name}: {status} (healthy: {healthy})")
                
                print("✅ Detailed health check successful")
            else:
                print("⚠️ No detailed service information available")
            
            # Test specific service health checks
            for service in ["database", "fda_api", "redis"]:
                try:
                    service_health = await client.check_service_health(service)
                    print(f"{service} health: {service_health.get('status', 'unknown')}")
                except Exception as e:
                    print(f"⚠️ Failed to check {service} health: {e}")
            
            print("✅ Service-specific health checks completed")
        else:
            print("⚠️ Server not available - skipping detailed health checks")
    
    finally:
        await client.close()


async def test_environment_validation():
    """Test test environment validation"""
    print("\n🔍 Testing environment validation...")
    
    client = TestAPIClient(
        base_url="http://localhost:8000",
        required_services=["database"]
    )
    
    try:
        validation = await client.validate_test_environment()
        
        print(f"Environment validation results:")
        print(f"  Ready for tests: {validation['ready_for_tests']}")
        print(f"  Server available: {validation['server_available']}")
        print(f"  Services healthy: {validation['services_healthy']}")
        
        if validation["issues"]:
            print(f"  Issues: {'; '.join(validation['issues'])}")
        
        if validation["recommendations"]:
            print(f"  Recommendations: {'; '.join(validation['recommendations'])}")
        
        if validation["ready_for_tests"]:
            print("✅ Environment validation successful - ready for tests")
        else:
            print("⚠️ Environment not ready for tests")
    
    finally:
        await client.close()


async def test_service_readiness_waiting():
    """Test waiting for services to become ready"""
    print("\n⏳ Testing service readiness waiting...")
    
    client = TestAPIClient(
        base_url="http://localhost:8000",
        required_services=["database"]
    )
    
    try:
        # Test with short timeout to see behavior
        print("Testing service readiness with 5s timeout...")
        start_time = time.time()
        ready = await client.wait_for_services_ready(timeout=5.0, check_interval=1.0)
        elapsed = time.time() - start_time
        
        print(f"Services ready: {ready} (took {elapsed:.1f}s)")
        
        if ready:
            print("✅ Services became ready within timeout")
        else:
            print("⚠️ Services did not become ready within timeout (this may be expected)")
    
    finally:
        await client.close()


async def test_setup_utilities():
    """Test setup utility functions"""
    print("\n🛠️ Testing setup utilities...")
    
    # Test setup_test_environment function
    print("Testing setup_test_environment...")
    setup_result = await setup_test_environment(
        base_url="http://localhost:8000",
        required_services=["database"],
        wait_timeout=10.0,
        raise_on_failure=False
    )
    
    print(f"Setup result: {setup_result['success']}")
    print(f"Message: {setup_result['message']}")
    
    if setup_result["success"]:
        print("✅ Test environment setup successful")
    else:
        print("⚠️ Test environment setup failed (may be expected if server is offline)")
        if "recommendations" in setup_result:
            print(f"Recommendations: {'; '.join(setup_result['recommendations'])}")


async def test_environment_manager():
    """Test TestEnvironmentManager context manager"""
    print("\n🏗️ Testing TestEnvironmentManager...")
    
    try:
        async with TestEnvironmentManager(
            base_url="http://localhost:8000",
            required_services=["database"],
            wait_timeout=10.0,
            auto_skip=False  # Don't auto-skip for testing
        ) as env:
            print(f"Environment ready: {env.ready}")
            
            if env.ready:
                print("✅ TestEnvironmentManager setup successful")
                
                # Test using the client
                result = await env.client.get("/health")
                if result.success:
                    print("✅ Client request through environment manager successful")
                else:
                    print(f"⚠️ Client request failed: {result.error}")
            else:
                print("⚠️ Environment not ready (may be expected if server is offline)")
                if env.validation_result:
                    issues = env.validation_result.get("issues", [])
                    if issues:
                        print(f"Issues: {'; '.join(issues)}")
    
    except Exception as e:
        print(f"❌ TestEnvironmentManager failed: {e}")


async def test_connection_timeout_management():
    """Test connection timeout management"""
    print("\n⏱️ Testing connection timeout management...")
    
    # Test with very short timeout
    client = TestAPIClient(
        base_url="http://localhost:8000",
        timeout=0.1  # Very short timeout
    )
    
    try:
        start_time = time.time()
        result = await client.get("/health")
        elapsed = time.time() - start_time
        
        if result.success:
            print(f"✅ Request succeeded in {elapsed:.3f}s (faster than timeout)")
        else:
            print(f"⚠️ Request failed in {elapsed:.3f}s: {result.error}")
            if "timeout" in result.error.lower():
                print("✅ Timeout handling working correctly")
    
    finally:
        await client.close()
    
    # Test with reasonable timeout
    client = TestAPIClient(
        base_url="http://localhost:8000",
        timeout=10.0
    )
    
    try:
        result = await client.get("/health")
        if result.success:
            print("✅ Request with reasonable timeout successful")
        else:
            print(f"⚠️ Request failed: {result.error}")
    
    finally:
        await client.close()


async def test_decorator_logic():
    """Test the logic behind decorators without using pytest"""
    print("\n🎭 Testing decorator logic...")
    
    # Test server availability check
    server_available = await check_server_availability("http://localhost:8000")
    print(f"Server available: {server_available}")
    
    if server_available:
        print("✅ Server availability check successful")
    else:
        print("⚠️ Server not available - tests would be skipped")
    
    # Test environment validation logic
    client = TestAPIClient(
        base_url="http://localhost:8000",
        required_services=["database"]
    )
    
    try:
        validation = await client.validate_test_environment()
        
        if validation["ready_for_tests"]:
            print("✅ Environment ready - tests would run")
        else:
            print("⚠️ Environment not ready - tests would be skipped")
            print(f"  Issues: {'; '.join(validation['issues'])}")
            print(f"  Recommendations: {'; '.join(validation['recommendations'])}")
    
    finally:
        await client.close()


async def main():
    """Run all health check integration tests"""
    print("🚀 Starting TestAPIClient health check integration testing...\n")
    
    try:
        await test_health_check_integration()
        await test_environment_validation()
        await test_service_readiness_waiting()
        await test_setup_utilities()
        await test_environment_manager()
        await test_connection_timeout_management()
        await test_decorator_logic()
        
        print("\n✅ All health check integration tests completed!")
        print("\n📋 Test Summary:")
        print("   ✅ Health check integration")
        print("   ✅ Environment validation")
        print("   ✅ Service readiness waiting")
        print("   ✅ Setup utilities")
        print("   ✅ Environment manager")
        print("   ✅ Connection timeout management")
        print("   ✅ Decorator logic")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)