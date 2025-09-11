"""
Exception mapping middleware for Medical Device Regulatory Assistant.

This module provides centralized exception mapping from application exceptions
to HTTP responses with consistent formatting and status codes.
"""

from typing import Dict, Any, Optional, Type
from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
import logging

from .exceptions import (
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

logger = logging.getLogger(__name__)


class ExceptionMapper:
    """
    Maps application exceptions to HTTP status codes and responses.
    
    Provides consistent error response formatting and appropriate HTTP status codes
    for all application exceptions.
    """
    
    # Mapping of exception types to HTTP status codes
    EXCEPTION_STATUS_MAP: Dict[Type[Exception], int] = {
        ProjectNotFoundError: status.HTTP_404_NOT_FOUND,
        ValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        AuthorizationError: status.HTTP_403_FORBIDDEN,
        ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
        ConfigurationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        PerformanceError: status.HTTP_503_SERVICE_UNAVAILABLE,
    }
    
    # Special handling for specific error codes
    SPECIAL_STATUS_CODES: Dict[str, int] = {
        "DATABASE_CONNECTION_ERROR": status.HTTP_503_SERVICE_UNAVAILABLE,
        "DATABASE_CONSTRAINT_ERROR": status.HTTP_409_CONFLICT,
        "EXTERNAL_SERVICE_RATE_LIMITED": status.HTTP_429_TOO_MANY_REQUESTS,
        "EXTERNAL_SERVICE_UNAVAILABLE": status.HTTP_503_SERVICE_UNAVAILABLE,
        "EXTERNAL_SERVICE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    }
    
    def __init__(self, include_debug_info: bool = False):
        """
        Initialize the exception mapper.
        
        Args:
            include_debug_info: Whether to include debug information in responses
        """
        self.include_debug_info = include_debug_info
    
    def map_to_http_exception(self, exc: Exception) -> HTTPException:
        """
        Map application exception to HTTP exception.
        
        Args:
            exc: The exception to map
            
        Returns:
            HTTPException: Mapped HTTP exception
        """
        if isinstance(exc, RegulatoryAssistantException):
            status_code = self._get_status_code(exc)
            detail = self._create_error_detail(exc)
            
            return HTTPException(
                status_code=status_code,
                detail=detail
            )
        
        # Handle standard exceptions
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "UNKNOWN_ERROR",
                "message": "An unexpected error occurred",
                "user_message": "Something went wrong. Please try again.",
                "details": {"exception_type": type(exc).__name__},
                "suggestions": [
                    "Try again in a few minutes",
                    "Contact support if the problem persists"
                ]
            }
        )
    
    def create_error_response(
        self,
        request: Request,
        exc: Exception,
        status_code: Optional[int] = None
    ) -> JSONResponse:
        """
        Create standardized error response.
        
        Args:
            request: FastAPI request object
            exc: The exception that occurred
            status_code: Optional override for status code
            
        Returns:
            JSONResponse: Formatted error response
        """
        if isinstance(exc, RegulatoryAssistantException):
            response_status = status_code or self._get_status_code(exc)
            error_data = self._create_error_detail(exc)
            
            # Add request context
            error_data["request_id"] = getattr(request.state, "request_id", None)
            error_data["status_code"] = response_status
            
            # Add debug information if enabled
            if self.include_debug_info:
                error_data["debug"] = {
                    "method": request.method,
                    "url": str(request.url),
                    "exception_type": type(exc).__name__,
                }
            
            # Log the error
            self._log_error(request, exc, response_status)
            
            return JSONResponse(
                status_code=response_status,
                content=error_data
            )
        
        # Handle standard exceptions
        response_status = status_code or status.HTTP_500_INTERNAL_SERVER_ERROR
        error_data = {
            "error_code": "UNKNOWN_ERROR",
            "message": "An unexpected error occurred",
            "user_message": "Something went wrong. Please try again.",
            "details": {"exception_type": type(exc).__name__},
            "suggestions": [
                "Try again in a few minutes",
                "Contact support if the problem persists"
            ],
            "request_id": getattr(request.state, "request_id", None),
            "status_code": response_status
        }
        
        if self.include_debug_info:
            error_data["debug"] = {
                "method": request.method,
                "url": str(request.url),
                "exception_type": type(exc).__name__,
                "exception_message": str(exc)
            }
        
        # Log the error
        self._log_error(request, exc, response_status)
        
        return JSONResponse(
            status_code=response_status,
            content=error_data
        )
    
    def _get_status_code(self, exc: RegulatoryAssistantException) -> int:
        """
        Get appropriate HTTP status code for exception.
        
        Args:
            exc: The exception to get status code for
            
        Returns:
            int: HTTP status code
        """
        # Check for special error codes first
        if exc.error_code in self.SPECIAL_STATUS_CODES:
            return self.SPECIAL_STATUS_CODES[exc.error_code]
        
        # Use exception type mapping
        exc_type = type(exc)
        return self.EXCEPTION_STATUS_MAP.get(exc_type, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_error_detail(self, exc: RegulatoryAssistantException) -> Dict[str, Any]:
        """
        Create error detail dictionary from exception.
        
        Args:
            exc: The exception to create detail for
            
        Returns:
            Dict: Error detail dictionary
        """
        return exc.to_dict()
    
    def _log_error(self, request: Request, exc: Exception, status_code: int) -> None:
        """
        Log error with appropriate level and context.
        
        Args:
            request: FastAPI request object
            exc: The exception that occurred
            status_code: HTTP status code
        """
        # Determine log level based on status code
        if status_code >= 500:
            log_level = logging.ERROR
        elif status_code >= 400:
            log_level = logging.WARNING
        else:
            log_level = logging.INFO
        
        # Create log context
        context = {
            "method": request.method,
            "url": str(request.url),
            "status_code": status_code,
            "exception_type": type(exc).__name__,
            "request_id": getattr(request.state, "request_id", None),
        }
        
        # Add user context if available
        if hasattr(request.state, "user_id"):
            context["user_id"] = request.state.user_id
        
        # Add exception details if it's a RegulatoryAssistantException
        if isinstance(exc, RegulatoryAssistantException):
            context["error_code"] = exc.error_code
            context["error_id"] = exc.error_id
        
        # Log the error
        logger.log(
            log_level,
            f"HTTP {status_code} - {request.method} {request.url.path} - {type(exc).__name__}: {str(exc)}",
            extra=context,
            exc_info=status_code >= 500  # Include traceback for server errors
        )
    
    def add_retry_after_header(
        self,
        response: JSONResponse,
        exc: RegulatoryAssistantException
    ) -> JSONResponse:
        """
        Add Retry-After header for rate limiting errors.
        
        Args:
            response: The JSON response to modify
            exc: The exception that occurred
            
        Returns:
            JSONResponse: Response with Retry-After header if applicable
        """
        if (exc.error_code in ["EXTERNAL_SERVICE_RATE_LIMITED", "PERFORMANCE_ERROR"] and
            "retry_after" in exc.details):
            response.headers["Retry-After"] = str(exc.details["retry_after"])
        
        return response
    
    def get_error_summary(self, exc: Exception) -> Dict[str, Any]:
        """
        Get a summary of the error for monitoring and analytics.
        
        Args:
            exc: The exception to summarize
            
        Returns:
            Dict: Error summary
        """
        if isinstance(exc, RegulatoryAssistantException):
            return {
                "error_id": exc.error_id,
                "error_code": exc.error_code,
                "exception_type": type(exc).__name__,
                "status_code": self._get_status_code(exc),
                "timestamp": exc.timestamp.isoformat(),
                "has_suggestions": len(exc.suggestions) > 0,
                "context_keys": list(exc.context.keys()),
                "details_keys": list(exc.details.keys())
            }
        
        return {
            "error_id": None,
            "error_code": "UNKNOWN_ERROR",
            "exception_type": type(exc).__name__,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "timestamp": None,
            "has_suggestions": False,
            "context_keys": [],
            "details_keys": []
        }


# Global exception mapper instance
exception_mapper = ExceptionMapper()


def get_exception_mapper(include_debug_info: bool = False) -> ExceptionMapper:
    """
    Get exception mapper instance.
    
    Args:
        include_debug_info: Whether to include debug information
        
    Returns:
        ExceptionMapper: Exception mapper instance
    """
    return ExceptionMapper(include_debug_info=include_debug_info)