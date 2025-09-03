"""Health check API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from services.health_check import health_service

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def comprehensive_health_check(
    checks: Optional[List[str]] = Query(None, description="Specific checks to run (database, redis, fda_api, disk_space, memory)")
):
    """
    Comprehensive health check for all system components.
    
    Args:
        checks: Optional list of specific checks to run. If not provided, all checks are performed.
    
    Returns:
        Dict: Overall system health status including all services
    """
    try:
        if checks:
            health_status = await health_service.check_specific(checks)
        else:
            health_status = await health_service.check_all()
        
        # Return 503 if system is unhealthy
        if not health_status.get("healthy", False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=health_status
            )
        
        return health_status
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": f"Health check failed: {str(e)}"}
        )


@router.get("/database")
async def database_health():
    """
    Check database connectivity and performance.
    
    Returns:
        Dict: Database health status
    """
    try:
        health_status = await health_service.check_specific(["database"])
        db_check = health_status["checks"]["database"]
        
        if not db_check.get("healthy", False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=db_check
            )
        
        return db_check
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": f"Database health check failed: {str(e)}"}
        )


@router.get("/fda-api")
async def fda_api_health():
    """
    Check FDA API connectivity and performance.
    
    Returns:
        Dict: FDA API health status
    """
    try:
        health_status = await health_service.check_specific(["fda_api"])
        fda_check = health_status["checks"]["fda_api"]
        
        if not fda_check.get("healthy", False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=fda_check
            )
        
        return fda_check
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": f"FDA API health check failed: {str(e)}"}
        )


@router.get("/redis")
async def redis_health():
    """
    Check Redis cache connectivity and performance.
    
    Returns:
        Dict: Redis health status
    """
    try:
        health_status = await health_service.check_specific(["redis"])
        redis_check = health_status["checks"]["redis"]
        
        if not redis_check.get("healthy", False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=redis_check
            )
        
        return redis_check
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": f"Redis health check failed: {str(e)}"}
        )


@router.get("/system")
async def system_health():
    """
    Check system resources (disk space, memory).
    
    Returns:
        Dict: System resource health status
    """
    try:
        health_status = await health_service.check_specific(["disk_space", "memory"])
        
        # Check if any system check failed
        system_healthy = all(
            check.get("healthy", False) 
            for check in health_status["checks"].values()
        )
        
        if not system_healthy:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=health_status
            )
        
        return health_status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": f"System health check failed: {str(e)}"}
        )


@router.get("/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe.
    
    Returns:
        Dict: Simple ready/not ready status
    """
    try:
        # Check only critical services for readiness
        health_status = await health_service.check_specific(["database", "fda_api"])
        
        is_ready = health_status.get("healthy", False)
        
        if not is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"ready": False, "checks": health_status["checks"]}
            )
        
        return {"ready": True, "timestamp": health_status["timestamp"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"ready": False, "error": str(e)}
        )


@router.get("/live")
async def liveness_check():
    """
    Kubernetes-style liveness probe.
    
    Returns:
        Dict: Simple alive/dead status
    """
    try:
        # Basic liveness check - just verify the application is responding
        return {
            "alive": True,
            "service": "medical-device-regulatory-assistant",
            "version": "0.1.0",
            "timestamp": health_service._run_check.__globals__["datetime"].now(
                health_service._run_check.__globals__["timezone"].utc
            ).isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"alive": False, "error": str(e)}
        )