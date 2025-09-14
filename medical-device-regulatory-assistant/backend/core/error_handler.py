"""
Global Error Handler for FastAPI

Provides comprehensive error handling middleware with automatic error tracking,
response formatting, and diagnostic information generation.
"""

import logging
import traceback
import uuid
from typing import Dict, Any, Optional, Union
from datetime import datetime

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from core.error_tracker import (
    ErrorTracker, 
    ErrorCategory, 
    ErrorSeverity,
    get_error_tracker
)
from core.exceptions import RegulatoryAssistantException
from core.exception_mapper import ExceptionMapper

logger = logging.getLogger(__name__)


class GlobalErrorHandler:
    """
    Global error handler that provides comprehensive error processing,
    tracking, and response formatting for all application errors.
    """
    
    def __init__(self, error_tracker: Optional[ErrorTracker] = None):
        self.error_tracker = error_tracker or get_error_tracker()
        self.exception_mapper = ExceptionMapper()
        
    async def handle_exception(
        self, 
        request: Request, 
        exc: Exception
    ) -> JSONResponse:
        """
        Handle any exception with comprehensive error tracking and response formatting
        
        Args:
            request: FastAPI request object
            exc: Exception that occurred
            
        Returns:
            JSONResponse with formatted error details
        """
        # Generate unique request ID if not present
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
        
        # Extract request context
        context = await self._extract_request_context(request)
        
        # Track the error
        error_id = await self._track_error(exc, request, context)
        
        # Determine the appropriate status code
        if isinstance(exc, HTTPException):
            # Preserve the original HTTP status code for HTTPExceptions
            status_code = exc.status_code
        else:
            # Map other exceptions to HTTP response
            http_exception = self.exception_mapper.map_to_http_exception(exc)
            status_code = http_exception.status_code
        
        # Generate diagnostic information
        diagnostics = self._generate_diagnostics(exc, request, context)
        
        # Create response content
        response_content = {
            "error": {
                "id": error_id,
                "type": self._get_error_type(exc),
                "code": self._get_error_code(exc),
                "message": self._get_user_friendly_message(exc),
                "details": str(exc) if not isinstance(exc, RegulatoryAssistantException) else exc.message,
                "timestamp": datetime.now().isoformat(),
                "request_id": request_id,
                "suggestions": self._get_error_suggestions(exc),
                "retryable": self._is_retryable(exc),
                "diagnostics": diagnostics
            },
            "success": False
        }
        
        # Log the error
        await self._log_error(exc, request, context, error_id)
        
        return JSONResponse(
            status_code=status_code,
            content=response_content,
            headers=self._get_response_headers(exc)
        )
    
    async def _extract_request_context(self, request: Request) -> Dict[str, Any]:
        """Extract relevant context from the request"""
        try:
            # Get user information if available
            user_id = None
            project_id = None
            
            # Try to extract from request state or headers
            if hasattr(request.state, 'user'):
                user_id = getattr(request.state.user, 'id', None)
            
            if hasattr(request.state, 'project_id'):
                project_id = request.state.project_id
            
            # Extract from path parameters if available
            path_params = request.path_params
            if 'project_id' in path_params:
                try:
                    project_id = int(path_params['project_id'])
                except (ValueError, TypeError):
                    pass
            
            return {
                'url': str(request.url),
                'method': request.method,
                'headers': dict(request.headers),
                'path_params': dict(path_params),
                'query_params': dict(request.query_params),
                'user_id': user_id,
                'project_id': project_id,
                'client_ip': request.client.host if request.client else None,
                'user_agent': request.headers.get('user-agent'),
                'referer': request.headers.get('referer'),
                'request_id': getattr(request.state, 'request_id', None)
            }
        except Exception as e:
            logger.warning(f"Failed to extract request context: {e}")
            return {
                'url': str(request.url) if hasattr(request, 'url') else 'unknown',
                'method': getattr(request, 'method', 'unknown'),
                'extraction_error': str(e)
            }
    
    async def _track_error(
        self, 
        exc: Exception, 
        request: Request, 
        context: Dict[str, Any]
    ) -> str:
        """Track the error using the error tracking system"""
        try:
            # Determine error category and severity
            category = self._categorize_error(exc, context)
            severity = self._assess_severity(exc, context)
            component = self._identify_component(exc, context)
            
            # Track the error
            error_id = await self.error_tracker.track_error(
                error=exc,
                category=category,
                severity=severity,
                component=component,
                context=context,
                user_id=context.get('user_id'),
                project_id=context.get('project_id'),
                request_id=context.get('request_id')
            )
            
            return error_id
            
        except Exception as tracking_error:
            logger.error(f"Failed to track error: {tracking_error}")
            return f"untracked-{datetime.now().timestamp()}"
    
    def _categorize_error(self, exc: Exception, context: Dict[str, Any]) -> ErrorCategory:
        """Categorize the error based on type and context"""
        exc_type = type(exc).__name__.lower()
        url = context.get('url', '').lower()
        
        # Database errors
        if any(keyword in exc_type for keyword in ['database', 'sql', 'connection']):
            return ErrorCategory.DATABASE
        
        # API integration errors
        if any(keyword in exc_type for keyword in ['fda', 'api', 'http', 'request']):
            return ErrorCategory.API_INTEGRATION
        
        # Authentication errors
        if any(keyword in exc_type for keyword in ['auth', 'unauthorized', 'forbidden']):
            return ErrorCategory.AUTHENTICATION
        
        # Validation errors
        if any(keyword in exc_type for keyword in ['validation', 'pydantic']):
            return ErrorCategory.VALIDATION
        
        # Performance errors
        if any(keyword in exc_type for keyword in ['timeout', 'performance']):
            return ErrorCategory.PERFORMANCE
        
        # Configuration errors
        if any(keyword in exc_type for keyword in ['config', 'environment']):
            return ErrorCategory.CONFIGURATION
        
        # Business logic errors (regulatory-specific)
        if '/agent' in url or '/regulatory' in url or '/predicate' in url:
            return ErrorCategory.BUSINESS_LOGIC
        
        # Default to system error
        return ErrorCategory.SYSTEM
    
    def _assess_severity(self, exc: Exception, context: Dict[str, Any]) -> ErrorSeverity:
        """Assess the severity of the error"""
        exc_type = type(exc).__name__.lower()
        
        # Critical errors
        if any(keyword in exc_type for keyword in ['critical', 'fatal', 'system']):
            return ErrorSeverity.CRITICAL
        
        # High severity errors
        if isinstance(exc, (ConnectionError, TimeoutError)):
            return ErrorSeverity.HIGH
        
        if any(keyword in exc_type for keyword in ['database', 'auth', 'security']):
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if isinstance(exc, (HTTPException, RequestValidationError)):
            return ErrorSeverity.MEDIUM
        
        if any(keyword in exc_type for keyword in ['validation', 'api', 'network']):
            return ErrorSeverity.MEDIUM
        
        # Low severity errors
        if isinstance(exc, ValueError):
            return ErrorSeverity.LOW
        
        # Default to medium
        return ErrorSeverity.MEDIUM
    
    def _identify_component(self, exc: Exception, context: Dict[str, Any]) -> str:
        """Identify the component where the error occurred"""
        url = context.get('url', '')
        
        if '/api/projects' in url:
            return 'projects-api'
        elif '/api/agent' in url:
            return 'agent-api'
        elif '/api/auth' in url:
            return 'auth-api'
        elif '/api/health' in url:
            return 'health-api'
        elif '/api/audit' in url:
            return 'audit-api'
        elif '/api/errors' in url:
            return 'error-tracking-api'
        elif '/api' in url:
            return 'api-general'
        else:
            return 'backend-core'
    
    def _generate_diagnostics(
        self, 
        exc: Exception, 
        request: Request, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate diagnostic information for the error"""
        diagnostics = {
            'error_type': type(exc).__name__,
            'error_module': getattr(exc, '__module__', 'unknown'),
            'timestamp': datetime.now().isoformat(),
            'python_version': f"{__import__('sys').version_info.major}.{__import__('sys').version_info.minor}",
            'request_method': context.get('method'),
            'request_path': request.url.path if hasattr(request, 'url') else 'unknown',
            'stack_trace': traceback.format_exc() if logger.isEnabledFor(logging.DEBUG) else None
        }
        
        # Add specific diagnostics based on error type
        if isinstance(exc, HTTPException):
            diagnostics['http_status'] = exc.status_code
            diagnostics['http_detail'] = exc.detail
        
        if isinstance(exc, RequestValidationError):
            diagnostics['validation_errors'] = exc.errors()
        
        if isinstance(exc, RegulatoryAssistantException):
            diagnostics['error_code'] = exc.error_code
            diagnostics['error_details'] = exc.details
        
        return diagnostics
    
    def _get_error_type(self, exc: Exception) -> str:
        """Get a user-friendly error type"""
        if isinstance(exc, HTTPException):
            return 'http_error'
        elif isinstance(exc, RequestValidationError):
            return 'validation_error'
        elif isinstance(exc, RegulatoryAssistantException):
            return 'application_error'
        elif isinstance(exc, ConnectionError):
            return 'connection_error'
        elif isinstance(exc, TimeoutError):
            return 'timeout_error'
        else:
            return 'system_error'
    
    def _get_error_code(self, exc: Exception) -> str:
        """Get error code for the exception"""
        if isinstance(exc, RegulatoryAssistantException):
            return exc.error_code
        elif isinstance(exc, HTTPException):
            return f"HTTP_{exc.status_code}"
        elif isinstance(exc, RequestValidationError):
            return "VALIDATION_ERROR"
        else:
            return type(exc).__name__.upper()
    
    def _get_user_friendly_message(self, exc: Exception) -> str:
        """Get a user-friendly error message"""
        if isinstance(exc, RegulatoryAssistantException):
            return exc.message
        elif isinstance(exc, HTTPException):
            return exc.detail
        elif isinstance(exc, RequestValidationError):
            return "The request contains invalid data. Please check your input and try again."
        elif isinstance(exc, ConnectionError):
            return "Unable to connect to external services. Please try again later."
        elif isinstance(exc, TimeoutError):
            return "The operation took too long to complete. Please try again."
        else:
            return "An unexpected error occurred. Please try again or contact support."
    
    def _get_error_suggestions(self, exc: Exception) -> list:
        """Get suggestions for resolving the error"""
        if isinstance(exc, ConnectionError):
            return [
                "Check your internet connection",
                "Verify that external services are available",
                "Try again in a few minutes"
            ]
        elif isinstance(exc, TimeoutError):
            return [
                "Try the operation again",
                "Break large requests into smaller parts",
                "Contact support if the issue persists"
            ]
        elif isinstance(exc, RequestValidationError):
            return [
                "Check that all required fields are provided",
                "Verify data formats match the expected types",
                "Review the API documentation for correct usage"
            ]
        elif isinstance(exc, HTTPException) and exc.status_code == 401:
            return [
                "Sign in to your account",
                "Check that your session hasn't expired",
                "Contact support if you continue to have access issues"
            ]
        elif isinstance(exc, HTTPException) and exc.status_code == 403:
            return [
                "Verify you have permission to access this resource",
                "Contact your administrator for access",
                "Check that you're accessing the correct project"
            ]
        else:
            return [
                "Try refreshing the page",
                "Try the operation again",
                "Contact support with the error ID if the issue persists"
            ]
    
    def _is_retryable(self, exc: Exception) -> bool:
        """Determine if the error is retryable"""
        if isinstance(exc, (ConnectionError, TimeoutError)):
            return True
        elif isinstance(exc, HTTPException):
            # 5xx errors are generally retryable
            return 500 <= exc.status_code < 600
        elif isinstance(exc, RequestValidationError):
            return False  # Validation errors need user input changes
        else:
            return False  # Conservative approach for unknown errors
    
    def _get_response_headers(self, exc: Exception) -> Dict[str, str]:
        """Get additional response headers based on error type"""
        headers = {
            'X-Error-Timestamp': datetime.now().isoformat(),
            'X-Error-Type': type(exc).__name__
        }
        
        if isinstance(exc, HTTPException) and exc.status_code == 401:
            headers['WWW-Authenticate'] = 'Bearer'
        
        if self._is_retryable(exc):
            headers['Retry-After'] = '60'  # Suggest retry after 60 seconds
        
        return headers
    
    async def _log_error(
        self, 
        exc: Exception, 
        request: Request, 
        context: Dict[str, Any], 
        error_id: str
    ):
        """Log the error with appropriate level and context"""
        log_context = {
            'error_id': error_id,
            'error_type': type(exc).__name__,
            'request_id': context.get('request_id'),
            'user_id': context.get('user_id'),
            'project_id': context.get('project_id'),
            'url': context.get('url'),
            'method': context.get('method')
        }
        
        if isinstance(exc, (HTTPException, RequestValidationError)):
            logger.warning(f"Client error: {exc}", extra=log_context)
        elif isinstance(exc, RegulatoryAssistantException):
            logger.error(f"Application error: {exc.message}", extra=log_context)
        else:
            logger.error(f"Unexpected error: {exc}", extra=log_context, exc_info=True)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that catches all unhandled exceptions and processes them
    through the global error handler.
    """
    
    def __init__(self, app, error_handler: Optional[GlobalErrorHandler] = None):
        super().__init__(app)
        self.error_handler = error_handler or GlobalErrorHandler()
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and handle any exceptions"""
        try:
            # Add request ID to state for tracking
            request.state.request_id = str(uuid.uuid4())
            
            response = await call_next(request)
            return response
            
        except Exception as exc:
            # Handle the exception through the global error handler
            return await self.error_handler.handle_exception(request, exc)


# Exception handlers for specific exception types
async def regulatory_assistant_exception_handler(
    request: Request, 
    exc: RegulatoryAssistantException
) -> JSONResponse:
    """Handle RegulatoryAssistantException"""
    handler = GlobalErrorHandler()
    return await handler.handle_exception(request, exc)


async def http_exception_handler(
    request: Request, 
    exc: HTTPException
) -> JSONResponse:
    """Handle HTTPException"""
    handler = GlobalErrorHandler()
    return await handler.handle_exception(request, exc)


async def validation_exception_handler(
    request: Request, 
    exc: RequestValidationError
) -> JSONResponse:
    """Handle RequestValidationError"""
    handler = GlobalErrorHandler()
    return await handler.handle_exception(request, exc)


async def general_exception_handler(
    request: Request, 
    exc: Exception
) -> JSONResponse:
    """Handle any unhandled exception"""
    handler = GlobalErrorHandler()
    return await handler.handle_exception(request, exc)


# Utility functions
def setup_error_handlers(app):
    """
    Set up all error handlers for the FastAPI application
    
    Args:
        app: FastAPI application instance
    """
    # Add exception handlers
    app.add_exception_handler(RegulatoryAssistantException, regulatory_assistant_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Add error handling middleware
    app.add_middleware(ErrorHandlingMiddleware)
    
    logger.info("Error handlers configured successfully")


def get_global_error_handler() -> GlobalErrorHandler:
    """Get a global error handler instance"""
    return GlobalErrorHandler()