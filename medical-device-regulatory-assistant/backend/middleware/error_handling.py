"""Error handling middleware and exception handlers."""

import logging
from typing import Dict, Any

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger("medical_device_assistant.errors")


class RegulatoryAssistantError(Exception):
    """Base exception for regulatory assistant errors."""
    
    def __init__(self, message: str, error_code: str = "GENERAL_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class FDAAPIError(RegulatoryAssistantError):
    """FDA API related errors."""
    
    def __init__(self, message: str, status_code: int = None):
        self.status_code = status_code
        super().__init__(message, "FDA_API_ERROR")


class AuthenticationError(RegulatoryAssistantError):
    """Authentication related errors."""
    
    def __init__(self, message: str):
        super().__init__(message, "AUTHENTICATION_ERROR")


class ValidationError(RegulatoryAssistantError):
    """Data validation errors."""
    
    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message, "VALIDATION_ERROR")


async def regulatory_assistant_exception_handler(
    request: Request, 
    exc: RegulatoryAssistantError
) -> JSONResponse:
    """Handle custom regulatory assistant exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"RegulatoryAssistantError - Request ID: {request_id} | "
        f"Error Code: {exc.error_code} | "
        f"Message: {exc.message}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "request_id": request_id,
            "type": "regulatory_assistant_error"
        }
    )


async def fda_api_exception_handler(
    request: Request, 
    exc: FDAAPIError
) -> JSONResponse:
    """Handle FDA API specific exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"FDAAPIError - Request ID: {request_id} | "
        f"Status Code: {exc.status_code} | "
        f"Message: {exc.message}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "FDA_API_UNAVAILABLE",
            "message": "Unable to access FDA database. Please try again later.",
            "details": exc.message,
            "request_id": request_id,
            "suggestions": [
                "Check your internet connection",
                "Try again in a few minutes",
                "Contact support if the problem persists"
            ]
        }
    )


async def authentication_exception_handler(
    request: Request, 
    exc: AuthenticationError
) -> JSONResponse:
    """Handle authentication exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"AuthenticationError - Request ID: {request_id} | "
        f"Message: {exc.message}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "error": "AUTHENTICATION_REQUIRED",
            "message": exc.message,
            "request_id": request_id,
            "type": "authentication_error"
        },
        headers={"WWW-Authenticate": "Bearer"}
    )


async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"ValidationError - Request ID: {request_id} | "
        f"Errors: {exc.errors()}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": exc.errors(),
            "request_id": request_id,
            "type": "validation_error"
        }
    )


async def http_exception_handler(
    request: Request, 
    exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"HTTPException - Request ID: {request_id} | "
        f"Status Code: {exc.status_code} | "
        f"Detail: {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id,
            "type": "http_error"
        }
    )


async def general_exception_handler(
    request: Request, 
    exc: Exception
) -> JSONResponse:
    """Handle unexpected exceptions."""
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"UnhandledException - Request ID: {request_id} | "
        f"Type: {type(exc).__name__} | "
        f"Message: {str(exc)}",
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "request_id": request_id,
            "type": "internal_error"
        }
    )