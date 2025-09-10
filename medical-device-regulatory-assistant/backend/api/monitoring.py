"""
API endpoints for monitoring, analytics, and error tracking
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from middleware.auth import get_current_user, TokenData
from services.monitoring import get_monitoring_service, MonitoringService
from services.error_tracking import get_error_tracking_service, ErrorTrackingService, AlertSeverity, ErrorCategory
from services.analytics import get_analytics_service, AnalyticsService, EventType, FeatureCategory
from services.performance_monitor import get_performance_monitor

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


# Pydantic models for request/response
class ErrorTrackingRequest(BaseModel):
    """Request model for manual error tracking"""
    error_type: str = Field(..., description="Type of error")
    error_message: str = Field(..., description="Error message")
    category: ErrorCategory = Field(..., description="Error category")
    severity: AlertSeverity = Field(..., description="Error severity")
    component: str = Field(..., description="Component where error occurred")
    project_id: Optional[int] = Field(None, description="Project ID if applicable")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class AnalyticsEventRequest(BaseModel):
    """Request model for tracking analytics events"""
    event_type: EventType = Field(..., description="Type of event")
    feature_category: FeatureCategory = Field(..., description="Feature category")
    feature_name: str = Field(..., description="Feature name")
    action: str = Field(..., description="Action performed")
    project_id: Optional[int] = Field(None, description="Project ID if applicable")
    session_id: Optional[str] = Field(None, description="Session ID")
    page_url: Optional[str] = Field(None, description="Page URL")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds")
    success: bool = Field(True, description="Whether action was successful")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AlertRuleRequest(BaseModel):
    """Request model for creating alert rules"""
    name: str = Field(..., description="Rule name")
    condition: str = Field(..., description="Alert condition")
    time_window: int = Field(..., description="Time window in minutes")
    severity: AlertSeverity = Field(..., description="Alert severity")
    enabled: bool = Field(True, description="Whether rule is enabled")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channels")


# Prometheus metrics endpoint
@router.get("/metrics", response_class=PlainTextResponse)
async def get_prometheus_metrics():
    """
    Get Prometheus metrics in text format
    
    Returns:
        Prometheus metrics in text format
    """
    monitoring_service = get_monitoring_service()
    return monitoring_service.get_metrics()


# Performance monitoring endpoints
@router.get("/performance/summary")
async def get_performance_summary(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get performance metrics summary
    
    Returns:
        Performance metrics summary
    """
    monitoring_service = get_monitoring_service()
    return await monitoring_service.get_performance_summary()


@router.get("/performance/report")
async def get_performance_report(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive performance report
    
    Returns:
        Detailed performance report
    """
    performance_monitor = get_performance_monitor()
    return await performance_monitor.get_performance_report()


@router.get("/performance/alerts")
async def get_performance_alerts(
    current_user: TokenData = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get current performance alerts
    
    Returns:
        List of active performance alerts
    """
    monitoring_service = get_monitoring_service()
    return await monitoring_service.check_alerts()


# Error tracking endpoints
@router.post("/errors/track")
async def track_error_manually(
    request: ErrorTrackingRequest,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Manually track an error event
    
    Args:
        request: Error tracking request data
    
    Returns:
        Error tracking confirmation with error ID
    """
    error_service = get_error_tracking_service()
    
    # Create a mock exception for tracking
    class ManualError(Exception):
        pass
    
    error = ManualError(request.error_message)
    
    error_id = await error_service.track_error(
        error=error,
        category=request.category,
        severity=request.severity,
        component=request.component,
        user_id=current_user.user_id,
        project_id=request.project_id,
        context=request.context
    )
    
    return {
        "message": "Error tracked successfully",
        "error_id": error_id
    }


@router.get("/errors/summary")
async def get_error_summary(
    hours: int = Query(24, description="Time period in hours"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get error summary for specified time period
    
    Args:
        hours: Time period in hours (default: 24)
    
    Returns:
        Error summary statistics
    """
    error_service = get_error_tracking_service()
    return await error_service.get_error_summary(hours=hours)


@router.get("/errors/{error_id}")
async def get_error_details(
    error_id: str = Path(..., description="Error ID"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed information about a specific error
    
    Args:
        error_id: Error ID
    
    Returns:
        Detailed error information
    """
    error_service = get_error_tracking_service()
    error_details = await error_service.get_error_details(error_id)
    
    if not error_details:
        raise HTTPException(status_code=404, detail="Error not found")
    
    return error_details


@router.post("/errors/{error_id}/resolve")
async def resolve_error(
    error_id: str = Path(..., description="Error ID"),
    resolution_notes: str = Query(..., description="Resolution notes"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Mark an error as resolved
    
    Args:
        error_id: Error ID
        resolution_notes: Notes about the resolution
    
    Returns:
        Resolution confirmation
    """
    error_service = get_error_tracking_service()
    success = await error_service.resolve_error(error_id, resolution_notes)
    
    if not success:
        raise HTTPException(status_code=404, detail="Error not found")
    
    return {
        "message": "Error resolved successfully",
        "error_id": error_id
    }


# Alert rule management endpoints
@router.get("/alerts/rules")
async def get_alert_rules(
    current_user: TokenData = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all alert rules
    
    Returns:
        List of alert rules
    """
    error_service = get_error_tracking_service()
    return error_service.get_alert_rules()


@router.post("/alerts/rules")
async def create_alert_rule(
    request: AlertRuleRequest,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Create a new alert rule
    
    Args:
        request: Alert rule configuration
    
    Returns:
        Creation confirmation
    """
    from services.error_tracking import AlertRule
    
    error_service = get_error_tracking_service()
    
    alert_rule = AlertRule(
        name=request.name,
        condition=request.condition,
        time_window=request.time_window,
        severity=request.severity,
        enabled=request.enabled,
        notification_channels=request.notification_channels
    )
    
    error_service.add_alert_rule(alert_rule)
    
    return {
        "message": "Alert rule created successfully",
        "rule_name": request.name
    }


@router.delete("/alerts/rules/{rule_name}")
async def delete_alert_rule(
    rule_name: str = Path(..., description="Rule name"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete an alert rule
    
    Args:
        rule_name: Name of the rule to delete
    
    Returns:
        Deletion confirmation
    """
    error_service = get_error_tracking_service()
    success = error_service.remove_alert_rule(rule_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    return {
        "message": "Alert rule deleted successfully",
        "rule_name": rule_name
    }


# Analytics endpoints
@router.post("/analytics/track")
async def track_analytics_event(
    request: AnalyticsEventRequest,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Track an analytics event
    
    Args:
        request: Analytics event data
    
    Returns:
        Tracking confirmation with event ID
    """
    analytics_service = get_analytics_service()
    
    event_id = await analytics_service.track_event(
        event_type=request.event_type,
        feature_category=request.feature_category,
        feature_name=request.feature_name,
        action=request.action,
        user_id=current_user.user_id,
        session_id=request.session_id,
        project_id=request.project_id,
        page_url=request.page_url,
        duration_ms=request.duration_ms,
        success=request.success,
        metadata=request.metadata
    )
    
    return {
        "message": "Analytics event tracked successfully",
        "event_id": event_id
    }


@router.get("/analytics/features")
async def get_feature_metrics(
    feature_name: Optional[str] = Query(None, description="Specific feature name"),
    category: Optional[FeatureCategory] = Query(None, description="Feature category"),
    hours: int = Query(24, description="Time period in hours"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get feature usage metrics
    
    Args:
        feature_name: Optional specific feature name
        category: Optional feature category
        hours: Time period in hours (default: 24)
    
    Returns:
        Feature usage metrics
    """
    analytics_service = get_analytics_service()
    return await analytics_service.get_feature_metrics(
        feature_name=feature_name,
        category=category,
        hours=hours
    )


@router.get("/analytics/users/{user_id}/behavior")
async def get_user_behavior_analysis(
    user_id: str = Path(..., description="User ID"),
    days: int = Query(7, description="Analysis period in days"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get user behavior analysis
    
    Args:
        user_id: User ID to analyze
        days: Analysis period in days (default: 7)
    
    Returns:
        User behavior analysis
    """
    # Only allow users to view their own behavior or admin users
    if current_user.user_id != user_id:
        # TODO: Add admin role check when role system is implemented
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics_service = get_analytics_service()
    return await analytics_service.get_user_behavior_analysis(user_id, days)


@router.get("/analytics/projects/{project_id}")
async def get_project_analytics(
    project_id: int = Path(..., description="Project ID"),
    days: int = Query(30, description="Analysis period in days"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get analytics for a specific project
    
    Args:
        project_id: Project ID
        days: Analysis period in days (default: 30)
    
    Returns:
        Project analytics data
    """
    # TODO: Add project access validation
    analytics_service = get_analytics_service()
    return await analytics_service.get_project_analytics(project_id, days)


@router.get("/analytics/system/overview")
async def get_system_usage_overview(
    days: int = Query(7, description="Analysis period in days"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get system-wide usage overview
    
    Args:
        days: Analysis period in days (default: 7)
    
    Returns:
        System usage overview
    """
    analytics_service = get_analytics_service()
    return await analytics_service.get_system_usage_overview(days)


@router.post("/analytics/sessions/start")
async def start_analytics_session(
    session_id: Optional[str] = Query(None, description="Optional session ID"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Start a new analytics session
    
    Args:
        session_id: Optional session ID (generated if not provided)
    
    Returns:
        Session start confirmation with session ID
    """
    analytics_service = get_analytics_service()
    
    session_id = await analytics_service.start_session(
        user_id=current_user.user_id,
        session_id=session_id
    )
    
    return {
        "message": "Analytics session started",
        "session_id": session_id
    }


@router.post("/analytics/sessions/{session_id}/end")
async def end_analytics_session(
    session_id: str = Path(..., description="Session ID"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    End an analytics session
    
    Args:
        session_id: Session ID to end
    
    Returns:
        Session end confirmation
    """
    analytics_service = get_analytics_service()
    await analytics_service.end_session(session_id)
    
    return {
        "message": "Analytics session ended",
        "session_id": session_id
    }


# System health and status endpoints
@router.get("/system/status")
async def get_system_status(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get overall system monitoring status
    
    Returns:
        System monitoring status
    """
    monitoring_service = get_monitoring_service()
    error_service = get_error_tracking_service()
    analytics_service = get_analytics_service()
    
    # Get recent metrics
    performance_summary = await monitoring_service.get_performance_summary()
    error_summary = await error_service.get_error_summary(hours=1)
    usage_overview = await analytics_service.get_system_usage_overview(days=1)
    alerts = await monitoring_service.check_alerts()
    
    # Determine overall health
    health_score = 100
    
    # Reduce score based on errors
    if error_summary["total_errors"] > 0:
        health_score -= min(error_summary["total_errors"] * 2, 30)
    
    # Reduce score based on performance issues
    if performance_summary["success_rate"] < 0.95:
        health_score -= (1 - performance_summary["success_rate"]) * 50
    
    # Reduce score based on alerts
    critical_alerts = len([a for a in alerts if a.get("severity") == "critical"])
    high_alerts = len([a for a in alerts if a.get("severity") == "high"])
    health_score -= critical_alerts * 20 + high_alerts * 10
    
    health_score = max(0, health_score)
    
    # Determine status
    if health_score >= 90:
        status = "healthy"
    elif health_score >= 70:
        status = "warning"
    elif health_score >= 50:
        status = "degraded"
    else:
        status = "critical"
    
    return {
        "status": status,
        "health_score": health_score,
        "performance": performance_summary,
        "errors": error_summary,
        "usage": usage_overview,
        "alerts": {
            "total": len(alerts),
            "critical": critical_alerts,
            "high": high_alerts,
            "active_alerts": alerts[:5]  # Show top 5 alerts
        },
        "timestamp": datetime.now().isoformat()
    }


@router.post("/system/cache/clear")
async def clear_monitoring_cache(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Clear monitoring and analytics cache
    
    Returns:
        Cache clear confirmation
    """
    analytics_service = get_analytics_service()
    analytics_service.clear_cache()
    
    return {
        "message": "Monitoring cache cleared successfully"
    }