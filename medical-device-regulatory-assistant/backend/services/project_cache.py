"""
Project-specific caching service for enhanced performance.

This service provides Redis-based caching specifically for project data,
including dashboard data, search results, and frequently accessed project information.
"""

import json
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass

import redis.asyncio as redis
from pydantic import BaseModel

from .cache import get_redis_client
from .performance_cache import CacheManager

logger = logging.getLogger(__name__)


class ProjectCacheKeys:
    """Centralized cache key management for projects"""
    
    @staticmethod
    def project_detail(project_id: int) -> str:
        """Cache key for project detail data"""
        return f"project:detail:{project_id}"
    
    @staticmethod
    def project_dashboard(project_id: int) -> str:
        """Cache key for project dashboard data"""
        return f"project:dashboard:{project_id}"
    
    @staticmethod
    def project_list(user_id: str, filters_hash: str) -> str:
        """Cache key for project list with filters"""
        return f"project:list:{user_id}:{filters_hash}"
    
    @staticmethod
    def project_export(project_id: int, format_type: str) -> str:
        """Cache key for project export data"""
        return f"project:export:{project_id}:{format_type}"
    
    @staticmethod
    def project_stats(user_id: str) -> str:
        """Cache key for user project statistics"""
        return f"project:stats:{user_id}"
    
    @staticmethod
    def project_search(search_query: str, user_id: str) -> str:
        """Cache key for project search results"""
        query_hash = hashlib.md5(search_query.encode()).hexdigest()
        return f"project:search:{user_id}:{query_hash}"
    
    @staticmethod
    def user_projects_pattern(user_id: str) -> str:
        """Pattern for all user project cache keys"""
        return f"project:*:{user_id}:*"
    
    @staticmethod
    def project_pattern(project_id: int) -> str:
        """Pattern for all cache keys related to a specific project"""
        return f"project:*:{project_id}*"


class ProjectCacheConfig:
    """Configuration for project caching TTLs and settings"""
    
    # TTL configurations (in seconds)
    PROJECT_DETAIL_TTL = 1800  # 30 minutes
    PROJECT_DASHBOARD_TTL = 300  # 5 minutes (frequently updated)
    PROJECT_LIST_TTL = 600  # 10 minutes
    PROJECT_EXPORT_TTL = 3600  # 1 hour
    PROJECT_STATS_TTL = 900  # 15 minutes
    PROJECT_SEARCH_TTL = 1200  # 20 minutes
    
    # Cache warming settings
    WARM_CACHE_ON_UPDATE = True
    WARM_DASHBOARD_ON_PROJECT_CHANGE = True
    
    # Invalidation settings
    INVALIDATE_ON_PROJECT_UPDATE = True
    INVALIDATE_RELATED_ON_CLASSIFICATION_UPDATE = True
    INVALIDATE_RELATED_ON_PREDICATE_UPDATE = True


@dataclass
class CacheInvalidationEvent:
    """Event data for cache invalidation"""
    event_type: str  # 'project_update', 'classification_update', 'predicate_update'
    project_id: int
    user_id: str
    timestamp: datetime
    metadata: Dict[str, Any] = None


class ProjectCacheService:
    """
    Enhanced caching service specifically for project data with intelligent
    invalidation and cache warming strategies.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.config = ProjectCacheConfig()
        self._cache_manager: Optional[CacheManager] = None
    
    async def _get_redis_client(self) -> Optional[redis.Redis]:
        """Get Redis client instance"""
        if self.redis_client is None:
            self.redis_client = await get_redis_client()
        return self.redis_client
    
    async def _get_cache_manager(self) -> Optional[CacheManager]:
        """Get cache manager instance"""
        if self._cache_manager is None:
            redis_client = await self._get_redis_client()
            if redis_client:
                self._cache_manager = CacheManager(redis_client)
        return self._cache_manager
    
    def _generate_filters_hash(self, filters: Dict[str, Any]) -> str:
        """Generate hash for filter parameters"""
        # Sort filters for consistent hashing
        sorted_filters = json.dumps(filters, sort_keys=True, default=str)
        return hashlib.md5(sorted_filters.encode()).hexdigest()
    
    # Project Detail Caching
    async def cache_project_detail(
        self, 
        project_id: int, 
        project_data: Dict[str, Any]
    ) -> bool:
        """Cache project detail data"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        cache_key = ProjectCacheKeys.project_detail(project_id)
        return await cache_manager.cache.set(
            "project_detail", 
            str(project_id), 
            project_data, 
            self.config.PROJECT_DETAIL_TTL
        )
    
    async def get_project_detail(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Get cached project detail data"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        return await cache_manager.cache.get("project_detail", str(project_id))
    
    # Project Dashboard Caching
    async def cache_project_dashboard(
        self, 
        project_id: int, 
        dashboard_data: Dict[str, Any]
    ) -> bool:
        """Cache project dashboard data with short TTL for real-time updates"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        return await cache_manager.cache_project_dashboard(
            project_id, 
            dashboard_data, 
            self.config.PROJECT_DASHBOARD_TTL
        )
    
    async def get_project_dashboard(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Get cached project dashboard data"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        return await cache_manager.get_project_dashboard(project_id)
    
    # Project List Caching
    async def cache_project_list(
        self, 
        user_id: str, 
        filters: Dict[str, Any], 
        projects_data: List[Dict[str, Any]]
    ) -> bool:
        """Cache project list with filters"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        filters_hash = self._generate_filters_hash(filters)
        cache_key = f"{user_id}:{filters_hash}"
        
        return await cache_manager.cache.set(
            "project_list", 
            cache_key, 
            projects_data, 
            self.config.PROJECT_LIST_TTL
        )
    
    async def get_project_list(
        self, 
        user_id: str, 
        filters: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached project list"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        filters_hash = self._generate_filters_hash(filters)
        cache_key = f"{user_id}:{filters_hash}"
        
        return await cache_manager.cache.get("project_list", cache_key)
    
    # Project Export Caching
    async def cache_project_export(
        self, 
        project_id: int, 
        format_type: str, 
        export_data: Dict[str, Any]
    ) -> bool:
        """Cache project export data"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        cache_key = f"{project_id}:{format_type}"
        return await cache_manager.cache.set(
            "project_export", 
            cache_key, 
            export_data, 
            self.config.PROJECT_EXPORT_TTL
        )
    
    async def get_project_export(
        self, 
        project_id: int, 
        format_type: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached project export data"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        cache_key = f"{project_id}:{format_type}"
        return await cache_manager.cache.get("project_export", cache_key)
    
    # Project Statistics Caching
    async def cache_project_stats(
        self, 
        user_id: str, 
        stats_data: Dict[str, Any]
    ) -> bool:
        """Cache user project statistics"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        return await cache_manager.cache.set(
            "project_stats", 
            user_id, 
            stats_data, 
            self.config.PROJECT_STATS_TTL
        )
    
    async def get_project_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached project statistics"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        return await cache_manager.cache.get("project_stats", user_id)
    
    # Project Search Caching
    async def cache_project_search(
        self, 
        search_query: str, 
        user_id: str, 
        search_results: List[Dict[str, Any]]
    ) -> bool:
        """Cache project search results"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return False
        
        query_hash = hashlib.md5(search_query.encode()).hexdigest()
        cache_key = f"{user_id}:{query_hash}"
        
        return await cache_manager.cache.set(
            "project_search", 
            cache_key, 
            search_results, 
            self.config.PROJECT_SEARCH_TTL
        )
    
    async def get_project_search(
        self, 
        search_query: str, 
        user_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached project search results"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return None
        
        query_hash = hashlib.md5(search_query.encode()).hexdigest()
        cache_key = f"{user_id}:{query_hash}"
        
        return await cache_manager.cache.get("project_search", cache_key)
    
    # Cache Invalidation Methods
    async def invalidate_project_cache(self, project_id: int, user_id: str) -> int:
        """
        Invalidate all cache entries related to a specific project
        
        Returns:
            Number of cache entries invalidated
        """
        redis_client = await self._get_redis_client()
        if not redis_client:
            return 0
        
        invalidated_count = 0
        
        try:
            # Invalidate project detail
            detail_key = f"mdra:project_detail:{project_id}"
            if await redis_client.delete(detail_key):
                invalidated_count += 1
            
            # Invalidate project dashboard
            dashboard_key = f"mdra:project_dashboard:{project_id}"
            if await redis_client.delete(dashboard_key):
                invalidated_count += 1
            
            # Invalidate project exports
            export_patterns = [
                f"mdra:project_export:{project_id}:json",
                f"mdra:project_export:{project_id}:pdf"
            ]
            for pattern in export_patterns:
                if await redis_client.delete(pattern):
                    invalidated_count += 1
            
            # Invalidate user-related caches
            user_patterns = [
                f"mdra:project_list:*{user_id}*",
                f"mdra:project_stats:{user_id}",
                f"mdra:project_search:{user_id}:*"
            ]
            
            for pattern in user_patterns:
                keys_to_delete = []
                async for key in redis_client.scan_iter(match=pattern):
                    keys_to_delete.append(key)
                
                for key in keys_to_delete:
                    if await redis_client.delete(key):
                        invalidated_count += 1
            
            logger.info(f"Invalidated {invalidated_count} cache entries for project {project_id}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Error invalidating project cache: {e}")
            return 0
    
    async def invalidate_user_project_caches(self, user_id: str) -> int:
        """
        Invalidate all project-related cache entries for a user
        
        Returns:
            Number of cache entries invalidated
        """
        redis_client = await self._get_redis_client()
        if not redis_client:
            return 0
        
        invalidated_count = 0
        
        try:
            # Patterns for user-specific caches
            patterns = [
                f"mdra:project_list:*{user_id}*",
                f"mdra:project_stats:{user_id}",
                f"mdra:project_search:{user_id}:*"
            ]
            
            for pattern in patterns:
                async for key in redis_client.scan_iter(match=pattern):
                    if await redis_client.delete(key):
                        invalidated_count += 1
            
            logger.info(f"Invalidated {invalidated_count} user cache entries for user {user_id}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Error invalidating user project caches: {e}")
            return 0
    
    # Cache Warming Methods
    async def warm_project_dashboard(
        self, 
        project_id: int, 
        dashboard_data: Dict[str, Any]
    ) -> bool:
        """
        Warm the cache with fresh dashboard data
        """
        if self.config.WARM_DASHBOARD_ON_PROJECT_CHANGE:
            return await self.cache_project_dashboard(project_id, dashboard_data)
        return False
    
    async def warm_project_caches_on_update(
        self, 
        project_id: int, 
        user_id: str, 
        project_data: Dict[str, Any],
        dashboard_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, bool]:
        """
        Warm multiple caches after a project update
        
        Returns:
            Dictionary indicating success/failure for each cache type
        """
        results = {}
        
        if self.config.WARM_CACHE_ON_UPDATE:
            # Warm project detail cache
            results['project_detail'] = await self.cache_project_detail(
                project_id, project_data
            )
            
            # Warm dashboard cache if data provided
            if dashboard_data and self.config.WARM_DASHBOARD_ON_PROJECT_CHANGE:
                results['project_dashboard'] = await self.cache_project_dashboard(
                    project_id, dashboard_data
                )
        
        return results
    
    # Event-driven Cache Management
    async def handle_cache_invalidation_event(
        self, 
        event: CacheInvalidationEvent
    ) -> Dict[str, Any]:
        """
        Handle cache invalidation based on events
        
        Returns:
            Dictionary with invalidation results
        """
        results = {
            'event_type': event.event_type,
            'project_id': event.project_id,
            'user_id': event.user_id,
            'timestamp': event.timestamp.isoformat(),
            'invalidated_keys': 0,
            'success': False
        }
        
        try:
            if event.event_type == 'project_update':
                # Invalidate all project-related caches
                invalidated = await self.invalidate_project_cache(
                    event.project_id, event.user_id
                )
                results['invalidated_keys'] = invalidated
                results['success'] = True
                
            elif event.event_type in ['classification_update', 'predicate_update']:
                # Invalidate dashboard and export caches (detail can stay)
                redis_client = await self._get_redis_client()
                if redis_client:
                    dashboard_key = f"mdra:project_dashboard:{event.project_id}"
                    export_keys = [
                        f"mdra:project_export:{event.project_id}:json",
                        f"mdra:project_export:{event.project_id}:pdf"
                    ]
                    
                    invalidated = 0
                    if await redis_client.delete(dashboard_key):
                        invalidated += 1
                    
                    for key in export_keys:
                        if await redis_client.delete(key):
                            invalidated += 1
                    
                    results['invalidated_keys'] = invalidated
                    results['success'] = True
            
            logger.info(f"Cache invalidation event handled: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error handling cache invalidation event: {e}")
            results['error'] = str(e)
            return results
    
    # Cache Statistics and Monitoring
    async def get_project_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about project cache usage"""
        cache_manager = await self._get_cache_manager()
        if not cache_manager:
            return {"error": "Cache manager not available"}
        
        try:
            # Get general cache stats
            general_stats = await cache_manager.get_cache_stats()
            
            # Get project-specific stats
            redis_client = await self._get_redis_client()
            if not redis_client:
                return {"error": "Redis client not available"}
            
            project_keys = 0
            project_size = 0
            
            # Count project-related keys
            patterns = [
                "mdra:project_detail:*",
                "mdra:project_dashboard:*",
                "mdra:project_list:*",
                "mdra:project_export:*",
                "mdra:project_stats:*",
                "mdra:project_search:*"
            ]
            
            for pattern in patterns:
                async for key in redis_client.scan_iter(match=pattern):
                    project_keys += 1
                    # Get key size (approximate)
                    try:
                        key_size = await redis_client.memory_usage(key)
                        if key_size:
                            project_size += key_size
                    except:
                        # Memory usage command might not be available
                        pass
            
            return {
                "project_cache_keys": project_keys,
                "project_cache_size_bytes": project_size,
                "general_stats": general_stats.dict() if hasattr(general_stats, 'dict') else general_stats,
                "cache_config": {
                    "project_detail_ttl": self.config.PROJECT_DETAIL_TTL,
                    "project_dashboard_ttl": self.config.PROJECT_DASHBOARD_TTL,
                    "project_list_ttl": self.config.PROJECT_LIST_TTL,
                    "warm_cache_on_update": self.config.WARM_CACHE_ON_UPDATE
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting project cache stats: {e}")
            return {"error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on project cache service"""
        try:
            redis_client = await self._get_redis_client()
            if not redis_client:
                return {
                    "status": "unhealthy",
                    "error": "Redis client not available",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Test basic operations
            test_key = "health_check_project_cache"
            test_data = {"test": True, "timestamp": datetime.now().isoformat()}
            
            # Test set
            await self.cache_project_detail(999999, test_data)
            
            # Test get
            retrieved = await self.get_project_detail(999999)
            
            # Test delete
            await self.invalidate_project_cache(999999, "health_check_user")
            
            return {
                "status": "healthy",
                "operations_successful": retrieved is not None,
                "redis_available": True,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Factory function for creating project cache service
async def create_project_cache_service() -> ProjectCacheService:
    """
    Create project cache service with Redis connection
    
    Returns:
        Configured project cache service instance
    """
    try:
        redis_client = await get_redis_client()
        if not redis_client:
            logger.warning("Redis not available, project cache service will be disabled")
        
        service = ProjectCacheService(redis_client)
        logger.info("Project cache service created successfully")
        return service
        
    except Exception as e:
        logger.error(f"Failed to create project cache service: {e}")
        # Return service anyway, it will handle missing Redis gracefully
        return ProjectCacheService(None)


# Global project cache service instance
_project_cache_service: Optional[ProjectCacheService] = None


async def get_project_cache_service() -> ProjectCacheService:
    """Get the global project cache service instance"""
    global _project_cache_service
    if _project_cache_service is None:
        _project_cache_service = await create_project_cache_service()
    return _project_cache_service