"""Health check service for monitoring system status."""

import asyncio
import time
from typing import Dict, Any, List
from datetime import datetime

import httpx
import aiosqlite
from pydantic import BaseModel


class HealthStatus(BaseModel):
    """Health status model."""
    service: str
    status: str
    response_time_ms: float
    timestamp: datetime
    details: Dict[str, Any] = {}


class SystemHealth(BaseModel):
    """System health model."""
    status: str
    timestamp: datetime
    services: List[HealthStatus]
    overall_response_time_ms: float


class HealthChecker:
    """Health checker service."""
    
    def __init__(self):
        self.database_path = "medical_device_assistant.db"
        self.fda_api_url = "https://api.fda.gov/device/510k.json"
    
    async def check_database(self) -> HealthStatus:
        """Check database connectivity."""
        start_time = time.time()
        
        try:
            async with aiosqlite.connect(self.database_path) as db:
                await db.execute("SELECT 1")
                await db.commit()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="database",
                status="healthy",
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                details={"database_path": self.database_path}
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="database",
                status="unhealthy",
                response_time_ms=max(response_time, 0.1),  # Ensure minimum response time
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def check_fda_api(self) -> HealthStatus:
        """Check FDA API connectivity."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    self.fda_api_url,
                    params={"limit": 1}
                )
                response.raise_for_status()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="fda_api",
                status="healthy",
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                details={
                    "api_url": self.fda_api_url,
                    "status_code": response.status_code
                }
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="fda_api",
                status="unhealthy",
                response_time_ms=max(response_time, 0.1),  # Ensure minimum response time
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def check_redis_cache(self) -> HealthStatus:
        """Check Redis cache connectivity."""
        start_time = time.time()
        
        try:
            # For MVP, we'll simulate Redis check since it's not required yet
            # In production, this would connect to actual Redis instance
            await asyncio.sleep(0.01)  # Simulate network call
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="redis_cache",
                status="healthy",
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                details={"note": "Redis not implemented in MVP, simulated check"}
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            
            return HealthStatus(
                service="redis_cache",
                status="unhealthy",
                response_time_ms=max(response_time, 0.1),  # Ensure minimum response time
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def check_all(self) -> SystemHealth:
        """Check all system components."""
        start_time = time.time()
        
        # Run all health checks concurrently
        database_check, fda_api_check, redis_check = await asyncio.gather(
            self.check_database(),
            self.check_fda_api(),
            self.check_redis_cache(),
            return_exceptions=True
        )
        
        services = []
        
        # Handle potential exceptions from concurrent execution
        for check in [database_check, fda_api_check, redis_check]:
            if isinstance(check, Exception):
                services.append(HealthStatus(
                    service="unknown",
                    status="error",
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"error": str(check)}
                ))
            else:
                services.append(check)
        
        # Determine overall status
        overall_status = "healthy"
        if any(service.status != "healthy" for service in services):
            overall_status = "degraded"
        if all(service.status == "unhealthy" for service in services):
            overall_status = "unhealthy"
        
        overall_response_time = (time.time() - start_time) * 1000
        
        return SystemHealth(
            status=overall_status,
            timestamp=datetime.utcnow(),
            services=services,
            overall_response_time_ms=max(overall_response_time, 0.1)  # Ensure minimum response time
        )