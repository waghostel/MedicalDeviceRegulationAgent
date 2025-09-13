"""
FDA API Monitoring Service

This service provides comprehensive monitoring and alerting for FDA API integration:
- API usage analytics and tracking
- Health check dashboard
- Alerting system for failures and performance issues
- Usage reports and cost tracking
- Circuit breaker monitoring
- Structured logging and distributed tracing
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from contextlib import asynccontextmanager

import structlog
from prometheus_client import Counter, Histogram, Gauge, Summary, Info
import redis.asyncio as redis

try:
    from .monitoring import get_monitoring_service
except ImportError:
    # Fallback for testing
    def get_monitoring_service():
        return None

try:
    from .error_tracking import get_error_tracking_service, ErrorCategory, AlertSeverity
except ImportError:
    # Fallback for testing
    from enum import Enum
    
    class ErrorCategory(Enum):
        EXTERNAL_API = "external_api"
    
    class AlertSeverity(Enum):
        CRITICAL = "critical"
        HIGH = "high"
        MEDIUM = "medium"
        LOW = "low"
    
    def get_error_tracking_service():
        return None

logger = structlog.get_logger(__name__)


class FDAAPIEndpoint(Enum):
    """FDA API endpoints for monitoring"""
    DEVICE_510K = "device/510k"
    DEVICE_CLASSIFICATION = "device/classification"
    DEVICE_ADVERSE_EVENTS = "device/event"
    DEVICE_RECALL = "device/recall"
    DEVICE_ENFORCEMENT = "device/enforcement"


class AlertType(Enum):
    """Types of FDA API alerts"""
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    API_UNAVAILABLE = "api_unavailable"
    HIGH_ERROR_RATE = "high_error_rate"
    SLOW_RESPONSE = "slow_response"
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"
    QUOTA_EXHAUSTED = "quota_exhausted"
    AUTHENTICATION_FAILED = "authentication_failed"


@dataclass
class FDAAPICall:
    """FDA API call tracking data"""
    endpoint: FDAAPIEndpoint
    method: str
    query_params: Dict[str, Any]
    response_time_ms: float
    status_code: int
    success: bool
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    cache_hit: bool = False
    user_id: Optional[str] = None
    project_id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.now)
    request_id: Optional[str] = None
    response_size_bytes: int = 0
    rate_limit_remaining: Optional[int] = None


@dataclass
class FDAAPIMetrics:
    """Aggregated FDA API metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time_ms: float = 0.0
    cache_hit_rate: float = 0.0
    rate_limit_hits: int = 0
    circuit_breaker_trips: int = 0
    total_data_transferred_mb: float = 0.0
    unique_users: int = 0
    unique_projects: int = 0
    cost_estimate_usd: float = 0.0


@dataclass
class AlertRule:
    """FDA API alert rule configuration"""
    name: str
    alert_type: AlertType
    threshold: float
    time_window_minutes: int
    severity: AlertSeverity
    enabled: bool = True
    notification_channels: List[str] = field(default_factory=list)
    cooldown_minutes: int = 15
    last_triggered: Optional[datetime] = None


class FDAAPIMonitor:
    """
    Comprehensive FDA API monitoring service
    """
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        enable_detailed_logging: bool = True,
        enable_cost_tracking: bool = True
    ):
        self.redis_client = redis_client
        self.enable_detailed_logging = enable_detailed_logging
        self.enable_cost_tracking = enable_cost_tracking
        
        # Create separate registry for FDA metrics to avoid conflicts
        from prometheus_client import CollectorRegistry
        self.registry = CollectorRegistry()
        
        # Get monitoring services
        self.monitoring_service = get_monitoring_service()
        self.error_service = get_error_tracking_service()
        
        # Initialize Prometheus metrics
        self._init_prometheus_metrics()
        
        # Alert rules
        self.alert_rules: List[AlertRule] = []
        self._init_default_alert_rules()
        
        # Call tracking
        self.recent_calls: List[FDAAPICall] = []
        self.max_recent_calls = 1000
        
        # Circuit breaker state tracking
        self.circuit_breaker_states: Dict[str, Dict[str, Any]] = {}
        
        # Cost tracking (estimated based on API usage)
        self.cost_per_request = 0.001  # $0.001 per request (estimated)
        
        logger.info("FDA API Monitor initialized")
    
    def _init_prometheus_metrics(self):
        """Initialize Prometheus metrics for FDA API monitoring"""
        # Request metrics
        self.fda_requests_total = Counter(
            'fda_api_requests_total',
            'Total FDA API requests',
            ['endpoint', 'method', 'status_code', 'cache_hit'],
            registry=self.registry
        )
        
        self.fda_request_duration = Histogram(
            'fda_api_request_duration_seconds',
            'FDA API request duration',
            ['endpoint', 'method'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
            registry=self.registry
        )
        
        self.fda_response_size = Histogram(
            'fda_api_response_size_bytes',
            'FDA API response size',
            ['endpoint'],
            buckets=[1024, 10240, 102400, 1048576, 10485760],  # 1KB to 10MB
            registry=self.registry
        )
        
        # Error metrics
        self.fda_errors_total = Counter(
            'fda_api_errors_total',
            'Total FDA API errors',
            ['endpoint', 'error_type'],
            registry=self.registry
        )
        
        # Rate limiting metrics
        self.fda_rate_limit_remaining = Gauge(
            'fda_api_rate_limit_remaining',
            'FDA API rate limit remaining',
            registry=self.registry
        )
        
        self.fda_rate_limit_hits = Counter(
            'fda_api_rate_limit_hits_total',
            'FDA API rate limit hits',
            registry=self.registry
        )
        
        # Circuit breaker metrics
        self.fda_circuit_breaker_state = Gauge(
            'fda_api_circuit_breaker_state',
            'FDA API circuit breaker state (0=closed, 1=half-open, 2=open)',
            ['endpoint'],
            registry=self.registry
        )
        
        self.fda_circuit_breaker_trips = Counter(
            'fda_api_circuit_breaker_trips_total',
            'FDA API circuit breaker trips',
            ['endpoint'],
            registry=self.registry
        )
        
        # Usage metrics
        self.fda_active_users = Gauge(
            'fda_api_active_users',
            'Number of active FDA API users',
            registry=self.registry
        )
        
        self.fda_active_projects = Gauge(
            'fda_api_active_projects',
            'Number of projects using FDA API',
            registry=self.registry
        )
        
        # Cost metrics
        self.fda_estimated_cost = Counter(
            'fda_api_estimated_cost_usd',
            'Estimated FDA API cost in USD',
            registry=self.registry
        )
        
        # Cache metrics
        self.fda_cache_hits = Counter(
            'fda_api_cache_hits_total',
            'FDA API cache hits',
            ['endpoint'],
            registry=self.registry
        )
        
        self.fda_cache_misses = Counter(
            'fda_api_cache_misses_total',
            'FDA API cache misses',
            ['endpoint'],
            registry=self.registry
        )
        
        # Health metrics
        self.fda_api_health = Gauge(
            'fda_api_health_status',
            'FDA API health status (1=healthy, 0=unhealthy)',
            registry=self.registry
        )
        
        # Performance summary
        self.fda_performance_summary = Info(
            'fda_api_performance_summary',
            'FDA API performance summary',
            registry=self.registry
        )
    
    def _init_default_alert_rules(self):
        """Initialize default alert rules"""
        self.alert_rules = [
            AlertRule(
                name="High Error Rate",
                alert_type=AlertType.HIGH_ERROR_RATE,
                threshold=0.1,  # 10% error rate
                time_window_minutes=5,
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "slack"]
            ),
            AlertRule(
                name="Rate Limit Exceeded",
                alert_type=AlertType.RATE_LIMIT_EXCEEDED,
                threshold=1,  # Any rate limit hit
                time_window_minutes=1,
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "slack", "pagerduty"]
            ),
            AlertRule(
                name="Slow Response Time",
                alert_type=AlertType.SLOW_RESPONSE,
                threshold=10.0,  # 10 seconds
                time_window_minutes=5,
                severity=AlertSeverity.MEDIUM,
                notification_channels=["slack"]
            ),
            AlertRule(
                name="Circuit Breaker Open",
                alert_type=AlertType.CIRCUIT_BREAKER_OPEN,
                threshold=1,  # Any circuit breaker trip
                time_window_minutes=1,
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "slack", "pagerduty"]
            ),
            AlertRule(
                name="API Unavailable",
                alert_type=AlertType.API_UNAVAILABLE,
                threshold=1,  # Any 5xx error
                time_window_minutes=1,
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "slack", "pagerduty"]
            )
        ]
    
    async def track_api_call(
        self,
        endpoint: FDAAPIEndpoint,
        method: str,
        query_params: Dict[str, Any],
        response_time_ms: float,
        status_code: int,
        success: bool,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        cache_hit: bool = False,
        user_id: Optional[str] = None,
        project_id: Optional[int] = None,
        request_id: Optional[str] = None,
        response_size_bytes: int = 0,
        rate_limit_remaining: Optional[int] = None
    ) -> None:
        """
        Track FDA API call with comprehensive metrics
        """
        # Create API call record
        api_call = FDAAPICall(
            endpoint=endpoint,
            method=method,
            query_params=query_params,
            response_time_ms=response_time_ms,
            status_code=status_code,
            success=success,
            error_type=error_type,
            error_message=error_message,
            cache_hit=cache_hit,
            user_id=user_id,
            project_id=project_id,
            request_id=request_id,
            response_size_bytes=response_size_bytes,
            rate_limit_remaining=rate_limit_remaining
        )
        
        # Update Prometheus metrics
        self.fda_requests_total.labels(
            endpoint=endpoint.value,
            method=method,
            status_code=str(status_code),
            cache_hit=str(cache_hit)
        ).inc()
        
        self.fda_request_duration.labels(
            endpoint=endpoint.value,
            method=method
        ).observe(response_time_ms / 1000.0)
        
        if response_size_bytes > 0:
            self.fda_response_size.labels(
                endpoint=endpoint.value
            ).observe(response_size_bytes)
        
        # Track errors
        if not success and error_type:
            self.fda_errors_total.labels(
                endpoint=endpoint.value,
                error_type=error_type
            ).inc()
        
        # Track rate limiting
        if rate_limit_remaining is not None:
            self.fda_rate_limit_remaining.set(rate_limit_remaining)
            
            if rate_limit_remaining == 0:
                self.fda_rate_limit_hits.inc()
        
        # Track cache performance
        if cache_hit:
            self.fda_cache_hits.labels(endpoint=endpoint.value).inc()
        else:
            self.fda_cache_misses.labels(endpoint=endpoint.value).inc()
        
        # Track cost
        if self.enable_cost_tracking:
            cost = self.cost_per_request
            self.fda_estimated_cost.inc(cost)
        
        # Store recent call
        self.recent_calls.append(api_call)
        if len(self.recent_calls) > self.max_recent_calls:
            self.recent_calls.pop(0)
        
        # Detailed logging
        if self.enable_detailed_logging:
            logger.info(
                "FDA API call tracked",
                endpoint=endpoint.value,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                success=success,
                cache_hit=cache_hit,
                user_id=user_id,
                project_id=project_id,
                request_id=request_id,
                error_type=error_type
            )
        
        # Store in Redis for persistence
        if self.redis_client:
            await self._store_api_call_in_redis(api_call)
        
        # Check alert rules
        await self._check_alert_rules(api_call)
    
    async def track_circuit_breaker_state(
        self,
        endpoint: FDAAPIEndpoint,
        state: str,  # "CLOSED", "HALF_OPEN", "OPEN"
        failure_count: int = 0,
        last_failure_time: Optional[datetime] = None
    ) -> None:
        """
        Track circuit breaker state changes
        """
        state_mapping = {"CLOSED": 0, "HALF_OPEN": 1, "OPEN": 2}
        state_value = state_mapping.get(state, 0)
        
        self.fda_circuit_breaker_state.labels(
            endpoint=endpoint.value
        ).set(state_value)
        
        # Track state change
        self.circuit_breaker_states[endpoint.value] = {
            "state": state,
            "failure_count": failure_count,
            "last_failure_time": last_failure_time.isoformat() if last_failure_time else None,
            "updated_at": datetime.now().isoformat()
        }
        
        # Track circuit breaker trips
        if state == "OPEN":
            self.fda_circuit_breaker_trips.labels(
                endpoint=endpoint.value
            ).inc()
            
            # Log circuit breaker trip
            logger.warning(
                "FDA API circuit breaker opened",
                endpoint=endpoint.value,
                failure_count=failure_count,
                last_failure_time=last_failure_time
            )
        
        # Store in Redis
        if self.redis_client:
            await self.redis_client.hset(
                "fda_circuit_breaker_states",
                endpoint.value,
                json.dumps(self.circuit_breaker_states[endpoint.value])
            )
    
    async def get_api_usage_analytics(
        self,
        time_window_hours: int = 24,
        endpoint: Optional[FDAAPIEndpoint] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive API usage analytics
        """
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        
        # Filter recent calls
        filtered_calls = [
            call for call in self.recent_calls
            if call.timestamp > cutoff_time and (endpoint is None or call.endpoint == endpoint)
        ]
        
        if not filtered_calls:
            return {
                "time_window_hours": time_window_hours,
                "endpoint": endpoint.value if endpoint else "all",
                "total_requests": 0,
                "metrics": FDAAPIMetrics(),
                "trends": {},
                "top_users": [],
                "top_projects": [],
                "error_breakdown": {}
            }
        
        # Calculate metrics
        metrics = self._calculate_metrics(filtered_calls)
        
        # Calculate trends (hourly breakdown)
        trends = self._calculate_trends(filtered_calls, time_window_hours)
        
        # Get top users and projects
        top_users = self._get_top_users(filtered_calls)
        top_projects = self._get_top_projects(filtered_calls)
        
        # Error breakdown
        error_breakdown = self._get_error_breakdown(filtered_calls)
        
        return {
            "time_window_hours": time_window_hours,
            "endpoint": endpoint.value if endpoint else "all",
            "total_requests": len(filtered_calls),
            "metrics": metrics,
            "trends": trends,
            "top_users": top_users,
            "top_projects": top_projects,
            "error_breakdown": error_breakdown,
            "generated_at": datetime.now().isoformat()
        }
    
    async def get_health_dashboard(self) -> Dict[str, Any]:
        """
        Get comprehensive health dashboard data
        """
        # Current health status
        health_status = await self._check_api_health()
        
        # Recent metrics (last hour)
        recent_analytics = await self.get_api_usage_analytics(time_window_hours=1)
        
        # Circuit breaker states
        circuit_breaker_status = dict(self.circuit_breaker_states)
        
        # Active alerts
        active_alerts = await self._get_active_alerts()
        
        # Performance summary
        performance_summary = await self._get_performance_summary()
        
        return {
            "overall_status": health_status["status"],
            "health_details": health_status,
            "recent_metrics": recent_analytics,
            "circuit_breakers": circuit_breaker_status,
            "active_alerts": active_alerts,
            "performance_summary": performance_summary,
            "dashboard_updated_at": datetime.now().isoformat()
        }
    
    async def generate_usage_report(
        self,
        start_date: datetime,
        end_date: datetime,
        include_cost_analysis: bool = True,
        include_performance_analysis: bool = True,
        include_error_analysis: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive usage report
        """
        # Filter calls by date range
        filtered_calls = [
            call for call in self.recent_calls
            if start_date <= call.timestamp <= end_date
        ]
        
        report = {
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": (end_date - start_date).days
            },
            "summary": self._calculate_metrics(filtered_calls),
            "generated_at": datetime.now().isoformat()
        }
        
        # Cost analysis
        if include_cost_analysis and self.enable_cost_tracking:
            report["cost_analysis"] = self._generate_cost_analysis(filtered_calls)
        
        # Performance analysis
        if include_performance_analysis:
            report["performance_analysis"] = self._generate_performance_analysis(filtered_calls)
        
        # Error analysis
        if include_error_analysis:
            report["error_analysis"] = self._generate_error_analysis(filtered_calls)
        
        # Endpoint breakdown
        report["endpoint_breakdown"] = self._generate_endpoint_breakdown(filtered_calls)
        
        # User activity
        report["user_activity"] = self._generate_user_activity_analysis(filtered_calls)
        
        # Recommendations
        report["recommendations"] = self._generate_recommendations(filtered_calls)
        
        return report
    
    async def add_alert_rule(self, alert_rule: AlertRule) -> None:
        """Add new alert rule"""
        self.alert_rules.append(alert_rule)
        
        logger.info(
            "Alert rule added",
            rule_name=alert_rule.name,
            alert_type=alert_rule.alert_type.value,
            threshold=alert_rule.threshold,
            severity=alert_rule.severity.value
        )
    
    async def remove_alert_rule(self, rule_name: str) -> bool:
        """Remove alert rule by name"""
        for i, rule in enumerate(self.alert_rules):
            if rule.name == rule_name:
                del self.alert_rules[i]
                logger.info("Alert rule removed", rule_name=rule_name)
                return True
        return False
    
    async def get_alert_rules(self) -> List[Dict[str, Any]]:
        """Get all alert rules"""
        return [
            {
                "name": rule.name,
                "alert_type": rule.alert_type.value,
                "threshold": rule.threshold,
                "time_window_minutes": rule.time_window_minutes,
                "severity": rule.severity.value,
                "enabled": rule.enabled,
                "notification_channels": rule.notification_channels,
                "cooldown_minutes": rule.cooldown_minutes,
                "last_triggered": rule.last_triggered.isoformat() if rule.last_triggered else None
            }
            for rule in self.alert_rules
        ]
    
    @asynccontextmanager
    async def monitor_api_call(
        self,
        endpoint: FDAAPIEndpoint,
        method: str = "GET",
        user_id: Optional[str] = None,
        project_id: Optional[int] = None,
        request_id: Optional[str] = None
    ):
        """
        Context manager to monitor FDA API calls
        """
        start_time = time.time()
        success = True
        error_type = None
        error_message = None
        status_code = 200
        response_size_bytes = 0
        
        try:
            yield
        except Exception as e:
            success = False
            error_type = type(e).__name__
            error_message = str(e)
            
            # Determine status code from exception
            if "rate limit" in str(e).lower():
                status_code = 429
            elif "auth" in str(e).lower():
                status_code = 401
            elif "forbidden" in str(e).lower():
                status_code = 403
            elif "not found" in str(e).lower():
                status_code = 404
            else:
                status_code = 500
            
            raise
        finally:
            response_time_ms = (time.time() - start_time) * 1000
            
            await self.track_api_call(
                endpoint=endpoint,
                method=method,
                query_params={},  # Will be filled by caller if needed
                response_time_ms=response_time_ms,
                status_code=status_code,
                success=success,
                error_type=error_type,
                error_message=error_message,
                user_id=user_id,
                project_id=project_id,
                request_id=request_id,
                response_size_bytes=response_size_bytes
            )
    
    # Private helper methods
    
    async def _store_api_call_in_redis(self, api_call: FDAAPICall) -> None:
        """Store API call data in Redis for persistence"""
        try:
            key = f"fda_api_calls:{api_call.timestamp.strftime('%Y-%m-%d')}"
            value = json.dumps({
                "endpoint": api_call.endpoint.value,
                "method": api_call.method,
                "response_time_ms": api_call.response_time_ms,
                "status_code": api_call.status_code,
                "success": api_call.success,
                "error_type": api_call.error_type,
                "cache_hit": api_call.cache_hit,
                "user_id": api_call.user_id,
                "project_id": api_call.project_id,
                "timestamp": api_call.timestamp.isoformat(),
                "response_size_bytes": api_call.response_size_bytes
            })
            
            await self.redis_client.lpush(key, value)
            await self.redis_client.expire(key, 86400 * 7)  # Keep for 7 days
            
        except Exception as e:
            logger.error("Failed to store API call in Redis", error=str(e))
    
    async def _check_alert_rules(self, api_call: FDAAPICall) -> None:
        """Check if any alert rules are triggered"""
        current_time = datetime.now()
        
        for rule in self.alert_rules:
            if not rule.enabled:
                continue
            
            # Check cooldown
            if (rule.last_triggered and 
                (current_time - rule.last_triggered).total_seconds() < rule.cooldown_minutes * 60):
                continue
            
            # Check rule conditions
            should_trigger = False
            
            if rule.alert_type == AlertType.HIGH_ERROR_RATE:
                should_trigger = await self._check_error_rate_rule(rule)
            elif rule.alert_type == AlertType.RATE_LIMIT_EXCEEDED:
                should_trigger = api_call.status_code == 429
            elif rule.alert_type == AlertType.SLOW_RESPONSE:
                should_trigger = api_call.response_time_ms > rule.threshold * 1000
            elif rule.alert_type == AlertType.API_UNAVAILABLE:
                should_trigger = api_call.status_code >= 500
            elif rule.alert_type == AlertType.AUTHENTICATION_FAILED:
                should_trigger = api_call.status_code in [401, 403]
            
            if should_trigger:
                await self._trigger_alert(rule, api_call)
    
    async def _check_error_rate_rule(self, rule: AlertRule) -> bool:
        """Check error rate alert rule"""
        cutoff_time = datetime.now() - timedelta(minutes=rule.time_window_minutes)
        recent_calls = [call for call in self.recent_calls if call.timestamp > cutoff_time]
        
        if len(recent_calls) < 10:  # Need minimum calls to calculate rate
            return False
        
        error_count = len([call for call in recent_calls if not call.success])
        error_rate = error_count / len(recent_calls)
        
        return error_rate > rule.threshold
    
    async def _trigger_alert(self, rule: AlertRule, api_call: FDAAPICall) -> None:
        """Trigger an alert"""
        rule.last_triggered = datetime.now()
        
        alert_data = {
            "rule_name": rule.name,
            "alert_type": rule.alert_type.value,
            "severity": rule.severity.value,
            "threshold": rule.threshold,
            "triggered_by": {
                "endpoint": api_call.endpoint.value,
                "status_code": api_call.status_code,
                "response_time_ms": api_call.response_time_ms,
                "error_type": api_call.error_type,
                "timestamp": api_call.timestamp.isoformat()
            },
            "notification_channels": rule.notification_channels
        }
        
        # Log alert
        logger.warning(
            "FDA API alert triggered",
            **alert_data
        )
        
        # Send to error tracking service
        await self.error_service.track_error(
            error=Exception(f"FDA API Alert: {rule.name}"),
            category=ErrorCategory.EXTERNAL_API,
            severity=rule.severity,
            component="fda_api_monitor",
            context=alert_data
        )
    
    def _calculate_metrics(self, calls: List[FDAAPICall]) -> FDAAPIMetrics:
        """Calculate aggregated metrics from API calls"""
        if not calls:
            return FDAAPIMetrics()
        
        total_requests = len(calls)
        successful_requests = len([call for call in calls if call.success])
        failed_requests = total_requests - successful_requests
        
        response_times = [call.response_time_ms for call in calls]
        avg_response_time_ms = sum(response_times) / len(response_times)
        
        cache_hits = len([call for call in calls if call.cache_hit])
        cache_hit_rate = cache_hits / total_requests if total_requests > 0 else 0.0
        
        rate_limit_hits = len([call for call in calls if call.status_code == 429])
        
        total_data_mb = sum(call.response_size_bytes for call in calls) / (1024 * 1024)
        
        unique_users = len(set(call.user_id for call in calls if call.user_id))
        unique_projects = len(set(call.project_id for call in calls if call.project_id))
        
        cost_estimate = total_requests * self.cost_per_request if self.enable_cost_tracking else 0.0
        
        return FDAAPIMetrics(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time_ms=avg_response_time_ms,
            cache_hit_rate=cache_hit_rate,
            rate_limit_hits=rate_limit_hits,
            circuit_breaker_trips=0,  # Would need separate tracking
            total_data_transferred_mb=total_data_mb,
            unique_users=unique_users,
            unique_projects=unique_projects,
            cost_estimate_usd=cost_estimate
        )
    
    def _calculate_trends(self, calls: List[FDAAPICall], hours: int) -> Dict[str, Any]:
        """Calculate hourly trends"""
        trends = {"hourly_requests": [], "hourly_errors": [], "hourly_response_times": []}
        
        for hour in range(hours):
            hour_start = datetime.now() - timedelta(hours=hour+1)
            hour_end = datetime.now() - timedelta(hours=hour)
            
            hour_calls = [
                call for call in calls
                if hour_start <= call.timestamp < hour_end
            ]
            
            trends["hourly_requests"].append({
                "hour": hour_start.strftime("%Y-%m-%d %H:00"),
                "count": len(hour_calls)
            })
            
            trends["hourly_errors"].append({
                "hour": hour_start.strftime("%Y-%m-%d %H:00"),
                "count": len([call for call in hour_calls if not call.success])
            })
            
            if hour_calls:
                avg_response_time = sum(call.response_time_ms for call in hour_calls) / len(hour_calls)
            else:
                avg_response_time = 0.0
            
            trends["hourly_response_times"].append({
                "hour": hour_start.strftime("%Y-%m-%d %H:00"),
                "avg_ms": avg_response_time
            })
        
        return trends
    
    def _get_top_users(self, calls: List[FDAAPICall], limit: int = 10) -> List[Dict[str, Any]]:
        """Get top users by API usage"""
        user_counts = {}
        for call in calls:
            if call.user_id:
                user_counts[call.user_id] = user_counts.get(call.user_id, 0) + 1
        
        return [
            {"user_id": user_id, "request_count": count}
            for user_id, count in sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        ]
    
    def _get_top_projects(self, calls: List[FDAAPICall], limit: int = 10) -> List[Dict[str, Any]]:
        """Get top projects by API usage"""
        project_counts = {}
        for call in calls:
            if call.project_id:
                project_counts[call.project_id] = project_counts.get(call.project_id, 0) + 1
        
        return [
            {"project_id": project_id, "request_count": count}
            for project_id, count in sorted(project_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        ]
    
    def _get_error_breakdown(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Get error breakdown by type and endpoint"""
        error_types = {}
        endpoint_errors = {}
        
        for call in calls:
            if not call.success and call.error_type:
                error_types[call.error_type] = error_types.get(call.error_type, 0) + 1
                
                endpoint_key = call.endpoint.value
                if endpoint_key not in endpoint_errors:
                    endpoint_errors[endpoint_key] = {}
                endpoint_errors[endpoint_key][call.error_type] = (
                    endpoint_errors[endpoint_key].get(call.error_type, 0) + 1
                )
        
        return {
            "by_error_type": error_types,
            "by_endpoint": endpoint_errors
        }
    
    async def _check_api_health(self) -> Dict[str, Any]:
        """Check current API health status"""
        # Get recent calls (last 5 minutes)
        cutoff_time = datetime.now() - timedelta(minutes=5)
        recent_calls = [call for call in self.recent_calls if call.timestamp > cutoff_time]
        
        if not recent_calls:
            return {
                "status": "unknown",
                "message": "No recent API calls to assess health",
                "last_call": None
            }
        
        # Calculate health metrics
        total_calls = len(recent_calls)
        successful_calls = len([call for call in recent_calls if call.success])
        success_rate = successful_calls / total_calls
        
        avg_response_time = sum(call.response_time_ms for call in recent_calls) / total_calls
        
        # Determine health status
        if success_rate >= 0.95 and avg_response_time < 5000:  # 95% success, <5s response
            status = "healthy"
        elif success_rate >= 0.8 and avg_response_time < 10000:  # 80% success, <10s response
            status = "degraded"
        else:
            status = "unhealthy"
        
        # Update Prometheus metric
        health_value = 1 if status == "healthy" else 0
        self.fda_api_health.set(health_value)
        
        return {
            "status": status,
            "success_rate": success_rate,
            "avg_response_time_ms": avg_response_time,
            "total_calls_5min": total_calls,
            "last_call": recent_calls[-1].timestamp.isoformat() if recent_calls else None,
            "circuit_breaker_states": dict(self.circuit_breaker_states)
        }
    
    async def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active alerts"""
        active_alerts = []
        current_time = datetime.now()
        
        for rule in self.alert_rules:
            if (rule.last_triggered and 
                (current_time - rule.last_triggered).total_seconds() < rule.cooldown_minutes * 60):
                active_alerts.append({
                    "rule_name": rule.name,
                    "alert_type": rule.alert_type.value,
                    "severity": rule.severity.value,
                    "triggered_at": rule.last_triggered.isoformat(),
                    "cooldown_remaining_minutes": rule.cooldown_minutes - 
                        ((current_time - rule.last_triggered).total_seconds() / 60)
                })
        
        return active_alerts
    
    async def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for dashboard"""
        # Get recent metrics
        recent_analytics = await self.get_api_usage_analytics(time_window_hours=1)
        metrics = recent_analytics["metrics"]
        
        # Update Prometheus info metric
        self.fda_performance_summary.info({
            "total_requests": str(metrics.total_requests),
            "success_rate": f"{(metrics.successful_requests / max(metrics.total_requests, 1)):.2%}",
            "avg_response_time_ms": f"{metrics.avg_response_time_ms:.2f}",
            "cache_hit_rate": f"{metrics.cache_hit_rate:.2%}",
            "cost_estimate_usd": f"${metrics.cost_estimate_usd:.4f}"
        })
        
        return {
            "requests_per_hour": metrics.total_requests,
            "success_rate": metrics.successful_requests / max(metrics.total_requests, 1),
            "avg_response_time_ms": metrics.avg_response_time_ms,
            "cache_hit_rate": metrics.cache_hit_rate,
            "active_users": metrics.unique_users,
            "active_projects": metrics.unique_projects,
            "estimated_hourly_cost": metrics.cost_estimate_usd
        }
    
    def _generate_cost_analysis(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Generate cost analysis"""
        total_cost = len(calls) * self.cost_per_request
        
        # Cost by endpoint
        endpoint_costs = {}
        for call in calls:
            endpoint = call.endpoint.value
            endpoint_costs[endpoint] = endpoint_costs.get(endpoint, 0) + self.cost_per_request
        
        # Cost by user
        user_costs = {}
        for call in calls:
            if call.user_id:
                user_costs[call.user_id] = user_costs.get(call.user_id, 0) + self.cost_per_request
        
        return {
            "total_cost_usd": total_cost,
            "cost_per_request_usd": self.cost_per_request,
            "cost_by_endpoint": endpoint_costs,
            "cost_by_user": user_costs,
            "projected_monthly_cost_usd": total_cost * 30  # Simple projection
        }
    
    def _generate_performance_analysis(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Generate performance analysis"""
        if not calls:
            return {}
        
        response_times = [call.response_time_ms for call in calls]
        
        return {
            "avg_response_time_ms": sum(response_times) / len(response_times),
            "min_response_time_ms": min(response_times),
            "max_response_time_ms": max(response_times),
            "p95_response_time_ms": sorted(response_times)[int(len(response_times) * 0.95)],
            "p99_response_time_ms": sorted(response_times)[int(len(response_times) * 0.99)],
            "cache_hit_rate": len([call for call in calls if call.cache_hit]) / len(calls),
            "success_rate": len([call for call in calls if call.success]) / len(calls)
        }
    
    def _generate_error_analysis(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Generate error analysis"""
        error_calls = [call for call in calls if not call.success]
        
        if not error_calls:
            return {"total_errors": 0}
        
        error_types = {}
        error_endpoints = {}
        
        for call in error_calls:
            if call.error_type:
                error_types[call.error_type] = error_types.get(call.error_type, 0) + 1
            
            endpoint = call.endpoint.value
            error_endpoints[endpoint] = error_endpoints.get(endpoint, 0) + 1
        
        return {
            "total_errors": len(error_calls),
            "error_rate": len(error_calls) / len(calls),
            "error_types": error_types,
            "errors_by_endpoint": error_endpoints,
            "most_common_error": max(error_types.items(), key=lambda x: x[1])[0] if error_types else None
        }
    
    def _generate_endpoint_breakdown(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Generate endpoint usage breakdown"""
        endpoint_stats = {}
        
        for call in calls:
            endpoint = call.endpoint.value
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "avg_response_time_ms": 0,
                    "response_times": []
                }
            
            stats = endpoint_stats[endpoint]
            stats["total_requests"] += 1
            stats["response_times"].append(call.response_time_ms)
            
            if call.success:
                stats["successful_requests"] += 1
            else:
                stats["failed_requests"] += 1
        
        # Calculate averages
        for endpoint, stats in endpoint_stats.items():
            if stats["response_times"]:
                stats["avg_response_time_ms"] = sum(stats["response_times"]) / len(stats["response_times"])
            del stats["response_times"]  # Remove raw data
            
            stats["success_rate"] = stats["successful_requests"] / stats["total_requests"]
        
        return endpoint_stats
    
    def _generate_user_activity_analysis(self, calls: List[FDAAPICall]) -> Dict[str, Any]:
        """Generate user activity analysis"""
        user_activity = {}
        
        for call in calls:
            if call.user_id:
                if call.user_id not in user_activity:
                    user_activity[call.user_id] = {
                        "total_requests": 0,
                        "successful_requests": 0,
                        "endpoints_used": set(),
                        "projects_accessed": set(),
                        "first_request": call.timestamp,
                        "last_request": call.timestamp
                    }
                
                activity = user_activity[call.user_id]
                activity["total_requests"] += 1
                
                if call.success:
                    activity["successful_requests"] += 1
                
                activity["endpoints_used"].add(call.endpoint.value)
                
                if call.project_id:
                    activity["projects_accessed"].add(call.project_id)
                
                if call.timestamp < activity["first_request"]:
                    activity["first_request"] = call.timestamp
                if call.timestamp > activity["last_request"]:
                    activity["last_request"] = call.timestamp
        
        # Convert sets to lists for JSON serialization
        for user_id, activity in user_activity.items():
            activity["endpoints_used"] = list(activity["endpoints_used"])
            activity["projects_accessed"] = list(activity["projects_accessed"])
            activity["first_request"] = activity["first_request"].isoformat()
            activity["last_request"] = activity["last_request"].isoformat()
            activity["success_rate"] = activity["successful_requests"] / activity["total_requests"]
        
        return user_activity
    
    def _generate_recommendations(self, calls: List[FDAAPICall]) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        if not calls:
            return recommendations
        
        # Cache hit rate analysis
        cache_hits = len([call for call in calls if call.cache_hit])
        cache_hit_rate = cache_hits / len(calls)
        
        if cache_hit_rate < 0.5:
            recommendations.append(
                "Consider implementing more aggressive caching strategies. "
                f"Current cache hit rate is {cache_hit_rate:.1%}, which could be improved."
            )
        
        # Response time analysis
        response_times = [call.response_time_ms for call in calls]
        avg_response_time = sum(response_times) / len(response_times)
        
        if avg_response_time > 5000:
            recommendations.append(
                f"Average response time is {avg_response_time:.0f}ms. "
                "Consider optimizing queries or implementing request batching."
            )
        
        # Error rate analysis
        error_rate = len([call for call in calls if not call.success]) / len(calls)
        
        if error_rate > 0.05:
            recommendations.append(
                f"Error rate is {error_rate:.1%}. "
                "Review error patterns and implement better retry logic."
            )
        
        # Rate limiting analysis
        rate_limit_hits = len([call for call in calls if call.status_code == 429])
        
        if rate_limit_hits > 0:
            recommendations.append(
                f"Encountered {rate_limit_hits} rate limit hits. "
                "Consider implementing exponential backoff or request queuing."
            )
        
        return recommendations


# Global FDA API monitor instance
_fda_monitor: Optional[FDAAPIMonitor] = None


def get_fda_monitor() -> FDAAPIMonitor:
    """Get the global FDA API monitor instance"""
    global _fda_monitor
    if _fda_monitor is None:
        _fda_monitor = FDAAPIMonitor()
    return _fda_monitor


async def init_fda_monitoring(redis_client: Optional[redis.Redis] = None) -> FDAAPIMonitor:
    """Initialize FDA API monitoring"""
    global _fda_monitor
    _fda_monitor = FDAAPIMonitor(redis_client=redis_client)
    return _fda_monitor