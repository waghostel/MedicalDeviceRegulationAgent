"""
Unified exception hierarchy for Medical Device Regulatory Assistant.

This module provides a standardized exception system with:
- Base exception class with error codes and context
- Specific exception types for different error categories
- Consistent error messaging and details
- Support for error tracking and monitoring
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid


class RegulatoryAssistantException(Exception):
    """
    Base exception for all application errors.
    
    Provides standardized error handling with:
    - Unique error codes for categorization
    - Detailed error context for debugging
    - User-friendly messages for display
    - Structured data for API responses
    """
    
    def __init__(
        self,
        message: str,
        error_code: str,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None,
        suggestions: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the exception.
        
        Args:
            message: Technical error message for logging
            error_code: Unique error code for categorization
            details: Additional error details and context
            user_message: User-friendly error message
            suggestions: List of suggested actions to resolve the error
            context: Additional context information (request ID, user ID, etc.)
        """
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.user_message = user_message or message
        self.suggestions = suggestions or []
        self.context = context or {}
        self.timestamp = datetime.utcnow()
        self.error_id = str(uuid.uuid4())
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict containing all exception data
        """
        return {
            "error_id": self.error_id,
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "details": self.details,
            "suggestions": self.suggestions,
            "context": self.context,
            "timestamp": self.timestamp.isoformat()
        }
    
    def add_context(self, key: str, value: Any) -> None:
        """Add additional context to the exception."""
        self.context[key] = value
    
    def add_suggestion(self, suggestion: str) -> None:
        """Add a suggestion for resolving the error."""
        if suggestion not in self.suggestions:
            self.suggestions.append(suggestion)


class ProjectNotFoundError(RegulatoryAssistantException):
    """Raised when a requested project cannot be found."""
    
    def __init__(
        self,
        project_id: int,
        user_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        details = {
            "project_id": project_id,
            "user_id": user_id,
            **(additional_context or {})
        }
        
        suggestions = [
            "Verify the project ID is correct",
            "Check if the project was deleted or archived",
            "Ensure you have access permissions for this project",
            "Try refreshing the project list"
        ]
        
        user_message = f"Project with ID {project_id} was not found or you don't have access to it."
        
        super().__init__(
            message=f"Project {project_id} not found for user {user_id}",
            error_code="PROJECT_NOT_FOUND",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class ValidationError(RegulatoryAssistantException):
    """Raised when input validation fails."""
    
    def __init__(
        self,
        field: str,
        value: Any,
        constraint: str,
        validation_errors: Optional[List[Dict[str, Any]]] = None
    ):
        details = {
            "field": field,
            "value": str(value) if value is not None else None,
            "constraint": constraint,
            "validation_errors": validation_errors or []
        }
        
        suggestions = self._get_field_suggestions(field, constraint)
        user_message = self._get_user_friendly_message(field, constraint)
        
        super().__init__(
            message=f"Validation failed for field '{field}': {constraint}",
            error_code="VALIDATION_ERROR",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )
    
    def _get_field_suggestions(self, field: str, constraint: str) -> List[str]:
        """Get field-specific suggestions for validation errors."""
        field_suggestions = {
            "name": [
                "Project name must be between 1 and 255 characters",
                "Use descriptive names that identify your device",
                "Avoid special characters that might cause issues"
            ],
            "description": [
                "Provide a clear description of your medical device",
                "Include key features and intended use",
                "Keep descriptions under 2000 characters"
            ],
            "device_type": [
                "Specify the type of medical device (e.g., 'Cardiac Monitor')",
                "Use standard medical device terminology",
                "Be specific about the device category"
            ],
            "intended_use": [
                "Clearly state what the device is intended to do",
                "Follow FDA guidance for intended use statements",
                "Be specific about the medical indication"
            ]
        }
        
        return field_suggestions.get(field, [
            f"Check the {field} field meets all requirements",
            "Refer to the API documentation for field constraints",
            "Contact support if you need help with validation"
        ])
    
    def _get_user_friendly_message(self, field: str, constraint: str) -> str:
        """Get user-friendly error message for validation failures."""
        field_messages = {
            "name": "Project name is required and must be between 1-255 characters.",
            "description": "Project description must be under 2000 characters.",
            "device_type": "Device type must be under 255 characters.",
            "intended_use": "Intended use statement must be under 5000 characters."
        }
        
        return field_messages.get(field, f"The {field} field has a validation error: {constraint}")


class DatabaseError(RegulatoryAssistantException):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        operation: str,
        table: Optional[str] = None,
        original_error: Optional[Exception] = None,
        query_info: Optional[Dict[str, Any]] = None
    ):
        details = {
            "operation": operation,
            "table": table,
            "original_error": str(original_error) if original_error else None,
            "query_info": query_info or {}
        }
        
        suggestions = [
            "Check database connectivity",
            "Verify database schema is up to date",
            "Try the operation again in a few moments",
            "Contact support if the problem persists"
        ]
        
        error_code = "DATABASE_ERROR"
        user_message = "A database error occurred. Please try again."
        
        if original_error and "connection" in str(original_error).lower():
            suggestions.insert(0, "Check database connection settings")
            user_message = "Database connection failed. Please try again."
            error_code = "DATABASE_CONNECTION_ERROR"
        elif original_error and "constraint" in str(original_error).lower():
            suggestions.insert(0, "Check data integrity constraints")
            user_message = "Data integrity constraint violation. Please check your input."
            error_code = "DATABASE_CONSTRAINT_ERROR"
        
        super().__init__(
            message=f"Database {operation} failed on table {table}: {original_error}",
            error_code=error_code,
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class AuthenticationError(RegulatoryAssistantException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        reason: str,
        auth_method: Optional[str] = None,
        additional_details: Optional[Dict[str, Any]] = None
    ):
        details = {
            "reason": reason,
            "auth_method": auth_method,
            **(additional_details or {})
        }
        
        suggestions = [
            "Check your login credentials",
            "Try logging out and logging back in",
            "Clear your browser cache and cookies",
            "Contact support if authentication continues to fail"
        ]
        
        user_message = "Authentication failed. Please log in again."
        
        super().__init__(
            message=f"Authentication failed: {reason}",
            error_code="AUTHENTICATION_ERROR",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class AuthorizationError(RegulatoryAssistantException):
    """Raised when authorization/permission checks fail."""
    
    def __init__(
        self,
        resource: str,
        action: str,
        user_id: Optional[str] = None,
        required_permissions: Optional[List[str]] = None
    ):
        details = {
            "resource": resource,
            "action": action,
            "user_id": user_id,
            "required_permissions": required_permissions or []
        }
        
        suggestions = [
            "Contact the resource owner to request access",
            "Verify you have the required permissions",
            "Check if your access has been revoked",
            "Try refreshing your session"
        ]
        
        user_message = f"You don't have permission to {action} this {resource}."
        
        super().__init__(
            message=f"User {user_id} not authorized to {action} {resource}",
            error_code="AUTHORIZATION_ERROR",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class ExternalServiceError(RegulatoryAssistantException):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        service_name: str,
        operation: str,
        status_code: Optional[int] = None,
        service_message: Optional[str] = None,
        retry_after: Optional[int] = None
    ):
        details = {
            "service_name": service_name,
            "operation": operation,
            "status_code": status_code,
            "service_message": service_message,
            "retry_after": retry_after
        }
        
        if status_code == 429:  # Rate limited
            suggestions = [
                f"Wait {retry_after} seconds before retrying" if retry_after else "Wait before retrying",
                f"Reduce the frequency of {service_name} requests",
                "Consider caching results to minimize API calls"
            ]
            user_message = f"{service_name} rate limit exceeded. Please wait and try again."
            error_code = "EXTERNAL_SERVICE_RATE_LIMITED"
        elif status_code == 503:  # Service unavailable
            suggestions = [
                f"{service_name} is temporarily unavailable",
                "Try again in a few minutes",
                f"Check {service_name} status page"
            ]
            user_message = f"{service_name} is temporarily unavailable. Please try again later."
            error_code = "EXTERNAL_SERVICE_UNAVAILABLE"
        elif status_code == 404:  # Not found
            suggestions = [
                "Check if the requested data exists",
                "Verify request parameters are correct",
                "Try broader search criteria"
            ]
            user_message = f"The requested information was not found in {service_name}."
            error_code = "EXTERNAL_SERVICE_NOT_FOUND"
        else:
            suggestions = [
                "Check internet connectivity",
                f"Verify {service_name} is accessible",
                "Try again in a few minutes"
            ]
            user_message = f"Unable to connect to {service_name}. Please try again."
            error_code = "EXTERNAL_SERVICE_ERROR"
        
        super().__init__(
            message=f"{service_name} {operation} failed: {service_message or 'Unknown error'}",
            error_code=error_code,
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class ConfigurationError(RegulatoryAssistantException):
    """Raised when configuration is invalid or missing."""
    
    def __init__(
        self,
        config_key: str,
        reason: str,
        config_file: Optional[str] = None,
        expected_type: Optional[str] = None
    ):
        details = {
            "config_key": config_key,
            "reason": reason,
            "config_file": config_file,
            "expected_type": expected_type
        }
        
        suggestions = [
            f"Check the {config_key} configuration setting",
            "Verify environment variables are set correctly",
            "Review configuration file syntax",
            "Contact support for configuration assistance"
        ]
        
        user_message = f"Configuration error: {reason}"
        
        super().__init__(
            message=f"Configuration error for {config_key}: {reason}",
            error_code="CONFIGURATION_ERROR",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )


class PerformanceError(RegulatoryAssistantException):
    """Raised when performance thresholds are exceeded."""
    
    def __init__(
        self,
        operation: str,
        metric: str,
        actual_value: float,
        threshold: float,
        unit: str = "ms"
    ):
        details = {
            "operation": operation,
            "metric": metric,
            "actual_value": actual_value,
            "threshold": threshold,
            "unit": unit
        }
        
        suggestions = [
            "Try reducing the scope of the operation",
            "Consider breaking the operation into smaller parts",
            "Check system resources and load",
            "Contact support if performance issues persist"
        ]
        
        user_message = f"Operation took longer than expected. Please try again or reduce the scope."
        
        super().__init__(
            message=f"Performance threshold exceeded for {operation}: {actual_value}{unit} > {threshold}{unit}",
            error_code="PERFORMANCE_ERROR",
            details=details,
            user_message=user_message,
            suggestions=suggestions
        )