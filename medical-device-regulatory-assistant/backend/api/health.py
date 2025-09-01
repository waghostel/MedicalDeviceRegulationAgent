"""Health check API endpoints."""

from fastapi import APIRouter, HTTPException, status
from services.health import HealthChecker, SystemHealth, HealthStatus

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/", response_model=SystemHealth)
async def health_check() -> SystemHealth:
    """
    Comprehensive health check for all system components.
    
    Returns:
        SystemHealth: Overall system health status including all services
    """
    checker = HealthChecker()
    health_status = await checker.check_all()
    
    # Return 503 if system is unhealthy
    if health_status.status == "unhealthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status.dict()
        )
    
    return health_status


@router.get("/database", response_model=HealthStatus)
async def database_health() -> HealthStatus:
    """
    Check database connectivity and performance.
    
    Returns:
        HealthStatus: Database health status
    """
    checker = HealthChecker()
    db_status = await checker.check_database()
    
    if db_status.status != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=db_status.dict()
        )
    
    return db_status


@router.get("/fda-api", response_model=HealthStatus)
async def fda_api_health() -> HealthStatus:
    """
    Check FDA API connectivity and performance.
    
    Returns:
        HealthStatus: FDA API health status
    """
    checker = HealthChecker()
    fda_status = await checker.check_fda_api()
    
    if fda_status.status != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=fda_status.dict()
        )
    
    return fda_status


@router.get("/cache", response_model=HealthStatus)
async def cache_health() -> HealthStatus:
    """
    Check cache system connectivity and performance.
    
    Returns:
        HealthStatus: Cache system health status
    """
    checker = HealthChecker()
    cache_status = await checker.check_redis_cache()
    
    if cache_status.status != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=cache_status.dict()
        )
    
    return cache_status