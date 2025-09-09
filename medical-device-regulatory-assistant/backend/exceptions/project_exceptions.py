"""
Project-specific exception classes for the Medical Device Regulatory Assistant.

These exceptions provide detailed error information and actionable guidance
for project-related operations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class ProjectError(Exception):
    """Base exception for all project-related errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "PROJECT_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None,
        user_message: Optional[str] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.suggestions = suggestions or []
        self.user_message = user_message or message
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "details": self.details,
            "suggestions": self.suggestions,
            "timestamp": self.timestamp.isoformat()
        }


class ProjectNotFoundError(ProjectError):
    """Raised when a requested project cannot be found."""
    
    def __init__(self, project_id: int, user_id: Optional[str] = None):
        details = {"project_id": project_id}
        if user_id:
            details["user_id"] = user_id
        
        suggestions = [
            "Verify the project ID is correct",
            "Check if the project was deleted",
            "Ensure you have access to this project",
            "Try refreshing the project list"
        ]
        
        user_message = f"Project with ID {project_id} was not found or you don't have access to it."
        
        super().__init__(
            message=f"Project {project_id} not found for user {user_id}",
            error_code="PROJECT_NOT_FOUND",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectAccessDeniedError(ProjectError):
    """Raised when user doesn't have permission to access a project."""
    
    def __init__(self, project_id: int, user_id: str, required_permission: str = "access"):
        details = {
            "project_id": project_id,
            "user_id": user_id,
            "required_permission": required_permission
        }
        
        suggestions = [
            "Contact the project owner to request access",
            "Verify you're logged in with the correct account",
            "Check if your permissions have been revoked",
            "Try logging out and logging back in"
        ]
        
        user_message = f"You don't have permission to {required_permission} this project."
        
        super().__init__(
            message=f"User {user_id} denied {required_permission} to project {project_id}",
            error_code="PROJECT_ACCESS_DENIED",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectValidationError(ProjectError):
    """Raised when project data fails validation."""
    
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
            error_code="PROJECT_VALIDATION_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
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
                "Be specific about the medical indication",
                "Keep under 5000 characters"
            ],
            "status": [
                "Status must be one of: draft, in_progress, completed",
                "Use 'draft' for new projects",
                "Use 'in_progress' for active development",
                "Use 'completed' for finished projects"
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
            "intended_use": "Intended use statement must be under 5000 characters.",
            "status": "Project status must be 'draft', 'in_progress', or 'completed'."
        }
        
        return field_messages.get(field, f"The {field} field has a validation error: {constraint}")


class ProjectStateError(ProjectError):
    """Raised when an operation is invalid for the current project state."""
    
    def __init__(
        self,
        project_id: int,
        current_state: str,
        required_state: str,
        operation: str
    ):
        details = {
            "project_id": project_id,
            "current_state": current_state,
            "required_state": required_state,
            "operation": operation
        }
        
        suggestions = [
            f"Change project status to '{required_state}' before {operation}",
            "Complete required steps to advance project state",
            "Check project workflow requirements",
            "Contact support if you're unsure about project states"
        ]
        
        user_message = f"Cannot {operation} - project must be in '{required_state}' state, currently '{current_state}'."
        
        super().__init__(
            message=f"Invalid state for {operation}: project {project_id} is '{current_state}', requires '{required_state}'",
            error_code="PROJECT_STATE_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectDuplicateError(ProjectError):
    """Raised when attempting to create a duplicate project."""
    
    def __init__(self, field: str, value: str, existing_project_id: Optional[int] = None):
        details = {
            "duplicate_field": field,
            "duplicate_value": value,
            "existing_project_id": existing_project_id
        }
        
        suggestions = [
            f"Choose a different {field} for your project",
            "Check if you already have a project with this name",
            "Consider adding a version number or date to make it unique",
            "View your existing projects to avoid duplicates"
        ]
        
        user_message = f"A project with this {field} already exists. Please choose a different {field}."
        
        super().__init__(
            message=f"Duplicate project {field}: '{value}'",
            error_code="PROJECT_DUPLICATE_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectExportError(ProjectError):
    """Raised when project export operations fail."""
    
    def __init__(
        self,
        project_id: int,
        export_format: str,
        reason: str,
        export_stage: Optional[str] = None
    ):
        details = {
            "project_id": project_id,
            "export_format": export_format,
            "reason": reason,
            "export_stage": export_stage
        }
        
        suggestions = [
            "Try exporting in a different format (JSON, PDF, CSV)",
            "Check if the project has all required data",
            "Ensure you have sufficient storage space",
            "Try again in a few minutes",
            "Contact support if exports continue to fail"
        ]
        
        user_message = f"Failed to export project in {export_format} format. {reason}"
        
        super().__init__(
            message=f"Export failed for project {project_id} ({export_format}): {reason}",
            error_code="PROJECT_EXPORT_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectImportError(ProjectError):
    """Raised when project import operations fail."""
    
    def __init__(
        self,
        filename: str,
        reason: str,
        import_stage: Optional[str] = None,
        line_number: Optional[int] = None
    ):
        details = {
            "filename": filename,
            "reason": reason,
            "import_stage": import_stage,
            "line_number": line_number
        }
        
        suggestions = [
            "Check that the import file is in the correct format",
            "Verify the file is not corrupted",
            "Ensure all required fields are present",
            "Try importing a smaller file first",
            "Check the import file documentation"
        ]
        
        user_message = f"Failed to import project from {filename}. {reason}"
        if line_number:
            user_message += f" (Error at line {line_number})"
        
        super().__init__(
            message=f"Import failed for {filename}: {reason}",
            error_code="PROJECT_IMPORT_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectConcurrencyError(ProjectError):
    """Raised when concurrent modifications conflict."""
    
    def __init__(
        self,
        project_id: int,
        user_id: str,
        conflicting_user: Optional[str] = None,
        last_modified: Optional[datetime] = None
    ):
        details = {
            "project_id": project_id,
            "user_id": user_id,
            "conflicting_user": conflicting_user,
            "last_modified": last_modified.isoformat() if last_modified else None
        }
        
        suggestions = [
            "Refresh the project to see the latest changes",
            "Coordinate with other team members",
            "Try your changes again after refreshing",
            "Consider using project comments to communicate changes"
        ]
        
        user_message = "This project was modified by another user. Please refresh and try again."
        
        super().__init__(
            message=f"Concurrent modification detected for project {project_id}",
            error_code="PROJECT_CONCURRENCY_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ProjectQuotaExceededError(ProjectError):
    """Raised when user exceeds project limits."""
    
    def __init__(
        self,
        user_id: str,
        current_count: int,
        max_allowed: int,
        quota_type: str = "projects"
    ):
        details = {
            "user_id": user_id,
            "current_count": current_count,
            "max_allowed": max_allowed,
            "quota_type": quota_type
        }
        
        suggestions = [
            f"Delete unused {quota_type} to free up space",
            f"Archive completed {quota_type}",
            "Contact support to increase your quota",
            "Consider upgrading your account plan"
        ]
        
        user_message = f"You've reached the maximum number of {quota_type} ({max_allowed}). Please delete some {quota_type} or contact support."
        
        super().__init__(
            message=f"User {user_id} exceeded {quota_type} quota: {current_count}/{max_allowed}",
            error_code="PROJECT_QUOTA_EXCEEDED",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )