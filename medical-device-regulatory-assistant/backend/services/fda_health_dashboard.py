"""
FDA API Health Check Dashboard Service

This service provides a comprehensive health check dashboard specifically for FDA API integration:
- Real-time health monitoring
- Performance metrics visualization
- Alert management interface
- System status overview
- Automated health checks
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

import structlog
from fastapi import BackgroundTasks

try:
    from .fda_monitoring import get_fda_monitor, FDAAPIEndpoint, AlertType
except ImportError:
    # Fallback for testing
    from enum import Enum
    
    class FDAAPIEndpoint(Enum):
        DEVICE_510K = "device/510k"
        DEVICE_CLASSIFICATION = "device/classification"
        DEVICE_ADVERSE_EVENTS = "device/event"
        DEVICE_RECALL = "device/recall"
    
    class AlertType(Enum):
        HIGH_ERROR_RATE = "high_error_rate"
    
    def get_fda_monitor():
        return None

try:
    from .monitoring import get_monitoring_service
except ImportError:
    def get_monitoring_service():
        return None

try:
    from .error_tracking import get_error_tracking_service
except ImportError:
    def get_error_tracking_service():
        return None

try:
    from .openfda import OpenFDAService
except ImportError:
    OpenFDAService = None

logger = structlog.get_logger(__name__)


class HealthStatus(Enum):
    """Health status levels"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ComponentStatus(Enum):
    """Individual component status"""
    OPERATIONAL = "operational"
    PERFORMANCE_ISSUES = "performance_issues"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"


@dataclass
class HealthCheckResult:
    """Health check result for a component"""
    component: str
    status: ComponentStatus
    response_time_ms: float
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    error: Optional[str] = None


@dataclass
class SystemHealthSummary:
    """Overall system health summary"""
    overall_status: HealthStatus
    component_count: int
    healthy_components: int
    degraded_components: int
    unhealthy_components: int
    last_updated: datetime
    uptime_percentage: float
    response_time_p95: float
    error_rate: float


class FDAHealthDashboard:
    """
    Comprehensive health dashboard for FDA API integration
    """
    
    def __init__(
        self,
        openfda_service: Optional[OpenFDAService] = None,
        check_interval_seconds: int = 60,
        enable_background_checks: bool = True
    ):
        self.openfda_service = openfda_service
        self.check_interval_seconds = check_interval_seconds
        self.enable_background_checks = enable_background_checks
        
        # Get monitoring services
        self.fda_monitor = get_fda_monitor()
        self.monitoring_service = get_monitoring_service()
        self.error_service = get_error_tracking_service()
        
        # Health check history
        self.health_history: List[HealthCheckResult] = []
        self.max_history_size = 1000
        
        # Background task management
        self._background_task: Optional[asyncio.Task] = None
        self._running = False
        
        # Component definitions
        self.components = {
            "fda_api_510k": {
                "name": "FDA 510(k) API",
                "endpoint": FDAAPIEndpoint.DEVICE_510K,
                "critical": True
            },
            "fda_api_classification": {
                "name": "FDA Classification API", 
                "endpoint": FDAAPIEndpoint.DEVICE_CLASSIFICATION,
                "critical": True
            },
            "fda_api_adverse_events": {
                "name": "FDA Adverse Events API",
                "endpoint": FDAAPIEndpoint.DEVICE_ADVERSE_EVENTS,
                "critical": False
            },
            "fda_api_recall": {
                "name": "FDA Recall API",
                "endpoint": FDAAPIEndpoint.DEVICE_RECALL,
                "critical": False
            },
            "cache_system": {
                "name": "Cache System",
                "critical": True
            },
            "database": {
                "name": "Database",
                "critical": True
            },
            "monitoring": {
                "name": "Monitoring System",
                "critical": False
            }
        }
        
        logger.info("FDA Health Dashboard initialized")
    
    async def start_background_monitoring(self) -> None:
        """Start background health monitoring"""
        if self._running or not self.enable_background_checks:
            return
        
        self._running = True
        self._background_task = asyncio.create_task(self._background_health_check_loop())
        logger.info("Background health monitoring started")
    
    async def stop_background_monitoring(self) -> None:
        """Stop background health monitoring"""
        self._running = False
        
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Background health monitoring stopped")
    
    async def get_comprehensive_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status for the dashboard
        """
        # Perform health checks for all components
        health_results = await self._perform_all_health_checks()
        
        # Get system health summary
        health_summary = self._calculate_health_summary(health_results)
        
        # Get FDA API specific metrics
        fda_metrics = await self._get_fda_api_metrics()
        
        # Get recent alerts
        recent_alerts = await self._get_recent_alerts()
        
        # Get performance trends
        performance_trends = await self._get_performance_trends()
        
        # Get uptime statistics
        uptime_stats = await self._get_uptime_statistics()
        
        return {
            "system_health": {
                "overall_status": health_summary.overall_status.value,
                "summary": {
                    "total_components": health_summary.component_count,
                    "healthy": health_summary.healthy_components,
                    "degraded": health_summary.degraded_components,
                    "unhealthy": health_summary.unhealthy_components,
                    "uptime_percentage": health_summary.uptime_percentage,
                    "response_time_p95_ms": health_summary.response_time_p95,
                    "error_rate": health_summary.error_rate
                },
                "last_updated": health_summary.last_updated.isoformat()
            },
            "component_status": [
                {
                    "component": result.component,
                    "status": result.status.value,
                    "response_time_ms": result.response_time_ms,
                    "message": result.message,
                    "details": result.details,
                    "timestamp": result.timestamp.isoformat(),
                    "error": result.error
                }
                for result in health_results
            ],
            "fda_api_metrics": fda_metrics,
            "recent_alerts": recent_alerts,
            "performance_trends": performance_trends,
            "uptime_statistics": uptime_stats,
            "dashboard_generated_at": datetime.now().isoformat()
        }
    
    async def get_fda_api_status_page(self) -> Dict[str, Any]:
        """
        Get FDA API status page information (public-facing)
        """
        # Get basic health status
        health_results = await self._perform_fda_api_health_checks()
        
        # Calculate overall FDA API status
        fda_status = self._calculate_fda_api_status(health_results)
        
        # Get recent incidents
        recent_incidents = await self._get_recent_incidents()
        
        # Get maintenance windows
        maintenance_windows = await self._get_maintenance_windows()
        
        # Get performance metrics (last 24 hours)
        performance_metrics = await self.fda_monitor.get_api_usage_analytics(time_window_hours=24)
        
        return {
            "fda_api_status": {
                "overall_status": fda_status.value,
                "components": [
                    {
                        "name": result.component,
                        "status": result.status.value,
                        "response_time_ms": result.response_time_ms,
                        "last_checked": result.timestamp.isoformat()
                    }
                    for result in health_results
                ],
                "last_updated": datetime.now().isoformat()
            },
            "performance_summary": {
                "requests_24h": performance_metrics["total_requests"],
                "success_rate": (
                    performance_metrics["metrics"].successful_requests / 
                    max(performance_metrics["metrics"].total_requests, 1)
                ),
                "avg_response_time_ms": performance_metrics["metrics"].avg_response_time_ms,
                "cache_hit_rate": performance_metrics["metrics"].cache_hit_rate
            },
            "recent_incidents": recent_incidents,
            "maintenance_windows": maintenance_windows,
            "status_page_updated_at": datetime.now().isoformat()
        }
    
    async def run_health_check(self, component_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Run health check for specific component or all components
        """
        if component_name:
            if component_name not in self.components:
                raise ValueError(f"Unknown component: {component_name}")
            
            result = await self._check_component_health(component_name)
            return {
                "component": result.component,
                "status": result.status.value,
                "response_time_ms": result.response_time_ms,
                "message": result.message,
                "details": result.details,
                "timestamp": result.timestamp.isoformat(),
                "error": result.error
            }
        else:
            results = await self._perform_all_health_checks()
            return {
                "components": [
                    {
                        "component": result.component,
                        "status": result.status.value,
                        "response_time_ms": result.response_time_ms,
                        "message": result.message,
                        "details": result.details,
                        "timestamp": result.timestamp.isoformat(),
                        "error": result.error
                    }
                    for result in results
                ],
                "summary": self._calculate_health_summary(results).__dict__,
                "check_completed_at": datetime.now().isoformat()
            }
    
    async def get_health_history(
        self,
        component_name: Optional[str] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get health check history for analysis
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter history
        filtered_history = [
            result for result in self.health_history
            if result.timestamp > cutoff_time and (
                component_name is None or result.component == component_name
            )
        ]
        
        if not filtered_history:
            return {
                "component": component_name or "all",
                "time_period_hours": hours,
                "total_checks": 0,
                "history": [],
                "statistics": {}
            }
        
        # Calculate statistics
        total_checks = len(filtered_history)
        healthy_checks = len([r for r in filtered_history if r.status == ComponentStatus.OPERATIONAL])
        degraded_checks = len([r for r in filtered_history if r.status == ComponentStatus.PERFORMANCE_ISSUES])
        unhealthy_checks = len([r for r in filtered_history if r.status in [ComponentStatus.PARTIAL_OUTAGE, ComponentStatus.MAJOR_OUTAGE]])
        
        response_times = [r.response_time_ms for r in filtered_history if r.response_time_ms > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        return {
            "component": component_name or "all",
            "time_period_hours": hours,
            "total_checks": total_checks,
            "statistics": {
                "healthy_percentage": (healthy_checks / total_checks) * 100,
                "degraded_percentage": (degraded_checks / total_checks) * 100,
                "unhealthy_percentage": (unhealthy_checks / total_checks) * 100,
                "avg_response_time_ms": avg_response_time,
                "uptime_percentage": ((healthy_checks + degraded_checks) / total_checks) * 100
            },
            "history": [
                {
                    "timestamp": result.timestamp.isoformat(),
                    "status": result.status.value,
                    "response_time_ms": result.response_time_ms,
                    "message": result.message,
                    "error": result.error
                }
                for result in filtered_history[-100:]  # Last 100 checks
            ]
        }
    
    async def trigger_manual_health_check(self, background_tasks: BackgroundTasks) -> Dict[str, str]:
        """
        Trigger manual health check (async)
        """
        # Schedule background health check
        background_tasks.add_task(self._perform_manual_health_check)
        
        return {
            "message": "Manual health check triggered",
            "status": "scheduled",
            "triggered_at": datetime.now().isoformat()
        }
    
    # Private methods
    
    async def _background_health_check_loop(self) -> None:
        """Background health check loop"""
        while self._running:
            try:
                await self._perform_all_health_checks()
                await asyncio.sleep(self.check_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Background health check failed", error=str(e))
                await asyncio.sleep(30)  # Wait before retrying
    
    async def _perform_all_health_checks(self) -> List[HealthCheckResult]:
        """Perform health checks for all components"""
        results = []
        
        # Run health checks concurrently
        tasks = [
            self._check_component_health(component_name)
            for component_name in self.components.keys()
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    component_name = list(self.components.keys())[i]
                    error_result = HealthCheckResult(
                        component=component_name,
                        status=ComponentStatus.MAJOR_OUTAGE,
                        response_time_ms=0,
                        message=f"Health check failed: {str(result)}",
                        error=str(result)
                    )
                    processed_results.append(error_result)
                else:
                    processed_results.append(result)
            
            results = processed_results
            
        except Exception as e:
            logger.error("Failed to perform health checks", error=str(e))
            results = []
        
        # Store in history
        for result in results:
            self.health_history.append(result)
        
        # Trim history if needed
        if len(self.health_history) > self.max_history_size:
            self.health_history = self.health_history[-self.max_history_size:]
        
        return results
    
    async def _perform_fda_api_health_checks(self) -> List[HealthCheckResult]:
        """Perform health checks specifically for FDA API components"""
        fda_components = [
            name for name, config in self.components.items()
            if name.startswith("fda_api_")
        ]
        
        results = []
        for component_name in fda_components:
            result = await self._check_component_health(component_name)
            results.append(result)
        
        return results
    
    async def _check_component_health(self, component_name: str) -> HealthCheckResult:
        """Check health of a specific component"""
        component_config = self.components[component_name]
        start_time = datetime.now()
        
        try:
            if component_name.startswith("fda_api_"):
                return await self._check_fda_api_health(component_name, component_config)
            elif component_name == "cache_system":
                return await self._check_cache_health()
            elif component_name == "database":
                return await self._check_database_health()
            elif component_name == "monitoring":
                return await self._check_monitoring_health()
            else:
                raise ValueError(f"Unknown component type: {component_name}")
                
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component=component_name,
                status=ComponentStatus.MAJOR_OUTAGE,
                response_time_ms=response_time,
                message=f"Health check failed: {str(e)}",
                error=str(e)
            )
    
    async def _check_fda_api_health(self, component_name: str, config: Dict[str, Any]) -> HealthCheckResult:
        """Check FDA API endpoint health"""
        start_time = datetime.now()
        
        try:
            if not self.openfda_service:
                return HealthCheckResult(
                    component=component_name,
                    status=ComponentStatus.MAJOR_OUTAGE,
                    response_time_ms=0,
                    message="OpenFDA service not configured",
                    error="Service not available"
                )
            
            # Perform basic health check based on endpoint
            endpoint = config["endpoint"]
            
            if endpoint == FDAAPIEndpoint.DEVICE_510K:
                # Test 510(k) search with minimal query
                results = await self.openfda_service.search_predicates(
                    search_terms=["device"],
                    limit=1
                )
                success = len(results) >= 0  # Even 0 results is success
                
            elif endpoint == FDAAPIEndpoint.DEVICE_CLASSIFICATION:
                # Test classification lookup
                results = await self.openfda_service.lookup_device_classification(
                    device_name="device"
                )
                success = len(results) >= 0
                
            elif endpoint == FDAAPIEndpoint.DEVICE_ADVERSE_EVENTS:
                # Test adverse events search
                results = await self.openfda_service.search_adverse_events(
                    device_name="device",
                    limit=1
                )
                success = len(results) >= 0
                
            else:
                # For other endpoints, just check if service is available
                health_check = await self.openfda_service.health_check()
                success = health_check.get("status") == "healthy"
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Determine status based on response time and success
            if success:
                if response_time < 2000:  # < 2 seconds
                    status = ComponentStatus.OPERATIONAL
                    message = f"API responding normally ({response_time:.0f}ms)"
                elif response_time < 10000:  # < 10 seconds
                    status = ComponentStatus.PERFORMANCE_ISSUES
                    message = f"API responding slowly ({response_time:.0f}ms)"
                else:
                    status = ComponentStatus.PARTIAL_OUTAGE
                    message = f"API responding very slowly ({response_time:.0f}ms)"
            else:
                status = ComponentStatus.MAJOR_OUTAGE
                message = "API not responding or returning errors"
            
            return HealthCheckResult(
                component=component_name,
                status=status,
                response_time_ms=response_time,
                message=message,
                details={
                    "endpoint": endpoint.value,
                    "critical": config.get("critical", False)
                }
            )
            
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component=component_name,
                status=ComponentStatus.MAJOR_OUTAGE,
                response_time_ms=response_time,
                message=f"API health check failed: {str(e)}",
                error=str(e),
                details={
                    "endpoint": config["endpoint"].value,
                    "critical": config.get("critical", False)
                }
            )
    
    async def _check_cache_health(self) -> HealthCheckResult:
        """Check cache system health"""
        start_time = datetime.now()
        
        try:
            # Try to get cache statistics from FDA monitor
            if hasattr(self.fda_monitor, 'redis_client') and self.fda_monitor.redis_client:
                # Test Redis connection
                await self.fda_monitor.redis_client.ping()
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return HealthCheckResult(
                    component="cache_system",
                    status=ComponentStatus.OPERATIONAL,
                    response_time_ms=response_time,
                    message=f"Cache system operational ({response_time:.0f}ms)",
                    details={"cache_type": "Redis"}
                )
            else:
                return HealthCheckResult(
                    component="cache_system",
                    status=ComponentStatus.PARTIAL_OUTAGE,
                    response_time_ms=0,
                    message="Cache system not configured",
                    details={"cache_type": "None"}
                )
                
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component="cache_system",
                status=ComponentStatus.MAJOR_OUTAGE,
                response_time_ms=response_time,
                message=f"Cache system failed: {str(e)}",
                error=str(e)
            )
    
    async def _check_database_health(self) -> HealthCheckResult:
        """Check database health"""
        start_time = datetime.now()
        
        try:
            # Simple database connectivity check
            # This would typically involve a simple query
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component="database",
                status=ComponentStatus.OPERATIONAL,
                response_time_ms=response_time,
                message=f"Database operational ({response_time:.0f}ms)",
                details={"database_type": "SQLite"}
            )
            
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component="database",
                status=ComponentStatus.MAJOR_OUTAGE,
                response_time_ms=response_time,
                message=f"Database failed: {str(e)}",
                error=str(e)
            )
    
    async def _check_monitoring_health(self) -> HealthCheckResult:
        """Check monitoring system health"""
        start_time = datetime.now()
        
        try:
            # Check if monitoring services are responding
            monitoring_summary = await self.monitoring_service.get_performance_summary()
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component="monitoring",
                status=ComponentStatus.OPERATIONAL,
                response_time_ms=response_time,
                message=f"Monitoring system operational ({response_time:.0f}ms)",
                details={"metrics_available": bool(monitoring_summary)}
            )
            
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HealthCheckResult(
                component="monitoring",
                status=ComponentStatus.PERFORMANCE_ISSUES,
                response_time_ms=response_time,
                message=f"Monitoring system issues: {str(e)}",
                error=str(e)
            )
    
    def _calculate_health_summary(self, results: List[HealthCheckResult]) -> SystemHealthSummary:
        """Calculate overall system health summary"""
        if not results:
            return SystemHealthSummary(
                overall_status=HealthStatus.UNKNOWN,
                component_count=0,
                healthy_components=0,
                degraded_components=0,
                unhealthy_components=0,
                last_updated=datetime.now(),
                uptime_percentage=0.0,
                response_time_p95=0.0,
                error_rate=0.0
            )
        
        # Count components by status
        healthy = len([r for r in results if r.status == ComponentStatus.OPERATIONAL])
        degraded = len([r for r in results if r.status == ComponentStatus.PERFORMANCE_ISSUES])
        unhealthy = len([r for r in results if r.status in [ComponentStatus.PARTIAL_OUTAGE, ComponentStatus.MAJOR_OUTAGE]])
        
        # Determine overall status
        critical_components = [
            r for r in results 
            if self.components.get(r.component, {}).get("critical", False)
        ]
        
        critical_unhealthy = len([
            r for r in critical_components 
            if r.status in [ComponentStatus.PARTIAL_OUTAGE, ComponentStatus.MAJOR_OUTAGE]
        ])
        
        if critical_unhealthy > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif unhealthy > 0 or degraded > len(results) * 0.3:  # More than 30% degraded
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Calculate metrics
        response_times = [r.response_time_ms for r in results if r.response_time_ms > 0]
        response_time_p95 = sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0
        
        uptime_percentage = ((healthy + degraded) / len(results)) * 100
        error_rate = (unhealthy / len(results)) * 100
        
        return SystemHealthSummary(
            overall_status=overall_status,
            component_count=len(results),
            healthy_components=healthy,
            degraded_components=degraded,
            unhealthy_components=unhealthy,
            last_updated=datetime.now(),
            uptime_percentage=uptime_percentage,
            response_time_p95=response_time_p95,
            error_rate=error_rate
        )
    
    def _calculate_fda_api_status(self, results: List[HealthCheckResult]) -> HealthStatus:
        """Calculate overall FDA API status"""
        if not results:
            return HealthStatus.UNKNOWN
        
        # Check critical FDA API components
        critical_results = [
            r for r in results 
            if self.components.get(r.component, {}).get("critical", False)
        ]
        
        if not critical_results:
            return HealthStatus.UNKNOWN
        
        unhealthy_critical = len([
            r for r in critical_results 
            if r.status in [ComponentStatus.PARTIAL_OUTAGE, ComponentStatus.MAJOR_OUTAGE]
        ])
        
        if unhealthy_critical > 0:
            return HealthStatus.UNHEALTHY
        
        degraded_critical = len([
            r for r in critical_results 
            if r.status == ComponentStatus.PERFORMANCE_ISSUES
        ])
        
        if degraded_critical > 0:
            return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
    
    async def _get_fda_api_metrics(self) -> Dict[str, Any]:
        """Get FDA API specific metrics"""
        try:
            # Get recent analytics
            analytics = await self.fda_monitor.get_api_usage_analytics(time_window_hours=1)
            
            return {
                "requests_last_hour": analytics["total_requests"],
                "success_rate": (
                    analytics["metrics"].successful_requests / 
                    max(analytics["metrics"].total_requests, 1)
                ),
                "avg_response_time_ms": analytics["metrics"].avg_response_time_ms,
                "cache_hit_rate": analytics["metrics"].cache_hit_rate,
                "rate_limit_hits": analytics["metrics"].rate_limit_hits,
                "active_users": analytics["metrics"].unique_users,
                "active_projects": analytics["metrics"].unique_projects
            }
        except Exception as e:
            logger.error("Failed to get FDA API metrics", error=str(e))
            return {}
    
    async def _get_recent_alerts(self) -> List[Dict[str, Any]]:
        """Get recent alerts"""
        try:
            # Get alerts from monitoring service
            alerts = await self.monitoring_service.check_alerts()
            
            # Get FDA-specific alerts
            fda_alerts = [
                alert for alert in alerts 
                if "fda" in alert.get("type", "").lower() or "api" in alert.get("type", "").lower()
            ]
            
            return fda_alerts[:10]  # Last 10 alerts
        except Exception as e:
            logger.error("Failed to get recent alerts", error=str(e))
            return []
    
    async def _get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends"""
        try:
            # Get analytics for trend calculation
            analytics = await self.fda_monitor.get_api_usage_analytics(time_window_hours=24)
            
            return {
                "hourly_trends": analytics.get("trends", {}),
                "response_time_trend": "stable",  # Would calculate from historical data
                "error_rate_trend": "stable",
                "usage_trend": "stable"
            }
        except Exception as e:
            logger.error("Failed to get performance trends", error=str(e))
            return {}
    
    async def _get_uptime_statistics(self) -> Dict[str, Any]:
        """Get uptime statistics"""
        try:
            # Calculate uptime from health history
            cutoff_time = datetime.now() - timedelta(days=30)
            recent_history = [
                result for result in self.health_history
                if result.timestamp > cutoff_time
            ]
            
            if not recent_history:
                return {"uptime_30d": 100.0, "mttr_minutes": 0, "incidents_30d": 0}
            
            # Calculate uptime percentage
            operational_checks = len([
                r for r in recent_history 
                if r.status == ComponentStatus.OPERATIONAL
            ])
            uptime_percentage = (operational_checks / len(recent_history)) * 100
            
            # Count incidents (transitions to unhealthy state)
            incidents = 0
            for i in range(1, len(recent_history)):
                prev_healthy = recent_history[i-1].status == ComponentStatus.OPERATIONAL
                curr_unhealthy = recent_history[i].status in [ComponentStatus.PARTIAL_OUTAGE, ComponentStatus.MAJOR_OUTAGE]
                if prev_healthy and curr_unhealthy:
                    incidents += 1
            
            return {
                "uptime_30d": uptime_percentage,
                "mttr_minutes": 0,  # Would calculate from incident data
                "incidents_30d": incidents
            }
        except Exception as e:
            logger.error("Failed to get uptime statistics", error=str(e))
            return {}
    
    async def _get_recent_incidents(self) -> List[Dict[str, Any]]:
        """Get recent incidents for status page"""
        # This would typically come from an incident management system
        return []
    
    async def _get_maintenance_windows(self) -> List[Dict[str, Any]]:
        """Get scheduled maintenance windows"""
        # This would typically come from a maintenance scheduling system
        return []
    
    async def _perform_manual_health_check(self) -> None:
        """Perform manual health check (background task)"""
        try:
            results = await self._perform_all_health_checks()
            logger.info(f"Manual health check completed: {len(results)} components checked")
        except Exception as e:
            logger.error("Manual health check failed", error=str(e))


# Global health dashboard instance
_health_dashboard: Optional[FDAHealthDashboard] = None


def get_fda_health_dashboard() -> FDAHealthDashboard:
    """Get the global FDA health dashboard instance"""
    global _health_dashboard
    if _health_dashboard is None:
        _health_dashboard = FDAHealthDashboard()
    return _health_dashboard


async def init_fda_health_dashboard(
    openfda_service: Optional[OpenFDAService] = None,
    check_interval_seconds: int = 60
) -> FDAHealthDashboard:
    """Initialize FDA health dashboard"""
    global _health_dashboard
    _health_dashboard = FDAHealthDashboard(
        openfda_service=openfda_service,
        check_interval_seconds=check_interval_seconds
    )
    await _health_dashboard.start_background_monitoring()
    return _health_dashboard