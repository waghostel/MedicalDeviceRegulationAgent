"""
Database performance indexes and optimization utilities
"""

import logging
from typing import List, Dict, Any
from sqlalchemy import Index, text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


class DatabaseIndexManager:
    """Manager for database indexes and performance optimization"""
    
    def __init__(self, engine: AsyncEngine):
        self.engine = engine
    
    async def create_performance_indexes(self) -> None:
        """Create performance indexes for common query patterns"""
        indexes = [
            # Project indexes for search and filtering
            {
                "name": "idx_projects_user_status",
                "table": "projects",
                "columns": ["user_id", "status"],
                "description": "Optimize project listing by user and status"
            },
            {
                "name": "idx_projects_user_updated",
                "table": "projects", 
                "columns": ["user_id", "updated_at DESC"],
                "description": "Optimize project listing with ordering"
            },
            {
                "name": "idx_projects_name_search",
                "table": "projects",
                "columns": ["name"],
                "description": "Optimize project name searches"
            },
            {
                "name": "idx_projects_device_type",
                "table": "projects",
                "columns": ["device_type"],
                "description": "Optimize device type filtering"
            },
            {
                "name": "idx_projects_status_created",
                "table": "projects",
                "columns": ["status", "created_at DESC"],
                "description": "Optimize status-based queries with date ordering"
            },
            
            # User indexes
            {
                "name": "idx_users_google_id",
                "table": "users",
                "columns": ["google_id"],
                "description": "Optimize user authentication lookups"
            },
            {
                "name": "idx_users_email",
                "table": "users", 
                "columns": ["email"],
                "description": "Optimize email-based user lookups"
            },
            
            # Device classification indexes
            {
                "name": "idx_device_classifications_project",
                "table": "device_classifications",
                "columns": ["project_id", "created_at DESC"],
                "description": "Optimize classification lookups by project"
            },
            {
                "name": "idx_device_classifications_product_code",
                "table": "device_classifications",
                "columns": ["product_code"],
                "description": "Optimize product code searches"
            },
            {
                "name": "idx_device_classifications_device_class",
                "table": "device_classifications",
                "columns": ["device_class"],
                "description": "Optimize device class filtering"
            },
            
            # Predicate device indexes
            {
                "name": "idx_predicate_devices_project",
                "table": "predicate_devices",
                "columns": ["project_id", "created_at DESC"],
                "description": "Optimize predicate lookups by project"
            },
            {
                "name": "idx_predicate_devices_k_number",
                "table": "predicate_devices",
                "columns": ["k_number"],
                "description": "Optimize K-number searches"
            },
            {
                "name": "idx_predicate_devices_selected",
                "table": "predicate_devices",
                "columns": ["project_id", "is_selected"],
                "description": "Optimize selected predicate queries"
            },
            {
                "name": "idx_predicate_devices_confidence",
                "table": "predicate_devices",
                "columns": ["project_id", "confidence_score DESC"],
                "description": "Optimize confidence-based ordering"
            },
            
            # Agent interaction indexes
            {
                "name": "idx_agent_interactions_project",
                "table": "agent_interactions",
                "columns": ["project_id", "created_at DESC"],
                "description": "Optimize interaction history queries"
            },
            {
                "name": "idx_agent_interactions_action",
                "table": "agent_interactions",
                "columns": ["agent_action", "created_at DESC"],
                "description": "Optimize action-based queries"
            },
            {
                "name": "idx_agent_interactions_user",
                "table": "agent_interactions",
                "columns": ["user_id", "created_at DESC"],
                "description": "Optimize user activity queries"
            },
            
            # Project document indexes
            {
                "name": "idx_project_documents_project",
                "table": "project_documents",
                "columns": ["project_id", "created_at DESC"],
                "description": "Optimize document queries by project"
            },
            {
                "name": "idx_project_documents_type",
                "table": "project_documents",
                "columns": ["document_type"],
                "description": "Optimize document type filtering"
            },
            
            # Audit log indexes (if exists)
            {
                "name": "idx_audit_logs_timestamp",
                "table": "audit_logs",
                "columns": ["created_at DESC"],
                "description": "Optimize audit log queries by timestamp",
                "optional": True
            },
            {
                "name": "idx_audit_logs_user_action",
                "table": "audit_logs",
                "columns": ["user_id", "action", "created_at DESC"],
                "description": "Optimize audit queries by user and action",
                "optional": True
            }
        ]
        
        async with self.engine.begin() as conn:
            for index_config in indexes:
                try:
                    await self._create_index(conn, index_config)
                except Exception as e:
                    if index_config.get("optional", False):
                        logger.warning(f"Optional index {index_config['name']} skipped: {e}")
                    else:
                        logger.error(f"Failed to create index {index_config['name']}: {e}")
                        raise
        
        logger.info(f"Created {len(indexes)} performance indexes")
    
    async def _create_index(self, conn, index_config: Dict[str, Any]) -> None:
        """Create a single index"""
        name = index_config["name"]
        table = index_config["table"]
        columns = index_config["columns"]
        
        # Check if index already exists
        check_query = text(f"""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND name='{name}'
        """)
        result = await conn.execute(check_query)
        if result.fetchone():
            logger.debug(f"Index {name} already exists, skipping")
            return
        
        # Build CREATE INDEX statement
        columns_str = ", ".join(columns)
        create_query = text(f"""
            CREATE INDEX IF NOT EXISTS {name} 
            ON {table} ({columns_str})
        """)
        
        await conn.execute(create_query)
        logger.info(f"Created index: {name} on {table}({columns_str})")
    
    async def analyze_query_performance(self, query: str) -> Dict[str, Any]:
        """Analyze query performance using EXPLAIN QUERY PLAN"""
        async with self.engine.begin() as conn:
            explain_query = text(f"EXPLAIN QUERY PLAN {query}")
            result = await conn.execute(explain_query)
            rows = result.fetchall()
            
            analysis = {
                "query": query,
                "execution_plan": [
                    {
                        "id": row[0],
                        "parent": row[1], 
                        "notused": row[2],
                        "detail": row[3]
                    }
                    for row in rows
                ],
                "uses_index": any("USING INDEX" in str(row[3]) for row in rows),
                "table_scans": [row[3] for row in rows if "SCAN TABLE" in str(row[3])],
                "index_usage": [row[3] for row in rows if "USING INDEX" in str(row[3])]
            }
            
            return analysis
    
    async def get_table_statistics(self) -> Dict[str, Any]:
        """Get table statistics for performance monitoring"""
        stats = {}
        
        tables = [
            "users", "projects", "device_classifications", 
            "predicate_devices", "agent_interactions", "project_documents"
        ]
        
        async with self.engine.begin() as conn:
            for table in tables:
                try:
                    # Get row count
                    count_query = text(f"SELECT COUNT(*) FROM {table}")
                    count_result = await conn.execute(count_query)
                    row_count = count_result.scalar()
                    
                    # Get table info
                    info_query = text(f"PRAGMA table_info({table})")
                    info_result = await conn.execute(info_query)
                    columns = info_result.fetchall()
                    
                    # Get index info
                    index_query = text(f"PRAGMA index_list({table})")
                    index_result = await conn.execute(index_query)
                    indexes = index_result.fetchall()
                    
                    stats[table] = {
                        "row_count": row_count,
                        "column_count": len(columns),
                        "index_count": len(indexes),
                        "indexes": [idx[1] for idx in indexes]  # index names
                    }
                    
                except Exception as e:
                    logger.warning(f"Could not get stats for table {table}: {e}")
                    stats[table] = {"error": str(e)}
        
        return stats
    
    async def optimize_database(self) -> Dict[str, Any]:
        """Run database optimization commands"""
        optimization_results = {}
        
        async with self.engine.begin() as conn:
            # Analyze database for query optimization
            try:
                await conn.execute(text("ANALYZE"))
                optimization_results["analyze"] = "completed"
                logger.info("Database ANALYZE completed")
            except Exception as e:
                optimization_results["analyze"] = f"failed: {e}"
                logger.error(f"Database ANALYZE failed: {e}")
            
            # Vacuum database to reclaim space and optimize
            try:
                await conn.execute(text("VACUUM"))
                optimization_results["vacuum"] = "completed"
                logger.info("Database VACUUM completed")
            except Exception as e:
                optimization_results["vacuum"] = f"failed: {e}"
                logger.error(f"Database VACUUM failed: {e}")
            
            # Update SQLite statistics
            try:
                await conn.execute(text("PRAGMA optimize"))
                optimization_results["pragma_optimize"] = "completed"
                logger.info("PRAGMA optimize completed")
            except Exception as e:
                optimization_results["pragma_optimize"] = f"failed: {e}"
                logger.error(f"PRAGMA optimize failed: {e}")
        
        return optimization_results
    
    async def drop_performance_indexes(self) -> None:
        """Drop all performance indexes (for testing or reset)"""
        index_names = [
            "idx_projects_user_status", "idx_projects_user_updated",
            "idx_projects_name_search", "idx_projects_device_type",
            "idx_projects_status_created", "idx_users_google_id",
            "idx_users_email", "idx_device_classifications_project",
            "idx_device_classifications_product_code", "idx_device_classifications_device_class",
            "idx_predicate_devices_project", "idx_predicate_devices_k_number",
            "idx_predicate_devices_selected", "idx_predicate_devices_confidence",
            "idx_agent_interactions_project", "idx_agent_interactions_action",
            "idx_agent_interactions_user", "idx_project_documents_project",
            "idx_project_documents_type", "idx_audit_logs_timestamp",
            "idx_audit_logs_user_action"
        ]
        
        async with self.engine.begin() as conn:
            for index_name in index_names:
                try:
                    drop_query = text(f"DROP INDEX IF EXISTS {index_name}")
                    await conn.execute(drop_query)
                    logger.info(f"Dropped index: {index_name}")
                except Exception as e:
                    logger.warning(f"Could not drop index {index_name}: {e}")
        
        logger.info("Performance indexes cleanup completed")


async def create_performance_indexes(engine: AsyncEngine) -> None:
    """Convenience function to create all performance indexes"""
    manager = DatabaseIndexManager(engine)
    await manager.create_performance_indexes()


async def optimize_database(engine: AsyncEngine) -> Dict[str, Any]:
    """Convenience function to optimize database"""
    manager = DatabaseIndexManager(engine)
    return await manager.optimize_database()