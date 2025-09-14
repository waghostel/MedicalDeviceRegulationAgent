"""
Core module for Medical Device Regulatory Assistant backend.

This module contains core functionality including:
- Exception handling and error management
- Configuration management
- Environment validation
- Performance monitoring
"""

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

from .exception_mapper import ExceptionMapper, get_exception_mapper

__all__ = [
    "RegulatoryAssistantException",
    "ProjectNotFoundError", 
    "ValidationError",
    "DatabaseError",
    "AuthenticationError",
    "AuthorizationError",
    "ExternalServiceError",
    "ConfigurationError",
    "PerformanceError",
    "ExceptionMapper",
    "get_exception_mapper",
]