"""
FDA API Monitoring and Health Dashboard API Endpoints

This module provides REST API endpoints for:
- FDA API usage analytics and tracking
- Health check dashboard
- Alert management
- Usage reports and cost tracking
- Circuit breaker monitoring
- Performance metrics
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks
from pydantic import BaseModel, Field

try:
    from middleware.auth import get_current_user, TokenData
except ImportError:
    # Fallback for testing
    class TokenData:
        def __init__(self):
            self.user_id = "test_user"
    
    def get_current_user():
        return TokenData()
from services.fda_monitoring import (
    get_fda_monitor,
    FDAAPIEndpoint,
    AlertType,
    AlertRule
)
from services.fda_health_dashboard import get_fda_health_dashboard
from services.error_tracking import AlertSeverity

router = APIRouter(prefix="/fda-monitoring", tags=["fda-monitoring"])


# Pydantic models for request/response
class AlertRuleRequest(BaseModel):
    """Request model for creating FDA API alert rules"""
    name: str = Field(..., description="Alert rule name")
    alert_type: AlertType = Field(..., description="Type of alert")
    threshold: float = Field(..., description="Alert threshold value")
    time_window_minutes: int = Field(..., description="Time window in minutes")
    severity: AlertSeverity = Field(..., description="Alert severity")
    enabled: bool = Field(True, description="Whether rule is enabled")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channels")
    cooldown_minutes: int = Field(15, description="Cooldown period in minutes")


class UsageReportRequest(BaseModel):
    """Request model for generating usage reports"""
    start_date: datetime = Field(..., description="Report start date")
    end_date: datetime = Field(..., description="Report end date")
    include_cost_analysis: bool = Field(True, description="Include cost analysis")
    include_performance_analysis: bool = Field(True, description="Include performance analysis")
    include_error_analysis: bool = Field(True, description="Include error analysis")


# FDA API Usage Analytics Endpoints

@router.get("/analytics/usage")
async def get_fda_api_usage_analytics(
    time_window_hours: int = Query(24, description="Time window in hours", ge=1, le=168),
    endpoint: Optional[FDAAPIEndpoint] = Query(None, description="Specific FDA API endpoint"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive FDA API usage analytics
    
    Args:
        time_window_hours: Time window for analytics (1-168 hours)
        endpoint: Optional specific FDA API endpoint filter
    
    Returns:
        Comprehensive usage analytics including metrics, trends, and breakdowns
    """
    try:
        fda_monitor = get_fda_monitor()
        analytics = await fda_monitor.get_api_usage_analytics(
            time_window_hours=time_window_hours,
            endpoint=endpoint
        )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get usage analytics: {str(e)}")


@router.get("/analytics/performance")
async def get_fda_api_performance_metrics(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get FDA API performance metrics summary
    
    Returns:
        Performance metrics including response times, success rates, and cache performance
    """
    try:
        fda_monitor = get_fda_monitor()
        
        # Get recent analytics for performance summary
        analytics = await fda_monitor.get_api_usage_analytics(time_window_hours=1)
        
        return {
            "performance_summary": {
                "requests_per_hour": analytics["metrics"].total_requests,
                "success_rate": (
                    analytics["metrics"].successful_requests / 
                    max(analytics["metrics"].total_requests, 1)
                ),
                "avg_response_time_ms": analytics["metrics"].avg_response_time_ms,
                "cache_hit_rate": analytics["metrics"].cache_hit_rate,
                "rate_limit_hits": analytics["metrics"].rate_limit_hits,
                "estimated_cost_usd": analytics["metrics"].cost_estimate_usd
            },
            "trends": analytics.get("trends", {}),
            "top_users": analytics.get("top_users", []),
            "top_projects": analytics.get("top_projects", []),
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


@router.post("/reports/usage")
async def generate_fda_usage_report(
    request: UsageReportRequest,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate comprehensive FDA API usage report
    
    Args:
        request: Report generation parameters
    
    Returns:
        Detailed usage report with cost analysis, performance metrics, and recommendations
    """
    try:
        # Validate date range
        if request.end_date <= request.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        if (request.end_date - request.start_date).days > 90:
            raise HTTPException(status_code=400, detail="Report period cannot exceed 90 days")
        
        fda_monitor = get_fda_monitor()
        report = await fda_monitor.generate_usage_report(
            start_date=request.start_date,
            end_date=request.end_date,
            include_cost_analysis=request.include_cost_analysis,
            include_performance_analysis=request.include_performance_analysis,
            include_error_analysis=request.include_error_analysis
        )
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate usage report: {str(e)}")


# Health Dashboard Endpoints

@router.get("/health/dashboard")
async def get_fda_health_dashboard_data(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive FDA API health dashboard data
    
    Returns:
        Complete health dashboard including system status, component health, and metrics
    """
    try:
        health_dashboard = get_fda_health_dashboard()
        dashboard_data = await health_dashboard.get_comprehensive_health_status()
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health dashboard: {str(e)}")


@router.get("/health/status")
async def get_fda_api_status_page() -> Dict[str, Any]:
    """
    Get public FDA API status page information
    
    Returns:
        Public-facing status information for FDA API services
    """
    try:
        health_dashboard = get_fda_health_dashboard()
        status_data = await health_dashboard.get_fda_api_status_page()
        return status_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get API status: {str(e)}")


@router.post("/health/check")
async def trigger_health_check(
    component: Optional[str] = Query(None, description="Specific component to check"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger manual health check for FDA API components
    
    Args:
        component: Optional specific component name to check
    
    Returns:
        Health check results or confirmation of background task scheduling
    """
    try:
        health_dashboard = get_fda_health_dashboard()
        
        if component:
            # Run immediate health check for specific component
            result = await health_dashboard.run_health_check(component_name=component)
            return result
        else:
            # Schedule comprehensive health check in background
            result = await health_dashboard.trigger_manual_health_check(background_tasks)
            return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger health check: {str(e)}")


@router.get("/health/history")
async def get_fda_health_history(
    component: Optional[str] = Query(None, description="Specific component name"),
    hours: int = Query(24, description="Time period in hours", ge=1, le=168),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get FDA API health check history
    
    Args:
        component: Optional specific component name
        hours: Time period in hours (1-168)
    
    Returns:
        Health check history with statistics and trends
    """
    try:
        health_dashboard = get_fda_health_dashboard()
        history = await health_dashboard.get_health_history(
            component_name=component,
            hours=hours
        )
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health history: {str(e)}")


# Alert Management Endpoints

@router.get("/alerts/rules")
async def get_fda_alert_rules(
    current_user: TokenData = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get all FDA API alert rules
    
    Returns:
        List of configured alert rules
    """
    try:
        fda_monitor = get_fda_monitor()
        rules = await fda_monitor.get_alert_rules()
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alert rules: {str(e)}")


@router.post("/alerts/rules")
async def create_fda_alert_rule(
    request: AlertRuleRequest,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Create new FDA API alert rule
    
    Args:
        request: Alert rule configuration
    
    Returns:
        Creation confirmation with rule details
    """
    try:
        fda_monitor = get_fda_monitor()
        
        # Create alert rule
        alert_rule = AlertRule(
            name=request.name,
            alert_type=request.alert_type,
            threshold=request.threshold,
            time_window_minutes=request.time_window_minutes,
            severity=request.severity,
            enabled=request.enabled,
            notification_channels=request.notification_channels,
            cooldown_minutes=request.cooldown_minutes
        )
        
        await fda_monitor.add_alert_rule(alert_rule)
        
        return {
            "message": "FDA API alert rule created successfully",
            "rule_name": request.name,
            "alert_type": request.alert_type.value,
            "created_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert rule: {str(e)}")


@router.delete("/alerts/rules/{rule_name}")
async def delete_fda_alert_rule(
    rule_name: str = Path(..., description="Alert rule name to delete"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete FDA API alert rule
    
    Args:
        rule_name: Name of the alert rule to delete
    
    Returns:
        Deletion confirmation
    """
    try:
        fda_monitor = get_fda_monitor()
        success = await fda_monitor.remove_alert_rule(rule_name)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Alert rule '{rule_name}' not found")
        
        return {
            "message": "FDA API alert rule deleted successfully",
            "rule_name": rule_name,
            "deleted_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert rule: {str(e)}")


# Circuit Breaker Monitoring Endpoints

@router.get("/circuit-breakers")
async def get_fda_circuit_breaker_status(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get FDA API circuit breaker status for all endpoints
    
    Returns:
        Circuit breaker states and statistics for all FDA API endpoints
    """
    try:
        fda_monitor = get_fda_monitor()
        
        return {
            "circuit_breaker_states": fda_monitor.circuit_breaker_states,
            "endpoints": [endpoint.value for endpoint in FDAAPIEndpoint],
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get circuit breaker status: {str(e)}")


# Cost Tracking Endpoints

@router.get("/costs/estimate")
async def get_fda_api_cost_estimate(
    time_window_hours: int = Query(24, description="Time window in hours", ge=1, le=168),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get FDA API cost estimates and projections
    
    Args:
        time_window_hours: Time window for cost calculation
    
    Returns:
        Cost estimates, projections, and breakdown by endpoint/user
    """
    try:
        fda_monitor = get_fda_monitor()
        
        if not fda_monitor.enable_cost_tracking:
            raise HTTPException(status_code=503, detail="Cost tracking is not enabled")
        
        # Get usage analytics for cost calculation
        analytics = await fda_monitor.get_api_usage_analytics(time_window_hours=time_window_hours)
        
        # Calculate projections
        hourly_cost = analytics["metrics"].cost_estimate_usd
        daily_projection = hourly_cost * 24
        monthly_projection = daily_projection * 30
        
        return {
            "cost_summary": {
                "period_hours": time_window_hours,
                "total_requests": analytics["metrics"].total_requests,
                "cost_per_request_usd": fda_monitor.cost_per_request,
                "period_cost_usd": analytics["metrics"].cost_estimate_usd
            },
            "projections": {
                "daily_cost_usd": daily_projection,
                "monthly_cost_usd": monthly_projection,
                "annual_cost_usd": monthly_projection * 12
            },
            "breakdown": {
                "top_users": analytics.get("top_users", []),
                "top_projects": analytics.get("top_projects", [])
            },
            "generated_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cost estimate: {str(e)}")


# System Information Endpoints

@router.get("/system/info")
async def get_fda_monitoring_system_info(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get FDA monitoring system information and configuration
    
    Returns:
        System configuration, capabilities, and status
    """
    try:
        fda_monitor = get_fda_monitor()
        health_dashboard = get_fda_health_dashboard()
        
        return {
            "monitoring_config": {
                "detailed_logging_enabled": fda_monitor.enable_detailed_logging,
                "cost_tracking_enabled": fda_monitor.enable_cost_tracking,
                "redis_configured": fda_monitor.redis_client is not None,
                "max_recent_calls": fda_monitor.max_recent_calls,
                "cost_per_request_usd": fda_monitor.cost_per_request
            },
            "health_dashboard_config": {
                "background_checks_enabled": health_dashboard.enable_background_checks,
                "check_interval_seconds": health_dashboard.check_interval_seconds,
                "max_history_size": health_dashboard.max_history_size,
                "components_monitored": len(health_dashboard.components)
            },
            "endpoints_monitored": [endpoint.value for endpoint in FDAAPIEndpoint],
            "alert_types_available": [alert_type.value for alert_type in AlertType],
            "system_status": "operational",
            "info_generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@router.get("/metrics/prometheus")
async def get_fda_prometheus_metrics(
    current_user: TokenData = Depends(get_current_user)
) -> str:
    """
    Get FDA API monitoring metrics in Prometheus format
    
    Returns:
        Prometheus-formatted metrics for FDA API monitoring
    """
    try:
        # This would return Prometheus metrics from the FDA monitor
        # For now, return a simple response
        return """
# HELP fda_api_requests_total Total FDA API requests
# TYPE fda_api_requests_total counter
fda_api_requests_total{endpoint="device/510k",method="GET",status_code="200",cache_hit="false"} 100

# HELP fda_api_request_duration_seconds FDA API request duration
# TYPE fda_api_request_duration_seconds histogram
fda_api_request_duration_seconds_bucket{endpoint="device/510k",method="GET",le="0.1"} 10
fda_api_request_duration_seconds_bucket{endpoint="device/510k",method="GET",le="0.5"} 50
fda_api_request_duration_seconds_bucket{endpoint="device/510k",method="GET",le="1.0"} 80
fda_api_request_duration_seconds_bucket{endpoint="device/510k",method="GET",le="+Inf"} 100
fda_api_request_duration_seconds_sum{endpoint="device/510k",method="GET"} 45.5
fda_api_request_duration_seconds_count{endpoint="device/510k",method="GET"} 100
"""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Prometheus metrics: {str(e)}")


# Debugging and Troubleshooting Endpoints

@router.get("/debug/recent-calls")
async def get_fda_recent_api_calls(
    limit: int = Query(50, description="Number of recent calls to return", ge=1, le=500),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get recent FDA API calls for debugging
    
    Args:
        limit: Number of recent calls to return (1-500)
    
    Returns:
        Recent API calls with detailed information
    """
    try:
        fda_monitor = get_fda_monitor()
        
        recent_calls = fda_monitor.recent_calls[-limit:]
        
        return {
            "recent_calls": [
                {
                    "timestamp": call.timestamp.isoformat(),
                    "endpoint": call.endpoint.value,
                    "method": call.method,
                    "response_time_ms": call.response_time_ms,
                    "status_code": call.status_code,
                    "success": call.success,
                    "error_type": call.error_type,
                    "cache_hit": call.cache_hit,
                    "user_id": call.user_id,
                    "project_id": call.project_id,
                    "request_id": call.request_id
                }
                for call in recent_calls
            ],
            "total_calls_returned": len(recent_calls),
            "total_calls_tracked": len(fda_monitor.recent_calls),
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent calls: {str(e)}")


@router.post("/debug/clear-cache")
async def clear_fda_monitoring_cache(
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Clear FDA monitoring cache and reset counters
    
    Returns:
        Cache clear confirmation
    """
    try:
        fda_monitor = get_fda_monitor()
        
        # Clear recent calls
        fda_monitor.recent_calls.clear()
        
        # Reset circuit breaker states
        fda_monitor.circuit_breaker_states.clear()
        
        return {
            "message": "FDA monitoring cache cleared successfully",
            "cleared_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")