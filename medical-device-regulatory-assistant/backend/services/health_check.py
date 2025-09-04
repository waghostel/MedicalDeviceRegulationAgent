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
    
    async def check_all(self, include_checks: List[str] = None) -> Dict[str, Any]:
        """Run all health checks or specified subset"""
        start_time = time.time()
        
        if include_checks is None:
            include_checks = list(self.checks.keys())
        
        results = {}
        overall_healthy = True
        
        for check_name in include_checks:
            if check_name in self.checks:
                check_start = time.time()
                try:
                    result = await self.checks[check_name]()
                    result['execution_time_ms'] = round((time.time() - check_start) * 1000, 2)
                    result['timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
                    results[check_name] = result
                    
                    if not result.get('healthy', False):
                        overall_healthy = False
                        
                except Exception as e:
                    logger.error(f"Health check {check_name} failed: {e}")
                    results[check_name] = {
                        'healthy': False,
                        'status': 'error',
                        'error': str(e),
                        'execution_time_ms': round((time.time() - check_start) * 1000, 2),
                        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
                    }
                    overall_healthy = False
        
        return {
            'healthy': overall_healthy,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            'execution_time_ms': round((time.time() - start_time) * 1000, 2),
            'service': 'medical-device-regulatory-assistant',
            'version': '0.1.0',
            'checks': results
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            db_manager = get_database_manager()
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
                    'healthy': False,
                    'status': 'not_configured',
                    'message': 'Redis client not initialized'
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
            return {
                'healthy': False,
                'status': 'disconnected',
                'error': str(e)
            }
    
    async def _check_fda_api(self) -> Dict[str, Any]:
        """Check FDA API accessibility"""
        try:
            fda_service = OpenFDAService()
            # Test with a simple query
            results = await fda_service.search_predicates(
                search_terms=["device"],
                limit=1
            )
            
            return {
                'healthy': True,
                'status': 'accessible',
                'details': {
                    'requests_remaining': None,  # FDA doesn't provide this info
                    'rate_limit_reset': None,
                    'total_results': len(results) if results else 0
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'inaccessible',
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