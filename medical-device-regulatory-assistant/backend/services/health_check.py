"""Health check service for monitoring application and dependencies."""

import time
import asyncio
from typing import Dict, Any, List
import logging
from database.connection import get_database_manager
from .cache import get_redis_client
from .openfda import OpenFDAService
import shutil
import os
from datetime import datetime

# Import Pydantic models
from models.health import (
    HealthCheckResponse,
    HealthCheckDetail,
    DatabaseHealthDetail,
    RedisHealthDetail,
    FDAAPIHealthDetail,
    SystemResourceHealthDetail,
)

logger = logging.getLogger(__name__)

class HealthCheckService:
    def __init__(self):
        self.checks = {
            'database': self._check_database,
            'redis': self._check_redis,
            'fda_api': self._check_fda_api,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory
        }
    
    async def check_all(self, include_checks: List[str] = None) -> HealthCheckResponse:
        """Run all health checks or specified subset"""
        start_time = time.time()
        
        if include_checks is None:
            include_checks = list(self.checks.keys())
        
        results = {}
        overall_healthy = True
        critical_services_healthy = True
        
        # Define which services are critical vs optional
        critical_services = {'fda_api'}  # Database is critical but may be initializing
        optional_services = {'redis', 'disk_space', 'memory'}
        
        for check_name in include_checks:
            if check_name in self.checks:
                check_start = time.time()
                try:
                    result_dict = await self.checks[check_name]()
                    execution_time = round((time.time() - check_start) * 1000, 2)
                    timestamp = datetime.utcnow().isoformat() + 'Z'
                    
                    # Create HealthCheckDetail from result
                    result_dict['execution_time_ms'] = execution_time
                    result_dict['timestamp'] = timestamp
                    
                    health_detail = HealthCheckDetail(**result_dict)
                    results[check_name] = health_detail
                    
                    # Determine if this affects overall health
                    if not health_detail.healthy:
                        # Special handling for database during startup
                        if check_name == 'database' and health_detail.status == 'not_initialized':
                            # Database not initialized is acceptable during startup
                            pass
                        elif check_name in critical_services:
                            critical_services_healthy = False
                            overall_healthy = False
                        elif check_name not in optional_services:
                            overall_healthy = False
                        
                except Exception as e:
                    logger.error(f"Health check {check_name} failed: {e}")
                    execution_time = round((time.time() - check_start) * 1000, 2)
                    timestamp = datetime.utcnow().isoformat() + 'Z'
                    
                    error_detail = HealthCheckDetail(
                        healthy=False,
                        status='error',
                        error=str(e),
                        execution_time_ms=execution_time,
                        timestamp=timestamp
                    )
                    results[check_name] = error_detail
                    
                    # Critical service errors affect overall health
                    if check_name in critical_services:
                        critical_services_healthy = False
                        overall_healthy = False
                    elif check_name not in optional_services:
                        overall_healthy = False
        
        return HealthCheckResponse(
            healthy=overall_healthy,
            timestamp=datetime.utcnow().isoformat() + 'Z',
            execution_time_ms=round((time.time() - start_time) * 1000, 2),
            service='medical-device-regulatory-assistant',
            version='0.1.0',
            checks=results
        )
    
    async def check_specific(self, check_names: List[str]) -> HealthCheckResponse:
        """Run specific health checks by name"""
        # Validate check names
        invalid_checks = [name for name in check_names if name not in self.checks]
        if invalid_checks:
            raise ValueError(f"Invalid health check names: {invalid_checks}. Available: {list(self.checks.keys())}")
        
        return await self.check_all(include_checks=check_names)
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            # Check if database manager is initialized
            try:
                db_manager = get_database_manager()
            except RuntimeError as e:
                if "not initialized" in str(e):
                    return {
                        'healthy': False,
                        'status': 'not_initialized',
                        'error': 'Database manager not initialized - service may be starting up',
                        'message': 'Database will be available once application startup completes'
                    }
                raise
            
            # If manager exists, perform health check
            return await db_manager.health_check()
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            redis_client = await get_redis_client()
            if redis_client is None:
                return {
                    'healthy': True,  # Redis is optional, so this is healthy
                    'status': 'not_configured',
                    'message': 'Redis not configured - running without cache (this is normal)'
                }
            
            # Test Redis connection
            await redis_client.ping()
            info = await redis_client.info()
            
            return {
                'healthy': True,
                'status': 'connected',
                'details': {
                    'version': info.get('redis_version', 'unknown'),
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory_human': info.get('used_memory_human', 'unknown')
                }
            }
        except Exception as e:
            # Check if it's a connection refused error (Redis not running)
            error_str = str(e).lower()
            if ('connection refused' in error_str or 
                'refused the network connection' in error_str or
                'connect call failed' in error_str or
                'connection error' in error_str):
                return {
                    'healthy': True,  # Redis is optional, so this is still healthy
                    'status': 'not_available',
                    'message': 'Redis server not running - application will work without cache',
                    'error': str(e)
                }
            else:
                return {
                    'healthy': True,  # Still healthy since Redis is optional
                    'status': 'configuration_error',
                    'error': str(e),
                    'message': 'Redis configuration issue - application will work without cache'
                }
    
    async def _check_fda_api(self) -> Dict[str, Any]:
        """Check FDA API accessibility"""
        try:
            # Use a simpler HTTP check instead of the full service
            import httpx
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.fda.gov/device/510k.json",
                    params={"limit": 1}
                )
                response.raise_for_status()
                
                # Parse response to get result count
                data = response.json()
                total_results = len(data.get('results', []))
                
                return {
                    'healthy': True,
                    'status': 'accessible',
                    'details': {
                        'status_code': response.status_code,
                        'response_time_ms': response.elapsed.total_seconds() * 1000,
                        'total_results': total_results
                    }
                }
                
        except httpx.TimeoutException:
            return {
                'healthy': False,
                'status': 'timeout',
                'error': 'FDA API request timed out',
                'message': 'Check internet connection and FDA API availability'
            }
        except httpx.HTTPStatusError as e:
            return {
                'healthy': False,
                'status': 'http_error',
                'error': f'FDA API returned HTTP {e.response.status_code}',
                'message': 'FDA API may be experiencing issues'
            }
        except Exception as e:
            error_str = str(e).lower()
            if 'network' in error_str or 'connection' in error_str:
                return {
                    'healthy': False,
                    'status': 'network_error',
                    'error': str(e),
                    'message': 'Check internet connection'
                }
            else:
                return {
                    'healthy': False,
                    'status': 'error',
                    'error': str(e)
                }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            total, used, free = shutil.disk_usage("/")
            usage_percent = (used / total) * 100
            
            return {
                'healthy': usage_percent < 90,  # Alert if >90% full
                'status': 'ok' if usage_percent < 90 else 'low_space',
                'details': {
                    'total_gb': round(total / (1024**3), 2),
                    'used_gb': round(used / (1024**3), 2),
                    'free_gb': round(free / (1024**3), 2),
                    'usage_percent': round(usage_percent, 2)
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage (optional, requires psutil)"""
        try:
            import psutil
            memory = psutil.virtual_memory()
            
            return {
                'healthy': memory.percent < 90,
                'status': 'ok' if memory.percent < 90 else 'high_usage',
                'details': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'used_percent': memory.percent
                }
            }
        except ImportError:
            return {
                'healthy': True,
                'status': 'not_available',
                'message': 'psutil not installed, memory check skipped'
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }


# Global health service instance
health_service = HealthCheckService()