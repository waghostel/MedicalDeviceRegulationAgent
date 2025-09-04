"""Health check service for monitoring application and dependencies."""

import asyncio
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import aiohttp
import redis.asyncio as redis

from services.cache import get_redis_client
from services.openfda import OpenFDAService

logger = logging.getLogger(__name__)


class HealthCheckService:
    """Service for performing comprehensive health checks."""
    
    def __init__(self):
        self.checks = {
            "database": self._check_database,
            "redis": self._check_redis,
            "fda_api": self._check_fda_api,
            "disk_space": self._check_disk_space,
            "memory": self._check_memory,
        }
    
    async def check_all(self) -> Dict[str, Any]:
        """
        Perform all health checks and return comprehensive status.
        
        Returns:
            Dict containing overall health status and individual check results
        """
        start_time = time.time()
        results = {}
        overall_healthy = True
        
        # Run all checks concurrently
        tasks = []
        for check_name, check_func in self.checks.items():
            task = asyncio.create_task(self._run_check(check_name, check_func))
            tasks.append(task)
        
        # Wait for all checks to complete
        check_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, (check_name, _) in enumerate(self.checks.items()):
            result = check_results[i]
            if isinstance(result, Exception):
                results[check_name] = {
                    "status": "unhealthy",
                    "error": str(result),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                overall_healthy = False
            else:
                results[check_name] = result
                if not result.get("healthy", False):
                    overall_healthy = False
        
        execution_time = time.time() - start_time
        
        return {
            "healthy": overall_healthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "execution_time_ms": round(execution_time * 1000, 2),
            "service": "medical-device-regulatory-assistant",
            "version": "0.1.0",
            "checks": results
        }
    
    async def check_specific(self, check_names: List[str]) -> Dict[str, Any]:
        """
        Perform specific health checks.
        
        Args:
            check_names: List of check names to perform
            
        Returns:
            Dict containing results for specified checks
        """
        start_time = time.time()
        results = {}
        overall_healthy = True
        
        # Validate check names
        invalid_checks = [name for name in check_names if name not in self.checks]
        if invalid_checks:
            raise ValueError(f"Invalid check names: {invalid_checks}")
        
        # Run specified checks
        tasks = []
        for check_name in check_names:
            check_func = self.checks[check_name]
            task = asyncio.create_task(self._run_check(check_name, check_func))
            tasks.append(task)
        
        check_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, check_name in enumerate(check_names):
            result = check_results[i]
            if isinstance(result, Exception):
                results[check_name] = {
                    "status": "unhealthy",
                    "error": str(result),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                overall_healthy = False
            else:
                results[check_name] = result
                if not result.get("healthy", False):
                    overall_healthy = False
        
        execution_time = time.time() - start_time
        
        return {
            "healthy": overall_healthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "execution_time_ms": round(execution_time * 1000, 2),
            "checks": results
        }
    
    async def _run_check(self, check_name: str, check_func) -> Dict[str, Any]:
        """Run a single health check with timeout and error handling."""
        start_time = time.time()
        
        try:
            # Run check with 10-second timeout
            result = await asyncio.wait_for(check_func(), timeout=10.0)
            execution_time = time.time() - start_time
            
            return {
                **result,
                "execution_time_ms": round(execution_time * 1000, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except asyncio.TimeoutError:
            return {
                "healthy": False,
                "status": "timeout",
                "error": f"Health check timed out after 10 seconds",
                "execution_time_ms": 10000,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                "healthy": False,
                "status": "error",
                "error": str(e),
                "execution_time_ms": round(execution_time * 1000, 2),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        try:
            from database.connection import get_database_manager
            db_manager = get_database_manager()
            return await db_manager.health_check()
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "status": "error",
                "error": str(e)
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance."""
        try:
            redis_client = await get_redis_client()
            if not redis_client:
                return {
                    "healthy": False,
                    "status": "not_configured",
                    "message": "Redis client not configured"
                }
            
            # Test basic connectivity
            await redis_client.ping()
            
            # Test read/write operations
            test_key = "health_check_test"
            await redis_client.set(test_key, "test_value", ex=60)
            value = await redis_client.get(test_key)
            await redis_client.delete(test_key)
            
            if value != b"test_value":
                raise Exception("Redis read/write test failed")
            
            # Get Redis info
            info = await redis_client.info()
            
            return {
                "healthy": True,
                "status": "connected",
                "details": {
                    "version": info.get("redis_version"),
                    "connected_clients": info.get("connected_clients"),
                    "used_memory_human": info.get("used_memory_human")
                }
            }
        except Exception as e:
            return {
                "healthy": False,
                "status": "disconnected",
                "error": str(e)
            }
    
    async def _check_fda_api(self) -> Dict[str, Any]:
        """Check FDA API connectivity and rate limits."""
        try:
            fda_service = OpenFDAService()
            
            # Test basic connectivity with a simple query
            async with aiohttp.ClientSession() as session:
                url = "https://api.fda.gov/device/510k.json"
                params = {"limit": 1}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check rate limit headers
                        rate_limit_info = {
                            "requests_remaining": response.headers.get("X-RateLimit-Remaining"),
                            "rate_limit_reset": response.headers.get("X-RateLimit-Reset"),
                            "total_results": data.get("meta", {}).get("results", {}).get("total", 0)
                        }
                        
                        return {
                            "healthy": True,
                            "status": "accessible",
                            "details": rate_limit_info
                        }
                    else:
                        return {
                            "healthy": False,
                            "status": f"http_error_{response.status}",
                            "error": f"FDA API returned status {response.status}"
                        }
        except Exception as e:
            return {
                "healthy": False,
                "status": "unreachable",
                "error": str(e)
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space."""
        try:
            import shutil
            
            # Check disk space for current directory
            total, used, free = shutil.disk_usage("/")
            
            # Convert to GB
            total_gb = total / (1024**3)
            used_gb = used / (1024**3)
            free_gb = free / (1024**3)
            usage_percent = (used / total) * 100
            
            # Consider unhealthy if less than 1GB free or >95% used
            is_healthy = free_gb > 1.0 and usage_percent < 95.0
            
            return {
                "healthy": is_healthy,
                "status": "ok" if is_healthy else "low_space",
                "details": {
                    "total_gb": round(total_gb, 2),
                    "used_gb": round(used_gb, 2),
                    "free_gb": round(free_gb, 2),
                    "usage_percent": round(usage_percent, 2)
                }
            }
        except Exception as e:
            return {
                "healthy": False,
                "status": "error",
                "error": str(e)
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage."""
        try:
            import psutil
            
            # Get memory information
            memory = psutil.virtual_memory()
            
            # Convert to MB
            total_mb = memory.total / (1024**2)
            available_mb = memory.available / (1024**2)
            used_mb = memory.used / (1024**2)
            usage_percent = memory.percent
            
            # Consider unhealthy if >90% memory used
            is_healthy = usage_percent < 90.0
            
            return {
                "healthy": is_healthy,
                "status": "ok" if is_healthy else "high_usage",
                "details": {
                    "total_mb": round(total_mb, 2),
                    "used_mb": round(used_mb, 2),
                    "available_mb": round(available_mb, 2),
                    "usage_percent": round(usage_percent, 2)
                }
            }
        except ImportError:
            return {
                "healthy": True,
                "status": "not_available",
                "message": "psutil not installed, memory check skipped"
            }
        except Exception as e:
            return {
                "healthy": False,
                "status": "error",
                "error": str(e)
            }


# Global health check service instance
health_service = HealthCheckService()