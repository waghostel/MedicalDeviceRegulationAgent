"""
Test API Client with Retry Logic and Graceful Failure Handling

This module provides a robust API testing client that handles:
- Connection retry logic with exponential backoff
- Graceful handling for offline testing scenarios
- Timeout management and connection pooling
- Comprehensive error reporting and logging

Requirements: 2.2
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from enum import Enum
import time
import json

import httpx
from httpx import Response, ConnectError, TimeoutException, HTTPStatusError


logger = logging.getLogger(__name__)


class ConnectionStatus(Enum):
    """Connection status enumeration"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    ERROR = "error"


@dataclass
class RetryConfig:
    """Configuration for retry logic"""
    max_retries: int = 3
    base_delay: float = 1.0  # Base delay in seconds
    max_delay: float = 30.0  # Maximum delay in seconds
    exponential_base: float = 2.0  # Exponential backoff base
    jitter: bool = True  # Add random jitter to delays


@dataclass
class ConnectionResult:
    """Result of connection attempt"""
    success: bool
    status: ConnectionStatus
    error: Optional[str] = None
    response_time: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class RequestResult:
    """Result of API request"""
    success: bool
    response: Optional[Response] = None
    error: Optional[str] = None
    retry_count: int = 0
    total_time: float = 0.0
    details: Optional[Dict[str, Any]] = None


class TestAPIClient:
    """
    Robust API testing client with retry logic and graceful failure handling.
    
    Features:
    - Connection retry with exponential backoff
    - Graceful offline testing (skip tests when server unavailable)
    - Timeout management and connection pooling
    - Comprehensive error reporting
    - Health check integration with detailed validation
    - Test setup validation to determine if API tests should run
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout: float = 10.0,
        retry_config: Optional[RetryConfig] = None,
        headers: Optional[Dict[str, str]] = None,
        required_services: Optional[List[str]] = None
    ):
        """
        Initialize the test API client.
        
        Args:
            base_url: Base URL for API requests
            timeout: Request timeout in seconds
            retry_config: Retry configuration
            headers: Default headers for all requests
            required_services: List of services that must be healthy for tests to run
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retry_config = retry_config or RetryConfig()
        self.default_headers = headers or {}
        self.required_services = required_services or ["database"]  # Default required services
        
        self._status = ConnectionStatus.DISCONNECTED
        self._last_health_check: Optional[float] = None
        self._health_check_interval = 30.0  # 30 seconds
        self._health_data: Optional[Dict[str, Any]] = None
        self._connection_pool_limits = httpx.Limits(
            max_keepalive_connections=10,
            max_connections=20,
            keepalive_expiry=30.0
        )
        
        logger.info(f"TestAPIClient initialized for {self.base_url} with required services: {self.required_services}")
    
    @property
    def status(self) -> ConnectionStatus:
        """Get current connection status"""
        return self._status
    
    @property
    def is_connected(self) -> bool:
        """Check if client is connected"""
        return self._status == ConnectionStatus.CONNECTED
    
    async def connect(self, force_check: bool = False) -> ConnectionResult:
        """
        Attempt to connect to the API server.
        
        Args:
            force_check: Force a new connection check even if recently checked
            
        Returns:
            ConnectionResult with connection status and details
        """
        current_time = time.time()
        
        # Skip check if recently performed and not forced
        if (not force_check and 
            self._last_health_check and 
            current_time - self._last_health_check < self._health_check_interval and
            self._status == ConnectionStatus.CONNECTED):
            return ConnectionResult(
                success=True,
                status=self._status,
                details={"cached": True, "last_check": self._last_health_check}
            )
        
        self._status = ConnectionStatus.CONNECTING
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
                limits=self._connection_pool_limits
            ) as client:
                response = await client.get("/health")
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    self._status = ConnectionStatus.CONNECTED
                    self._last_health_check = current_time
                    
                    # Parse health response for additional details
                    try:
                        health_data = response.json()
                        details = {
                            "health_status": health_data.get("status", "unknown"),
                            "response_time": response_time,
                            "server_info": health_data
                        }
                    except json.JSONDecodeError:
                        details = {"response_time": response_time}
                    
                    logger.info(f"Successfully connected to {self.base_url} in {response_time:.3f}s")
                    return ConnectionResult(
                        success=True,
                        status=self._status,
                        response_time=response_time,
                        details=details
                    )
                else:
                    self._status = ConnectionStatus.ERROR
                    error_msg = f"Health check failed with status {response.status_code}"
                    logger.warning(error_msg)
                    return ConnectionResult(
                        success=False,
                        status=self._status,
                        error=error_msg,
                        response_time=response_time
                    )
                    
        except (ConnectError, TimeoutException) as e:
            self._status = ConnectionStatus.DISCONNECTED
            error_msg = f"Connection failed: {type(e).__name__}: {str(e)}"
            logger.warning(error_msg)
            return ConnectionResult(
                success=False,
                status=self._status,
                error=error_msg,
                response_time=time.time() - start_time
            )
        except Exception as e:
            self._status = ConnectionStatus.ERROR
            error_msg = f"Unexpected connection error: {type(e).__name__}: {str(e)}"
            logger.error(error_msg)
            return ConnectionResult(
                success=False,
                status=self._status,
                error=error_msg,
                response_time=time.time() - start_time
            )
    
    async def health_check(self, detailed: bool = True) -> Dict[str, Any]:
        """
        Perform a comprehensive health check using the API's health endpoints.
        
        Args:
            detailed: Whether to perform detailed health checks of all services
            
        Returns:
            Dict containing health check results
        """
        connection_result = await self.connect(force_check=True)
        
        health_info = {
            "connected": connection_result.success,
            "status": connection_result.status.value,
            "base_url": self.base_url,
            "response_time": connection_result.response_time,
            "timestamp": time.time(),
            "services_ready": False,
            "required_services": self.required_services
        }
        
        if connection_result.error:
            health_info["error"] = connection_result.error
        
        if connection_result.details:
            health_info.update(connection_result.details)
        
        # If connected and detailed check requested, get service health
        if connection_result.success and detailed:
            try:
                services_health = await self.get_services_health()
                health_info["services"] = services_health
                health_info["services_ready"] = self._are_required_services_ready(services_health)
                self._health_data = health_info
            except Exception as e:
                health_info["services_error"] = str(e)
                logger.warning(f"Failed to get detailed service health: {e}")
        
        return health_info
    
    async def get_services_health(self) -> Dict[str, Any]:
        """
        Get detailed health information for all services.
        
        Returns:
            Dict containing health status for all services
        """
        try:
            result = await self.get("/api/health")
            if result.success and result.response:
                return result.response.json()
            else:
                # Fallback to basic health endpoint
                result = await self.get("/health")
                if result.success and result.response:
                    return result.response.json()
                else:
                    raise Exception(f"Health endpoint failed: {result.error}")
        except Exception as e:
            logger.error(f"Failed to get services health: {e}")
            raise
    
    async def check_service_health(self, service_name: str) -> Dict[str, Any]:
        """
        Check health of a specific service.
        
        Args:
            service_name: Name of the service to check (database, redis, fda_api, etc.)
            
        Returns:
            Dict containing service health status
        """
        try:
            # Try specific service endpoint first
            result = await self.get(f"/api/health/{service_name}")
            if result.success and result.response:
                return result.response.json()
            
            # Fallback to general health check with filter
            result = await self.get(f"/api/health?checks={service_name}")
            if result.success and result.response:
                health_data = result.response.json()
                if "checks" in health_data and service_name in health_data["checks"]:
                    return health_data["checks"][service_name]
                return health_data
            
            raise Exception(f"Service health check failed: {result.error}")
            
        except Exception as e:
            logger.error(f"Failed to check {service_name} health: {e}")
            return {
                "healthy": False,
                "status": "error",
                "error": str(e)
            }
    
    def _are_required_services_ready(self, services_health: Dict[str, Any]) -> bool:
        """
        Check if all required services are ready.
        
        Args:
            services_health: Health data from services health check
            
        Returns:
            True if all required services are healthy
        """
        if not services_health:
            return False
        
        # Check overall health first
        if services_health.get("healthy") is False:
            return False
        
        # Check individual required services
        checks = services_health.get("checks", {})
        for service in self.required_services:
            service_health = checks.get(service, {})
            if not service_health.get("healthy", False):
                # Special case: database not initialized during startup is acceptable
                if service == "database" and service_health.get("status") == "not_initialized":
                    logger.info("Database not initialized yet - this is acceptable during startup")
                    continue
                logger.warning(f"Required service {service} is not healthy: {service_health}")
                return False
        
        return True
    
    async def wait_for_services_ready(
        self, 
        timeout: float = 60.0, 
        check_interval: float = 2.0
    ) -> bool:
        """
        Wait for required services to become ready.
        
        Args:
            timeout: Maximum time to wait in seconds
            check_interval: Time between checks in seconds
            
        Returns:
            True if services become ready within timeout, False otherwise
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                health_info = await self.health_check(detailed=True)
                if health_info.get("services_ready", False):
                    logger.info("All required services are ready")
                    return True
                
                logger.debug(f"Services not ready yet, waiting {check_interval}s...")
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.debug(f"Health check failed during wait: {e}")
                await asyncio.sleep(check_interval)
        
        logger.warning(f"Services did not become ready within {timeout}s")
        return False
    
    async def validate_test_environment(self) -> Dict[str, Any]:
        """
        Validate that the test environment is ready for API tests.
        
        Returns:
            Dict with validation results and recommendations
        """
        validation_result = {
            "ready_for_tests": False,
            "server_available": False,
            "services_healthy": False,
            "issues": [],
            "recommendations": [],
            "details": {}
        }
        
        try:
            # Check basic connectivity
            connection_result = await self.connect()
            validation_result["server_available"] = connection_result.success
            validation_result["details"]["connection"] = connection_result.__dict__
            
            if not connection_result.success:
                validation_result["issues"].append("API server is not available")
                validation_result["recommendations"].append("Start the API server before running tests")
                return validation_result
            
            # Check service health
            try:
                health_info = await self.health_check(detailed=True)
                validation_result["services_healthy"] = health_info.get("services_ready", False)
                validation_result["details"]["health"] = health_info
                
                if not validation_result["services_healthy"]:
                    validation_result["issues"].append("Required services are not healthy")
                    
                    # Provide specific recommendations based on service status
                    services = health_info.get("services", {}).get("checks", {})
                    for service_name in self.required_services:
                        service_health = services.get(service_name, {})
                        if not service_health.get("healthy", False):
                            status = service_health.get("status", "unknown")
                            error = service_health.get("error", "")
                            
                            if service_name == "database":
                                if status == "not_initialized":
                                    validation_result["recommendations"].append("Wait for database initialization to complete")
                                elif "connection" in error.lower():
                                    validation_result["recommendations"].append("Check database connection configuration")
                            elif service_name == "fda_api":
                                if "network" in error.lower() or "connection" in error.lower():
                                    validation_result["recommendations"].append("Check internet connectivity for FDA API access")
                            elif service_name == "redis":
                                if service_health.get("status") == "not_configured":
                                    # Redis is optional, don't fail tests for this
                                    pass
                                else:
                                    validation_result["recommendations"].append("Check Redis server configuration")
                
            except Exception as e:
                validation_result["issues"].append(f"Failed to check service health: {str(e)}")
                validation_result["recommendations"].append("Check API health endpoints are working")
        
        except Exception as e:
            validation_result["issues"].append(f"Environment validation failed: {str(e)}")
            validation_result["recommendations"].append("Check API server configuration and connectivity")
        
        # Determine if ready for tests
        validation_result["ready_for_tests"] = (
            validation_result["server_available"] and 
            validation_result["services_healthy"]
        )
        
        return validation_result
    
    def _calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for retry attempt with exponential backoff.
        
        Args:
            attempt: Current attempt number (0-based)
            
        Returns:
            Delay in seconds
        """
        delay = min(
            self.retry_config.base_delay * (self.retry_config.exponential_base ** attempt),
            self.retry_config.max_delay
        )
        
        # Add jitter to prevent thundering herd
        if self.retry_config.jitter:
            import random
            delay *= (0.5 + random.random() * 0.5)  # 50-100% of calculated delay
        
        return delay
    
    async def request(
        self,
        method: str,
        endpoint: str,
        skip_if_offline: bool = True,
        **kwargs
    ) -> RequestResult:
        """
        Make an API request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            endpoint: API endpoint (relative to base_url)
            skip_if_offline: Skip request if server is offline
            **kwargs: Additional arguments for httpx request
            
        Returns:
            RequestResult with response and metadata
        """
        start_time = time.time()
        endpoint = endpoint.lstrip('/')
        url = f"{self.base_url}/{endpoint}"
        
        # Check connection first
        connection_result = await self.connect()
        if not connection_result.success and skip_if_offline:
            logger.info(f"Skipping {method} {endpoint} - server offline")
            return RequestResult(
                success=False,
                error=f"Server offline: {connection_result.error}",
                details={"skipped": True, "reason": "offline"}
            )
        
        # Merge headers
        headers = {**self.default_headers, **kwargs.pop('headers', {})}
        
        last_error = None
        for attempt in range(self.retry_config.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    base_url=self.base_url,
                    timeout=httpx.Timeout(self.timeout),
                    limits=self._connection_pool_limits
                ) as client:
                    response = await client.request(
                        method=method,
                        url=endpoint,
                        headers=headers,
                        **kwargs
                    )
                    
                    total_time = time.time() - start_time
                    
                    logger.debug(f"{method} {endpoint} -> {response.status_code} in {total_time:.3f}s")
                    
                    return RequestResult(
                        success=True,
                        response=response,
                        retry_count=attempt,
                        total_time=total_time,
                        details={
                            "status_code": response.status_code,
                            "url": str(response.url)
                        }
                    )
                    
            except (ConnectError, TimeoutException) as e:
                last_error = f"{type(e).__name__}: {str(e)}"
                logger.warning(f"Request attempt {attempt + 1} failed: {last_error}")
                
                # Don't retry on the last attempt
                if attempt < self.retry_config.max_retries:
                    delay = self._calculate_delay(attempt)
                    logger.debug(f"Retrying in {delay:.2f}s...")
                    await asyncio.sleep(delay)
                
            except HTTPStatusError as e:
                # Don't retry on HTTP errors (4xx, 5xx)
                total_time = time.time() - start_time
                logger.warning(f"{method} {endpoint} -> HTTP {e.response.status_code}")
                
                return RequestResult(
                    success=False,
                    response=e.response,
                    error=f"HTTP {e.response.status_code}: {str(e)}",
                    retry_count=attempt,
                    total_time=total_time,
                    details={
                        "status_code": e.response.status_code,
                        "url": str(e.response.url)
                    }
                )
                
            except Exception as e:
                last_error = f"{type(e).__name__}: {str(e)}"
                logger.error(f"Unexpected error in request attempt {attempt + 1}: {last_error}")
                
                # Don't retry on unexpected errors
                break
        
        # All retries exhausted
        total_time = time.time() - start_time
        return RequestResult(
            success=False,
            error=f"Request failed after {self.retry_config.max_retries + 1} attempts: {last_error}",
            retry_count=self.retry_config.max_retries,
            total_time=total_time,
            details={"exhausted_retries": True}
        )
    
    # Convenience methods for common HTTP verbs
    async def get(self, endpoint: str, **kwargs) -> RequestResult:
        """Make a GET request"""
        return await self.request("GET", endpoint, **kwargs)
    
    async def post(self, endpoint: str, **kwargs) -> RequestResult:
        """Make a POST request"""
        return await self.request("POST", endpoint, **kwargs)
    
    async def put(self, endpoint: str, **kwargs) -> RequestResult:
        """Make a PUT request"""
        return await self.request("PUT", endpoint, **kwargs)
    
    async def delete(self, endpoint: str, **kwargs) -> RequestResult:
        """Make a DELETE request"""
        return await self.request("DELETE", endpoint, **kwargs)
    
    async def patch(self, endpoint: str, **kwargs) -> RequestResult:
        """Make a PATCH request"""
        return await self.request("PATCH", endpoint, **kwargs)
    
    @asynccontextmanager
    async def session(self):
        """
        Context manager for maintaining a persistent session.
        
        Usage:
            async with client.session() as session:
                result1 = await session.get("/api/projects")
                result2 = await session.post("/api/projects", json={...})
        """
        # For now, this is a simple wrapper, but could be extended
        # to maintain cookies, authentication state, etc.
        yield self
    
    async def close(self):
        """Clean up resources"""
        self._status = ConnectionStatus.DISCONNECTED
        self._last_health_check = None
        logger.info("TestAPIClient closed")


# Utility functions for common testing patterns

async def create_test_client(
    base_url: str = "http://localhost:8000",
    timeout: float = 10.0,
    max_retries: int = 3,
    headers: Optional[Dict[str, str]] = None
) -> TestAPIClient:
    """
    Create a configured test API client.
    
    Args:
        base_url: Base URL for API requests
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        headers: Default headers for all requests
        
    Returns:
        Configured TestAPIClient instance
    """
    retry_config = RetryConfig(max_retries=max_retries)
    return TestAPIClient(
        base_url=base_url,
        timeout=timeout,
        retry_config=retry_config,
        headers=headers
    )


async def check_server_availability(
    base_url: str = "http://localhost:8000",
    timeout: float = 5.0
) -> bool:
    """
    Quick check if server is available.
    
    Args:
        base_url: Base URL to check
        timeout: Timeout for the check
        
    Returns:
        True if server is available, False otherwise
    """
    client = TestAPIClient(base_url=base_url, timeout=timeout)
    connection_result = await client.connect()
    await client.close()
    return connection_result.success


def skip_if_server_offline(base_url: str = "http://localhost:8000"):
    """
    Decorator to skip tests if server is offline.
    
    Usage:
        @skip_if_server_offline()
        async def test_api_endpoint():
            # Test code here
    """
    import pytest
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            if not await check_server_availability(base_url):
                pytest.skip(f"Server at {base_url} is not available")
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def skip_if_services_not_ready(
    base_url: str = "http://localhost:8000",
    required_services: Optional[List[str]] = None,
    timeout: float = 30.0
):
    """
    Decorator to skip tests if required services are not ready.
    
    Usage:
        @skip_if_services_not_ready(required_services=["database", "fda_api"])
        async def test_api_with_database():
            # Test code here
    """
    import pytest
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            client = TestAPIClient(
                base_url=base_url,
                required_services=required_services or ["database"]
            )
            
            try:
                validation = await client.validate_test_environment()
                
                if not validation["ready_for_tests"]:
                    issues = "; ".join(validation["issues"])
                    recommendations = "; ".join(validation["recommendations"])
                    pytest.skip(
                        f"Test environment not ready: {issues}. "
                        f"Recommendations: {recommendations}"
                    )
                
                return await func(*args, **kwargs)
            finally:
                await client.close()
        
        return wrapper
    return decorator


async def setup_test_environment(
    base_url: str = "http://localhost:8000",
    required_services: Optional[List[str]] = None,
    wait_timeout: float = 60.0,
    raise_on_failure: bool = False
) -> Dict[str, Any]:
    """
    Set up and validate the test environment.
    
    Args:
        base_url: Base URL for API requests
        required_services: List of services that must be healthy
        wait_timeout: Maximum time to wait for services to be ready
        raise_on_failure: Whether to raise an exception if setup fails
        
    Returns:
        Dict with setup results and validation information
        
    Raises:
        RuntimeError: If raise_on_failure is True and setup fails
    """
    client = TestAPIClient(
        base_url=base_url,
        required_services=required_services or ["database"]
    )
    
    try:
        # Initial validation
        validation = await client.validate_test_environment()
        
        if validation["ready_for_tests"]:
            logger.info("Test environment is ready")
            return {
                "success": True,
                "message": "Test environment is ready",
                "validation": validation
            }
        
        # If not ready, try waiting for services
        if validation["server_available"]:
            logger.info(f"Waiting up to {wait_timeout}s for services to be ready...")
            services_ready = await client.wait_for_services_ready(timeout=wait_timeout)
            
            if services_ready:
                final_validation = await client.validate_test_environment()
                return {
                    "success": True,
                    "message": "Test environment became ready after waiting",
                    "validation": final_validation
                }
        
        # Setup failed
        error_msg = f"Test environment setup failed: {'; '.join(validation['issues'])}"
        recommendations = f"Recommendations: {'; '.join(validation['recommendations'])}"
        
        if raise_on_failure:
            raise RuntimeError(f"{error_msg}. {recommendations}")
        
        return {
            "success": False,
            "message": error_msg,
            "recommendations": validation["recommendations"],
            "validation": validation
        }
        
    finally:
        await client.close()


class TestEnvironmentManager:
    """
    Context manager for test environment setup and teardown.
    
    Usage:
        async with TestEnvironmentManager() as env:
            if env.ready:
                # Run tests
                client = env.client
                result = await client.get("/api/projects")
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        required_services: Optional[List[str]] = None,
        wait_timeout: float = 60.0,
        auto_skip: bool = True
    ):
        self.base_url = base_url
        self.required_services = required_services or ["database"]
        self.wait_timeout = wait_timeout
        self.auto_skip = auto_skip
        
        self.client: Optional[TestAPIClient] = None
        self.ready = False
        self.validation_result: Optional[Dict[str, Any]] = None
    
    async def __aenter__(self):
        """Set up test environment"""
        self.client = TestAPIClient(
            base_url=self.base_url,
            required_services=self.required_services
        )
        
        try:
            setup_result = await setup_test_environment(
                base_url=self.base_url,
                required_services=self.required_services,
                wait_timeout=self.wait_timeout,
                raise_on_failure=False
            )
            
            self.ready = setup_result["success"]
            self.validation_result = setup_result.get("validation")
            
            if not self.ready and self.auto_skip:
                import pytest
                pytest.skip(f"Test environment not ready: {setup_result['message']}")
            
            return self
            
        except Exception as e:
            await self.client.close()
            raise
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up test environment"""
        if self.client:
            await self.client.close()