"""
Performance Monitoring Service

This service monitors application performance, tracks metrics,
and provides alerting for performance issues.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import statistics

import redis.asyncio as redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    timestamp: datetime
    metric_name: str
    value: float
    tags: Dict[str, str]
    unit: str = "ms"


@dataclass
class PerformanceAlert:
    """Performance alert"""
    alert_id: str
    metric_name: str
    threshold: float
    current_value: float
    severity: str  # "warning", "critical"
    message: str
    timestamp: datetime
    resolved: bool = False


class MetricsCollector:
    """
    Collects and stores performance metrics
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.metrics_buffer = deque(maxlen=1000)  # In-memory buffer
        self.metric_aggregates = defaultdict(list)
        
        # Performance targets from design document
        self.performance_targets = {
            "device_classification": 2000,  # 2 seconds in ms
            "predicate_search": 10000,      # 10 seconds in ms
            "comparison_analysis": 5000,    # 5 seconds in ms
            "document_processing": 30000,   # 30 seconds in ms
            "chat_responses": 3000,         # 3 seconds in ms
            "api_response": 1000,           # 1 second in ms
            "database_query": 500,          # 500ms
            "cache_operation": 50           # 50ms
        }
    
    async def record_api_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
        user_id: Optional[int] = None,
        project_id: Optional[int] = None
    ) -> None:
        """Record API request metrics"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name="api_request",
            value=response_time * 1000,  # Convert to milliseconds
            tags={
                "endpoint": endpoint,
                "method": method,
                "status_code": str(status_code),
                "user_id": str(user_id) if user_id else "anonymous",
                "project_id": str(project_id) if project_id else "none"
            }
        )
        
        await self._store_metric(metric)
    
    async def record_database_query(
        self,
        query_type: str,
        execution_time: float,
        table_name: Optional[str] = None,
        rows_affected: Optional[int] = None
    ) -> None:
        """Record database query metrics"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name="database_query",
            value=execution_time * 1000,
            tags={
                "query_type": query_type,
                "table_name": table_name or "unknown",
                "rows_affected": str(rows_affected) if rows_affected else "0"
            }
        )
        
        await self._store_metric(metric)
    
    async def record_cache_operation(
        self,
        operation: str,  # "get", "set", "delete"
        hit: bool,
        response_time: float,
        key_namespace: Optional[str] = None
    ) -> None:
        """Record cache operation metrics"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name="cache_operation",
            value=response_time * 1000,
            tags={
                "operation": operation,
                "hit": str(hit),
                "namespace": key_namespace or "default"
            }
        )
        
        await self._store_metric(metric)
    
    async def record_agent_workflow(
        self,
        workflow_type: str,
        execution_time: float,
        confidence_score: Optional[float] = None,
        success: bool = True
    ) -> None:
        """Record agent workflow metrics"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name=workflow_type,
            value=execution_time * 1000,
            tags={
                "success": str(success),
                "confidence_score": str(confidence_score) if confidence_score else "none"
            }
        )
        
        await self._store_metric(metric)
    
    async def record_background_job(
        self,
        job_type: str,
        execution_time: float,
        status: str,
        retry_count: int = 0
    ) -> None:
        """Record background job metrics"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_name="background_job",
            value=execution_time * 1000,
            tags={
                "job_type": job_type,
                "status": status,
                "retry_count": str(retry_count)
            }
        )
        
        await self._store_metric(metric)
    
    async def _store_metric(self, metric: PerformanceMetric) -> None:
        """Store metric in buffer and Redis"""
        # Add to in-memory buffer
        self.metrics_buffer.append(metric)
        
        # Add to aggregates for quick calculations
        self.metric_aggregates[metric.metric_name].append(metric.value)
        
        # Keep only recent values for aggregates
        if len(self.metric_aggregates[metric.metric_name]) > 100:
            self.metric_aggregates[metric.metric_name] = self.metric_aggregates[metric.metric_name][-100:]
        
        # Store in Redis if available
        if self.redis_client:
            try:
                metric_data = {
                    "timestamp": metric.timestamp.isoformat(),
                    "metric_name": metric.metric_name,
                    "value": metric.value,
                    "tags": json.dumps(metric.tags),
                    "unit": metric.unit
                }
                
                # Store with TTL of 24 hours
                await self.redis_client.setex(
                    f"metric:{metric.metric_name}:{int(metric.timestamp.timestamp())}",
                    86400,
                    json.dumps(metric_data)
                )
                
                # Also add to time series for aggregation
                await self.redis_client.zadd(
                    f"metrics_ts:{metric.metric_name}",
                    {json.dumps(metric_data): metric.timestamp.timestamp()}
                )
                
                # Keep only last 24 hours of time series data
                cutoff = (datetime.now() - timedelta(hours=24)).timestamp()
                await self.redis_client.zremrangebyscore(
                    f"metrics_ts:{metric.metric_name}",
                    0,
                    cutoff
                )
                
            except Exception as e:
                logger.error(f"Failed to store metric in Redis: {e}")
    
    async def get_metrics(self, time_range_hours: int = 1) -> Dict[str, Any]:
        """Get aggregated metrics for the specified time range"""
        cutoff_time = datetime.now() - timedelta(hours=time_range_hours)
        
        # Filter recent metrics from buffer
        recent_metrics = [
            m for m in self.metrics_buffer 
            if m.timestamp >= cutoff_time
        ]
        
        # Group by metric name
        grouped_metrics = defaultdict(list)
        for metric in recent_metrics:
            grouped_metrics[metric.metric_name].append(metric)
        
        # Calculate aggregates
        aggregated = {}
        
        for metric_name, metrics in grouped_metrics.items():
            values = [m.value for m in metrics]
            
            if values:
                aggregated[metric_name] = {
                    "count": len(values),
                    "avg": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "p50": statistics.median(values),
                    "p95": self._percentile(values, 0.95),
                    "p99": self._percentile(values, 0.99),
                    "unit": metrics[0].unit,
                    "target": self.performance_targets.get(metric_name),
                    "meets_target": statistics.mean(values) <= self.performance_targets.get(metric_name, float('inf'))
                }
        
        # Add overall statistics
        all_api_requests = [m for m in recent_metrics if m.metric_name == "api_request"]
        
        return {
            "time_range_hours": time_range_hours,
            "total_metrics": len(recent_metrics),
            "metrics": aggregated,
            "api_requests": {
                "total": len(all_api_requests),
                "avg_response_time": statistics.mean([m.value for m in all_api_requests]) if all_api_requests else 0,
                "requests_per_minute": len(all_api_requests) / (time_range_hours * 60) if time_range_hours > 0 else 0
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile of values"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(percentile * len(sorted_values))
        
        if index >= len(sorted_values):
            return sorted_values[-1]
        
        return sorted_values[index]


class PerformanceMonitor:
    """
    Main performance monitoring service
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.metrics_collector = MetricsCollector(redis_client)
        self.alerts: List[PerformanceAlert] = []
        self.alert_handlers: List[Callable] = []
        
        # Alert thresholds
        self.alert_thresholds = {
            "api_request": {"warning": 2000, "critical": 5000},  # ms
            "database_query": {"warning": 1000, "critical": 3000},  # ms
            "device_classification": {"warning": 3000, "critical": 5000},  # ms
            "predicate_search": {"warning": 15000, "critical": 30000},  # ms
            "comparison_analysis": {"warning": 8000, "critical": 15000},  # ms
            "document_processing": {"warning": 45000, "critical": 90000},  # ms
            "chat_responses": {"warning": 5000, "critical": 10000},  # ms
        }
    
    def add_alert_handler(self, handler: Callable[[PerformanceAlert], None]) -> None:
        """Add alert handler function"""
        self.alert_handlers.append(handler)
    
    async def check_performance_alerts(self) -> List[PerformanceAlert]:
        """Check for performance issues and generate alerts"""
        current_alerts = []
        
        # Get recent metrics
        metrics = await self.metrics_collector.get_metrics(time_range_hours=1)
        
        for metric_name, metric_data in metrics.get("metrics", {}).items():
            if metric_name not in self.alert_thresholds:
                continue
            
            avg_value = metric_data["avg"]
            thresholds = self.alert_thresholds[metric_name]
            
            # Check for critical alert
            if avg_value > thresholds["critical"]:
                alert = PerformanceAlert(
                    alert_id=f"{metric_name}_critical_{int(time.time())}",
                    metric_name=metric_name,
                    threshold=thresholds["critical"],
                    current_value=avg_value,
                    severity="critical",
                    message=f"{metric_name} average response time ({avg_value:.0f}ms) exceeds critical threshold ({thresholds['critical']}ms)",
                    timestamp=datetime.now()
                )
                current_alerts.append(alert)
                
            # Check for warning alert
            elif avg_value > thresholds["warning"]:
                alert = PerformanceAlert(
                    alert_id=f"{metric_name}_warning_{int(time.time())}",
                    metric_name=metric_name,
                    threshold=thresholds["warning"],
                    current_value=avg_value,
                    severity="warning",
                    message=f"{metric_name} average response time ({avg_value:.0f}ms) exceeds warning threshold ({thresholds['warning']}ms)",
                    timestamp=datetime.now()
                )
                current_alerts.append(alert)
        
        # Store alerts and notify handlers
        for alert in current_alerts:
            self.alerts.append(alert)
            
            # Notify alert handlers
            for handler in self.alert_handlers:
                try:
                    await handler(alert) if asyncio.iscoroutinefunction(handler) else handler(alert)
                except Exception as e:
                    logger.error(f"Alert handler failed: {e}")
        
        return current_alerts
    
    async def check_target_compliance(self, targets: Dict[str, float]) -> Dict[str, Any]:
        """Check compliance with performance targets"""
        metrics = await self.metrics_collector.get_metrics(time_range_hours=24)
        
        compliance_results = {}
        total_metrics = 0
        compliant_metrics = 0
        
        for metric_name, target_ms in targets.items():
            if metric_name in metrics.get("metrics", {}):
                metric_data = metrics["metrics"][metric_name]
                avg_value = metric_data["avg"]
                is_compliant = avg_value <= target_ms
                
                compliance_results[metric_name] = {
                    "target_ms": target_ms,
                    "actual_avg_ms": avg_value,
                    "compliant": is_compliant,
                    "compliance_ratio": min(1.0, target_ms / avg_value) if avg_value > 0 else 1.0,
                    "sample_count": metric_data["count"]
                }
                
                total_metrics += 1
                if is_compliant:
                    compliant_metrics += 1
        
        overall_compliance = compliant_metrics / total_metrics if total_metrics > 0 else 0.0
        
        return {
            "overall_compliance": overall_compliance,
            "compliant_metrics": compliant_metrics,
            "total_metrics": total_metrics,
            "metric_compliance": compliance_results,
            "timestamp": datetime.now().isoformat()
        }
    
    async def record_workflow_completion(
        self,
        workflow_type: str,
        execution_time: float,
        cache_hit: bool = False,
        success: bool = True
    ) -> None:
        """Record workflow completion metrics"""
        await self.metrics_collector.record_agent_workflow(
            workflow_type=workflow_type,
            execution_time=execution_time,
            success=success
        )
        
        # Also record cache performance
        if cache_hit:
            await self.metrics_collector.record_cache_operation(
                operation="get",
                hit=True,
                response_time=0.001,  # Cache hits are very fast
                key_namespace=workflow_type
            )
    
    async def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data"""
        # Get metrics for different time ranges
        metrics_1h = await self.metrics_collector.get_metrics(1)
        metrics_24h = await self.metrics_collector.get_metrics(24)
        
        # Get recent alerts
        recent_alerts = [
            alert for alert in self.alerts
            if alert.timestamp >= datetime.now() - timedelta(hours=24)
        ]
        
        # Calculate performance trends
        trends = {}
        for metric_name in self.metrics_collector.performance_targets.keys():
            if metric_name in metrics_1h.get("metrics", {}) and metric_name in metrics_24h.get("metrics", {}):
                current_avg = metrics_1h["metrics"][metric_name]["avg"]
                historical_avg = metrics_24h["metrics"][metric_name]["avg"]
                
                trend = "stable"
                if current_avg > historical_avg * 1.1:
                    trend = "degrading"
                elif current_avg < historical_avg * 0.9:
                    trend = "improving"
                
                trends[metric_name] = {
                    "current_avg": current_avg,
                    "historical_avg": historical_avg,
                    "trend": trend,
                    "change_percent": ((current_avg - historical_avg) / historical_avg * 100) if historical_avg > 0 else 0
                }
        
        return {
            "current_metrics": metrics_1h,
            "historical_metrics": metrics_24h,
            "recent_alerts": [asdict(alert) for alert in recent_alerts],
            "performance_trends": trends,
            "system_health": await self._get_system_health(),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get overall system health indicators"""
        metrics = await self.metrics_collector.get_metrics(1)
        
        # Calculate health score based on performance targets
        health_score = 0.0
        total_weight = 0.0
        
        for metric_name, target in self.metrics_collector.performance_targets.items():
            if metric_name in metrics.get("metrics", {}):
                actual = metrics["metrics"][metric_name]["avg"]
                
                # Calculate health contribution (1.0 = perfect, 0.0 = terrible)
                if actual <= target:
                    contribution = 1.0
                else:
                    # Degrade score based on how much we exceed target
                    contribution = max(0.0, 1.0 - (actual - target) / target)
                
                weight = 1.0
                if metric_name in ["api_request", "database_query"]:
                    weight = 2.0  # Higher weight for critical metrics
                
                health_score += contribution * weight
                total_weight += weight
        
        overall_health = health_score / total_weight if total_weight > 0 else 0.0
        
        # Determine health status
        if overall_health >= 0.9:
            status = "excellent"
        elif overall_health >= 0.7:
            status = "good"
        elif overall_health >= 0.5:
            status = "fair"
        else:
            status = "poor"
        
        return {
            "overall_health_score": overall_health,
            "health_status": status,
            "active_alerts": len([a for a in self.alerts if not a.resolved]),
            "critical_alerts": len([a for a in self.alerts if a.severity == "critical" and not a.resolved])
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on monitoring system"""
        try:
            # Test metrics collection
            test_start = time.time()
            await self.metrics_collector.record_api_request(
                endpoint="/health",
                method="GET",
                status_code=200,
                response_time=0.1
            )
            
            # Test metrics retrieval
            metrics = await self.metrics_collector.get_metrics(1)
            
            response_time = time.time() - test_start
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "metrics_buffer_size": len(self.metrics_collector.metrics_buffer),
                "active_alerts": len([a for a in self.alerts if not a.resolved]),
                "redis_connected": self.redis_client is not None,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Alert handlers
async def log_alert_handler(alert: PerformanceAlert) -> None:
    """Log performance alerts"""
    logger.warning(f"Performance Alert [{alert.severity.upper()}]: {alert.message}")


async def email_alert_handler(alert: PerformanceAlert) -> None:
    """Send email alerts (placeholder implementation)"""
    # In a real implementation, this would send emails
    logger.info(f"Would send email alert: {alert.message}")


# Factory function
async def create_performance_monitor(redis_url: str = "redis://localhost:6379") -> PerformanceMonitor:
    """Create performance monitor with Redis connection"""
    try:
        redis_client = redis.from_url(redis_url)
        await redis_client.ping()
        logger.info("Connected to Redis for performance monitoring")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis for monitoring: {e}")
        redis_client = None
    
    monitor = PerformanceMonitor(redis_client)
    
    # Add default alert handlers
    monitor.add_alert_handler(log_alert_handler)
    
    return monitor


# Performance monitoring decorators
def monitor_performance(metric_name: str):
    """Decorator to monitor function performance"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                execution_time = time.time() - start_time
                
                # Record metric (would need access to metrics collector)
                logger.debug(f"Function {func.__name__} executed in {execution_time:.4f}s")
        
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                execution_time = time.time() - start_time
                logger.debug(f"Function {func.__name__} executed in {execution_time:.4f}s")
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator