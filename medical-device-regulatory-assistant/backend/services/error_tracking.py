"""
Error tracking and alerting service with Sentry integration
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import structlog

from services.audit_logger import AuditLogger

logger = structlog.get_logger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for classification"""
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    NETWORK = "network"
    PERFORMANCE = "performance"


@dataclass
class ErrorEvent:
    """Error event data structure"""
    error_id: str
    error_type: str
    error_message: str
    category: ErrorCategory
    severity: AlertSeverity
    component: str
    user_id: Optional[str] = None
    project_id: Optional[int] = None
    request_id: Optional[str] = None
    stack_trace: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    resolution_notes: Optional[str] = None


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    condition: str  # e.g., "error_count > 10"
    time_window: int  # minutes
    severity: AlertSeverity
    enabled: bool = True
    notification_channels: List[str] = field(default_factory=list)


class ErrorTrackingService:
    """
    Comprehensive error tracking and alerting service
    """
    
    def __init__(self):
        self.audit_logger = AuditLogger()
        self.error_events: List[ErrorEvent] = []
        self.alert_rules: List[AlertRule] = []
        self.error_counts: Dict[str, int] = {}
        self.last_alert_times: Dict[str, datetime] = {}
        
        # Configuration
        self.max_events = 10000
        self.cleanup_interval = 3600  # 1 hour
        self.alert_cooldown = 300  # 5 minutes
        
        # Initialize Sentry if configured
        self._init_sentry()
        
        # Set up default alert rules
        self._setup_default_alert_rules()
        
        # Background tasks
        self._cleanup_task: Optional[asyncio.Task] = None
        self._monitoring_active = False
        
        logger.info("Error tracking service initialized")
    
    def _init_sentry(self):
        """Initialize Sentry error tracking"""
        sentry_dsn = os.getenv("SENTRY_DSN")
        if not sentry_dsn:
            logger.info("Sentry DSN not configured, skipping Sentry initialization")
            return
        
        environment = os.getenv("ENVIRONMENT", "development")
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(auto_enabling_integrations=False),
                SqlalchemyIntegration(),
                RedisIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR
                ),
            ],
            traces_sample_rate=0.1,  # 10% of transactions
            profiles_sample_rate=0.1,  # 10% of transactions
            attach_stacktrace=True,
            send_default_pii=False,  # Don't send PII for regulatory compliance
            before_send=self._sentry_before_send,
        )
        
        logger.info("Sentry error tracking initialized", environment=environment)
    
    def _sentry_before_send(self, event, hint):
        """Filter and modify events before sending to Sentry"""
        # Remove sensitive data for regulatory compliance
        if 'user' in event:
            # Keep user ID but remove other PII
            user_data = event['user']
            filtered_user = {
                'id': user_data.get('id'),
                'ip_address': '{{auto}}'  # Let Sentry handle IP anonymization
            }
            event['user'] = filtered_user
        
        # Remove sensitive context data
        if 'contexts' in event:
            contexts = event['contexts']
            for context_name, context_data in contexts.items():
                if isinstance(context_data, dict):
                    # Remove potential PII fields
                    sensitive_fields = ['email', 'phone', 'ssn', 'password', 'token']
                    for field in sensitive_fields:
                        if field in context_data:
                            context_data[field] = '[Filtered]'
        
        return event
    
    def _setup_default_alert_rules(self):
        """Set up default alert rules"""
        self.alert_rules = [
            AlertRule(
                name="high_error_rate",
                condition="error_count > 50",
                time_window=5,
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "slack"]
            ),
            AlertRule(
                name="critical_errors",
                condition="critical_error_count > 1",
                time_window=1,
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email", "slack", "pagerduty"]
            ),
            AlertRule(
                name="database_errors",
                condition="database_error_count > 10",
                time_window=5,
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "slack"]
            ),
            AlertRule(
                name="fda_api_errors",
                condition="fda_api_error_count > 20",
                time_window=10,
                severity=AlertSeverity.MEDIUM,
                notification_channels=["email"]
            ),
            AlertRule(
                name="authentication_failures",
                condition="auth_error_count > 25",
                time_window=5,
                severity=AlertSeverity.HIGH,
                notification_channels=["email", "slack"]
            )
        ]
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_active:
            return
        
        self._monitoring_active = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Error tracking monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        self._monitoring_active = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("Error tracking monitoring stopped")
    
    async def _cleanup_loop(self):
        """Background task to clean up old error events"""
        while self._monitoring_active:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_old_events()
                await self._check_alert_rules()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in cleanup loop", error=str(e))
    
    async def _cleanup_old_events(self):
        """Remove old error events to prevent memory issues"""
        if len(self.error_events) > self.max_events:
            # Keep only the most recent events
            self.error_events = self.error_events[-self.max_events:]
            logger.info("Cleaned up old error events", remaining_count=len(self.error_events))
        
        # Clean up old error counts (older than 1 hour)
        cutoff_time = datetime.now() - timedelta(hours=1)
        old_keys = [
            key for key, timestamp in self.last_alert_times.items()
            if timestamp < cutoff_time
        ]
        for key in old_keys:
            del self.last_alert_times[key]
    
    async def track_error(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: AlertSeverity,
        component: str,
        user_id: Optional[str] = None,
        project_id: Optional[int] = None,
        request_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Track an error event
        
        Args:
            error: The exception that occurred
            category: Error category
            severity: Error severity
            component: Component where error occurred
            user_id: Optional user ID
            project_id: Optional project ID
            request_id: Optional request ID
            context: Additional context data
        
        Returns:
            Error event ID
        """
        import uuid
        import traceback
        
        error_id = str(uuid.uuid4())
        error_type = type(error).__name__
        error_message = str(error)
        stack_trace = traceback.format_exc()
        
        # Create error event
        error_event = ErrorEvent(
            error_id=error_id,
            error_type=error_type,
            error_message=error_message,
            category=category,
            severity=severity,
            component=component,
            user_id=user_id,
            project_id=project_id,
            request_id=request_id,
            stack_trace=stack_trace,
            context=context or {}
        )
        
        self.error_events.append(error_event)
        
        # Update error counts
        count_key = f"{category.value}:{component}"
        self.error_counts[count_key] = self.error_counts.get(count_key, 0) + 1
        
        # Log to audit trail if project-related
        if project_id and user_id:
            await self.audit_logger.log_error(
                project_id=project_id,
                user_id=int(user_id),
                error_type=error_type,
                error_message=error_message,
                error_details={
                    "category": category.value,
                    "severity": severity.value,
                    "component": component,
                    "error_id": error_id,
                    "context": context or {}
                },
                context={"request_id": request_id} if request_id else None
            )
        
        # Send to Sentry if configured
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("error_category", category.value)
            scope.set_tag("component", component)
            scope.set_tag("severity", severity.value)
            
            if user_id:
                scope.set_user({"id": user_id})
            if project_id:
                scope.set_context("project", {"id": project_id})
            if request_id:
                scope.set_context("request", {"id": request_id})
            if context:
                scope.set_context("additional", context)
            
            sentry_sdk.capture_exception(error)
        
        # Log structured error
        logger.error(
            "Error tracked",
            error_id=error_id,
            error_type=error_type,
            category=category.value,
            severity=severity.value,
            component=component,
            user_id=user_id,
            project_id=project_id,
            request_id=request_id,
            context=context
        )
        
        # Check for immediate alerts
        await self._check_immediate_alerts(error_event)
        
        return error_id
    
    async def _check_immediate_alerts(self, error_event: ErrorEvent):
        """Check if error should trigger immediate alerts"""
        # Critical errors always trigger immediate alerts
        if error_event.severity == AlertSeverity.CRITICAL:
            await self._send_alert(
                f"Critical error in {error_event.component}",
                f"Error: {error_event.error_message}",
                AlertSeverity.CRITICAL,
                {"error_event": error_event}
            )
        
        # Check for repeated errors
        error_key = f"{error_event.error_type}:{error_event.component}"
        recent_errors = [
            e for e in self.error_events
            if (e.error_type == error_event.error_type and 
                e.component == error_event.component and
                e.timestamp > datetime.now() - timedelta(minutes=5))
        ]
        
        if len(recent_errors) >= 5:  # 5 similar errors in 5 minutes
            await self._send_alert(
                f"Repeated errors in {error_event.component}",
                f"Error type: {error_event.error_type} ({len(recent_errors)} occurrences)",
                AlertSeverity.HIGH,
                {"error_count": len(recent_errors), "error_type": error_event.error_type}
            )
    
    async def _check_alert_rules(self):
        """Check all alert rules and send notifications"""
        current_time = datetime.now()
        
        for rule in self.alert_rules:
            if not rule.enabled:
                continue
            
            # Check cooldown
            last_alert = self.last_alert_times.get(rule.name)
            if last_alert and (current_time - last_alert).seconds < self.alert_cooldown:
                continue
            
            # Evaluate rule condition
            if await self._evaluate_alert_rule(rule, current_time):
                await self._send_alert_for_rule(rule)
                self.last_alert_times[rule.name] = current_time
    
    async def _evaluate_alert_rule(self, rule: AlertRule, current_time: datetime) -> bool:
        """Evaluate if an alert rule condition is met"""
        time_window_start = current_time - timedelta(minutes=rule.time_window)
        
        # Get errors in time window
        recent_errors = [
            e for e in self.error_events
            if e.timestamp >= time_window_start
        ]
        
        # Simple condition evaluation (can be extended)
        if "error_count >" in rule.condition:
            threshold = int(rule.condition.split(">")[1].strip())
            return len(recent_errors) > threshold
        
        elif "critical_error_count >" in rule.condition:
            threshold = int(rule.condition.split(">")[1].strip())
            critical_errors = [e for e in recent_errors if e.severity == AlertSeverity.CRITICAL]
            return len(critical_errors) > threshold
        
        elif "database_error_count >" in rule.condition:
            threshold = int(rule.condition.split(">")[1].strip())
            db_errors = [e for e in recent_errors if e.category == ErrorCategory.DATABASE]
            return len(db_errors) > threshold
        
        elif "fda_api_error_count >" in rule.condition:
            threshold = int(rule.condition.split(">")[1].strip())
            api_errors = [e for e in recent_errors if e.category == ErrorCategory.EXTERNAL_API and "fda" in e.component.lower()]
            return len(api_errors) > threshold
        
        elif "auth_error_count >" in rule.condition:
            threshold = int(rule.condition.split(">")[1].strip())
            auth_errors = [e for e in recent_errors if e.category == ErrorCategory.AUTHENTICATION]
            return len(auth_errors) > threshold
        
        return False
    
    async def _send_alert_for_rule(self, rule: AlertRule):
        """Send alert for a triggered rule"""
        time_window_start = datetime.now() - timedelta(minutes=rule.time_window)
        recent_errors = [
            e for e in self.error_events
            if e.timestamp >= time_window_start
        ]
        
        message = f"Alert rule '{rule.name}' triggered"
        details = f"Condition: {rule.condition}, Time window: {rule.time_window} minutes, Recent errors: {len(recent_errors)}"
        
        await self._send_alert(message, details, rule.severity, {
            "rule_name": rule.name,
            "condition": rule.condition,
            "time_window": rule.time_window,
            "recent_error_count": len(recent_errors)
        })
    
    async def _send_alert(
        self,
        title: str,
        message: str,
        severity: AlertSeverity,
        metadata: Dict[str, Any]
    ):
        """Send alert notification"""
        alert_data = {
            "title": title,
            "message": message,
            "severity": severity.value,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata
        }
        
        # Log alert
        logger.warning(
            "Alert triggered",
            title=title,
            message=message,
            severity=severity.value,
            metadata=metadata
        )
        
        # Send to Sentry
        with sentry_sdk.configure_scope() as scope:
            scope.set_level("warning" if severity in [AlertSeverity.LOW, AlertSeverity.MEDIUM] else "error")
            scope.set_tag("alert_type", "system_alert")
            scope.set_tag("severity", severity.value)
            scope.set_context("alert", alert_data)
            
            sentry_sdk.capture_message(f"System Alert: {title}")
        
        # TODO: Implement additional notification channels (email, Slack, PagerDuty)
        # This would require additional configuration and services
    
    async def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get error summary for the specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_errors = [e for e in self.error_events if e.timestamp >= cutoff_time]
        
        if not recent_errors:
            return {
                "total_errors": 0,
                "error_rate": 0.0,
                "categories": {},
                "severities": {},
                "components": {},
                "top_errors": []
            }
        
        # Calculate statistics
        total_errors = len(recent_errors)
        error_rate = total_errors / hours  # errors per hour
        
        # Group by category
        categories = {}
        for error in recent_errors:
            cat = error.category.value
            categories[cat] = categories.get(cat, 0) + 1
        
        # Group by severity
        severities = {}
        for error in recent_errors:
            sev = error.severity.value
            severities[sev] = severities.get(sev, 0) + 1
        
        # Group by component
        components = {}
        for error in recent_errors:
            comp = error.component
            components[comp] = components.get(comp, 0) + 1
        
        # Top error types
        error_types = {}
        for error in recent_errors:
            error_types[error.error_type] = error_types.get(error.error_type, 0) + 1
        
        top_errors = sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_errors": total_errors,
            "error_rate": round(error_rate, 2),
            "categories": categories,
            "severities": severities,
            "components": components,
            "top_errors": top_errors,
            "time_period_hours": hours,
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_error_details(self, error_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific error"""
        error_event = next((e for e in self.error_events if e.error_id == error_id), None)
        
        if not error_event:
            return None
        
        return {
            "error_id": error_event.error_id,
            "error_type": error_event.error_type,
            "error_message": error_event.error_message,
            "category": error_event.category.value,
            "severity": error_event.severity.value,
            "component": error_event.component,
            "user_id": error_event.user_id,
            "project_id": error_event.project_id,
            "request_id": error_event.request_id,
            "stack_trace": error_event.stack_trace,
            "context": error_event.context,
            "timestamp": error_event.timestamp.isoformat(),
            "resolved": error_event.resolved,
            "resolution_notes": error_event.resolution_notes
        }
    
    async def resolve_error(self, error_id: str, resolution_notes: str) -> bool:
        """Mark an error as resolved"""
        error_event = next((e for e in self.error_events if e.error_id == error_id), None)
        
        if not error_event:
            return False
        
        error_event.resolved = True
        error_event.resolution_notes = resolution_notes
        
        logger.info(
            "Error resolved",
            error_id=error_id,
            resolution_notes=resolution_notes
        )
        
        return True
    
    def add_alert_rule(self, rule: AlertRule):
        """Add a new alert rule"""
        self.alert_rules.append(rule)
        logger.info("Alert rule added", rule_name=rule.name)
    
    def remove_alert_rule(self, rule_name: str) -> bool:
        """Remove an alert rule"""
        initial_count = len(self.alert_rules)
        self.alert_rules = [r for r in self.alert_rules if r.name != rule_name]
        
        if len(self.alert_rules) < initial_count:
            logger.info("Alert rule removed", rule_name=rule_name)
            return True
        return False
    
    def get_alert_rules(self) -> List[Dict[str, Any]]:
        """Get all alert rules"""
        return [
            {
                "name": rule.name,
                "condition": rule.condition,
                "time_window": rule.time_window,
                "severity": rule.severity.value,
                "enabled": rule.enabled,
                "notification_channels": rule.notification_channels
            }
            for rule in self.alert_rules
        ]


def error_handler(
    category: ErrorCategory,
    severity: AlertSeverity = AlertSeverity.MEDIUM,
    component: str = "unknown"
):
    """Decorator to automatically track errors"""
    def decorator(func: Callable):
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                error_service = get_error_tracking_service()
                await error_service.track_error(
                    error=e,
                    category=category,
                    severity=severity,
                    component=component,
                    context={"function": func.__name__, "args": str(args)}
                )
                raise
        
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_service = get_error_tracking_service()
                # For sync functions, we'll need to handle this differently
                # or convert to async context
                logger.error(
                    "Error in sync function",
                    function=func.__name__,
                    error=str(e),
                    category=category.value,
                    severity=severity.value,
                    component=component
                )
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


# Global error tracking service instance
_error_tracking_service: Optional[ErrorTrackingService] = None


def get_error_tracking_service() -> ErrorTrackingService:
    """Get the global error tracking service instance"""
    global _error_tracking_service
    if _error_tracking_service is None:
        _error_tracking_service = ErrorTrackingService()
    return _error_tracking_service


async def init_error_tracking():
    """Initialize error tracking service"""
    error_service = get_error_tracking_service()
    await error_service.start_monitoring()
    return error_service


async def cleanup_error_tracking():
    """Cleanup error tracking service"""
    if _error_tracking_service:
        await _error_tracking_service.stop_monitoring()