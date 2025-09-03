"""
Database Performance Optimization

This module provides database indexing and query optimization
for improved performance of the Medical Device Regulatory Assistant.
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy import text, Index, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from models.base import Base
from models.project import Project
from models.agent_interaction import AgentInteraction
from models.predicate_device import PredicateDevice
from models.device_classification import DeviceClassification

logger = logging.getLogger(__name__)


class DatabaseOptimizer:
    """
    Database performance optimizer for SQLite
    """
    
    def __init__(self, session_factory: sessionmaker):
        self.session_factory = session_factory
        self.performance_indexes = []
        self.query_metrics = {}
    
    async def create_performance_indexes(self) -> List[str]:
        """Create performance indexes for common queries"""
        indexes_created = []
        
        async with self.session_factory() as session:
            try:
                # Project indexes
                project_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)",
                    "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
                    "CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status)",
                ]
                
                # Agent interaction indexes
                agent_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_id ON agent_interactions(project_id)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_user_id ON agent_interactions(user_id)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_action ON agent_interactions(agent_action)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_created_at ON agent_interactions(created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_confidence ON agent_interactions(confidence_score)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_action ON agent_interactions(project_id, agent_action)",
                    "CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_created ON agent_interactions(project_id, created_at)",
                ]
                
                # Predicate device indexes
                predicate_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_project_id ON predicate_devices(project_id)",
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_k_number ON predicate_devices(k_number)",
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_product_code ON predicate_devices(product_code)",
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_confidence ON predicate_devices(confidence_score)",
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_selected ON predicate_devices(is_selected)",
                    "CREATE INDEX IF NOT EXISTS idx_predicate_devices_project_confidence ON predicate_devices(project_id, confidence_score)",
                ]
                
                # Device classification indexes
                classification_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_device_classifications_project_id ON device_classifications(project_id)",
                    "CREATE INDEX IF NOT EXISTS idx_device_classifications_device_class ON device_classifications(device_class)",
                    "CREATE INDEX IF NOT EXISTS idx_device_classifications_product_code ON device_classifications(product_code)",
                    "CREATE INDEX IF NOT EXISTS idx_device_classifications_pathway ON device_classifications(regulatory_pathway)",
                    "CREATE INDEX IF NOT EXISTS idx_device_classifications_confidence ON device_classifications(confidence_score)",
                ]
                
                # User indexes
                user_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                    "CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)",
                    "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
                ]
                
                # Project document indexes
                document_indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id)",
                    "CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(document_type)",
                    "CREATE INDEX IF NOT EXISTS idx_project_documents_filename ON project_documents(filename)",
                    "CREATE INDEX IF NOT EXISTS idx_project_documents_updated ON project_documents(updated_at)",
                ]
                
                all_indexes = (
                    project_indexes + agent_indexes + predicate_indexes + 
                    classification_indexes + user_indexes + document_indexes
                )
                
                for index_sql in all_indexes:
                    try:
                        await session.execute(text(index_sql))
                        index_name = index_sql.split("idx_")[1].split(" ")[0] if "idx_" in index_sql else "unknown"
                        indexes_created.append(index_name)
                        logger.info(f"Created index: {index_name}")
                    except Exception as e:
                        logger.warning(f"Failed to create index: {index_sql}, error: {e}")
                
                await session.commit()
                
                # Analyze tables for better query planning
                await self._analyze_tables(session)
                
                logger.info(f"Created {len(indexes_created)} performance indexes")
                return indexes_created
                
            except Exception as e:
                logger.error(f"Error creating performance indexes: {e}")
                await session.rollback()
                return []
    
    async def _analyze_tables(self, session: AsyncSession) -> None:
        """Run ANALYZE on all tables to update statistics"""
        tables = [
            "users", "projects", "agent_interactions", "predicate_devices",
            "device_classifications", "project_documents"
        ]
        
        for table in tables:
            try:
                await session.execute(text(f"ANALYZE {table}"))
                logger.debug(f"Analyzed table: {table}")
            except Exception as e:
                logger.warning(f"Failed to analyze table {table}: {e}")
    
    async def optimize_common_queries(self) -> List[str]:
        """Optimize common query patterns"""
        optimizations = []
        
        async with self.session_factory() as session:
            try:
                # Enable query planner optimizations
                optimizations_sql = [
                    "PRAGMA optimize",
                    "PRAGMA cache_size = 10000",  # 10MB cache
                    "PRAGMA temp_store = memory",
                    "PRAGMA mmap_size = 268435456",  # 256MB memory map
                    "PRAGMA journal_mode = WAL",  # Write-Ahead Logging
                    "PRAGMA synchronous = NORMAL",
                    "PRAGMA foreign_keys = ON",
                ]
                
                for optimization in optimizations_sql:
                    try:
                        await session.execute(text(optimization))
                        optimizations.append(optimization)
                        logger.debug(f"Applied optimization: {optimization}")
                    except Exception as e:
                        logger.warning(f"Failed to apply optimization {optimization}: {e}")
                
                await session.commit()
                
                logger.info(f"Applied {len(optimizations)} query optimizations")
                return optimizations
                
            except Exception as e:
                logger.error(f"Error optimizing queries: {e}")
                return []
    
    async def measure_query_performance(self) -> Dict[str, Any]:
        """Measure performance of common queries"""
        metrics = {
            "queries_tested": 0,
            "total_time": 0.0,
            "avg_response_time": 0.0,
            "query_details": []
        }
        
        async with self.session_factory() as session:
            try:
                # Test common queries
                test_queries = [
                    {
                        "name": "get_user_projects",
                        "sql": "SELECT * FROM projects WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10",
                        "target_time": 0.1  # 100ms
                    },
                    {
                        "name": "get_project_interactions",
                        "sql": "SELECT * FROM agent_interactions WHERE project_id = 1 ORDER BY created_at DESC LIMIT 50",
                        "target_time": 0.2  # 200ms
                    },
                    {
                        "name": "get_project_predicates",
                        "sql": "SELECT * FROM predicate_devices WHERE project_id = 1 ORDER BY confidence_score DESC",
                        "target_time": 0.1  # 100ms
                    },
                    {
                        "name": "search_interactions_by_action",
                        "sql": "SELECT * FROM agent_interactions WHERE agent_action = 'predicate_search' ORDER BY created_at DESC LIMIT 20",
                        "target_time": 0.15  # 150ms
                    },
                    {
                        "name": "get_high_confidence_predicates",
                        "sql": "SELECT * FROM predicate_devices WHERE confidence_score > 0.8 ORDER BY confidence_score DESC LIMIT 10",
                        "target_time": 0.1  # 100ms
                    }
                ]
                
                total_time = 0.0
                
                for query in test_queries:
                    start_time = time.time()
                    
                    try:
                        result = await session.execute(text(query["sql"]))
                        rows = result.fetchall()
                        
                        execution_time = time.time() - start_time
                        total_time += execution_time
                        
                        query_detail = {
                            "name": query["name"],
                            "execution_time": execution_time,
                            "target_time": query["target_time"],
                            "meets_target": execution_time <= query["target_time"],
                            "rows_returned": len(rows)
                        }
                        
                        metrics["query_details"].append(query_detail)
                        metrics["queries_tested"] += 1
                        
                        logger.debug(f"Query {query['name']}: {execution_time:.4f}s ({'✅' if query_detail['meets_target'] else '❌'})")
                        
                    except Exception as e:
                        logger.error(f"Error testing query {query['name']}: {e}")
                
                metrics["total_time"] = total_time
                metrics["avg_response_time"] = total_time / metrics["queries_tested"] if metrics["queries_tested"] > 0 else 0
                
                logger.info(f"Query performance test completed: {metrics['avg_response_time']:.4f}s average")
                return metrics
                
            except Exception as e:
                logger.error(f"Error measuring query performance: {e}")
                return metrics
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics and health metrics"""
        stats = {}
        
        async with self.session_factory() as session:
            try:
                # Get table sizes
                table_stats = await session.execute(text("""
                    SELECT name, 
                           (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as table_count
                    FROM sqlite_master m WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
                
                tables = table_stats.fetchall()
                stats["tables"] = {}
                
                for table in tables:
                    table_name = table[0]
                    
                    # Get row count
                    count_result = await session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    row_count = count_result.scalar()
                    
                    stats["tables"][table_name] = {
                        "row_count": row_count
                    }
                
                # Get index information
                index_result = await session.execute(text("""
                    SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'
                """))
                
                indexes = index_result.fetchall()
                stats["indexes"] = [idx[0] for idx in indexes]
                stats["index_count"] = len(stats["indexes"])
                
                # Get database size
                size_result = await session.execute(text("PRAGMA page_count"))
                page_count = size_result.scalar()
                
                page_size_result = await session.execute(text("PRAGMA page_size"))
                page_size = page_size_result.scalar()
                
                stats["database_size_bytes"] = page_count * page_size
                stats["database_size_mb"] = stats["database_size_bytes"] / (1024 * 1024)
                
                # Get cache statistics
                cache_hit_result = await session.execute(text("PRAGMA cache_size"))
                cache_size = cache_hit_result.scalar()
                stats["cache_size"] = cache_size
                
                logger.info(f"Database stats: {stats['database_size_mb']:.2f}MB, {stats['index_count']} indexes")
                return stats
                
            except Exception as e:
                logger.error(f"Error getting database stats: {e}")
                return {"error": str(e)}
    
    async def optimize_for_read_heavy_workload(self) -> List[str]:
        """Optimize database for read-heavy workloads"""
        optimizations = []
        
        async with self.session_factory() as session:
            try:
                # Read-heavy optimizations
                read_optimizations = [
                    "PRAGMA query_only = OFF",  # Allow writes but optimize for reads
                    "PRAGMA cache_size = 20000",  # 20MB cache for reads
                    "PRAGMA mmap_size = 536870912",  # 512MB memory map
                    "PRAGMA temp_store = memory",
                    "PRAGMA journal_mode = WAL",
                    "PRAGMA wal_autocheckpoint = 1000",
                    "PRAGMA synchronous = NORMAL",
                    "PRAGMA optimize",
                ]
                
                for optimization in read_optimizations:
                    try:
                        await session.execute(text(optimization))
                        optimizations.append(optimization)
                        logger.debug(f"Applied read optimization: {optimization}")
                    except Exception as e:
                        logger.warning(f"Failed to apply read optimization {optimization}: {e}")
                
                await session.commit()
                
                logger.info(f"Applied {len(optimizations)} read-heavy optimizations")
                return optimizations
                
            except Exception as e:
                logger.error(f"Error applying read optimizations: {e}")
                return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        try:
            start_time = time.time()
            
            async with self.session_factory() as session:
                # Test basic connectivity
                await session.execute(text("SELECT 1"))
                
                # Test index usage
                explain_result = await session.execute(text("""
                    EXPLAIN QUERY PLAN 
                    SELECT * FROM projects WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10
                """))
                
                query_plan = explain_result.fetchall()
                uses_index = any("idx_" in str(row) for row in query_plan)
                
                response_time = time.time() - start_time
                
                return {
                    "status": "healthy",
                    "response_time_seconds": response_time,
                    "indexes_working": uses_index,
                    "query_plan_available": len(query_plan) > 0,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Utility functions
async def create_database_optimizer(session_factory: sessionmaker) -> DatabaseOptimizer:
    """Create database optimizer instance"""
    optimizer = DatabaseOptimizer(session_factory)
    
    # Initialize performance indexes
    await optimizer.create_performance_indexes()
    await optimizer.optimize_common_queries()
    
    return optimizer


def query_performance_monitor(func):
    """Decorator to monitor query performance"""
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            logger.debug(f"Query {func.__name__} executed in {execution_time:.4f}s")
            
            # Log slow queries
            if execution_time > 1.0:  # Queries taking more than 1 second
                logger.warning(f"Slow query detected: {func.__name__} took {execution_time:.4f}s")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Query {func.__name__} failed after {execution_time:.4f}s: {e}")
            raise
    
    return wrapper