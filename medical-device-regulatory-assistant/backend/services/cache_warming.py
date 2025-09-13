"""
Cache warming utilities for proactive cache management.

This module provides utilities for warming caches proactively,
including background tasks and scheduled cache warming operations.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass

from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from models.project import Project, ProjectStatus
from models.user import User
from models.device_classification import DeviceClassification
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction

from .project_cache import ProjectCacheService, get_project_cache_service
from .enhanced_project_service import EnhancedProjectService
from database.connection import get_database_manager

logger = logging.getLogger(__name__)


@dataclass
class CacheWarmingConfig:
    """Configuration for cache warming operations"""
    
    # Warming intervals (in seconds)
    DASHBOARD_WARMING_INTERVAL = 300  # 5 minutes
    PROJECT_LIST_WARMING_INTERVAL = 600  # 10 minutes
    STATS_WARMING_INTERVAL = 900  # 15 minutes
    
    # Warming thresholds
    MIN_PROJECTS_FOR_WARMING = 1  # Minimum projects to trigger warming
    MAX_PROJECTS_PER_BATCH = 50  # Maximum projects to warm in one batch
    
    # Priority settings
    WARM_ACTIVE_PROJECTS_FIRST = True
    WARM_RECENTLY_ACCESSED_FIRST = True
    
    # Background task settings
    ENABLE_BACKGROUND_WARMING = True
    BACKGROUND_TASK_INTERVAL = 1800  # 30 minutes


@dataclass
class CacheWarmingResult:
    """Result of cache warming operation"""
    operation_type: str
    success: bool
    items_warmed: int
    items_failed: int
    duration_seconds: float
    timestamp: datetime
    errors: List[str] = None


class CacheWarmingService:
    """
    Service for proactive cache warming and maintenance
    """
    
    def __init__(self):
        self.config = CacheWarmingConfig()
        self._db_manager = None
        self._cache_service: Optional[ProjectCacheService] = None
        self._project_service: Optional[EnhancedProjectService] = None
        self._warming_tasks: Set[asyncio.Task] = set()
    
    @property
    def db_manager(self):
        """Lazy initialization of database manager"""
        if self._db_manager is None:
            self._db_manager = get_database_manager()
        return self._db_manager
    
    async def _get_cache_service(self) -> ProjectCacheService:
        """Get cache service instance"""
        if self._cache_service is None:
            self._cache_service = await get_project_cache_service()
        return self._cache_service
    
    async def _get_project_service(self) -> EnhancedProjectService:
        """Get project service instance"""
        if self._project_service is None:
            from .enhanced_project_service import get_enhanced_project_service
            self._project_service = get_enhanced_project_service()
        return self._project_service
    
    async def warm_user_dashboard_caches(self, user_id: str) -> CacheWarmingResult:
        """
        Warm dashboard caches for all user projects
        """
        start_time = datetime.now()
        items_warmed = 0
        items_failed = 0
        errors = []
        
        try:
            async with self.db_manager.get_session() as session:
                # Get user projects with priority for active ones
                stmt = (
                    select(Project.id)
                    .join(User)
                    .where(User.google_id == user_id)
                    .order_by(
                        Project.status.desc(),  # Active projects first
                        Project.updated_at.desc()  # Recently updated first
                    )
                    .limit(self.config.MAX_PROJECTS_PER_BATCH)
                )
                
                result = await session.execute(stmt)
                project_ids = [row[0] for row in result.fetchall()]
            
            if len(project_ids) < self.config.MIN_PROJECTS_FOR_WARMING:
                return CacheWarmingResult(
                    operation_type="dashboard_warming",
                    success=True,
                    items_warmed=0,
                    items_failed=0,
                    duration_seconds=0,
                    timestamp=start_time,
                    errors=["Insufficient projects for warming"]
                )
            
            # Warm dashboard cache for each project
            project_service = await self._get_project_service()
            
            for project_id in project_ids:
                try:
                    # Get fresh dashboard data and cache it
                    dashboard_data = await project_service.get_dashboard_data(project_id, user_id)
                    items_warmed += 1
                    logger.debug(f"Warmed dashboard cache for project {project_id}")
                    
                except Exception as e:
                    items_failed += 1
                    error_msg = f"Failed to warm dashboard for project {project_id}: {str(e)}"
                    errors.append(error_msg)
                    logger.warning(error_msg)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return CacheWarmingResult(
                operation_type="dashboard_warming",
                success=items_failed == 0,
                items_warmed=items_warmed,
                items_failed=items_failed,
                duration_seconds=duration,
                timestamp=start_time,
                errors=errors if errors else None
            )
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            error_msg = f"Dashboard warming failed: {str(e)}"
            logger.error(error_msg)
            
            return CacheWarmingResult(
                operation_type="dashboard_warming",
                success=False,
                items_warmed=items_warmed,
                items_failed=items_failed + 1,
                duration_seconds=duration,
                timestamp=start_time,
                errors=[error_msg]
            )
    
    async def warm_project_list_caches(self, user_id: str) -> CacheWarmingResult:
        """
        Warm project list caches with common filter combinations
        """
        start_time = datetime.now()
        items_warmed = 0
        items_failed = 0
        errors = []
        
        try:
            project_service = await self._get_project_service()
            
            # Common filter combinations to warm
            filter_combinations = [
                {"search": None, "status": None, "device_type": None, "limit": 50, "offset": 0},
                {"search": None, "status": ProjectStatus.DRAFT, "device_type": None, "limit": 50, "offset": 0},
                {"search": None, "status": ProjectStatus.IN_PROGRESS, "device_type": None, "limit": 50, "offset": 0},
                {"search": None, "status": ProjectStatus.COMPLETED, "device_type": None, "limit": 50, "offset": 0},
            ]
            
            for filters in filter_combinations:
                try:
                    from .projects import ProjectSearchFilters
                    search_filters = ProjectSearchFilters(**filters)
                    
                    # This will cache the results
                    await project_service.list_projects(user_id, search_filters)
                    items_warmed += 1
                    logger.debug(f"Warmed project list cache with filters: {filters}")
                    
                except Exception as e:
                    items_failed += 1
                    error_msg = f"Failed to warm project list with filters {filters}: {str(e)}"
                    errors.append(error_msg)
                    logger.warning(error_msg)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return CacheWarmingResult(
                operation_type="project_list_warming",
                success=items_failed == 0,
                items_warmed=items_warmed,
                items_failed=items_failed,
                duration_seconds=duration,
                timestamp=start_time,
                errors=errors if errors else None
            )
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            error_msg = f"Project list warming failed: {str(e)}"
            logger.error(error_msg)
            
            return CacheWarmingResult(
                operation_type="project_list_warming",
                success=False,
                items_warmed=items_warmed,
                items_failed=items_failed + 1,
                duration_seconds=duration,
                timestamp=start_time,
                errors=[error_msg]
            )
    
    async def warm_project_stats_cache(self, user_id: str) -> CacheWarmingResult:
        """
        Warm project statistics cache for a user
        """
        start_time = datetime.now()
        
        try:
            project_service = await self._get_project_service()
            
            # This will cache the stats
            await project_service.get_project_stats(user_id)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return CacheWarmingResult(
                operation_type="stats_warming",
                success=True,
                items_warmed=1,
                items_failed=0,
                duration_seconds=duration,
                timestamp=start_time
            )
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            error_msg = f"Stats warming failed: {str(e)}"
            logger.error(error_msg)
            
            return CacheWarmingResult(
                operation_type="stats_warming",
                success=False,
                items_warmed=0,
                items_failed=1,
                duration_seconds=duration,
                timestamp=start_time,
                errors=[error_msg]
            )
    
    async def warm_all_user_caches(self, user_id: str) -> Dict[str, CacheWarmingResult]:
        """
        Warm all cache types for a user
        """
        results = {}
        
        # Warm dashboard caches
        results['dashboard'] = await self.warm_user_dashboard_caches(user_id)
        
        # Warm project list caches
        results['project_list'] = await self.warm_project_list_caches(user_id)
        
        # Warm stats cache
        results['stats'] = await self.warm_project_stats_cache(user_id)
        
        logger.info(f"Completed cache warming for user {user_id}: {results}")
        return results
    
    async def get_active_users_for_warming(self, hours_back: int = 24) -> List[str]:
        """
        Get list of users who have been active recently
        """
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours_back)
            
            async with self.db_manager.get_session() as session:
                # Get users with recent project activity
                stmt = (
                    select(User.google_id)
                    .join(Project)
                    .where(
                        or_(
                            Project.updated_at >= cutoff_time,
                            Project.created_at >= cutoff_time
                        )
                    )
                    .distinct()
                    .limit(100)  # Limit to prevent overwhelming
                )
                
                result = await session.execute(stmt)
                user_ids = [row[0] for row in result.fetchall()]
                
                logger.info(f"Found {len(user_ids)} active users for cache warming")
                return user_ids
                
        except Exception as e:
            logger.error(f"Failed to get active users: {e}")
            return []
    
    async def background_cache_warming_task(self):
        """
        Background task for periodic cache warming
        """
        if not self.config.ENABLE_BACKGROUND_WARMING:
            logger.info("Background cache warming is disabled")
            return
        
        logger.info("Starting background cache warming task")
        
        while True:
            try:
                # Get active users
                active_users = await self.get_active_users_for_warming()
                
                if not active_users:
                    logger.info("No active users found for cache warming")
                else:
                    # Warm caches for active users
                    warming_results = []
                    
                    for user_id in active_users:
                        try:
                            results = await self.warm_all_user_caches(user_id)
                            warming_results.append({
                                'user_id': user_id,
                                'results': results,
                                'success': all(r.success for r in results.values())
                            })
                            
                            # Small delay between users to prevent overwhelming
                            await asyncio.sleep(1)
                            
                        except Exception as e:
                            logger.warning(f"Cache warming failed for user {user_id}: {e}")
                            warming_results.append({
                                'user_id': user_id,
                                'success': False,
                                'error': str(e)
                            })
                    
                    # Log summary
                    successful_warmings = len([r for r in warming_results if r.get('success', False)])
                    logger.info(
                        f"Background cache warming completed: "
                        f"{successful_warmings}/{len(warming_results)} users successful"
                    )
                
                # Wait for next warming cycle
                await asyncio.sleep(self.config.BACKGROUND_TASK_INTERVAL)
                
            except Exception as e:
                logger.error(f"Background cache warming task error: {e}")
                # Wait before retrying
                await asyncio.sleep(60)
    
    async def start_background_warming(self):
        """
        Start background cache warming task
        """
        if self.config.ENABLE_BACKGROUND_WARMING:
            task = asyncio.create_task(self.background_cache_warming_task())
            self._warming_tasks.add(task)
            task.add_done_callback(self._warming_tasks.discard)
            logger.info("Background cache warming task started")
        else:
            logger.info("Background cache warming is disabled")
    
    async def stop_background_warming(self):
        """
        Stop all background warming tasks
        """
        for task in self._warming_tasks:
            task.cancel()
        
        if self._warming_tasks:
            await asyncio.gather(*self._warming_tasks, return_exceptions=True)
            self._warming_tasks.clear()
            logger.info("Background cache warming tasks stopped")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Health check for cache warming service
        """
        try:
            cache_service = await self._get_cache_service()
            cache_health = await cache_service.health_check()
            
            return {
                'status': 'healthy' if cache_health.get('status') == 'healthy' else 'unhealthy',
                'background_tasks_running': len(self._warming_tasks),
                'background_warming_enabled': self.config.ENABLE_BACKGROUND_WARMING,
                'cache_service_status': cache_health.get('status'),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }


# Global cache warming service instance
_cache_warming_service: Optional[CacheWarmingService] = None


def get_cache_warming_service() -> CacheWarmingService:
    """Get the global cache warming service instance"""
    global _cache_warming_service
    if _cache_warming_service is None:
        _cache_warming_service = CacheWarmingService()
    return _cache_warming_service


async def start_cache_warming_service():
    """Start the cache warming service with background tasks"""
    service = get_cache_warming_service()
    await service.start_background_warming()
    logger.info("Cache warming service started")


async def stop_cache_warming_service():
    """Stop the cache warming service"""
    global _cache_warming_service
    if _cache_warming_service:
        await _cache_warming_service.stop_background_warming()
        _cache_warming_service = None
        logger.info("Cache warming service stopped")