"""
Custom exception handling system for Medical Device Regulatory Assistant.

This module provides comprehensive error handling with:
- Project-specific exception classes
- User-friendly error messages
- Actionable guidance for error resolution
- Structured error logging and monitoring
"""

from .project_exceptions import (
    ProjectError,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectStateError,
    ProjectDuplicateError,
    ProjectExportError,
    ProjectImportError,
)

from .regulatory_exceptions import (
    RegulatoryError,
    FDAAPIError,
    ClassificationError,
    PredicateSearchError,
    ComplianceError,
    DocumentProcessingError,
)

from .handlers import (
    register_exception_handlers,
    create_error_response,
    log_error_with_context,
)

__all__ = [
    # Project exceptions
    "ProjectError",
    "ProjectNotFoundError", 
    "ProjectAccessDeniedError",
    "ProjectValidationError",
    "ProjectStateError",
    "ProjectDuplicateError",
    "ProjectExportError",
    "ProjectImportError",
    
    # Regulatory exceptions
    "RegulatoryError",
    "FDAAPIError",
    "ClassificationError",
    "PredicateSearchError",
    "ComplianceError",
    "DocumentProcessingError",
    
    # Handlers
    "register_exception_handlers",
    "create_error_response",
    "log_error_with_context",
]