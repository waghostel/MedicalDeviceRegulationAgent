"""
Test script for updated projects service with standardized exception handling.

This script tests that the projects service correctly uses the new
standardized exception types instead of generic HTTPExceptions.
"""

import sys
import traceback
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

# Import the updated service and exceptions
from services.projects import ProjectService, ProjectCreateRequest, ProjectUpdateRequest
from core.exceptions import (
    ProjectNotFoundError,
    ValidationError,
    DatabaseError,
)


def test_create_project_validation():
    """Test that create_project raises ValidationError for invalid data."""
    print("Testing create_project validation...")
    
    try:
        service = ProjectService()
        
        # Test with empty name
        project_data = ProjectCreateRequest(
            name="",  # Empty name should trigger validation error
            description="Test description"
        )
        
        # Mock the database manager to avoid actual database calls
        with patch.object(service, 'db_manager') as mock_db_manager:
            mock_session = AsyncMock()
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_session
            
            # Mock user exists
            mock_user = Mock()
            mock_user.id = 1
            mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user
            
            # This should raise ValidationError
            try:
                import asyncio
                asyncio.run(service.create_project(project_data, "test-user"))
                assert False, "Expected ValidationError was not raised"
            except ValidationError as e:
                assert e.error_code == "VALIDATION_ERROR"
                assert e.details["field"] == "name"
                assert "empty" in e.details["constraint"].lower()
                print("✅ ValidationError correctly raised for empty name")
                return True
            except Exception as e:
                print(f"❌ Unexpected exception: {e}")
                return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        traceback.print_exc()
        return False


def test_get_project_not_found():
    """Test that get_project raises ProjectNotFoundError when project doesn't exist."""
    print("Testing get_project not found...")
    
    try:
        service = ProjectService()
        
        # Mock the database manager
        with patch.object(service, 'db_manager') as mock_db_manager:
            mock_session = AsyncMock()
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_session
            
            # Mock project not found
            mock_session.execute.return_value.scalar_one_or_none.return_value = None
            
            # This should raise ProjectNotFoundError
            try:
                import asyncio
                asyncio.run(service.get_project(123, "test-user"))
                assert False, "Expected ProjectNotFoundError was not raised"
            except ProjectNotFoundError as e:
                assert e.error_code == "PROJECT_NOT_FOUND"
                assert e.details["project_id"] == 123
                assert e.details["user_id"] == "test-user"
                assert e.details["operation"] == "get_project"
                print("✅ ProjectNotFoundError correctly raised")
                return True
            except Exception as e:
                print(f"❌ Unexpected exception: {e}")
                return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        traceback.print_exc()
        return False


def test_update_project_validation():
    """Test that update_project raises ValidationError for invalid data."""
    print("Testing update_project validation...")
    
    try:
        service = ProjectService()
        
        # Test with empty name in update
        project_data = ProjectUpdateRequest(
            name=""  # Empty name should trigger validation error
        )
        
        # Mock the database manager
        with patch.object(service, 'db_manager') as mock_db_manager:
            mock_session = AsyncMock()
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_session
            
            # Mock project exists
            mock_project = Mock()
            mock_project.id = 123
            mock_project.name = "Original Name"
            mock_session.execute.return_value.scalar_one_or_none.return_value = mock_project
            
            # This should raise ValidationError
            try:
                import asyncio
                asyncio.run(service.update_project(123, project_data, "test-user"))
                assert False, "Expected ValidationError was not raised"
            except ValidationError as e:
                assert e.error_code == "VALIDATION_ERROR"
                assert e.details["field"] == "name"
                assert "empty" in e.details["constraint"].lower()
                print("✅ ValidationError correctly raised for empty name in update")
                return True
            except Exception as e:
                print(f"❌ Unexpected exception: {e}")
                return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        traceback.print_exc()
        return False


def test_database_error_handling():
    """Test that database errors are properly wrapped in DatabaseError."""
    print("Testing database error handling...")
    
    try:
        service = ProjectService()
        
        project_data = ProjectCreateRequest(
            name="Test Project",
            description="Test description"
        )
        
        # Mock the database manager to raise an exception
        with patch.object(service, 'db_manager') as mock_db_manager:
            mock_session = AsyncMock()
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_session
            
            # Mock database exception
            mock_session.execute.side_effect = Exception("Database connection failed")
            
            # This should raise DatabaseError
            try:
                import asyncio
                asyncio.run(service.create_project(project_data, "test-user"))
                assert False, "Expected DatabaseError was not raised"
            except DatabaseError as e:
                assert e.error_code == "DATABASE_ERROR"
                assert e.details["operation"] == "create_project"
                assert e.details["table"] == "projects"
                assert "Database connection failed" in e.details["original_error"]
                print("✅ DatabaseError correctly raised and wrapped original exception")
                return True
            except Exception as e:
                print(f"❌ Unexpected exception: {e}")
                return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        traceback.print_exc()
        return False


def test_exception_context_and_suggestions():
    """Test that exceptions include proper context and suggestions."""
    print("Testing exception context and suggestions...")
    
    try:
        service = ProjectService()
        
        # Mock the database manager
        with patch.object(service, 'db_manager') as mock_db_manager:
            mock_session = AsyncMock()
            mock_db_manager.get_session.return_value.__aenter__.return_value = mock_session
            
            # Mock project not found
            mock_session.execute.return_value.scalar_one_or_none.return_value = None
            
            try:
                import asyncio
                asyncio.run(service.delete_project(456, "test-user"))
                assert False, "Expected ProjectNotFoundError was not raised"
            except ProjectNotFoundError as e:
                # Check that context is properly set
                assert e.details["project_id"] == 456
                assert e.details["user_id"] == "test-user"
                assert e.details["operation"] == "delete_project"
                
                # Check that suggestions are provided
                assert len(e.suggestions) > 0
                assert any("project ID" in suggestion.lower() for suggestion in e.suggestions)
                
                # Check that user message is user-friendly
                assert "Project with ID 456" in e.user_message
                assert "not found" in e.user_message.lower()
                
                print("✅ Exception context and suggestions are properly set")
                return True
            except Exception as e:
                print(f"❌ Unexpected exception: {e}")
                return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all service layer exception tests."""
    print("🧪 Testing Updated Projects Service Exception Handling")
    print("=" * 60)
    
    tests = [
        test_create_project_validation,
        test_get_project_not_found,
        test_update_project_validation,
        test_database_error_handling,
        test_exception_context_and_suggestions,
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
    
    print("=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())