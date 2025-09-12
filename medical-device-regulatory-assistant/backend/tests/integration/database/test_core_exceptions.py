"""
Test script for unified exception hierarchy.

This script tests the core exception classes to ensure they work correctly
and provide the expected functionality.
"""

import sys
import traceback
from datetime import datetime
from core.exceptions import (
    RegulatoryAssistantException,
    ProjectNotFoundError,
    ValidationError,
    DatabaseError,
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    ConfigurationError,
    PerformanceError,
)


def test_base_exception():
    """Test the base RegulatoryAssistantException class."""
    print("Testing RegulatoryAssistantException...")
    
    try:
        exc = RegulatoryAssistantException(
            message="Test error message",
            error_code="TEST_ERROR",
            details={"test_key": "test_value"},
            user_message="User-friendly message",
            suggestions=["Try again", "Contact support"],
            context={"request_id": "test-123"}
        )
        
        # Test basic properties
        assert exc.message == "Test error message"
        assert exc.error_code == "TEST_ERROR"
        assert exc.details["test_key"] == "test_value"
        assert exc.user_message == "User-friendly message"
        assert len(exc.suggestions) == 2
        assert exc.context["request_id"] == "test-123"
        assert exc.error_id is not None
        assert isinstance(exc.timestamp, datetime)
        
        # Test to_dict method
        exc_dict = exc.to_dict()
        assert exc_dict["error_code"] == "TEST_ERROR"
        assert exc_dict["message"] == "Test error message"
        assert exc_dict["user_message"] == "User-friendly message"
        assert len(exc_dict["suggestions"]) == 2
        assert exc_dict["details"]["test_key"] == "test_value"
        assert exc_dict["context"]["request_id"] == "test-123"
        
        # Test add_context method
        exc.add_context("user_id", "user-456")
        assert exc.context["user_id"] == "user-456"
        
        # Test add_suggestion method
        exc.add_suggestion("New suggestion")
        assert "New suggestion" in exc.suggestions
        assert len(exc.suggestions) == 3
        
        print("✅ RegulatoryAssistantException tests passed")
        return True
        
    except Exception as e:
        print(f"❌ RegulatoryAssistantException test failed: {e}")
        traceback.print_exc()
        return False


def test_project_not_found_error():
    """Test ProjectNotFoundError class."""
    print("Testing ProjectNotFoundError...")
    
    try:
        exc = ProjectNotFoundError(
            project_id=123,
            user_id="user-456",
            additional_context={"source": "API"}
        )
        
        assert exc.error_code == "PROJECT_NOT_FOUND"
        assert exc.details["project_id"] == 123
        assert exc.details["user_id"] == "user-456"
        assert exc.details["source"] == "API"
        assert "Project with ID 123" in exc.user_message
        assert len(exc.suggestions) > 0
        
        print("✅ ProjectNotFoundError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ ProjectNotFoundError test failed: {e}")
        traceback.print_exc()
        return False


def test_validation_error():
    """Test ValidationError class."""
    print("Testing ValidationError...")
    
    try:
        exc = ValidationError(
            field="name",
            value="",
            constraint="must not be empty",
            validation_errors=[{"field": "name", "error": "required"}]
        )
        
        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.details["field"] == "name"
        assert exc.details["value"] == ""
        assert exc.details["constraint"] == "must not be empty"
        assert len(exc.details["validation_errors"]) == 1
        assert len(exc.suggestions) > 0
        assert "name" in exc.user_message.lower()
        
        print("✅ ValidationError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ ValidationError test failed: {e}")
        traceback.print_exc()
        return False


def test_database_error():
    """Test DatabaseError class."""
    print("Testing DatabaseError...")
    
    try:
        original_error = Exception("Query execution failed")
        exc = DatabaseError(
            operation="SELECT",
            table="projects",
            original_error=original_error,
            query_info={"query": "SELECT * FROM projects"}
        )
        
        assert exc.error_code == "DATABASE_ERROR"
        assert exc.details["operation"] == "SELECT"
        assert exc.details["table"] == "projects"
        assert "Query execution failed" in exc.details["original_error"]
        assert exc.details["query_info"]["query"] == "SELECT * FROM projects"
        assert len(exc.suggestions) > 0
        
        print("✅ DatabaseError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ DatabaseError test failed: {e}")
        traceback.print_exc()
        return False


def test_authentication_error():
    """Test AuthenticationError class."""
    print("Testing AuthenticationError...")
    
    try:
        exc = AuthenticationError(
            reason="Invalid token",
            auth_method="JWT",
            additional_details={"token_expired": True}
        )
        
        assert exc.error_code == "AUTHENTICATION_ERROR"
        assert exc.details["reason"] == "Invalid token"
        assert exc.details["auth_method"] == "JWT"
        assert exc.details["token_expired"] is True
        assert "Authentication failed" in exc.user_message
        assert len(exc.suggestions) > 0
        
        print("✅ AuthenticationError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ AuthenticationError test failed: {e}")
        traceback.print_exc()
        return False


def test_authorization_error():
    """Test AuthorizationError class."""
    print("Testing AuthorizationError...")
    
    try:
        exc = AuthorizationError(
            resource="project",
            action="delete",
            user_id="user-123",
            required_permissions=["project:delete"]
        )
        
        assert exc.error_code == "AUTHORIZATION_ERROR"
        assert exc.details["resource"] == "project"
        assert exc.details["action"] == "delete"
        assert exc.details["user_id"] == "user-123"
        assert "project:delete" in exc.details["required_permissions"]
        assert "permission" in exc.user_message.lower()
        assert len(exc.suggestions) > 0
        
        print("✅ AuthorizationError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ AuthorizationError test failed: {e}")
        traceback.print_exc()
        return False


def test_external_service_error():
    """Test ExternalServiceError class."""
    print("Testing ExternalServiceError...")
    
    try:
        # Test rate limiting scenario
        exc = ExternalServiceError(
            service_name="FDA API",
            operation="search",
            status_code=429,
            service_message="Rate limit exceeded",
            retry_after=60
        )
        
        assert exc.error_code == "EXTERNAL_SERVICE_RATE_LIMITED"
        assert exc.details["service_name"] == "FDA API"
        assert exc.details["operation"] == "search"
        assert exc.details["status_code"] == 429
        assert exc.details["retry_after"] == 60
        assert "rate limit" in exc.user_message.lower()
        assert len(exc.suggestions) > 0
        
        # Test service unavailable scenario
        exc2 = ExternalServiceError(
            service_name="FDA API",
            operation="search",
            status_code=503,
            service_message="Service unavailable"
        )
        
        assert exc2.error_code == "EXTERNAL_SERVICE_UNAVAILABLE"
        assert "unavailable" in exc2.user_message.lower()
        
        print("✅ ExternalServiceError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ ExternalServiceError test failed: {e}")
        traceback.print_exc()
        return False


def test_configuration_error():
    """Test ConfigurationError class."""
    print("Testing ConfigurationError...")
    
    try:
        exc = ConfigurationError(
            config_key="DATABASE_URL",
            reason="Environment variable not set",
            config_file=".env",
            expected_type="string"
        )
        
        assert exc.error_code == "CONFIGURATION_ERROR"
        assert exc.details["config_key"] == "DATABASE_URL"
        assert exc.details["reason"] == "Environment variable not set"
        assert exc.details["config_file"] == ".env"
        assert exc.details["expected_type"] == "string"
        assert "Configuration error" in exc.user_message
        assert len(exc.suggestions) > 0
        
        print("✅ ConfigurationError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ ConfigurationError test failed: {e}")
        traceback.print_exc()
        return False


def test_performance_error():
    """Test PerformanceError class."""
    print("Testing PerformanceError...")
    
    try:
        exc = PerformanceError(
            operation="database_query",
            metric="execution_time",
            actual_value=5000.0,
            threshold=1000.0,
            unit="ms"
        )
        
        assert exc.error_code == "PERFORMANCE_ERROR"
        assert exc.details["operation"] == "database_query"
        assert exc.details["metric"] == "execution_time"
        assert exc.details["actual_value"] == 5000.0
        assert exc.details["threshold"] == 1000.0
        assert exc.details["unit"] == "ms"
        assert "longer than expected" in exc.user_message.lower()
        assert len(exc.suggestions) > 0
        
        print("✅ PerformanceError tests passed")
        return True
        
    except Exception as e:
        print(f"❌ PerformanceError test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all exception tests."""
    print("🧪 Testing Unified Exception Hierarchy")
    print("=" * 50)
    
    tests = [
        test_base_exception,
        test_project_not_found_error,
        test_validation_error,
        test_database_error,
        test_authentication_error,
        test_authorization_error,
        test_external_service_error,
        test_configuration_error,
        test_performance_error,
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
    
    print("=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())