"""
Simple test script for service layer exception handling.

This script tests that the service layer correctly imports and uses
the new standardized exception types.
"""

import sys
import traceback

def test_exception_imports():
    """Test that the service can import the new exception types."""
    print("Testing exception imports...")
    
    try:
        # Test importing the service and exceptions
        from services.projects import ProjectService
        from core.exceptions import (
            ProjectNotFoundError,
            ValidationError,
            DatabaseError,
        )
        
        # Test that the service class can be instantiated
        service = ProjectService()
        
        # Test that exception classes can be instantiated
        project_not_found = ProjectNotFoundError(
            project_id=123,
            user_id="test-user",
            additional_context={"operation": "test"}
        )
        
        validation_error = ValidationError(
            field="name",
            value="",
            constraint="cannot be empty"
        )
        
        database_error = DatabaseError(
            operation="test",
            table="projects",
            original_error=Exception("test error")
        )
        
        # Verify exception properties
        assert project_not_found.error_code == "PROJECT_NOT_FOUND"
        assert project_not_found.details["project_id"] == 123
        assert project_not_found.details["user_id"] == "test-user"
        assert project_not_found.details["operation"] == "test"
        
        assert validation_error.error_code == "VALIDATION_ERROR"
        assert validation_error.details["field"] == "name"
        assert validation_error.details["value"] == ""
        
        assert database_error.error_code == "DATABASE_ERROR"
        assert database_error.details["operation"] == "test"
        assert database_error.details["table"] == "projects"
        
        print("✅ All exception imports and instantiation successful")
        return True
        
    except Exception as e:
        print(f"❌ Exception import test failed: {e}")
        traceback.print_exc()
        return False


def test_exception_hierarchy():
    """Test that all exceptions inherit from the base exception."""
    print("Testing exception hierarchy...")
    
    try:
        from core.exceptions import (
            RegulatoryAssistantException,
            ProjectNotFoundError,
            ValidationError,
            DatabaseError,
        )
        
        # Test inheritance
        project_exc = ProjectNotFoundError(project_id=1, user_id="test")
        validation_exc = ValidationError(field="test", value="", constraint="required")
        database_exc = DatabaseError(operation="test", table="test")
        
        assert isinstance(project_exc, RegulatoryAssistantException)
        assert isinstance(validation_exc, RegulatoryAssistantException)
        assert isinstance(database_exc, RegulatoryAssistantException)
        
        # Test that they all have the required methods
        for exc in [project_exc, validation_exc, database_exc]:
            assert hasattr(exc, 'to_dict')
            assert hasattr(exc, 'add_context')
            assert hasattr(exc, 'add_suggestion')
            assert hasattr(exc, 'error_code')
            assert hasattr(exc, 'error_id')
            assert hasattr(exc, 'timestamp')
            
            # Test to_dict method
            exc_dict = exc.to_dict()
            assert 'error_code' in exc_dict
            assert 'message' in exc_dict
            assert 'user_message' in exc_dict
            assert 'details' in exc_dict
            assert 'suggestions' in exc_dict
            assert 'timestamp' in exc_dict
        
        print("✅ Exception hierarchy tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Exception hierarchy test failed: {e}")
        traceback.print_exc()
        return False


def test_service_imports():
    """Test that the service correctly imports the new exceptions."""
    print("Testing service imports...")
    
    try:
        # Import the service module and check its imports
        import services.projects as projects_module
        
        # Check that the service module has the correct imports
        assert hasattr(projects_module, 'ProjectNotFoundError')
        assert hasattr(projects_module, 'ValidationError')
        assert hasattr(projects_module, 'DatabaseError')
        
        # Verify these are the correct exception classes
        from core.exceptions import (
            ProjectNotFoundError as CoreProjectNotFoundError,
            ValidationError as CoreValidationError,
            DatabaseError as CoreDatabaseError,
        )
        
        assert projects_module.ProjectNotFoundError is CoreProjectNotFoundError
        assert projects_module.ValidationError is CoreValidationError
        assert projects_module.DatabaseError is CoreDatabaseError
        
        print("✅ Service imports the correct exception classes")
        return True
        
    except Exception as e:
        print(f"❌ Service import test failed: {e}")
        traceback.print_exc()
        return False


def test_exception_mapper_integration():
    """Test that the exception mapper can handle the service exceptions."""
    print("Testing exception mapper integration...")
    
    try:
        from core.exception_mapper import ExceptionMapper
        from core.exceptions import ProjectNotFoundError, ValidationError, DatabaseError
        
        mapper = ExceptionMapper()
        
        # Test mapping different exception types
        project_exc = ProjectNotFoundError(project_id=123, user_id="test")
        validation_exc = ValidationError(field="name", value="", constraint="required")
        database_exc = DatabaseError(operation="test", table="projects")
        
        # Test HTTP exception mapping
        http_project_exc = mapper.map_to_http_exception(project_exc)
        http_validation_exc = mapper.map_to_http_exception(validation_exc)
        http_database_exc = mapper.map_to_http_exception(database_exc)
        
        # Verify status codes
        assert http_project_exc.status_code == 404
        assert http_validation_exc.status_code == 422
        assert http_database_exc.status_code == 500
        
        # Verify detail structure
        for http_exc in [http_project_exc, http_validation_exc, http_database_exc]:
            assert isinstance(http_exc.detail, dict)
            assert 'error_code' in http_exc.detail
            assert 'message' in http_exc.detail
            assert 'user_message' in http_exc.detail
            assert 'suggestions' in http_exc.detail
        
        print("✅ Exception mapper integration tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Exception mapper integration test failed: {e}")
        traceback.print_exc()
        return False


def test_no_http_exception_usage():
    """Test that the service no longer uses HTTPException directly."""
    print("Testing HTTPException removal...")
    
    try:
        import services.projects as projects_module
        import inspect
        
        # Get the source code of the module
        source = inspect.getsource(projects_module)
        
        # Check that HTTPException is not used in raise statements
        lines = source.split('\n')
        for i, line in enumerate(lines):
            if 'raise HTTPException' in line:
                print(f"❌ Found HTTPException usage at line {i+1}: {line.strip()}")
                return False
        
        # Check that HTTPException is not imported for raising
        if 'from fastapi import HTTPException' in source:
            print("❌ HTTPException is still imported from fastapi")
            return False
        
        print("✅ HTTPException is no longer used in the service")
        return True
        
    except Exception as e:
        print(f"❌ HTTPException removal test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all simple service exception tests."""
    print("🧪 Testing Service Layer Exception Handling (Simple)")
    print("=" * 55)
    
    tests = [
        test_exception_imports,
        test_exception_hierarchy,
        test_service_imports,
        test_exception_mapper_integration,
        test_no_http_exception_usage,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            failed += 1
        print()
    
    print("=" * 55)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())