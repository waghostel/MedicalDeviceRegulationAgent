#!/usr/bin/env python3
"""
Test script for the Environment Validator.

This script tests the EnvironmentValidator class to ensure it works correctly
and provides useful feedback about the development environment.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from core.environment import EnvironmentValidator, validate_environment
    print("✅ Successfully imported EnvironmentValidator")
except ImportError as e:
    print(f"❌ Failed to import EnvironmentValidator: {e}")
    sys.exit(1)


def test_environment_validator():
    """Test the EnvironmentValidator functionality."""
    print("\n" + "=" * 60)
    print("TESTING ENVIRONMENT VALIDATOR")
    print("=" * 60)
    
    # Create validator instance
    validator = EnvironmentValidator()
    print("✅ Created EnvironmentValidator instance")
    
    # Test individual validation methods
    print("\n1. Testing Python Environment Validation...")
    python_result = validator.validate_python_environment()
    print(f"   Result: {'✅ Valid' if python_result.is_valid else '❌ Issues Found'}")
    print(f"   Errors: {len(python_result.errors)}")
    print(f"   Warnings: {len(python_result.warnings)}")
    print(f"   Recommendations: {len(python_result.recommendations)}")
    
    if python_result.errors:
        print("   Errors found:")
        for error in python_result.errors:
            print(f"     - {error}")
    
    print("\n2. Testing Package Dependencies Validation...")
    package_result = validator.validate_package_dependencies()
    print(f"   Result: {'✅ Valid' if package_result.is_valid else '❌ Issues Found'}")
    print(f"   Installed packages: {len(package_result.details.get('installed_packages', {}))}")
    print(f"   Missing required: {len(package_result.details.get('missing_required', []))}")
    print(f"   Missing optional: {len(package_result.details.get('missing_optional', []))}")
    
    print("\n3. Testing Database Connection Validation...")
    db_result = validator.validate_database_connection()
    print(f"   Result: {'✅ Valid' if db_result.is_valid else '❌ Issues Found'}")
    print(f"   Database exists: {db_result.details.get('database_exists', 'unknown')}")
    
    print("\n4. Testing External Services Validation...")
    services_result = validator.validate_external_services()
    print(f"   Result: {'✅ Valid' if services_result.is_valid else '❌ Issues Found'}")
    env_vars = services_result.details.get('environment_variables', {})
    set_vars = sum(1 for v in env_vars.values() if v == 'set')
    print(f"   Environment variables set: {set_vars}/{len(env_vars)}")
    
    print("\n5. Testing Comprehensive Validation...")
    all_results = validator.run_comprehensive_validation()
    overall_valid = all(result.is_valid for result in all_results.values())
    print(f"   Overall Result: {'✅ All Valid' if overall_valid else '❌ Issues Found'}")
    
    print("\n6. Testing Setup Instructions Generation...")
    instructions = validator.generate_setup_instructions(list(all_results.values()))
    print(f"   Generated instructions: {len(instructions)} characters")
    print("   Sample instructions:")
    print("   " + "\n   ".join(instructions.split('\n')[:5]))
    
    print("\n7. Testing Validation Summary Display...")
    validator.print_validation_summary(all_results)
    
    return overall_valid


def test_convenience_function():
    """Test the convenience validate_environment function."""
    print("\n" + "=" * 60)
    print("TESTING CONVENIENCE FUNCTION")
    print("=" * 60)
    
    try:
        result = validate_environment()
        print(f"\n✅ Convenience function returned: {result}")
        return result
    except Exception as e:
        print(f"❌ Convenience function failed: {e}")
        return False


def main():
    """Main test function."""
    print("Medical Device Regulatory Assistant - Environment Validator Test")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print(f"Backend directory: {backend_dir}")
    
    # Test the validator
    validator_result = test_environment_validator()
    
    # Test convenience function
    convenience_result = test_convenience_function()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Environment Validator Test: {'✅ PASSED' if validator_result else '❌ FAILED'}")
    print(f"Convenience Function Test: {'✅ PASSED' if convenience_result else '❌ FAILED'}")
    
    overall_success = validator_result and convenience_result
    print(f"Overall Test Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    return overall_success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)