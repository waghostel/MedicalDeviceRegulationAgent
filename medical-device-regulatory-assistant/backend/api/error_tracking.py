"""
Error Tracking API Endpoints

Provides REST API endpoints for frontend error tracking and reporting
integration with the comprehensive error tracking system.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from core.error_tracker import (
    ErrorTracker, 
    ErrorCategory, 
    ErrorSeverity, 
    ResolutionStatus,
    get_error_tracker
)
from core.exceptions import RegulatoryAssistantException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/errors", tags=["error-tracking"])
security = HTTPBearer(auto_error=False)


class ErrorTrackingRequest(BaseModel):
    """Request model for error tracking"""
    error: Dict[str, Any] = Field(..., description="Error details")
    context: Dict[str, Any] = Field(..., description="Error context")
    errorInfo: Optional[Dict[str, Any]] = Field(None, description="Additional error information")


class ErrorReportRequest(BaseModel):
    """Request model for detailed error reporting"""
    errorId: str = Field(..., description="Original error ID")
    error: Dict[str, Any] = Field(..., description="Error details")
    errorInfo: Optional[Dict[str, Any]] = Field(None, description="Error information")
    context: Dict[str, Any] = Field(..., description="Error context")
    userFeedback: Optional[str] = Field(None, description="User feedback about the error")
    reportType: str = Field(default="user_reported", description="Type of error report")
    priority: str = Field(default="medium", description="Report priority")


class ErrorMetricsRequest(BaseModel):
    """Request model for error metrics"""
    time_period_hours: int = Field(default=24, ge=1, le=8760, description="Time period in hours")
    category_filter: Optional[str] = Field(None, description="Category filter")
    severity_filter: Optional[str] = Field(None, description="Severity filter")


class ResolutionUpdateRequest(BaseModel):
    """Request model for updating error resolution"""
    status: str = Field(..., description="Resolution status")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    resolved_by: Optional[str] = Field(None, description="User who resolved the error")


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key for backend access"""
    if not credentials:
        raise HTTPException(status_code=401, detail="API key required")
    
    # In production, verify against actual API key
    # For now, just check if token is provided
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return credentials.credentials


def map_error_category(error_type: str, component: str) -> ErrorCategory:
    """Map error type and component to ErrorCategory"""
    component_lower = component.lower()
    error_type_lower = error_type.lower()
    
    if 'test' in component_lower or 'testing' in component_lower:
        if 'react' in component_lower or 'frontend' in component_lower:
            return ErrorCategory.FRONTEND_TESTING
        else:
            return ErrorCategory.BACKEND_INTEGRATION
    
    if 'config' in component_lower or 'environment' in component_lower:
        return ErrorCategory.CONFIGURATION
    
    if 'performance' in component_lower or 'timeout' in error_type_lower:
        return ErrorCategory.PERFORMANCE
    
    if 'database' in component_lower or 'db' in component_lower:
        return ErrorCategory.DATABASE
    
    if 'api' in component_lower or 'fda' in component_lower:
        return ErrorCategory.API_INTEGRATION
    
    if 'auth' in component_lower or 'authentication' in error_type_lower:
        return ErrorCategory.AUTHENTICATION
    
    if 'validation' in error_type_lower:
        return ErrorCategory.VALIDATION
    
    if 'agent' in component_lower or 'regulatory' in component_lower:
        return ErrorCategory.BUSINESS_LOGIC
    
    return ErrorCategory.SYSTEM


def map_error_severity(error_type: str, context: Dict[str, Any]) -> ErrorSeverity:
    """Map error type and context to ErrorSeverity"""
    error_type_lower = error_type.lower()
    
    # Critical errors
    if any(keyword in error_type_lower for keyword in ['critical', 'fatal', 'crash']):
        return ErrorSeverity.CRITICAL
    
    # High severity errors
    if any(keyword in error_type_lower for keyword in ['auth', 'security', 'database']):
        return ErrorSeverity.HIGH
    
    # Network and timeout errors are usually medium
    if any(keyword in error_type_lower for keyword in ['network', 'timeout', 'connection']):
        return ErrorSeverity.MEDIUM
    
    # Validation errors are usually low to medium
    if 'validation' in error_type_lower:
        return ErrorSeverity.MEDIUM
    
    # Default to medium severity
    return ErrorSeverity.MEDIUM


@router.post("/track")
async def track_error(
    request: ErrorTrackingRequest,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Track a frontend error occurrence
    
    This endpoint receives error reports from the frontend and stores them
    in the comprehensive error tracking system.
    """
    try:
        # Extract error details
        error_details = request.error
        context = request.context
        
        # Create a mock exception for tracking
        class FrontendError(Exception):
            def __init__(self, name: str, message: str):
                self.name = name
                super().__init__(message)
        
        error_name = error_details.get('name', 'UnknownError')
        error_message = error_details.get('message', 'No error message provided')
        
        mock_error = FrontendError(error_name, error_message)
        mock_error.name = error_name
        
        # Map to error categories and severity
        component = context.get('component', 'frontend')
        category = map_error_category(error_name, component)
        severity = map_error_severity(error_name, context)
        
        # Track the error
        error_id = await error_tracker.track_error(
            error=mock_error,
            category=category,
            severity=severity,
            component=component,
            context={
                'url': context.get('url'),
                'userAgent': context.get('userAgent'),
                'timestamp': context.get('timestamp'),
                'errorInfo': request.errorInfo,
                'frontend_error': True,
                **context
            },
            user_id=context.get('userId'),
            project_id=context.get('projectId'),
            request_id=context.get('sessionId')
        )
        
        logger.info(
            "Frontend error tracked successfully",
            error_id=error_id,
            error_type=error_name,
            component=component,
            category=category.value,
            severity=severity.value
        )
        
        return {
            "success": True,
            "errorId": error_id,
            "category": category.value,
            "severity": severity.value,
            "message": "Error tracked successfully"
        }
        
    except Exception as e:
        logger.error("Failed to track frontend error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to track error"
        )


@router.post("/report")
async def report_error(
    request: ErrorReportRequest,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Submit detailed error report with user feedback
    
    This endpoint handles user-reported errors with additional context
    and feedback, marking them as high priority.
    """
    try:
        # Get the original error report
        original_error = await error_tracker.get_error_report(request.errorId)
        
        if not original_error:
            # Create new error report if original not found
            error_details = request.error
            context = request.context
            
            class ReportedError(Exception):
                def __init__(self, name: str, message: str):
                    self.name = name
                    super().__init__(message)
            
            error_name = error_details.get('name', 'ReportedError')
            error_message = error_details.get('message', 'User reported error')
            
            mock_error = ReportedError(error_name, error_message)
            mock_error.name = error_name
            
            component = context.get('component', 'user-reported')
            category = map_error_category(error_name, component)
            severity = ErrorSeverity.HIGH  # User-reported errors are high priority
            
            error_id = await error_tracker.track_error(
                error=mock_error,
                category=category,
                severity=severity,
                component=component,
                context={
                    'user_feedback': request.userFeedback,
                    'report_type': request.reportType,
                    'priority': request.priority,
                    'user_reported': True,
                    **context
                },
                user_id=context.get('userId'),
                project_id=context.get('projectId'),
                request_id=context.get('sessionId')
            )
        else:
            error_id = request.errorId
            
            # Update the existing error with user feedback
            await error_tracker.update_resolution_status(
                error_id=error_id,
                status=ResolutionStatus.IN_PROGRESS,
                resolution_notes=f"User feedback: {request.userFeedback}",
                resolved_by=request.context.get('userId')
            )
        
        # Generate ticket number
        ticket_number = f"ERR-{datetime.now().strftime('%Y%m%d')}-{error_id[-8:].upper()}"
        
        logger.info(
            "Error report submitted successfully",
            error_id=error_id,
            ticket_number=ticket_number,
            user_id=request.context.get('userId'),
            has_feedback=bool(request.userFeedback)
        )
        
        return {
            "success": True,
            "reportId": f"report-{error_id}",
            "errorId": error_id,
            "ticketNumber": ticket_number,
            "message": "Error report submitted successfully"
        }
        
    except Exception as e:
        logger.error("Failed to submit error report", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to submit error report"
        )


@router.get("/metrics")
async def get_error_metrics(
    time_period_hours: int = 24,
    category_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Get error metrics and statistics
    
    Returns comprehensive error metrics for the specified time period
    with optional filtering by category and severity.
    """
    try:
        # Parse filters
        category = None
        if category_filter:
            try:
                category = ErrorCategory(category_filter)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category: {category_filter}"
                )
        
        severity = None
        if severity_filter:
            try:
                severity = ErrorSeverity(severity_filter)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid severity: {severity_filter}"
                )
        
        # Get metrics
        metrics = await error_tracker.get_error_metrics(
            time_period_hours=time_period_hours,
            category_filter=category,
            severity_filter=severity
        )
        
        return {
            "success": True,
            "metrics": {
                "total_errors": metrics.total_errors,
                "errors_by_category": metrics.errors_by_category,
                "errors_by_severity": metrics.errors_by_severity,
                "errors_by_component": metrics.errors_by_component,
                "resolution_rate": metrics.resolution_rate,
                "average_resolution_time": metrics.average_resolution_time,
                "top_error_types": metrics.top_error_types,
                "time_period": metrics.time_period,
                "generated_at": metrics.generated_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get error metrics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error metrics"
        )


@router.get("/trends")
async def get_error_trends(
    time_period_hours: int = 168,  # 1 week
    comparison_period_hours: int = 168,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Get error trend analysis
    
    Returns trend analysis comparing current period with previous period,
    including recommendations for addressing trending issues.
    """
    try:
        trends = await error_tracker.analyze_error_trends(
            time_period_hours=time_period_hours,
            comparison_period_hours=comparison_period_hours
        )
        
        trend_data = []
        for trend in trends:
            trend_data.append({
                "category": trend.category.value,
                "time_period": trend.time_period,
                "error_count": trend.error_count,
                "severity_distribution": trend.severity_distribution,
                "component_distribution": trend.component_distribution,
                "trend_direction": trend.trend_direction,
                "trend_percentage": trend.trend_percentage,
                "recommendations": trend.recommendations
            })
        
        return {
            "success": True,
            "trends": trend_data,
            "analysis_period": f"{time_period_hours}h",
            "comparison_period": f"{comparison_period_hours}h",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get error trends", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error trends"
        )


@router.get("/{error_id}")
async def get_error_details(
    error_id: str,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Get detailed information about a specific error
    """
    try:
        error_report = await error_tracker.get_error_report(error_id)
        
        if not error_report:
            raise HTTPException(
                status_code=404,
                detail="Error not found"
            )
        
        return {
            "success": True,
            "error": {
                "error_id": error_report.error_id,
                "timestamp": error_report.timestamp.isoformat(),
                "category": error_report.category.value,
                "severity": error_report.severity.value,
                "component": error_report.component,
                "error_type": error_report.error_type,
                "error_message": error_report.error_message,
                "stack_trace": error_report.stack_trace,
                "context": error_report.context,
                "resolution_status": error_report.resolution_status.value,
                "resolution_notes": error_report.resolution_notes,
                "resolved_at": error_report.resolved_at.isoformat() if error_report.resolved_at else None,
                "resolved_by": error_report.resolved_by,
                "occurrence_count": error_report.occurrence_count,
                "first_seen": error_report.first_seen.isoformat() if error_report.first_seen else None,
                "last_seen": error_report.last_seen.isoformat() if error_report.last_seen else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get error details", error_id=error_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error details"
        )


@router.put("/{error_id}/resolution")
async def update_error_resolution(
    error_id: str,
    request: ResolutionUpdateRequest,
    api_key: str = Depends(verify_api_key),
    error_tracker: ErrorTracker = Depends(get_error_tracker)
):
    """
    Update error resolution status
    """
    try:
        # Validate status
        try:
            status = ResolutionStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid resolution status: {request.status}"
            )
        
        success = await error_tracker.update_resolution_status(
            error_id=error_id,
            status=status,
            resolution_notes=request.resolution_notes,
            resolved_by=request.resolved_by
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Error not found"
            )
        
        return {
            "success": True,
            "message": "Resolution status updated successfully",
            "error_id": error_id,
            "status": status.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update error resolution", error_id=error_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to update error resolution"
        )