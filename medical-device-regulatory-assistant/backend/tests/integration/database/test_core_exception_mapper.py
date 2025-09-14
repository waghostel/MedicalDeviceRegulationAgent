"""
Test script for exception mapping middleware.

This script tests the ExceptionMapper class to ensure it correctly maps
exceptions to HTTP responses with appropriate status codes and formatting.
"""

import sys
import traceback
from unittest.mock import Mock
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

from core.exception_mapper import ExceptionMapper, get_exception_mapper
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


def create_mock_request(method: str = "GET", url: str = "http://test.com/api/test") -> Request:
    """Create a mock request for testing."""
    request = Mock(spec=Request)
    request.method = method
    request.url = Mock()
    request.url.__str__ = Mock(return_value=url)
    request.url.path = "/api/test"
    request.state = Mock()
    request.state.request_id = "test-request-123"
    request.state.user_id = "test-user-456"
    return request


def test_exception_mapper_initialization():
    """Test ExceptionMapper initialization."""
    print("Testing ExceptionMapper initialization...")
    
    try:
        # Test default initialization
        mapper = ExceptionMapper()
        assert mapper.include_debug_info is False
        
        # Test with debug info enabled
        mapper_debug = ExceptionMapper(include_debug_info=True)
        assert mapper_debug.include_debug_info is True
        
        # Test get_exception_mapper function
        mapper_func = get_exception_mapper()
        assert mapper_func.include_debug_info is False
        
        mapper_func_debug = get_exception_mapper(include_debug_info=True)
        assert mapper_func_debug.include_debug_info is True
        
        print("✅ ExceptionMapper initialization tests passed")
        return True
        
    except Exception as e:
        print(f"❌ ExceptionMapper initialization test failed: {e}")
        traceback.print_exc()
        return False


def test_map_to_http_exception():
    """Test mapping exceptions to HTTP exceptions."""
    print("Testing map_to_http_exception...")
    
    try:
        mapper = ExceptionMapper()
        
        # Test ProjectNotFoundError
        exc = ProjectNotFoundError(project_id=123, user_id="user-456")
        http_exc = mapper.map_to_http_exception(exc)
        
        assert isinstance(http_exc, HTTPException)
        assert http_exc.status_code == 404
        assert isinstance(http_exc.detail, dict)
        assert http_exc.detail["error_code"] == "PROJECT_NOT_FOUND"
        assert http_exc.detail["user_message"] is not None
        
        # Test ValidationError
        validation_exc = ValidationError(field="name", value="", constraint="required")
        http_validation_exc = mapper.map_to_http_exception(validation_exc)
        
        assert http_validation_exc.status_code == 422
        assert http_validation_exc.detail["error_code"] == "VALIDATION_ERROR"
        
        # Test DatabaseError
        db_exc = DatabaseError(operation="SELECT", table="projects")
        http_db_exc = mapper.map_to_http_exception(db_exc)
        
        assert http_db_exc.status_code == 500
        assert http_db_exc.detail["error_code"] == "DATABASE_ERROR"
        
        # Test AuthenticationError
        auth_exc = AuthenticationError(reason="Invalid token")
        http_auth_exc = mapper.map_to_http_exception(auth_exc)
        
        assert http_auth_exc.status_code == 401
        assert http_auth_exc.detail["error_code"] == "AUTHENTICATION_ERROR"
        
        # Test AuthorizationError
        authz_exc = AuthorizationError(resource="project", action="delete", user_id="user-123")
        http_authz_exc = mapper.map_to_http_exception(authz_exc)
        
        assert http_authz_exc.status_code == 403
        assert http_authz_exc.detail["error_code"] == "AUTHORIZATION_ERROR"
        
        # Test ExternalServiceError
        ext_exc = ExternalServiceError(service_name="FDA API", operation="search")
        http_ext_exc = mapper.map_to_http_exception(ext_exc)
        
        assert http_ext_exc.status_code == 502
        assert http_ext_exc.detail["error_code"] == "EXTERNAL_SERVICE_ERROR"
        
        # Test standard exception
        std_exc = ValueError("Standard error")
        http_std_exc = mapper.map_to_http_exception(std_exc)
        
        assert http_std_exc.status_code == 500
        assert http_std_exc.detail["error_code"] == "UNKNOWN_ERROR"
        
        print("✅ map_to_http_exception tests passed")
        return True
        
    except Exception as e:
        print(f"❌ map_to_http_exception test failed: {e}")
        traceback.print_exc()
        return False


def test_special_status_codes():
    """Test special status code handling."""
    print("Testing special status codes...")
    
    try:
        mapper = ExceptionMapper()
        
        # Test database connection error
        db_conn_exc = DatabaseError(
            operation="CONNECT",
            original_error=Exception("connection failed")
        )
        http_exc = mapper.map_to_http_exception(db_conn_exc)
        assert http_exc.status_code == 503  # SERVICE_UNAVAILABLE
        
        # Test external service rate limiting
        rate_limit_exc = ExternalServiceError(
            service_name="FDA API",
            operation="search",
            status_code=429,
            retry_after=60
        )
        http_rate_exc = mapper.map_to_http_exception(rate_limit_exc)
        assert http_rate_exc.status_code == 429  # TOO_MANY_REQUESTS
        
        # Test external service unavailable
        unavailable_exc = ExternalServiceError(
            service_name="FDA API",
            operation="search",
            status_code=503
        )
        http_unavailable_exc = mapper.map_to_http_exception(unavailable_exc)
        assert http_unavailable_exc.status_code == 503  # SERVICE_UNAVAILABLE
        
        print("✅ Special status codes tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Special status codes test failed: {e}")
        traceback.print_exc()
        return False


def test_create_error_response():
    """Test creating error responses."""
    print("Testing create_error_response...")
    
    try:
        mapper = ExceptionMapper()
        request = create_mock_request()
        
        # Test with RegulatoryAssistantException
        exc = ProjectNotFoundError(project_id=123, user_id="user-456")
        response = mapper.create_error_response(request, exc)
        
        assert isinstance(response, JSONResponse)
        assert response.status_code == 404
        
        # Check response content
        content = response.body.decode()
        import json
        response_data = json.loads(content)
        
        assert response_data["error_code"] == "PROJECT_NOT_FOUND"
        assert response_data["request_id"] == "test-request-123"
        assert response_data["status_code"] == 404
        assert "debug" not in response_data  # Debug info disabled by default
        
        # Test with debug info enabled
        mapper_debug = ExceptionMapper(include_debug_info=True)
        response_debug = mapper_debug.create_error_response(request, exc)
        
        content_debug = response_debug.body.decode()
        response_data_debug = json.loads(content_debug)
        
        assert "debug" in response_data_debug
        assert response_data_debug["debug"]["method"] == "GET"
        assert response_data_debug["debug"]["url"] == "http://test.com/api/test"
        
        # Test with standard exception
        std_exc = ValueError("Standard error")
        std_response = mapper.create_error_response(request, std_exc)
        
        assert std_response.status_code == 500
        
        std_content = std_response.body.decode()
        std_response_data = json.loads(std_content)
        
        assert std_response_data["error_code"] == "UNKNOWN_ERROR"
        assert std_response_data["request_id"] == "test-request-123"
        
        print("✅ create_error_response tests passed")
        return True
        
    except Exception as e:
        print(f"❌ create_error_response test failed: {e}")
        traceback.print_exc()
        return False


def test_retry_after_header():
    """Test adding Retry-After header."""
    print("Testing retry-after header...")
    
    try:
        mapper = ExceptionMapper()
        
        # Test rate limited exception
        exc = ExternalServiceError(
            service_name="FDA API",
            operation="search",
            status_code=429,
            retry_after=60
        )
        
        request = create_mock_request()
        response = mapper.create_error_response(request, exc)
        
        # Add retry-after header
        response_with_header = mapper.add_retry_after_header(response, exc)
        
        assert "Retry-After" in response_with_header.headers
        assert response_with_header.headers["Retry-After"] == "60"
        
        # Test exception without retry_after
        exc_no_retry = ProjectNotFoundError(project_id=123)
        response_no_retry = mapper.create_error_response(request, exc_no_retry)
        response_no_header = mapper.add_retry_after_header(response_no_retry, exc_no_retry)
        
        assert "Retry-After" not in response_no_header.headers
        
        print("✅ retry-after header tests passed")
        return True
        
    except Exception as e:
        print(f"❌ retry-after header test failed: {e}")
        traceback.print_exc()
        return False


def test_error_summary():
    """Test error summary generation."""
    print("Testing error summary...")
    
    try:
        mapper = ExceptionMapper()
        
        # Test with RegulatoryAssistantException
        exc = ProjectNotFoundError(project_id=123, user_id="user-456")
        exc.add_context("source", "API")
        exc.add_suggestion("Check project ID")
        
        summary = mapper.get_error_summary(exc)
        
        assert summary["error_id"] == exc.error_id
        assert summary["error_code"] == "PROJECT_NOT_FOUND"
        assert summary["exception_type"] == "ProjectNotFoundError"
        assert summary["status_code"] == 404
        assert summary["has_suggestions"] is True
        assert "source" in summary["context_keys"]
        assert "project_id" in summary["details_keys"]
        
        # Test with standard exception
        std_exc = ValueError("Standard error")
        std_summary = mapper.get_error_summary(std_exc)
        
        assert std_summary["error_id"] is None
        assert std_summary["error_code"] == "UNKNOWN_ERROR"
        assert std_summary["exception_type"] == "ValueError"
        assert std_summary["status_code"] == 500
        assert std_summary["has_suggestions"] is False
        
        print("✅ error summary tests passed")
        return True
        
    except Exception as e:
        print(f"❌ error summary test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all exception mapper tests."""
    print("🧪 Testing Exception Mapping Middleware")
    print("=" * 50)
    
    tests = [
        test_exception_mapper_initialization,
        test_map_to_http_exception,
        test_special_status_codes,
        test_create_error_response,
        test_retry_after_header,
        test_error_summary,
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