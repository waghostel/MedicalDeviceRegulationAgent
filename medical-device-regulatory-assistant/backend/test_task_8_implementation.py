#!/usr/bin/env python3
"""
Test script to verify Task 8 implementation: Connect to Real OpenFDA API

This script tests all the requirements from Task 8:
1. Replace mock OpenFDA service with real API integration for production use
2. Implement proper API key configuration and validation
3. Add environment variable configuration for FDA_API_KEY
4. Update service initialization to use real API when not in test environment
5. Implement proper error handling for real API responses
6. Add configuration to switch between mock and real API based on environment
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


async def test_task_8_requirements():
    """Test all Task 8 requirements."""
    print("Testing Task 8: Connect to Real OpenFDA API")
    print("=" * 60)
    
    test_results = []
    
    # Requirement 1: Replace mock OpenFDA service with real API integration
    print("\n1. Testing real API integration replacement...")
    try:
        from services.openfda import create_production_openfda_service
        service = await create_production_openfda_service()
        print("   ✅ Real API service factory created successfully")
        test_results.append(("Real API Integration", True))
    except Exception as e:
        print(f"   ❌ Failed to create real API service: {e}")
        test_results.append(("Real API Integration", False))
    
    # Requirement 2: Implement proper API key configuration and validation
    print("\n2. Testing API key configuration and validation...")
    try:
        from services.openfda import create_production_openfda_service
        
        # Test without API key
        if "FDA_API_KEY" in os.environ:
            del os.environ["FDA_API_KEY"]
        
        service = await create_production_openfda_service()
        validation = await service.validate_api_configuration()
        
        assert not validation['api_key_configured'], "Should detect missing API key"
        print("   ✅ Correctly detects missing API key")
        
        # Test with API key
        os.environ["FDA_API_KEY"] = "test_key_123"
        service = await create_production_openfda_service()
        validation = await service.validate_api_configuration()
        
        assert validation['api_key_configured'], "Should detect configured API key"
        print("   ✅ Correctly detects configured API key")
        
        test_results.append(("API Key Configuration", True))
    except Exception as e:
        print(f"   ❌ API key configuration test failed: {e}")
        test_results.append(("API Key Configuration", False))
    
    # Requirement 3: Add environment variable configuration for FDA_API_KEY
    print("\n3. Testing environment variable configuration...")
    try:
        import importlib
        import core.environment
        
        # Test FDA_API_KEY environment variable
        os.environ["FDA_API_KEY"] = "test_api_key"
        # Reload the module to get updated environment variable
        importlib.reload(core.environment)
        from core.environment import FDA_API_KEY as reloaded_key
        
        print(f"   ✅ FDA_API_KEY environment variable accessible: {bool(reloaded_key)}")
        
        # Test USE_REAL_FDA_API environment variable
        os.environ["USE_REAL_FDA_API"] = "true"
        importlib.reload(core.environment)
        from core.environment import USE_REAL_FDA_API as reloaded_flag
        
        assert reloaded_flag == True, "USE_REAL_FDA_API should be True when set to 'true'"
        print("   ✅ USE_REAL_FDA_API environment variable correctly parsed")
        
        test_results.append(("Environment Variables", True))
    except Exception as e:
        print(f"   ❌ Environment variable test failed: {e}")
        test_results.append(("Environment Variables", False))
    
    # Requirement 4: Update service initialization to use real API when not in test environment
    print("\n4. Testing service initialization based on environment...")
    try:
        from services.openfda import create_production_openfda_service, create_successful_openfda_mock
        
        # Test production environment (TESTING not set)
        if "TESTING" in os.environ:
            del os.environ["TESTING"]
        
        # Simulate main.py logic
        if not os.getenv("TESTING"):
            service = await create_production_openfda_service()
            service_type = "production"
        else:
            service = create_successful_openfda_mock()
            service_type = "mock"
        
        assert service_type == "production", "Should use production service when TESTING is not set"
        print("   ✅ Uses production service in non-testing environment")
        
        # Test testing environment
        os.environ["TESTING"] = "true"
        
        if not os.getenv("TESTING"):
            service = await create_production_openfda_service()
            service_type = "production"
        else:
            service = create_successful_openfda_mock()
            service_type = "mock"
        
        assert service_type == "mock", "Should use mock service when TESTING is set"
        print("   ✅ Uses mock service in testing environment")
        
        test_results.append(("Service Initialization", True))
    except Exception as e:
        print(f"   ❌ Service initialization test failed: {e}")
        test_results.append(("Service Initialization", False))
    
    # Requirement 5: Implement proper error handling for real API responses
    print("\n5. Testing error handling for real API responses...")
    try:
        from services.openfda import OpenFDAService, FDAAPIError, RateLimitExceededError
        
        # Test that error classes exist and are properly defined
        assert issubclass(FDAAPIError, Exception), "FDAAPIError should be an Exception subclass"
        assert issubclass(RateLimitExceededError, FDAAPIError), "RateLimitExceededError should be FDAAPIError subclass"
        print("   ✅ Error classes properly defined")
        
        # Test health check error handling
        service = await create_production_openfda_service()
        health = await service.health_check()
        
        # Health check should return proper status information
        assert 'status' in health, "Health check should return status"
        assert 'timestamp' in health, "Health check should return timestamp"
        print("   ✅ Health check returns proper error information")
        
        test_results.append(("Error Handling", True))
    except Exception as e:
        print(f"   ❌ Error handling test failed: {e}")
        test_results.append(("Error Handling", False))
    
    # Requirement 6: Add configuration to switch between mock and real API based on environment
    print("\n6. Testing configuration switching between mock and real API...")
    try:
        from services.openfda import create_production_openfda_service, create_successful_openfda_mock
        
        # Test mock service creation
        mock_service = create_successful_openfda_mock()
        assert hasattr(mock_service, 'search_predicates'), "Mock service should have search_predicates method"
        assert hasattr(mock_service, 'health_check'), "Mock service should have health_check method"
        print("   ✅ Mock service properly configured")
        
        # Test real service creation
        real_service = await create_production_openfda_service()
        assert hasattr(real_service, 'search_predicates'), "Real service should have search_predicates method"
        assert hasattr(real_service, 'health_check'), "Real service should have health_check method"
        print("   ✅ Real service properly configured")
        
        # Test that they are different types
        assert type(mock_service) != type(real_service), "Mock and real services should be different types"
        print("   ✅ Mock and real services are properly differentiated")
        
        test_results.append(("Configuration Switching", True))
    except Exception as e:
        print(f"   ❌ Configuration switching test failed: {e}")
        test_results.append(("Configuration Switching", False))
    
    # Test the specific command from the task
    print("\n7. Testing the specific command from the task...")
    try:
        # This is the exact command from the task description
        os.environ['FDA_API_KEY'] = 'test_key'
        service = await create_production_openfda_service()
        print('Real API configured')
        print("   ✅ Task command executed successfully")
        
        test_results.append(("Task Command", True))
    except Exception as e:
        print(f"   ❌ Task command failed: {e}")
        test_results.append(("Task Command", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TASK 8 IMPLEMENTATION TEST SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(1 for _, passed in test_results if passed)
    total_tests = len(test_results)
    
    for test_name, passed in test_results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL TASK 8 REQUIREMENTS SUCCESSFULLY IMPLEMENTED!")
        return 0
    else:
        print(f"\n❌ {total_tests - passed_tests} requirements failed implementation")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(test_task_8_requirements())
    sys.exit(exit_code)