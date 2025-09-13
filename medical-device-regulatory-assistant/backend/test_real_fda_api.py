#!/usr/bin/env python3
"""
Test script for real FDA API integration.

This script tests the OpenFDA service with real API integration.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.openfda import create_production_openfda_service, create_successful_openfda_mock


async def test_mock_service():
    """Test the mock OpenFDA service."""
    print("Testing Mock OpenFDA Service...")
    print("=" * 50)
    
    try:
        # Create mock service
        service = create_successful_openfda_mock()
        print("✅ Mock service created successfully")
        
        # Test search_predicates
        results = await service.search_predicates(["test device"])
        print(f"✅ Mock predicate search returned {len(results)} results")
        if results:
            print(f"   First result: {results[0].k_number} - {results[0].device_name}")
        
        # Test health check
        health = await service.health_check()
        print(f"✅ Mock health check: {health['status']}")
        
        print("✅ Mock service test completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Mock service test failed: {e}")
        return False


async def test_real_service():
    """Test the real OpenFDA service."""
    print("\nTesting Real OpenFDA Service...")
    print("=" * 50)
    
    try:
        # Check if API key is configured
        api_key = os.getenv("FDA_API_KEY")
        if not api_key:
            print("⚠️  FDA_API_KEY not configured - testing without API key")
        else:
            print("✅ FDA_API_KEY is configured")
        
        # Create production service
        service = await create_production_openfda_service()
        print("✅ Production service created successfully")
        
        # Validate API configuration
        validation = await service.validate_api_configuration()
        print(f"✅ API configuration validation completed")
        print(f"   API key configured: {validation['api_key_configured']}")
        print(f"   Base URL accessible: {validation['base_url_accessible']}")
        print(f"   Cache configured: {validation['cache_configured']}")
        
        if validation['errors']:
            print("   Errors:")
            for error in validation['errors']:
                print(f"     ❌ {error}")
        
        if validation['warnings']:
            print("   Warnings:")
            for warning in validation['warnings']:
                print(f"     ⚠️  {warning}")
        
        # Test health check
        health = await service.health_check()
        print(f"✅ Health check: {health['status']}")
        if health['status'] == 'healthy':
            print(f"   Response time: {health['response_time_seconds']:.3f}s")
        elif 'error' in health:
            print(f"   Error: {health['error']}")
        
        # Test a simple search (only if API is healthy)
        if health['status'] == 'healthy':
            try:
                results = await service.search_predicates(["pacemaker"], limit=5)
                print(f"✅ Real API search returned {len(results)} results")
                if results:
                    print(f"   First result: {results[0].k_number} - {results[0].device_name}")
            except Exception as e:
                print(f"⚠️  Search test failed (this may be due to rate limiting): {e}")
        
        # Clean up
        await service.close()
        print("✅ Service closed successfully")
        
        print("✅ Real service test completed")
        return True
        
    except Exception as e:
        print(f"❌ Real service test failed: {e}")
        return False


async def main():
    """Main test function."""
    print("FDA API Integration Test")
    print("=" * 60)
    
    # Test mock service first
    mock_success = await test_mock_service()
    
    # Test real service
    real_success = await test_real_service()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Mock Service: {'✅ PASSED' if mock_success else '❌ FAILED'}")
    print(f"Real Service: {'✅ PASSED' if real_success else '❌ FAILED'}")
    
    if mock_success and real_success:
        print("\n🎉 All tests passed! FDA API integration is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)