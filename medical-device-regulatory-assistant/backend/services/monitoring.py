"""
Comprehensive monitoring service for application performance and metrics
"""

import time
import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
from functools import wraps

import structlog
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

from services.audit_logger import AuditLogger

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    operation: str
    duration_seconds: float
    success: bool
    error_type: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UsageMetrics:
    """Usage analytics data structure"""
    feature: str
    user_id: str
    action: str
    project_id: Optional[int] = None
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


class MonitoringService:
    """
    Comprehensive monitoring service for application performance,
    error tracking, and usage analytics
    """
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()
        self.audit_logger = AuditLogger()
        
        # Initialize OpenTelemetry
        self._init_opentelemetry()
        
        # Prometheus metrics
        self._init_prometheus_metrics()
        
        # Performance tracking
        self.performance_buffer: List[PerformanceMetrics] = []
        self.usage_buffer: List[UsageMetrics] = []
        self.buffer_size = 100
        self.flush_interval = 60  # seconds
        
        # Background tasks
        self._flush_task: Optional[asyncio.Task] = None
        self._monitoring_active = False
        
        # Error tracking
        self.error_counts: Dict[str, int] = {}
        self.error_threshold = 10  # errors per minute
        
        logger.info("Monitoring service initialized")
    
    def _init_opentelemetry(self):
        """Initialize OpenTelemetry tracing and metrics"""
        # Set up tracing
        trace.set_tracer_provider(TracerProvider())
        self.tracer = trace.get_tracer(__name__)
        
        # Set up metrics
        metrics.set_meter_provider(MeterProvider())
        self.meter = metrics.get_meter(__name__)
        
        # Auto-instrument FastAPI, SQLAlchemy, and Redis
        FastAPIInstrumentor().instrument()
        SQLAlchemyInstrumentor().instrument()
        RedisInstrumentor().instrument()
    
    def _init_prometheus_metrics(self):
        """Initialize Prometheus metrics"""
        # Request metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # Project operation metrics
        self.project_operations = Counter(
            'project_operations_total',
            'Total project operations',
            ['operation', 'status'],
            registry=self.registry
        )
        
        self.project_operation_duration = Histogram(
            'project_operation_duration_seconds',
            'Project operation duration',
            ['operation'],
            registry=self.registry
        )
        
        # Database metrics
        self.database_queries = Counter(
            'database_queries_total',
            'Total database queries',
            ['operation', 'table'],
            registry=self.registry
        )
        
        self.database_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration',
            ['operation', 'table'],
            registry=self.registry
        )
        
        # Error metrics
        self.error_count = Counter(
            'errors_total',
            'Total errors',
            ['error_type', 'component'],
            registry=self.registry
        )
        
        # Usage metrics
        self.feature_usage = Counter(
            'feature_usage_total',
            'Feature usage count',
            ['feature', 'action'],
            registry=self.registry
        )
        
        # System metrics
        self.active_users = Gauge(
            'active_users',
            'Number of active users',
            registry=self.registry
        )
        
        self.active_projects = Gauge(
            'active_projects',
            'Number of active projects',
            registry=self.registry
        )
        
        # FDA API metrics
        self.fda_api_requests = Counter(
            'fda_api_requests_total',
            'Total FDA API requests',
            ['endpoint', 'status'],
            registry=self.registry
        )
        
        self.fda_api_duration = Histogram(
            'fda_api_request_duration_seconds',
            'FDA API request duration',
            ['endpoint'],
            registry=self.registry
        )
        
        # Predicate search metrics
        self.predicate_searches = Counter(
            'predicate_searches_total',
            'Total predicate searches',
            ['status'],
            registry=self.registry
        )
        
        self.predicate_search_duration = Histogram(
            'predicate_search_duration_seconds',
            'Predicate search duration',
            registry=self.registry
        )
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_active:
            return
        
        self._monitoring_active = True
        self._flush_task = asyncio.create_task(self._flush_loop())
        logger.info("Background monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        self._monitoring_active = False
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        
        # Flush remaining data
        await self._flush_buffers()
        logger.info("Background monitoring stopped")
    
    async def _flush_loop(self):
        """Background task to flush metrics buffers"""
        while self._monitoring_active:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush_buffers()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in flush loop", error=str(e))
    
    async def _flush_buffers(self):
        """Flush performance and usage metrics buffers"""
        if self.performance_buffer:
            await self._process_performance_metrics(self.performance_buffer.copy())
            self.performance_buffer.clear()
        
        if self.usage_buffer:
            await self._process_usage_metrics(self.usage_buffer.copy())
            self.usage_buffer.clear()
    
    async def _process_performance_metrics(self, metrics: List[PerformanceMetrics]):
        """Process and store performance metrics"""
        for metric in metrics:
            # Log to audit trail if project-related
            if metric.project_id and metric.user_id:
                await self.audit_logger.log_agent_action(
                    project_id=metric.project_id,
                    user_id=int(metric.user_id),
                    action=f"performance_{metric.operation}",
                    input_data=metric.metadata,
                    output_data={
                        "duration_seconds": metric.duration_seconds,
                        "success": metric.success,
                        "error_type": metric.error_type
                    },
                    confidence_score=1.0 if metric.success else 0.0,
                    sources=[],
                    reasoning=f"Performance metric for {metric.operation}",
                    execution_time_ms=int(metric.duration_seconds * 1000)
                )
    
    async def _process_usage_metrics(self, metrics: List[UsageMetrics]):
        """Process and store usage analytics"""
        for metric in metrics:
            # Log to audit trail if project-related
            if metric.project_id:
                await self.audit_logger.log_user_interaction(
                    project_id=metric.project_id,
                    user_id=int(metric.user_id),
                    interaction_type=metric.feature,
                    user_input=metric.action,
                    agent_response="Feature usage tracked",
                    context=metric.metadata
                )
    
    @asynccontextmanager
    async def track_operation(
        self,
        operation: str,
        user_id: Optional[str] = None,
        project_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Context manager to track operation performance"""
        start_time = time.time()
        success = True
        error_type = None
        
        with self.tracer.start_as_current_span(operation) as span:
            try:
                span.set_attribute("operation", operation)
                if user_id:
                    span.set_attribute("user_id", user_id)
                if project_id:
                    span.set_attribute("project_id", project_id)
                
                yield
                
            except Exception as e:
                success = False
                error_type = type(e).__name__
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                
                # Track error
                self.error_count.labels(
                    error_type=error_type,
                    component=operation
                ).inc()
                
                raise
            
            finally:
                duration = time.time() - start_time
                
                # Record Prometheus metrics
                self.project_operations.labels(
                    operation=operation,
                    status="success" if success else "error"
                ).inc()
                
                self.project_operation_duration.labels(
                    operation=operation
                ).observe(duration)
                
                # Buffer performance metrics
                metric = PerformanceMetrics(
                    operation=operation,
                    duration_seconds=duration,
                    success=success,
                    error_type=error_type,
                    user_id=user_id,
                    project_id=project_id,
                    metadata=metadata or {}
                )
                
                self.performance_buffer.append(metric)
                
                # Flush if buffer is full
                if len(self.performance_buffer) >= self.buffer_size:
                    await self._flush_buffers()
    
    def track_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Track HTTP request metrics"""
        self.request_count.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def track_database_query(self, operation: str, table: str, duration: float):
        """Track database query metrics"""
        self.database_queries.labels(
            operation=operation,
            table=table
        ).inc()
        
        self.database_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
    
    def track_fda_api_request(self, endpoint: str, status: str, duration: float):
        """Track FDA API request metrics"""
        self.fda_api_requests.labels(
            endpoint=endpoint,
            status=status
        ).inc()
        
        self.fda_api_duration.labels(
            endpoint=endpoint
        ).observe(duration)
    
    def track_predicate_search(self, status: str, duration: float):
        """Track predicate search metrics"""
        self.predicate_searches.labels(status=status).inc()
        self.predicate_search_duration.observe(duration)
    
    def track_feature_usage(
        self,
        feature: str,
        action: str,
        user_id: str,
        project_id: Optional[int] = None,
        session_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Track feature usage for analytics"""
        self.feature_usage.labels(
            feature=feature,
            action=action
        ).inc()
        
        # Buffer usage metrics
        metric = UsageMetrics(
            feature=feature,
            user_id=user_id,
            action=action,
            project_id=project_id,
            session_id=session_id,
            user_agent=user_agent,
            ip_address=ip_address,
            metadata=metadata or {}
        )
        
        self.usage_buffer.append(metric)
    
    def track_error(self, error_type: str, component: str, error_details: Dict[str, Any]):
        """Track application errors"""
        self.error_count.labels(
            error_type=error_type,
            component=component
        ).inc()
        
        # Update error counts for alerting
        key = f"{error_type}:{component}"
        self.error_counts[key] = self.error_counts.get(key, 0) + 1
        
        # Log structured error
        logger.error(
            "Application error tracked",
            error_type=error_type,
            component=component,
            details=error_details
        )
    
    def update_active_users(self, count: int):
        """Update active users gauge"""
        self.active_users.set(count)
    
    def update_active_projects(self, count: int):
        """Update active projects gauge"""
        self.active_projects.set(count)
    
    def get_metrics(self) -> str:
        """Get Prometheus metrics in text format"""
        return generate_latest(self.registry).decode('utf-8')
    
    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        # Calculate recent performance metrics
        recent_metrics = [
            m for m in self.performance_buffer
            if m.timestamp > datetime.now() - timedelta(minutes=5)
        ]
        
        if not recent_metrics:
            return {
                "total_operations": 0,
                "success_rate": 0.0,
                "average_duration": 0.0,
                "error_types": {}
            }
        
        total_operations = len(recent_metrics)
        successful_operations = len([m for m in recent_metrics if m.success])
        success_rate = successful_operations / total_operations if total_operations > 0 else 0.0
        
        durations = [m.duration_seconds for m in recent_metrics]
        average_duration = sum(durations) / len(durations) if durations else 0.0
        
        error_types = {}
        for metric in recent_metrics:
            if not metric.success and metric.error_type:
                error_types[metric.error_type] = error_types.get(metric.error_type, 0) + 1
        
        return {
            "total_operations": total_operations,
            "success_rate": success_rate,
            "average_duration": average_duration,
            "error_types": error_types,
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_usage_analytics(self) -> Dict[str, Any]:
        """Get usage analytics summary"""
        recent_usage = [
            m for m in self.usage_buffer
            if m.timestamp > datetime.now() - timedelta(hours=1)
        ]
        
        if not recent_usage:
            return {
                "total_actions": 0,
                "unique_users": 0,
                "feature_usage": {},
                "top_features": []
            }
        
        total_actions = len(recent_usage)
        unique_users = len(set(m.user_id for m in recent_usage))
        
        feature_usage = {}
        for metric in recent_usage:
            key = f"{metric.feature}:{metric.action}"
            feature_usage[key] = feature_usage.get(key, 0) + 1
        
        top_features = sorted(
            feature_usage.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "total_actions": total_actions,
            "unique_users": unique_users,
            "feature_usage": feature_usage,
            "top_features": top_features,
            "timestamp": datetime.now().isoformat()
        }
    
    async def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for performance and error alerts"""
        alerts = []
        
        # Check error rates
        current_time = datetime.now()
        for error_key, count in self.error_counts.items():
            if count > self.error_threshold:
                alerts.append({
                    "type": "high_error_rate",
                    "severity": "high",
                    "message": f"High error rate detected: {error_key} ({count} errors)",
                    "timestamp": current_time.isoformat(),
                    "metadata": {"error_key": error_key, "count": count}
                })
        
        # Check recent performance issues
        recent_metrics = [
            m for m in self.performance_buffer
            if m.timestamp > current_time - timedelta(minutes=5)
        ]
        
        if recent_metrics:
            failed_operations = [m for m in recent_metrics if not m.success]
            failure_rate = len(failed_operations) / len(recent_metrics)
            
            if failure_rate > 0.2:  # More than 20% failure rate
                alerts.append({
                    "type": "high_failure_rate",
                    "severity": "high",
                    "message": f"High operation failure rate: {failure_rate:.1%}",
                    "timestamp": current_time.isoformat(),
                    "metadata": {"failure_rate": failure_rate, "total_operations": len(recent_metrics)}
                })
            
            # Check for slow operations
            slow_operations = [m for m in recent_metrics if m.duration_seconds > 5.0]
            if slow_operations:
                alerts.append({
                    "type": "slow_operations",
                    "severity": "medium",
                    "message": f"{len(slow_operations)} slow operations detected",
                    "timestamp": current_time.isoformat(),
                    "metadata": {"slow_count": len(slow_operations)}
                })
        
        return alerts


def performance_monitor(operation: str):
    """Decorator to monitor function performance"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            monitoring_service = get_monitoring_service()
            async with monitoring_service.track_operation(operation):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, we'll track manually
            start_time = time.time()
            success = True
            error_type = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_type = type(e).__name__
                monitoring_service = get_monitoring_service()
                monitoring_service.track_error(error_type, operation, {"args": str(args)})
                raise
            finally:
                duration = time.time() - start_time
                monitoring_service = get_monitoring_service()
                monitoring_service.project_operations.labels(
                    operation=operation,
                    status="success" if success else "error"
                ).inc()
                monitoring_service.project_operation_duration.labels(
                    operation=operation
                ).observe(duration)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


# Global monitoring service instance
_monitoring_service: Optional[MonitoringService] = None


def get_monitoring_service() -> MonitoringService:
    """Get the global monitoring service instance"""
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = MonitoringService()
    return _monitoring_service


async def init_monitoring():
    """Initialize monitoring service"""
    monitoring_service = get_monitoring_service()
    await monitoring_service.start_monitoring()
    return monitoring_service


async def cleanup_monitoring():
    """Cleanup monitoring service"""
    if _monitoring_service:
        await _monitoring_service.stop_monitoring()