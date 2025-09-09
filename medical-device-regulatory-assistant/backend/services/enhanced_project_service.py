"""
Enhanced Project Service with comprehensive caching integration.

This service extends the base project service with intelligent caching,
cache warming, and invalidation strategies for optimal performance.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, and_, or_, func
from fastapi import HTTPException, status

# Import base service and models
from .projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectDashboardData,
    ProjectSearchFilters,
    ProjectExportData
)
from .project_cache import (
    ProjectCacheService,
    CacheInvalidationEvent,
    get_project_cache_service
)

from models.project import Project, ProjectStatus
from models.user import User

logger = logging.getLogger(__name__)


class EnhancedProjectService(ProjectService):
    """
    Enhanced project service with comprehensive caching integration
    """
    
    def __init__(self):
        super().__init__()
        self._cache_service: Optional[ProjectCacheService] = None
    
    async def _get_cache_service(self) -> ProjectCacheService:
        """Get project cache service instance"""
        if self._cache_service is None:
            self._cache_service = await get_project_cache_service()
        return self._cache_service
    
    async def create_project(
        self, 
        project_data: ProjectCreateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """
        Create a new project with cache warming
        """
        # Create project using base service
        project_response = await super().create_project(project_data, user_id)
        
        # Warm caches after creation
        cache_service = await self._get_cache_service()
        try:
            # Cache the new project detail
            await cache_service.cache_project_detail(
                project_response.id,
                project_response.model_dump()
            )
            
            # Invalidate user project lists to include new project
            await cache_service.invalidate_user_project_caches(user_id)
            
            logger.info(f"Caches warmed for new project {project_response.id}")
            
        except Exception as e:
            logger.warning(f"Cache warming failed for new project: {e}")
        
        return project_response
    
    async def get_project(
        self, 
        project_id: int, 
        user_id: str
    ) -> ProjectResponse:
        """
        Get project with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            cached_project = await cache_service.get_project_detail(project_id)
            if cached_project:
                logger.debug(f"Project {project_id} retrieved from cache")
                return ProjectResponse(**cached_project)
        except Exception as e:
            logger.warning(f"Cache retrieval failed for project {project_id}: {e}")
        
        # Get from database
        project_response = await super().get_project(project_id, user_id)
        
        # Cache the result
        try:
            await cache_service.cache_project_detail(
                project_id,
                project_response.model_dump()
            )
            logger.debug(f"Project {project_id} cached after database retrieval")
        except Exception as e:
            logger.warning(f"Cache storage failed for project {project_id}: {e}")
        
        return project_response
    
    async def update_project(
        self, 
        project_id: int, 
        project_data: ProjectUpdateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """
        Update project with cache invalidation and warming
        """
        # Update project using base service
        project_response = await super().update_project(project_id, project_data, user_id)
        
        # Handle cache invalidation and warming
        cache_service = await self._get_cache_service()
        try:
            # Create invalidation event
            invalidation_event = CacheInvalidationEvent(
                event_type='project_update',
                project_id=project_id,
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                metadata={'updated_fields': list(project_data.model_dump(exclude_unset=True).keys())}
            )
            
            # Handle cache invalidation
            await cache_service.handle_cache_invalidation_event(invalidation_event)
            
            # Warm caches with fresh data
            await cache_service.warm_project_caches_on_update(
                project_id,
                user_id,
                project_response.model_dump()
            )
            
            logger.info(f"Caches updated for project {project_id}")
            
        except Exception as e:
            logger.warning(f"Cache update failed for project {project_id}: {e}")
        
        return project_response
    
    async def delete_project(
        self, 
        project_id: int, 
        user_id: str
    ) -> Dict[str, str]:
        """
        Delete project with cache invalidation
        """
        # Delete project using base service
        result = await super().delete_project(project_id, user_id)
        
        # Invalidate all related caches
        cache_service = await self._get_cache_service()
        try:
            await cache_service.invalidate_project_cache(project_id, user_id)
            logger.info(f"Caches invalidated for deleted project {project_id}")
        except Exception as e:
            logger.warning(f"Cache invalidation failed for deleted project {project_id}: {e}")
        
        return result
    
    async def list_projects(
        self, 
        user_id: str, 
        filters: ProjectSearchFilters
    ) -> List[ProjectResponse]:
        """
        List projects with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            filters_dict = filters.model_dump()
            cached_projects = await cache_service.get_project_list(user_id, filters_dict)
            if cached_projects:
                logger.debug(f"Project list retrieved from cache for user {user_id}")
                return [ProjectResponse(**project) for project in cached_projects]
        except Exception as e:
            logger.warning(f"Cache retrieval failed for project list: {e}")
        
        # Get from database
        projects = await super().list_projects(user_id, filters)
        
        # Cache the result
        try:
            projects_data = [project.model_dump() for project in projects]
            await cache_service.cache_project_list(
                user_id,
                filters.model_dump(),
                projects_data
            )
            logger.debug(f"Project list cached for user {user_id}")
        except Exception as e:
            logger.warning(f"Cache storage failed for project list: {e}")
        
        return projects
    
    async def get_dashboard_data(
        self, 
        project_id: int, 
        user_id: str
    ) -> ProjectDashboardData:
        """
        Get dashboard data with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            cached_dashboard = await cache_service.get_project_dashboard(project_id)
            if cached_dashboard:
                logger.debug(f"Dashboard data retrieved from cache for project {project_id}")
                return ProjectDashboardData(**cached_dashboard)
        except Exception as e:
            logger.warning(f"Cache retrieval failed for dashboard data: {e}")
        
        # Get from database
        dashboard_data = await super().get_dashboard_data(project_id, user_id)
        
        # Cache the result
        try:
            await cache_service.cache_project_dashboard(
                project_id,
                dashboard_data.model_dump()
            )
            logger.debug(f"Dashboard data cached for project {project_id}")
        except Exception as e:
            logger.warning(f"Cache storage failed for dashboard data: {e}")
        
        return dashboard_data
    
    async def export_project(
        self, 
        project_id: int, 
        user_id: str, 
        format_type: str = "json"
    ) -> ProjectExportData:
        """
        Export project with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            cached_export = await cache_service.get_project_export(project_id, format_type)
            if cached_export:
                logger.debug(f"Export data retrieved from cache for project {project_id}")
                return ProjectExportData(**cached_export)
        except Exception as e:
            logger.warning(f"Cache retrieval failed for export data: {e}")
        
        # Get from database
        export_data = await super().export_project(project_id, user_id, format_type)
        
        # Cache the result
        try:
            await cache_service.cache_project_export(
                project_id,
                format_type,
                export_data.model_dump()
            )
            logger.debug(f"Export data cached for project {project_id}")
        except Exception as e:
            logger.warning(f"Cache storage failed for export data: {e}")
        
        return export_data
    
    # Additional enhanced methods
    async def get_project_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get user project statistics with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            cached_stats = await cache_service.get_project_stats(user_id)
            if cached_stats:
                logger.debug(f"Project stats retrieved from cache for user {user_id}")
                return cached_stats
        except Exception as e:
            logger.warning(f"Cache retrieval failed for project stats: {e}")
        
        # Calculate stats from database
        async with self.db_manager.get_session() as session:
            # Get user projects with counts
            stmt = (
                select(
                    func.count(Project.id).label('total_projects'),
                    func.count(Project.id).filter(Project.status == ProjectStatus.DRAFT).label('draft_projects'),
                    func.count(Project.id).filter(Project.status == ProjectStatus.IN_PROGRESS).label('in_progress_projects'),
                    func.count(Project.id).filter(Project.status == ProjectStatus.COMPLETED).label('completed_projects')
                )
                .select_from(Project)
                .join(User)
                .where(User.google_id == user_id)
            )
            
            result = await session.execute(stmt)
            stats_row = result.first()
            
            stats = {
                'total_projects': stats_row.total_projects or 0,
                'draft_projects': stats_row.draft_projects or 0,
                'in_progress_projects': stats_row.in_progress_projects or 0,
                'completed_projects': stats_row.completed_projects or 0,
                'completion_rate': (
                    (stats_row.completed_projects or 0) / (stats_row.total_projects or 1) * 100
                ),
                'last_updated': datetime.now(timezone.utc).isoformat()
            }
        
        # Cache the result
        try:
            await cache_service.cache_project_stats(user_id, stats)
            logger.debug(f"Project stats cached for user {user_id}")
        except Exception as e:
            logger.warning(f"Cache storage failed for project stats: {e}")
        
        return stats
    
    async def search_projects(
        self, 
        search_query: str, 
        user_id: str, 
        limit: int = 20
    ) -> List[ProjectResponse]:
        """
        Search projects with caching
        """
        cache_service = await self._get_cache_service()
        
        # Try to get from cache first
        try:
            cached_results = await cache_service.get_project_search(search_query, user_id)
            if cached_results:
                logger.debug(f"Search results retrieved from cache for query: {search_query}")
                return [ProjectResponse(**project) for project in cached_results[:limit]]
        except Exception as e:
            logger.warning(f"Cache retrieval failed for search results: {e}")
        
        # Search in database
        filters = ProjectSearchFilters(search=search_query, limit=limit)
        projects = await self.list_projects(user_id, filters)
        
        # Cache the result
        try:
            projects_data = [project.model_dump() for project in projects]
            await cache_service.cache_project_search(search_query, user_id, projects_data)
            logger.debug(f"Search results cached for query: {search_query}")
        except Exception as e:
            logger.warning(f"Cache storage failed for search results: {e}")
        
        return projects
    
    # Cache management methods
    async def invalidate_project_caches(self, project_id: int, user_id: str) -> Dict[str, Any]:
        """
        Manually invalidate all caches for a project
        """
        cache_service = await self._get_cache_service()
        
        try:
            invalidated_count = await cache_service.invalidate_project_cache(project_id, user_id)
            return {
                'success': True,
                'project_id': project_id,
                'invalidated_keys': invalidated_count,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Manual cache invalidation failed: {e}")
            return {
                'success': False,
                'project_id': project_id,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    async def warm_project_caches(
        self, 
        project_id: int, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        Manually warm caches for a project
        """
        try:
            # Get fresh data from database
            project_response = await super().get_project(project_id, user_id)
            dashboard_data = await super().get_dashboard_data(project_id, user_id)
            
            # Warm caches
            cache_service = await self._get_cache_service()
            results = await cache_service.warm_project_caches_on_update(
                project_id,
                user_id,
                project_response.model_dump(),
                dashboard_data.model_dump()
            )
            
            return {
                'success': True,
                'project_id': project_id,
                'warmed_caches': results,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Manual cache warming failed: {e}")
            return {
                'success': False,
                'project_id': project_id,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive cache statistics
        """
        cache_service = await self._get_cache_service()
        return await cache_service.get_project_cache_stats()
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check including cache service
        """
        cache_service = await self._get_cache_service()
        cache_health = await cache_service.health_check()
        
        # Test database connectivity
        try:
            async with self.db_manager.get_session() as session:
                from sqlalchemy import text
                await session.execute(text("SELECT 1"))
            
            db_health = {
                'status': 'healthy',
                'database_available': True
            }
        except Exception as e:
            db_health = {
                'status': 'unhealthy',
                'database_available': False,
                'error': str(e)
            }
        
        return {
            'service_status': 'healthy' if (
                cache_health.get('status') == 'healthy' and 
                db_health.get('status') == 'healthy'
            ) else 'unhealthy',
            'cache_service': cache_health,
            'database_service': db_health,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


# Factory function for creating enhanced project service
def create_enhanced_project_service() -> EnhancedProjectService:
    """
    Create enhanced project service instance
    
    Returns:
        Configured enhanced project service
    """
    return EnhancedProjectService()


# Global enhanced project service instance
_enhanced_project_service: Optional[EnhancedProjectService] = None


def get_enhanced_project_service() -> EnhancedProjectService:
    """Get the global enhanced project service instance"""
    global _enhanced_project_service
    if _enhanced_project_service is None:
        _enhanced_project_service = create_enhanced_project_service()
    return _enhanced_project_service