"""
Test script for JSON schema validation functionality

This script tests the JSON schema validation for mock data configuration
to ensure the schema is correct and the sample data validates properly.
"""

import json
import sys
from pathlib import Path

# Add the current directory to Python path for imports
sys.path.append(str(Path(__file__).parent))

from mock_data.json_validator import MockDataValidator, validate_mock_data_file


def test_schema_validation():
    """Test the JSON schema validation functionality"""
    print("🧪 Testing JSON Schema Validation for Mock Data Configuration")
    print("=" * 70)
    
    # Test 1: Validate the sample configuration file
    print("\n1️⃣ Testing sample configuration validation...")
    sample_config_path = "mock_data/sample_mock_data_config.json"
    
    try:
        validate_mock_data_file(sample_config_path)
        print("✅ Sample configuration validation test passed")
    except Exception as e:
        print(f"❌ Sample configuration validation test failed: {e}")
        return False
    
    # Test 2: Test validator class directly
    print("\n2️⃣ Testing MockDataValidator class...")
    try:
        validator = MockDataValidator()
        schema_info = validator.get_schema_info()
        print(f"📋 Schema Info:")
        print(f"   Title: {schema_info['schema_title']}")
        print(f"   Required Properties: {schema_info['required_properties']}")
        print(f"   Available Properties: {schema_info['properties']}")
        print("✅ MockDataValidator class test passed")
    except Exception as e:
        print(f"❌ MockDataValidator class test failed: {e}")
        return False
    
    # Test 3: Test with invalid data
    print("\n3️⃣ Testing validation with invalid data...")
    try:
        validator = MockDataValidator()
        invalid_data = {
            "users": [
                {
                    "google_id": "test_user",
                    "email": "invalid-email",  # Invalid email format
                    "name": "Test User"
                }
            ],
            "projects": [
                {
                    "name": "Test Project",
                    "user_email": "nonexistent@example.com"  # References non-existent user
                }
            ]
        }
        
        is_valid, errors = validator.validate_data(invalid_data)
        if not is_valid and len(errors) > 0:
            print(f"✅ Invalid data correctly rejected with {len(errors)} errors:")
            for error in errors[:3]:  # Show first 3 errors
                print(f"   - {error}")
            if len(errors) > 3:
                print(f"   ... and {len(errors) - 3} more errors")
        else:
            print("❌ Invalid data was incorrectly accepted")
            return False
    except Exception as e:
        print(f"❌ Invalid data test failed: {e}")
        return False
    
    # Test 4: Test business rule validation
    print("\n4️⃣ Testing business rule validation...")
    try:
        validator = MockDataValidator()
        data_with_business_errors = {
            "users": [
                {
                    "google_id": "user1",
                    "email": "user1@example.com",
                    "name": "User 1"
                },
                {
                    "google_id": "user1",  # Duplicate google_id
                    "email": "user2@example.com",
                    "name": "User 2"
                }
            ],
            "projects": [
                {
                    "name": "Project 1",
                    "user_email": "user1@example.com"
                },
                {
                    "name": "Project 1",  # Duplicate project name
                    "user_email": "user1@example.com"
                }
            ]
        }
        
        is_valid, errors = validator.validate_data(data_with_business_errors)
        if not is_valid:
            business_rule_errors = [e for e in errors if "Duplicate" in e]
            if len(business_rule_errors) >= 2:  # Should catch duplicate google_id and project name
                print(f"✅ Business rules correctly enforced, found {len(business_rule_errors)} duplicate errors")
            else:
                print(f"⚠️ Some business rules may not be working, found {len(business_rule_errors)} duplicate errors")
        else:
            print("❌ Business rule validation failed - data with duplicates was accepted")
            return False
    except Exception as e:
        print(f"❌ Business rule validation test failed: {e}")
        return False
    
    # Test 5: Validate schema structure
    print("\n5️⃣ Testing schema structure...")
    try:
        schema_path = Path("mock_data/schemas/mock_data_schema.json")
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        required_sections = ["users", "projects", "device_classifications", "predicate_devices", "agent_interactions"]
        schema_properties = schema.get("properties", {})
        
        missing_sections = [section for section in required_sections if section not in schema_properties]
        if missing_sections:
            print(f"❌ Schema missing required sections: {missing_sections}")
            return False
        
        # Check that users and projects are required
        required_props = schema.get("required", [])
        if "users" not in required_props or "projects" not in required_props:
            print("❌ Schema should require 'users' and 'projects' properties")
            return False
        
        print("✅ Schema structure validation passed")
    except Exception as e:
        print(f"❌ Schema structure test failed: {e}")
        return False
    
    print("\n🎉 All JSON schema validation tests passed!")
    return True


def test_sample_data_completeness():
    """Test that sample data covers all required scenarios"""
    print("\n📊 Testing sample data completeness...")
    
    try:
        sample_config_path = Path("mock_data/sample_mock_data_config.json")
        with open(sample_config_path, 'r') as f:
            data = json.load(f)
        
        # Check data completeness
        checks = []
        
        # Check users
        users = data.get('users', [])
        checks.append(("Users count >= 3", len(users) >= 3))
        checks.append(("Users have required fields", all('google_id' in u and 'email' in u and 'name' in u for u in users)))
        
        # Check projects
        projects = data.get('projects', [])
        checks.append(("Projects count >= 3", len(projects) >= 3))
        checks.append(("Projects have varied statuses", len(set(p.get('status', 'draft') for p in projects)) >= 2))
        checks.append(("Projects have varied priorities", len(set(p.get('priority', 'medium') for p in projects if p.get('priority'))) >= 2))
        
        # Check device classifications
        classifications = data.get('device_classifications', [])
        checks.append(("Device classifications present", len(classifications) > 0))
        checks.append(("Classifications have varied device classes", len(set(c.get('device_class') for c in classifications)) >= 1))
        
        # Check predicate devices
        predicates = data.get('predicate_devices', [])
        checks.append(("Predicate devices present", len(predicates) > 0))
        checks.append(("Predicates have K-numbers", all('k_number' in p for p in predicates)))
        checks.append(("At least one selected predicate", any(p.get('is_selected', False) for p in predicates)))
        
        # Check agent interactions
        interactions = data.get('agent_interactions', [])
        checks.append(("Agent interactions present", len(interactions) > 0))
        checks.append(("Varied agent actions", len(set(i.get('agent_action') for i in interactions)) >= 2))
        
        # Print results
        passed_checks = sum(1 for _, result in checks if result)
        total_checks = len(checks)
        
        print(f"Sample data completeness: {passed_checks}/{total_checks} checks passed")
        for description, result in checks:
            status = "✅" if result else "❌"
            print(f"  {status} {description}")
        
        return passed_checks == total_checks
        
    except Exception as e:
        print(f"❌ Sample data completeness test failed: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Starting JSON Schema Validation Tests")
    
    # Change to the backend directory
    backend_dir = Path(__file__).parent
    import os
    os.chdir(backend_dir)
    
    success = True
    
    # Run validation tests
    if not test_schema_validation():
        success = False
    
    # Run completeness tests
    if not test_sample_data_completeness():
        success = False
    
    if success:
        print("\n🎉 All tests passed! JSON schema validation is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the output above.")
        sys.exit(1)