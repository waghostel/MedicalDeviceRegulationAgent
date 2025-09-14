#!/usr/bin/env python3
"""
Test script for the integrated seeder system
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.connection import init_database, close_database
from database.integrated_seeder import (
    IntegratedSeederManager,
    get_integrated_seeder,
    validate_seeder_setup,
    seed_development_data,
    seed_testing_data
)
from database.seeder_config import (
    override_seeder_config,
    Environment,
    get_seeder_config,
    get_environment
)
from database.seeder_validation import format_validation_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_environment_detection():
    """Test environment detection"""
    print("\n" + "="*60)
    print("Testing Environment Detection")
    print("="*60)
    
    # Test default environment
    original_env = os.environ.get("ENVIRONMENT")
    if "ENVIRONMENT" in os.environ:
        del os.environ["ENVIRONMENT"]
    
    env = get_environment()
    print(f"✓ Default environment: {env.value}")
    
    # Test explicit environment setting
    os.environ["ENVIRONMENT"] = "testing"
    env = get_environment()
    print(f"✓ Testing environment: {env.value}")
    
    os.environ["ENVIRONMENT"] = "production"
    env = get_environment()
    print(f"✓ Production environment: {env.value}")
    
    # Restore original environment
    if original_env:
        os.environ["ENVIRONMENT"] = original_env
    elif "ENVIRONMENT" in os.environ:
        del os.environ["ENVIRONMENT"]
    
    return True


async def test_configuration_validation():
    """Test configuration validation"""
    print("\n" + "="*60)
    print("Testing Configuration Validation")
    print("="*60)
    
    try:
        # Test validation with existing config
        validation_report = await validate_seeder_setup()
        print("Configuration validation report:")
        print(format_validation_report(validation_report))
        
        if validation_report.is_valid:
            print("✅ Configuration validation passed")
        else:
            print("❌ Configuration validation failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration validation error: {e}")
        return False


async def test_seeder_configuration():
    """Test seeder configuration for different environments"""
    print("\n" + "="*60)
    print("Testing Seeder Configuration")
    print("="*60)
    
    try:
        # Test development configuration
        dev_config = override_seeder_config(environment=Environment.DEVELOPMENT)
        print(f"✓ Development config: auto_seed={dev_config.auto_seed_on_startup}, clear={dev_config.clear_before_seed}")
        
        # Test testing configuration
        test_config = override_seeder_config(environment=Environment.TESTING)
        print(f"✓ Testing config: auto_seed={test_config.auto_seed_on_startup}, clear={test_config.clear_before_seed}")
        
        # Test production configuration
        prod_config = override_seeder_config(environment=Environment.PRODUCTION)
        print(f"✓ Production config: auto_seed={prod_config.auto_seed_on_startup}, clear={prod_config.clear_before_seed}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test error: {e}")
        return False


async def test_integrated_seeder():
    """Test integrated seeder functionality"""
    print("\n" + "="*60)
    print("Testing Integrated Seeder")
    print("="*60)
    
    try:
        # Test with testing configuration (safe to clear)
        config = override_seeder_config(
            environment=Environment.TESTING,
            clear_before_seed=True,
            seed_minimal_data=True,
            validate_before_seed=True,
            validate_after_seed=True,
            fail_on_validation_error=False
        )
        
        seeder_manager = IntegratedSeederManager(config)
        
        # Test seeding
        print("Running test seeding...")
        results = await seeder_manager.seed_database()
        
        if results["success"]:
            print("✅ Seeding completed successfully")
            print(f"   Environment: {results['environment']}")
            
            if results.get("warnings"):
                print("   Warnings:")
                for warning in results["warnings"]:
                    print(f"     - {warning}")
        else:
            print("❌ Seeding failed:")
            for error in results["errors"]:
                print(f"     - {error}")
            return False
        
        # Test status
        status = seeder_manager.get_seeding_status()
        print(f"✓ Seeder status retrieved: environment={status['environment']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Integrated seeder test error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_convenience_functions():
    """Test convenience functions"""
    print("\n" + "="*60)
    print("Testing Convenience Functions")
    print("="*60)
    
    try:
        # Test testing data seeding (safe)
        print("Testing seed_testing_data...")
        results = await seed_testing_data(clear_first=True)
        
        if results["success"]:
            print("✅ Testing data seeding successful")
        else:
            print("❌ Testing data seeding failed:")
            for error in results["errors"]:
                print(f"     - {error}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Convenience functions test error: {e}")
        return False


async def test_error_handling():
    """Test error handling"""
    print("\n" + "="*60)
    print("Testing Error Handling")
    print("="*60)
    
    try:
        # Test with invalid configuration file
        config = override_seeder_config(
            config_file_path="nonexistent_config.json",
            fail_on_validation_error=False
        )
        
        seeder_manager = IntegratedSeederManager(config)
        
        # This should handle the missing file gracefully
        validation_report = await seeder_manager.validate_configuration()
        print(f"✓ Handled missing config file: valid={validation_report.is_valid}")
        
        # Test seeding with missing config (should use minimal data)
        results = await seeder_manager.seed_database()
        
        if results["success"]:
            print("✅ Gracefully handled missing config file")
        else:
            print("✓ Expected failure for missing config handled properly")
        
        return True
        
    except Exception as e:
        print(f"❌ Error handling test error: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("Starting Integrated Seeder Tests")
    print("="*60)
    
    # Initialize database
    try:
        await init_database()
        print("✅ Database initialized for testing")
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return False
    
    tests = [
        ("Environment Detection", test_environment_detection),
        ("Configuration Validation", test_configuration_validation),
        ("Seeder Configuration", test_seeder_configuration),
        ("Integrated Seeder", test_integrated_seeder),
        ("Convenience Functions", test_convenience_functions),
        ("Error Handling", test_error_handling)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            if result:
                passed += 1
                print(f"\n✅ {test_name}: PASSED")
            else:
                failed += 1
                print(f"\n❌ {test_name}: FAILED")
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name}: ERROR - {e}")
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Total tests: {len(tests)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n💥 {failed} test(s) failed!")
        return False


async def main():
    """Main test function"""
    try:
        success = await run_all_tests()
        
        if success:
            print("\n✅ Integrated seeder system is working correctly!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Please check the output above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
        
    finally:
        # Clean up database connection
        try:
            await close_database()
            print("Database connection closed")
        except Exception as e:
            print(f"Warning: Error closing database: {e}")


if __name__ == "__main__":
    asyncio.run(main())