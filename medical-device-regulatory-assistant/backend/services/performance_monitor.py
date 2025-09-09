"""
Database performance monitoring service
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from sqlalchemy import text
from database.connection import get_database_manager
from database.performance_indexes import DatabaseIndexManager
from database.connection_pool import get_enhanced_connection_manager
from services.query_optimizer import get_query_optimizer

logger = logging.getLogger(__name__)


@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    alert_type: str
    severity: str  # low, medium, high, critical
    message: str
    metric_value: float
    threshold: float
    timestamp: datetime = field(default_factory=datetime.now)
    resolved: bool = False


class PerformanceMonitor:
    """Database performance monitoring service"""
    
    def __init__(self):
        self._db_manager = None
        self._connection_manager = None
        self._query_optimizer = None
        self._index_manager = None
        self._alerts: List[PerformanceAlert] = []
        self._monitoring_active = False
        self._monitoring_interval = 60  # seconds
        self._monitoring_task: Optional[asyncio.Task] = None
        
        # Performance thresholds
        self._thresholds = {
            "slow_query_time": 1.0,  # seconds
            "connection_pool_usage": 0.8,  # 80%
            "failed_connection_rate": 0.1,  # 10%
            "average_response_time": 0.5,  # seconds
            "database_size_mb": 1000,  # MB
            "index_usage_rate": 0.7  # 70%
        }
    
    @property
    def db_manager(self):
        """Lazy initialization of database manager"""
        if self._db_manager is None:
            self._db_manager = get_database_manager()
        return self._db_manager
    
    @property
    def connection_manager(self):
        """Lazy initialization of connection manager"""
        if self._connection_manager is None:
            try:
                self._connection_manager = get_enhanced_connection_manager()
            except RuntimeError:
                # Enhanced connection manager not initialized, use regular db_manager
                self._connection_manager = None
        return self._connection_manager
    
    @property
    def query_optimizer(self):
        """Lazy initialization of query optimizer"""
        if self._query_optimizer is None:
            self._query_optimizer = get_query_optimizer()
        return self._query_optimizer
    
    @property
    def index_manager(self):
        """Lazy initialization of index manager"""
        if self._index_manager is None:
            self._index_manager = DatabaseIndexManager(self.db_manager.engine)
        return self._index_manager
    
    async def start_monitoring(self) -> None:
        """Start continuous performance monitoring"""
        if self._monitoring_active:
            logger.warning("Performance monitoring is already active")
            return
        
        self._monitoring_active = True
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info(f"Performance monitoring started with {self._monitoring_interval}s interval")
    
    async def stop_monitoring(self) -> None:
        """Stop continuous performance monitoring"""
        self._monitoring_active = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
            self._monitoring_task = None
        logger.info("Performance monitoring stopped")
    
    async def _monitoring_loop(self) -> None:
        """Main monitoring loop"""
        while self._monitoring_active:
            try:
                await self._collect_performance_metrics()
                await asyncio.sleep(self._monitoring_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in performance monitoring loop: {e}")
                await asyncio.sleep(self._monitoring_interval)
    
    async def _collect_performance_metrics(self) -> None:
        """Collect and analyze performance metrics"""
        try:
            # Collect database health metrics
            health_data = await self.db_manager.health_check()
            
            # Collect connection pool metrics
            if self.connection_manager:
                pool_metrics = await self.connection_manager.get_performance_metrics()
                await self._check_connection_pool_alerts(pool_metrics)
            
            # Collect query performance metrics
            query_metrics = await self.query_optimizer.get_query_metrics_summary()
            await self._check_query_performance_alerts(query_metrics)
            
            # Collect database size and index usage
            await self._check_database_size_alerts()
            await self._check_index_usage_alerts()
            
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {e}")
    
    async def _check_connection_pool_alerts(self, pool_metrics: Dict[str, Any]) -> None:
        """Check for connection pool performance alerts"""
        try:
            pool_data = pool_metrics.get("connection_pool", {})
            performance_data = pool_metrics.get("performance", {})
            
            # Check pool usage
            current_size = pool_data.get("current_size", 0)
            checked_out = pool_data.get("checked_out", 0)
            max_size = pool_data.get("configured_size", 1) + pool_data.get("max_overflow", 0)
            
            if max_size > 0:
                usage_rate = checked_out / max_size
                if usage_rate > self._thresholds["connection_pool_usage"]:
                    await self._create_alert(
                        "connection_pool_high_usage",
                        "high",
                        f"Connection pool usage is {usage_rate:.1%} (threshold: {self._thresholds['connection_pool_usage']:.1%})",
                        usage_rate,
                        self._thresholds["connection_pool_usage"]
                    )
            
            # Check failed connection rate
            total_connections = performance_data.get("connection_requests", 0)
            failed_connections = performance_data.get("failed_connections", 0)
            
            if total_connections > 0:
                failure_rate = failed_connections / total_connections
                if failure_rate > self._thresholds["failed_connection_rate"]:
                    await self._create_alert(
                        "high_connection_failure_rate",
                        "critical",
                        f"Connection failure rate is {failure_rate:.1%} (threshold: {self._thresholds['failed_connection_rate']:.1%})",
                        failure_rate,
                        self._thresholds["failed_connection_rate"]
                    )
            
            # Check average connection time
            avg_time = performance_data.get("average_connection_time_ms", 0) / 1000
            if avg_time > self._thresholds["average_response_time"]:
                await self._create_alert(
                    "slow_connection_time",
                    "medium",
                    f"Average connection time is {avg_time:.3f}s (threshold: {self._thresholds['average_response_time']}s)",
                    avg_time,
                    self._thresholds["average_response_time"]
                )
                
        except Exception as e:
            logger.error(f"Error checking connection pool alerts: {e}")
    
    async def _check_query_performance_alerts(self, query_metrics: Dict[str, Any]) -> None:
        """Check for query performance alerts"""
        try:
            # Check average execution time
            avg_time = query_metrics.get("average_execution_time_seconds", 0)
            if avg_time > self._thresholds["slow_query_time"]:
                await self._create_alert(
                    "slow_average_query_time",
                    "medium",
                    f"Average query execution time is {avg_time:.3f}s (threshold: {self._thresholds['slow_query_time']}s)",
                    avg_time,
                    self._thresholds["slow_query_time"]
                )
            
            # Check for slow queries
            slow_queries = query_metrics.get("slow_queries_count", 0)
            total_queries = query_metrics.get("total_unique_queries", 1)
            slow_query_rate = slow_queries / total_queries
            
            if slow_query_rate > 0.2:  # More than 20% of queries are slow
                await self._create_alert(
                    "high_slow_query_rate",
                    "high",
                    f"{slow_queries} out of {total_queries} queries are slow ({slow_query_rate:.1%})",
                    slow_query_rate,
                    0.2
                )
                
        except Exception as e:
            logger.error(f"Error checking query performance alerts: {e}")
    
    async def _check_database_size_alerts(self) -> None:
        """Check for database size alerts"""
        try:
            async with self.db_manager.get_connection() as conn:
                # Get database size (SQLite specific)
                if self.db_manager.config.database_url.startswith("sqlite"):
                    size_query = text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
                    result = await conn.execute(size_query)
                    size_bytes = result.scalar() or 0
                    size_mb = size_bytes / (1024 * 1024)
                    
                    if size_mb > self._thresholds["database_size_mb"]:
                        await self._create_alert(
                            "large_database_size",
                            "medium",
                            f"Database size is {size_mb:.1f}MB (threshold: {self._thresholds['database_size_mb']}MB)",
                            size_mb,
                            self._thresholds["database_size_mb"]
                        )
                        
        except Exception as e:
            logger.error(f"Error checking database size alerts: {e}")
    
    async def _check_index_usage_alerts(self) -> None:
        """Check for index usage alerts"""
        try:
            # Get table statistics to check if indexes are being used effectively
            stats = await self.index_manager.get_table_statistics()
            
            for table_name, table_stats in stats.items():
                if isinstance(table_stats, dict):
                    row_count = table_stats.get("row_count", 0)
                    index_count = table_stats.get("index_count", 0)
                    
                    # Alert if large tables have few indexes
                    if row_count > 1000 and index_count < 2:
                        await self._create_alert(
                            "insufficient_indexes",
                            "medium",
                            f"Table {table_name} has {row_count} rows but only {index_count} indexes",
                            index_count,
                            2
                        )
                        
        except Exception as e:
            logger.error(f"Error checking index usage alerts: {e}")
    
    async def _create_alert(
        self, 
        alert_type: str, 
        severity: str, 
        message: str, 
        metric_value: float, 
        threshold: float
    ) -> None:
        """Create a performance alert"""
        # Check if similar alert already exists and is not resolved
        existing_alert = next(
            (alert for alert in self._alerts 
             if alert.alert_type == alert_type and not alert.resolved),
            None
        )
        
        if existing_alert:
            # Update existing alert
            existing_alert.metric_value = metric_value
            existing_alert.timestamp = datetime.now()
            existing_alert.message = message
        else:
            # Create new alert
            alert = PerformanceAlert(
                alert_type=alert_type,
                severity=severity,
                message=message,
                metric_value=metric_value,
                threshold=threshold
            )
            self._alerts.append(alert)
            logger.warning(f"Performance alert created: {severity.upper()} - {message}")
    
    async def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        try:
            # Database health
            health_data = await self.db_manager.health_check()
            
            # Connection pool metrics
            pool_metrics = {}
            if self.connection_manager:
                pool_metrics = await self.connection_manager.get_performance_metrics()
            
            # Query performance
            query_metrics = await self.query_optimizer.get_query_metrics_summary()
            query_analysis = await self.query_optimizer.analyze_query_performance()
            
            # Table statistics
            table_stats = await self.index_manager.get_table_statistics()
            
            # Active alerts
            active_alerts = [
                {
                    "type": alert.alert_type,
                    "severity": alert.severity,
                    "message": alert.message,
                    "metric_value": alert.metric_value,
                    "threshold": alert.threshold,
                    "timestamp": alert.timestamp.isoformat(),
                    "resolved": alert.resolved
                }
                for alert in self._alerts
                if not alert.resolved
            ]
            
            report = {
                "timestamp": datetime.now().isoformat(),
                "monitoring_active": self._monitoring_active,
                "database_health": health_data,
                "connection_pool": pool_metrics,
                "query_performance": {
                    "summary": query_metrics,
                    "analysis": query_analysis
                },
                "table_statistics": table_stats,
                "active_alerts": active_alerts,
                "alert_summary": {
                    "total_alerts": len(self._alerts),
                    "active_alerts": len(active_alerts),
                    "critical_alerts": len([a for a in active_alerts if a["severity"] == "critical"]),
                    "high_alerts": len([a for a in active_alerts if a["severity"] == "high"]),
                    "medium_alerts": len([a for a in active_alerts if a["severity"] == "medium"]),
                    "low_alerts": len([a for a in active_alerts if a["severity"] == "low"])
                },
                "thresholds": self._thresholds
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def resolve_alert(self, alert_type: str) -> bool:
        """Resolve an active alert"""
        for alert in self._alerts:
            if alert.alert_type == alert_type and not alert.resolved:
                alert.resolved = True
                logger.info(f"Performance alert resolved: {alert_type}")
                return True
        return False
    
    async def clear_resolved_alerts(self) -> int:
        """Clear all resolved alerts"""
        initial_count = len(self._alerts)
        self._alerts = [alert for alert in self._alerts if not alert.resolved]
        cleared_count = initial_count - len(self._alerts)
        logger.info(f"Cleared {cleared_count} resolved alerts")
        return cleared_count
    
    async def optimize_performance(self) -> Dict[str, Any]:
        """Run automated performance optimizations"""
        optimization_results = {}
        
        try:
            # Create performance indexes
            await self.index_manager.create_performance_indexes()
            optimization_results["indexes"] = "created"
            
            # Optimize database
            db_optimization = await self.index_manager.optimize_database()
            optimization_results["database_optimization"] = db_optimization
            
            # Optimize connection pool if available
            if self.connection_manager:
                pool_optimization = await self.connection_manager.optimize_connection_pool()
                optimization_results["connection_pool"] = pool_optimization
            
            logger.info("Performance optimization completed")
            
        except Exception as e:
            optimization_results["error"] = str(e)
            logger.error(f"Performance optimization failed: {e}")
        
        return optimization_results
    
    def set_threshold(self, metric: str, value: float) -> bool:
        """Set performance threshold for a metric"""
        if metric in self._thresholds:
            self._thresholds[metric] = value
            logger.info(f"Performance threshold updated: {metric} = {value}")
            return True
        return False
    
    def get_thresholds(self) -> Dict[str, float]:
        """Get current performance thresholds"""
        return self._thresholds.copy()


# Global performance monitor instance
_performance_monitor: Optional[PerformanceMonitor] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor