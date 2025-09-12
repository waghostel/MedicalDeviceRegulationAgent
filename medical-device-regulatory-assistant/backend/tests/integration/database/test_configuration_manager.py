#!/usr/bin/env python3
"""
Test script for the Configuration Management System.

This script tests the ConfigurationManager class to ensure it works correctly
and provides useful feedback about configuration validation.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from core.configuration import (
        ConfigurationManager, 
        EnvironmentType, 
        validate_configuration,
        generate_env_template
    )
    print("✅ Successfully imported ConfigurationManager")
except ImportError as e:
    print(f"❌ Failed to import ConfigurationManager: {e}")
    sys.exit(1)


def test_configuration_manager():
    """Test the ConfigurationManager functionality."""
    print("\n" + "=" * 60)
    print("TESTING CONFIGURATION MANAGER")
    print("=" * 60)
    
    # Test different environments
    environments = [EnvironmentType.DEVELOPMENT, EnvironmentType.TESTING]
    
    for env in environments:
        print(f"\n🔍 Testing {env.value.upper()} environment...")
        
        # Create manager instance
        manager = ConfigurationManager(env)
        print(f"✅ Created ConfigurationManager for {env.value}")
        
        # Test individual validation methods
        print(f"\n1. Testing Backend Configuration Validation...")
        backend_result = manager.validate_backend_configuration()
        print(f"   Result: {'✅ Valid' if backend_result.is_valid else '❌ Issues Found'}")
        print(f"   Errors: {len(backend_result.errors)}")
        print(f"   Warnings: {len(backend_result.warnings)}")
        
        print(f"\n2. Testing Frontend Configuration Validation...")
        frontend_result = manager.validate_frontend_configuration()
        print(f"   Result: {'✅ Valid' if frontend_result.is_valid else '❌ Issues Found'}")
        print(f"   Errors: {len(frontend_result.errors)}")
        print(f"   Warnings: {len(frontend_result.warnings)}")
        
        print(f"\n3. Testing Test Configuration Validation...")
        test_result = manager.validate_test_configuration()
        print(f"   Result: {'✅ Valid' if test_result.is_valid else '❌ Issues Found'}")
        print(f"   Errors: {len(test_result.errors)}")
        print(f"   Warnings: {len(test_result.warnings)}")
        
        print(f"\n4. Testing Configuration Files Validation...")
        files_result = manager.validate_configuration_files()
        print(f"   Result: {'✅ Valid' if files_result.is_valid else '❌ Issues Found'}")
        print(f"   Errors: {len(files_result.errors)}")
        print(f"   Warnings: {len(files_result.warnings)}")
        
        print(f"\n5. Testing Configuration Value Access...")
        # Test getting configuration values
        db_url = manager.get_configuration_value("DATABASE_URL", "default_db_url")
        print(f"   DATABASE_URL: {db_url}")
        
        # Test setting configuration values
        manager.set_configuration_value("TEST_KEY", "test_value")
        test_value = manager.get_configuration_value("TEST_KEY")
        print(f"   TEST_KEY (set/get): {test_value}")
        
        print(f"\n6. Testing Configuration Export...")
        config_export = manager.export_configuration(include_sensitive=False)
        print(f"   Exported {len(config_export)} configuration items")
        
        # Check for sensitive data redaction
        sensitive_found = any("***REDACTED***" in str(v) for v in config_export.values())
        print(f"   Sensitive data properly redacted: {'✅' if sensitive_found else '⚠️  No sensitive data found'}")
        
        print(f"\n7. Testing Comprehensive Validation...")
        all_results = manager.run_comprehensive_validation()
        overall_valid = all(result.is_valid for result in all_results.values())
        print(f"   Overall Result: {'✅ All Valid' if overall_valid else '❌ Issues Found'}")
        
        print(f"\n8. Testing Validation Summary Display...")
        summary_result = manager.print_validation_summary(all_results)
        
        print(f"\n--- End {env.value.upper()} environment test ---")
    
    return True


def test_env_template_generation():
    """Test environment template generation."""
    print("\n" + "=" * 60)
    print("TESTING ENVIRONMENT TEMPLATE GENERATION")
    print("=" * 60)
    
    try:
        # Test template generation
        template = generate_env_template()
        print(f"✅ Generated environment template: {len(template)} characters")
        
        # Check template content
        required_sections = [
            "Backend Configuration",
            "Frontend Configuration", 
            "Test Configuration",
            "DATABASE_URL",
            "NEXTAUTH_SECRET",
            "NEXT_PUBLIC_API_URL"
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in template:
                missing_sections.append(section)
        
        if missing_sections:
            print(f"❌ Missing sections in template: {missing_sections}")
            return False
        else:
            print("✅ All required sections found in template")
        
        # Test writing template to file
        test_output_path = Path("test_env_template.txt")
        try:
            generate_env_template(test_output_path)
            if test_output_path.exists():
                print(f"✅ Template successfully written to file")
                # Clean up
                test_output_path.unlink()
            else:
                print("❌ Template file was not created")
                return False
        except Exception as e:
            print(f"❌ Failed to write template to file: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Template generation failed: {e}")
        return False


def test_convenience_functions():
    """Test convenience functions."""
    print("\n" + "=" * 60)
    print("TESTING CONVENIENCE FUNCTIONS")
    print("=" * 60)
    
    try:
        # Test validate_configuration function
        print("Testing validate_configuration function...")
        result = validate_configuration(EnvironmentType.DEVELOPMENT)
        print(f"✅ validate_configuration returned: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Convenience function test failed: {e}")
        return False


def main():
    """Main test function."""
    print("Medical Device Regulatory Assistant - Configuration Manager Test")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print(f"Backend directory: {backend_dir}")
    
    # Test the configuration manager
    manager_result = test_configuration_manager()
    
    # Test template generation
    template_result = test_env_template_generation()
    
    # Test convenience functions
    convenience_result = test_convenience_functions()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Configuration Manager Test: {'✅ PASSED' if manager_result else '❌ FAILED'}")
    print(f"Template Generation Test: {'✅ PASSED' if template_result else '❌ FAILED'}")
    print(f"Convenience Functions Test: {'✅ PASSED' if convenience_result else '❌ FAILED'}")
    
    overall_success = manager_result and template_result and convenience_result
    print(f"Overall Test Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    return overall_success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)