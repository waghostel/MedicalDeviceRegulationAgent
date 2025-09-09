"""
Global exception handlers and error response utilities.

This module provides centralized error handling, logging, and response formatting
for all custom exceptions in the Medical Device Regulatory Assistant.
"""

import logging
import traceback
from typing import Dict, Any, Optional, Union
from datetime import datetime

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .project_exceptions import (
    ProjectError,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectStateError,
    ProjectConcurrencyError,
    ProjectQuotaExceededError,
)
from .regulatory_exceptions import (
    RegulatoryError,
    FDAAPIError,
    ClassificationError,
    PredicateSearchError,
    ComplianceError,
    DocumentProcessingError,
)


logger = logging.getLogger("medical_device_assistant.exceptions")


def get_request_id(request: Request) -> str:
    """Extract request ID from request state or generate one."""
    return getattr(request.state, "request_id", f"req_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")


def log_error_with_context(
    request: Request,
    exception: Exception,
    level: str = "error",
    include_traceback: bool = True
) -> None:
    """
    Log error with comprehensive context information.
    
    Args:
        request: FastAPI request object
        exception: The exception that occurred
        level: Logging level (error, warning, info)
        include_traceback: Whether to include full traceback
    """
    request_id = get_request_id(request)
    
    # Build context information
    context = {
        "request_id": request_id,
        "method": request.method,
        "url": str(request.url),
        "user_agent": request.headers.get("user-agent"),
        "client_ip": request.client.host if request.client else None,
        "exception_type": type(exception).__name__,
        "exception_message": str(exception),
    }
    
    # Add user context if available
    if hasattr(request.state, "user_id"):
        context["user_id"] = request.state.user_id
    
    # Add custom exception details if available
    if hasattr(exception, "to_dict"):
        context["exception_details"] = exception.to_dict()
    
    # Format log message
    log_message = f"Exception in {request.method} {request.url.path} - {type(exception).__name__}: {str(exception)}"
    
    # Log with appropriate level
    log_func = getattr(logger, level, logger.error)
    
    if include_traceback and level == "error":
        log_func(log_message, extra=context, exc_info=True)
    else:
        log_func(log_message, extra=context)


def create_error_response(
    request: Request,
    exception: Union[Exception, Dict[str, Any]],
    status_code: int = 500,
    include_debug_info: bool = False
) -> JSONResponse:
    """
    Create standardized error response.
    
    Args:
        request: FastAPI request object
        exception: Exception or error dictionary
        status_code: HTTP status code
        include_debug_info: Whether to include debug information
        
    Returns:
        JSONResponse: Formatted error response
    """
    request_id = get_request_id(request)
    
    if isinstance(exception, dict):
        error_data = exception
    elif hasattr(exception, "to_dict"):
        error_data = exception.to_dict()
    else:
        error_data = {
            "error_code": "UNKNOWN_ERROR",
            "message": str(exception),
            "user_message": "An unexpected error occurred. Please try again.",
            "details": {},
            "suggestions": ["Try again in a few minutes", "Contact support if the problem persists"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Add request context
    error_data["request_id"] = request_id
    error_data["status_code"] = status_code
    
    # Add debug information in development
    if include_debug_info:
        error_data["debug"] = {
            "method": request.method,
            "url": str(request.url),
            "exception_type": type(exception).__name__,
            "traceback": traceback.format_exc() if isinstance(exception, Exception) else None
        }
    
    return JSONResponse(
        status_code=status_code,
        content=error_data
    )


# Exception Handlers

async def project_error_handler(request: Request, exc: ProjectError) -> JSONResponse:
    """Handle general project errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=400)


async def project_not_found_handler(request: Request, exc: ProjectNotFoundError) -> JSONResponse:
    """Handle project not found errors."""
    log_error_with_context(request, exc, level="info", include_traceback=False)
    return create_error_response(request, exc, status_code=404)


async def project_access_denied_handler(request: Request, exc: ProjectAccessDeniedError) -> JSONResponse:
    """Handle project access denied errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=403)


async def project_validation_error_handler(request: Request, exc: ProjectValidationError) -> JSONResponse:
    """Handle project validation errors."""
    log_error_with_context(request, exc, level="info", include_traceback=False)
    return create_error_response(request, exc, status_code=422)


async def project_state_error_handler(request: Request, exc: ProjectStateError) -> JSONResponse:
    """Handle project state errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=409)


async def project_concurrency_error_handler(request: Request, exc: ProjectConcurrencyError) -> JSONResponse:
    """Handle project concurrency errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=409)


async def project_quota_exceeded_handler(request: Request, exc: ProjectQuotaExceededError) -> JSONResponse:
    """Handle project quota exceeded errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=429)


async def regulatory_error_handler(request: Request, exc: RegulatoryError) -> JSONResponse:
    """Handle general regulatory errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=400)


async def fda_api_error_handler(request: Request, exc: FDAAPIError) -> JSONResponse:
    """Handle FDA API errors."""
    # Determine status code based on error type
    if exc.error_code == "FDA_API_RATE_LIMITED":
        status_code = 429
    elif exc.error_code == "FDA_API_UNAVAILABLE":
        status_code = 503
    elif exc.error_code == "FDA_DATA_NOT_FOUND":
        status_code = 404
    else:
        status_code = 502  # Bad Gateway for external API issues
    
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    
    response = create_error_response(request, exc, status_code=status_code)
    
    # Add retry-after header for rate limiting
    if exc.error_code == "FDA_API_RATE_LIMITED" and exc.details.get("retry_after"):
        response.headers["Retry-After"] = str(exc.details["retry_after"])
    
    return response


async def classification_error_handler(request: Request, exc: ClassificationError) -> JSONResponse:
    """Handle device classification errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=422)


async def predicate_search_error_handler(request: Request, exc: PredicateSearchError) -> JSONResponse:
    """Handle predicate search errors."""
    # Use 404 for no results, 422 for low confidence, 400 for other errors
    if exc.error_code == "NO_PREDICATES_FOUND":
        status_code = 404
    elif exc.error_code == "LOW_CONFIDENCE_PREDICATES":
        status_code = 422
    else:
        status_code = 400
    
    log_error_with_context(request, exc, level="info", include_traceback=False)
    return create_error_response(request, exc, status_code=status_code)


async def compliance_error_handler(request: Request, exc: ComplianceError) -> JSONResponse:
    """Handle compliance errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=422)


async def document_processing_error_handler(request: Request, exc: DocumentProcessingError) -> JSONResponse:
    """Handle document processing errors."""
    log_error_with_context(request, exc, level="warning", include_traceback=False)
    return create_error_response(request, exc, status_code=422)


async def enhanced_validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Enhanced handler for FastAPI validation errors."""
    request_id = get_request_id(request)
    
    # Extract field-specific errors
    field_errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        field_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    # Create user-friendly error response
    error_data = {
        "error_code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "user_message": "Please check your input and try again.",
        "details": {
            "field_errors": field_errors,
            "error_count": len(field_errors)
        },
        "suggestions": [
            "Check that all required fields are provided",
            "Verify field formats match the expected types",
            "Review the API documentation for field requirements",
            "Ensure numeric fields contain valid numbers"
        ],
        "request_id": request_id,
        "status_code": 422,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_error_with_context(request, exc, level="info", include_traceback=False)
    
    return JSONResponse(
        status_code=422,
        content=error_data
    )


async def enhanced_http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Enhanced handler for HTTP errors."""
    request_id = get_request_id(request)
    
    # Map status codes to user-friendly messages
    status_messages = {
        400: "Bad request. Please check your input.",
        401: "Authentication required. Please log in.",
        403: "Access denied. You don't have permission for this action.",
        404: "The requested resource was not found.",
        405: "Method not allowed for this endpoint.",
        409: "Conflict. The resource is in an incompatible state.",
        422: "Invalid input data. Please check your request.",
        429: "Too many requests. Please slow down.",
        500: "Internal server error. Please try again later.",
        502: "External service unavailable. Please try again later.",
        503: "Service temporarily unavailable. Please try again later."
    }
    
    user_message = status_messages.get(exc.status_code, "An error occurred. Please try again.")
    
    error_data = {
        "error_code": f"HTTP_{exc.status_code}",
        "message": exc.detail,
        "user_message": user_message,
        "details": {"status_code": exc.status_code},
        "suggestions": _get_status_code_suggestions(exc.status_code),
        "request_id": request_id,
        "status_code": exc.status_code,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_level = "warning" if exc.status_code >= 400 else "info"
    log_error_with_context(request, exc, level=log_level, include_traceback=False)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_data
    )


async def enhanced_general_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Enhanced handler for unexpected errors."""
    request_id = get_request_id(request)
    
    error_data = {
        "error_code": "INTERNAL_SERVER_ERROR",
        "message": "An unexpected error occurred",
        "user_message": "Something went wrong on our end. Please try again later.",
        "details": {
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        },
        "suggestions": [
            "Try again in a few minutes",
            "Check if the issue persists",
            "Contact support if the problem continues",
            "Provide the request ID when contacting support"
        ],
        "request_id": request_id,
        "status_code": 500,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_error_with_context(request, exc, level="error", include_traceback=True)
    
    return JSONResponse(
        status_code=500,
        content=error_data
    )


def _get_status_code_suggestions(status_code: int) -> list[str]:
    """Get suggestions based on HTTP status code."""
    suggestions_map = {
        400: [
            "Check your request format and parameters",
            "Verify all required fields are included",
            "Review the API documentation"
        ],
        401: [
            "Log in to your account",
            "Check if your session has expired",
            "Verify your authentication token"
        ],
        403: [
            "Contact the project owner for access",
            "Verify you have the required permissions",
            "Try logging out and logging back in"
        ],
        404: [
            "Check the URL or resource ID",
            "Verify the resource exists",
            "Try refreshing the page"
        ],
        409: [
            "Refresh the page to see current state",
            "Try your action again",
            "Check for conflicting changes"
        ],
        429: [
            "Wait a moment before trying again",
            "Reduce the frequency of requests",
            "Contact support if rate limiting persists"
        ],
        500: [
            "Try again in a few minutes",
            "Contact support if the problem persists",
            "Check system status page"
        ]
    }
    
    return suggestions_map.get(status_code, [
        "Try again later",
        "Contact support if the problem persists"
    ])


def register_exception_handlers(app) -> None:
    """
    Register all custom exception handlers with the FastAPI app.
    
    Args:
        app: FastAPI application instance
    """
    # Project-specific exception handlers
    app.add_exception_handler(ProjectError, project_error_handler)
    app.add_exception_handler(ProjectNotFoundError, project_not_found_handler)
    app.add_exception_handler(ProjectAccessDeniedError, project_access_denied_handler)
    app.add_exception_handler(ProjectValidationError, project_validation_error_handler)
    app.add_exception_handler(ProjectStateError, project_state_error_handler)
    app.add_exception_handler(ProjectConcurrencyError, project_concurrency_error_handler)
    app.add_exception_handler(ProjectQuotaExceededError, project_quota_exceeded_handler)
    
    # Regulatory-specific exception handlers
    app.add_exception_handler(RegulatoryError, regulatory_error_handler)
    app.add_exception_handler(FDAAPIError, fda_api_error_handler)
    app.add_exception_handler(ClassificationError, classification_error_handler)
    app.add_exception_handler(PredicateSearchError, predicate_search_error_handler)
    app.add_exception_handler(ComplianceError, compliance_error_handler)
    app.add_exception_handler(DocumentProcessingError, document_processing_error_handler)
    
    # Enhanced built-in exception handlers
    app.add_exception_handler(RequestValidationError, enhanced_validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, enhanced_http_error_handler)
    app.add_exception_handler(Exception, enhanced_general_error_handler)
    
    logger.info("Custom exception handlers registered successfully")