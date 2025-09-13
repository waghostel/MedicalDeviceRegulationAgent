"""
Query Optimizer Service

Provides query performance monitoring and optimization capabilities.
"""

import asyncio
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """Query execution metrics"""
    query_name: str
    execution_count: int = 0
    total_time: float = 0.0
    min_time: float = float('inf')
    max_time: float = 0.0
    avg_time: float = 0.0
    last_executed: Optional[float] = None


class QueryOptimizer:
    """Query performance optimizer and monitor"""
    
    def __init__(self):
        self.query_metrics: Dict[str, QueryMetrics] = {}
        self.active_queries: Dict[str, float] = {}
        self._lock = asyncio.Lock()
    
    @asynccontextmanager
    async def monitored_query(self, query_name: str, query_sql: str = ""):
        """Context manager for monitoring query execution"""
        start_time = time.time()
        query_id = f"{query_name}_{start_time}"
        
        try:
            self.active_queries[query_id] = start_time
            yield
        finally:
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Remove from active queries
            self.active_queries.pop(query_id, None)
            
            # Update metrics
            await self._update_metrics(query_name, execution_time)
    
    async def _update_metrics(self, query_name: str, execution_time: float):
        """Update query metrics"""
        async with self._lock:
            if query_name not in self.query_metrics:
                self.query_metrics[query_name] = QueryMetrics(query_name=query_name)
            
            metrics = self.query_metrics[query_name]
            metrics.execution_count += 1
            metrics.total_time += execution_time
            metrics.min_time = min(metrics.min_time, execution_time)
            metrics.max_time = max(metrics.max_time, execution_time)
            metrics.avg_time = metrics.total_time / metrics.execution_count
            metrics.last_executed = time.time()
    
    async def get_query_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all query metrics"""
        async with self._lock:
            total_executions = sum(m.execution_count for m in self.query_metrics.values())
            total_time = sum(m.total_time for m in self.query_metrics.values())
            
            slowest_queries = sorted(
                self.query_metrics.values(),
                key=lambda m: m.avg_time,
                reverse=True
            )[:5]
            
            return {
                "total_executions": total_executions,
                "total_time": total_time,
                "unique_queries": len(self.query_metrics),
                "active_queries": len(self.active_queries),
                "slowest_queries": [
                    {
                        "name": q.query_name,
                        "avg_time": q.avg_time,
                        "execution_count": q.execution_count
                    }
                    for q in slowest_queries
                ]
            }
    
    async def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze query performance and provide recommendations"""
        async with self._lock:
            slow_queries = [
                m for m in self.query_metrics.values()
                if m.avg_time > 1.0  # Queries taking more than 1 second
            ]
            
            frequent_queries = [
                m for m in self.query_metrics.values()
                if m.execution_count > 10
            ]
            
            return {
                "slowest_queries": [
                    {
                        "name": q.query_name,
                        "avg_time": q.avg_time,
                        "max_time": q.max_time,
                        "execution_count": q.execution_count
                    }
                    for q in slow_queries
                ],
                "frequent_queries": [
                    {
                        "name": q.query_name,
                        "execution_count": q.execution_count,
                        "total_time": q.total_time
                    }
                    for q in frequent_queries
                ],
                "recommendations": self._generate_recommendations(slow_queries, frequent_queries)
            }
    
    def _generate_recommendations(self, slow_queries: List[QueryMetrics], frequent_queries: List[QueryMetrics]) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if slow_queries:
            recommendations.append("Consider adding database indexes for slow queries")
            recommendations.append("Review query execution plans for optimization opportunities")
        
        if frequent_queries:
            recommendations.append("Consider caching results for frequently executed queries")
            recommendations.append("Optimize connection pooling for high-frequency queries")
        
        if not slow_queries and not frequent_queries:
            recommendations.append("Query performance is within acceptable limits")
        
        return recommendations
    
    async def reset_metrics(self):
        """Reset all query metrics"""
        async with self._lock:
            self.query_metrics.clear()
            self.active_queries.clear()


# Global query optimizer instance
_query_optimizer: Optional[QueryOptimizer] = None


def get_query_optimizer() -> QueryOptimizer:
    """Get the global query optimizer instance"""
    global _query_optimizer
    if _query_optimizer is None:
        _query_optimizer = QueryOptimizer()
    return _query_optimizer


def reset_query_optimizer():
    """Reset the global query optimizer instance"""
    global _query_optimizer
    _query_optimizer = None