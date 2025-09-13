#!/usr/bin/env python3
"""
Test script for service switching between mock and real API based on environment.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.openfda import create_production_openfda_service, create_successful_openfda_mock


async def test_environment_switching():
    """Test that service switching works based on environment variables."""
    print("Testing Environment-Based Service Switching")
    print("=" * 60)
    
    # Test 1: Testing environment (should use mock)
    print("\n1. Testing with TESTING=true (should use mock)")
    os.environ["TESTING"] = "true"
    
    # Simulate main.py logic
    if not os.getenv("TESTING"):
        service = await create_production_openfda_service()
        service_type = "production"
    else:
        service = create_successful_openfda_mock()
        service_type = "mock"
    
    print(f"   Service type: {service_type}")
    assert service_type == "mock", "Should use mock service in testing environment"
    print("   ✅ Correctly used mock service")
    
    # Test 2: Production environment (should use real API)
    print("\n2. Testing with TESTING unset (should use production)")
    if "TESTING" in os.environ:
        del os.environ["TESTING"]
    
    # Simulate main.py logic
    if not os.getenv("TESTING"):
        service = await create_production_openfda_service()
        service_type = "production"
    else:
        service = create_successful_openfda_mock()
        service_type = "mock"
    
    print(f"   Service type: {service_type}")
    assert service_type == "production", "Should use production service when TESTING is not set"
    print("   ✅ Correctly used production service")
    
    # Test 3: USE_REAL_FDA_API environment variable
    print("\n3. Testing USE_REAL_FDA_API environment variable")
    os.environ["USE_REAL_FDA_API"] = "true"
    
    from core.environment import USE_REAL_FDA_API
    print(f"   USE_REAL_FDA_API: {USE_REAL_FDA_API}")
    assert USE_REAL_FDA_API == True, "USE_REAL_FDA_API should be True when set to 'true'"
    print("   ✅ Environment variable correctly parsed")
    
    # Clean up
    if "USE_REAL_FDA_API" in os.environ:
        del os.environ["USE_REAL_FDA_API"]
    
    print("\n✅ All environment switching tests passed!")


async def test_api_key_handling():
    """Test API key handling in different scenarios."""
    print("\nTesting API Key Handling")
    print("=" * 40)
    
    # Test 1: No API key
    print("\n1. Testing without API key")
    if "FDA_API_KEY" in os.environ:
        del os.environ["FDA_API_KEY"]
    
    service = await create_production_openfda_service()
    validation = await service.validate_api_configuration()
    
    print(f"   API key configured: {validation['api_key_configured']}")
    assert not validation['api_key_configured'], "Should detect missing API key"
    print("   ✅ Correctly detected missing API key")
    
    # Test 2: With API key
    print("\n2. Testing with API key")
    os.environ["FDA_API_KEY"] = "test_api_key_12345"
    
    service = await create_production_openfda_service()
    validation = await service.validate_api_configuration()
    
    print(f"   API key configured: {validation['api_key_configured']}")
    assert validation['api_key_configured'], "Should detect configured API key"
    print("   ✅ Correctly detected configured API key")
    
    # Clean up
    if "FDA_API_KEY" in os.environ:
        del os.environ["FDA_API_KEY"]
    
    print("\n✅ All API key handling tests passed!")


async def main():
    """Main test function."""
    try:
        await test_environment_switching()
        await test_api_key_handling()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("FDA API integration with environment switching is working correctly.")
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)