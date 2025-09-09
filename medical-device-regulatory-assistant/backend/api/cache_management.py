"""
API endpoints for cache management and monitoring.

This module provides REST endpoints for cache operations including
invalidation, warming, statistics, and health checks.
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from middleware.auth import get_current_user, TokenData
from services.enhanced_project_service import get_enhanced_project_service, EnhancedProjectService
from services.cache_warming import get_cache_warming_service, CacheWarmingService
from services.project_cache import get_project_cache_service, ProjectCacheService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cache", tags=["cache"])


class CacheInvalidationRequest(BaseModel):
    """Request model for cache invalidation"""
    project_id: Optional[int] = Field(None, description="Specific project ID to invalidate")
    invalidate_all_user_caches: bool = Field(False, description="Invalidate all user caches")


class CacheWarmingRequest(BaseModel):
    """Request model for cache warming"""
    project_id: Optional[int] = Field(None, description="Specific project ID to warm")
    warm_all_user_caches: bool = Field(False, description="Warm all user caches")
    cache_types: Optional[list] = Field(None, description="Specific cache types to warm")


class CacheStatsResponse(BaseModel):
    """Response model for cache statistics"""
    project_cache_keys: int
    project_cache_size_bytes: int
    general_stats: Dict[str, Any]
    cache_config: Dict[str, Any]
    timestamp: str


class CacheHealthResponse(BaseModel):
    """Response model for cache health check"""
    service_status: str
    cache_service: Dict[str, Any]
    database_service: Dict[str, Any]
    cache_warming_service: Dict[str, Any]
    timestamp: str


@router.post("/invalidate")
async def invalidate_cache(
    request: CacheInvalidationRequest,
    current_user: TokenData = Depends(get_current_user),
    project_service: EnhancedProjectService = Depends(get_enhanced_project_service)
):
    """
    Invalidate cache entries for projects
    
    This endpoint allows manual cache invalidation for debugging
    and maintenance purposes.
    """
    try:
        if request.project_id:
            # Invalidate specific project caches
            result = await project_service.invalidate_project_caches(
                request.project_id, 
                current_user.user_id
            )
            
            if not result['success']:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Cache invalidation failed: {result.get('error', 'Unknown error')}"
                )
            
            return {
                "message": f"Cache invalidated for project {request.project_id}",
                "invalidated_keys": result['invalidated_keys'],
                "timestamp": result['timestamp']
            }
        
        elif request.invalidate_all_user_caches:
            # Invalidate all user caches
            cache_service = await get_project_cache_service()
            invalidated_count = await cache_service.invalidate_user_project_caches(
                current_user.user_id
            )
            
            return {
                "message": f"All user caches invalidated",
                "invalidated_keys": invalidated_count,
                "timestamp": datetime.now().isoformat()
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify either project_id or invalidate_all_user_caches"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache invalidation failed: {str(e)}"
        )


@router.post("/warm")
async def warm_cache(
    request: CacheWarmingRequest,
    current_user: TokenData = Depends(get_current_user),
    project_service: EnhancedProjectService = Depends(get_enhanced_project_service),
    warming_service: CacheWarmingService = Depends(get_cache_warming_service)
):
    """
    Warm cache entries proactively
    
    This endpoint allows manual cache warming for performance optimization.
    """
    try:
        if request.project_id:
            # Warm specific project caches
            result = await project_service.warm_project_caches(
                request.project_id, 
                current_user.user_id
            )
            
            if not result['success']:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Cache warming failed: {result.get('error', 'Unknown error')}"
                )
            
            return {
                "message": f"Cache warmed for project {request.project_id}",
                "warmed_caches": result['warmed_caches'],
                "timestamp": result['timestamp']
            }
        
        elif request.warm_all_user_caches:
            # Warm all user caches
            results = await warming_service.warm_all_user_caches(current_user.user_id)
            
            # Check if any warming failed
            failed_operations = [op for op, result in results.items() if not result.success]
            
            if failed_operations:
                logger.warning(f"Some cache warming operations failed: {failed_operations}")
            
            return {
                "message": "User caches warming completed",
                "results": {
                    op: {
                        "success": result.success,
                        "items_warmed": result.items_warmed,
                        "items_failed": result.items_failed,
                        "duration_seconds": result.duration_seconds,
                        "errors": result.errors
                    }
                    for op, result in results.items()
                },
                "timestamp": datetime.now().isoformat()
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify either project_id or warm_all_user_caches"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cache warming error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache warming failed: {str(e)}"
        )


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    current_user: TokenData = Depends(get_current_user),
    project_service: EnhancedProjectService = Depends(get_enhanced_project_service)
):
    """
    Get comprehensive cache statistics
    
    Returns detailed information about cache usage, hit rates,
    and performance metrics.
    """
    try:
        stats = await project_service.get_cache_stats()
        
        return CacheStatsResponse(
            project_cache_keys=stats.get('project_cache_keys', 0),
            project_cache_size_bytes=stats.get('project_cache_size_bytes', 0),
            general_stats=stats.get('general_stats', {}),
            cache_config=stats.get('cache_config', {}),
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache statistics: {str(e)}"
        )


@router.get("/health", response_model=CacheHealthResponse)
async def cache_health_check(
    current_user: TokenData = Depends(get_current_user),
    project_service: EnhancedProjectService = Depends(get_enhanced_project_service),
    warming_service: CacheWarmingService = Depends(get_cache_warming_service)
):
    """
    Perform comprehensive cache health check
    
    Checks the health of cache service, database connectivity,
    and cache warming service.
    """
    try:
        # Get health from project service (includes cache and database)
        service_health = await project_service.health_check()
        
        # Get cache warming service health
        warming_health = await warming_service.health_check()
        
        overall_status = 'healthy'
        if (service_health.get('service_status') != 'healthy' or 
            warming_health.get('status') != 'healthy'):
            overall_status = 'unhealthy'
        
        return CacheHealthResponse(
            service_status=overall_status,
            cache_service=service_health.get('cache_service', {}),
            database_service=service_health.get('database_service', {}),
            cache_warming_service=warming_health,
            timestamp=service_health.get('timestamp', datetime.now().isoformat())
        )
    
    except Exception as e:
        logger.error(f"Cache health check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache health check failed: {str(e)}"
        )


@router.get("/keys")
async def list_cache_keys(
    pattern: Optional[str] = Query(None, description="Pattern to filter cache keys"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of keys to return"),
    current_user: TokenData = Depends(get_current_user)
):
    """
    List cache keys (for debugging purposes)
    
    This endpoint is useful for debugging and monitoring cache contents.
    """
    try:
        cache_service = await get_project_cache_service()
        redis_client = await cache_service._get_redis_client()
        
        if not redis_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis cache service not available"
            )
        
        # Default pattern for user's project caches
        if not pattern:
            pattern = f"mdra:*{current_user.user_id}*"
        
        keys = []
        count = 0
        
        async for key in redis_client.scan_iter(match=pattern):
            if count >= limit:
                break
            
            # Get key info
            key_type = await redis_client.type(key)
            ttl = await redis_client.ttl(key)
            
            keys.append({
                "key": key.decode() if isinstance(key, bytes) else key,
                "type": key_type.decode() if isinstance(key_type, bytes) else key_type,
                "ttl": ttl if ttl > 0 else None
            })
            count += 1
        
        return {
            "keys": keys,
            "total_found": len(keys),
            "pattern": pattern,
            "limit": limit,
            "timestamp": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List cache keys error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list cache keys: {str(e)}"
        )


@router.delete("/keys")
async def delete_cache_key(
    key: str = Query(..., description="Cache key to delete"),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Delete a specific cache key (for debugging purposes)
    
    This endpoint allows manual deletion of specific cache keys.
    """
    try:
        # Security check: only allow deletion of user's own cache keys
        if current_user.user_id not in key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete your own cache keys"
            )
        
        cache_service = await get_project_cache_service()
        redis_client = await cache_service._get_redis_client()
        
        if not redis_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis cache service not available"
            )
        
        deleted = await redis_client.delete(key)
        
        return {
            "message": f"Cache key {'deleted' if deleted else 'not found'}",
            "key": key,
            "deleted": bool(deleted),
            "timestamp": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete cache key error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete cache key: {str(e)}"
        )


@router.post("/warm/background")
async def trigger_background_warming(
    current_user: TokenData = Depends(get_current_user),
    warming_service: CacheWarmingService = Depends(get_cache_warming_service)
):
    """
    Trigger immediate background cache warming for active users
    
    This endpoint manually triggers the background warming process
    without waiting for the scheduled interval.
    """
    try:
        # Get active users
        active_users = await warming_service.get_active_users_for_warming()
        
        if not active_users:
            return {
                "message": "No active users found for cache warming",
                "active_users": 0,
                "timestamp": datetime.now().isoformat()
            }
        
        # Start warming for active users (async)
        warming_results = []
        
        for user_id in active_users[:10]:  # Limit to first 10 users
            try:
                results = await warming_service.warm_all_user_caches(user_id)
                warming_results.append({
                    'user_id': user_id,
                    'success': all(r.success for r in results.values()),
                    'cache_types_warmed': len(results)
                })
            except Exception as e:
                warming_results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(e)
                })
        
        successful_warmings = len([r for r in warming_results if r.get('success', False)])
        
        return {
            "message": "Background cache warming completed",
            "active_users": len(active_users),
            "users_processed": len(warming_results),
            "successful_warmings": successful_warmings,
            "results": warming_results,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Background warming trigger error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger background warming: {str(e)}"
        )