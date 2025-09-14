"""
OpenFDA API Integration Service

This service provides integration with the FDA's openFDA API for:
- Predicate device searches
- Device classification lookups
- Adverse event monitoring
- Rate limiting and caching
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from urllib.parse import urlencode
import hashlib

import httpx
import redis.asyncio as redis
from pydantic import BaseModel, Field, validator

# Note: These imports are for type hints and documentation
# In actual usage, the service returns data structures that can be used
# to create model instances in the calling code


logger = logging.getLogger(__name__)


class FDAAPIError(Exception):
    """FDA API related errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(message)


class RateLimitExceededError(FDAAPIError):
    """Rate limit exceeded error"""
    pass


class PredicateNotFoundError(FDAAPIError):
    """No suitable predicates found"""
    pass


@dataclass
class FDASearchResult:
    """FDA search result data structure"""
    k_number: str
    device_name: str
    intended_use: str
    product_code: str
    clearance_date: str
    applicant: Optional[str] = None
    contact: Optional[str] = None
    decision_description: Optional[str] = None
    statement_or_summary: Optional[str] = None
    confidence_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DeviceClassificationResult:
    """Device classification result data structure"""
    device_class: str
    product_code: str
    device_name: str
    regulation_number: str
    medical_specialty_description: str
    device_class_description: str
    confidence_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AdverseEventResult:
    """Adverse event result data structure"""
    report_number: str
    event_date: str
    device_name: str
    manufacturer_name: str
    event_type: str
    patient_outcome: Optional[str] = None
    device_problem_flag: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AsyncRateLimiter:
    """Async rate limiter for FDA API (240 requests per minute)"""
    
    def __init__(self, max_requests: int = 240, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire rate limit permission"""
        async with self._lock:
            now = datetime.now()
            # Remove old requests outside the time window
            self.requests = [req_time for req_time in self.requests 
                           if (now - req_time).total_seconds() < self.time_window]
            
            if len(self.requests) >= self.max_requests:
                # Calculate wait time
                oldest_request = min(self.requests)
                wait_time = self.time_window - (now - oldest_request).total_seconds()
                if wait_time > 0:
                    logger.warning(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                    await asyncio.sleep(wait_time)
                    return await self.acquire()
            
            self.requests.append(now)


class CircuitBreaker:
    """Circuit breaker pattern for API resilience"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise FDAAPIError("Circuit breaker is OPEN - API temporarily unavailable")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset the circuit breaker"""
        if self.last_failure_time is None:
            return True
        return (datetime.now() - self.last_failure_time).total_seconds() > self.recovery_timeout
    
    def _on_success(self) -> None:
        """Handle successful API call"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self) -> None:
        """Handle failed API call"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.error(f"Circuit breaker opened after {self.failure_count} failures")


class OpenFDAService:
    """
    OpenFDA API integration service with rate limiting, caching, and resilience patterns
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        redis_client: Optional[redis.Redis] = None,
        cache_ttl: int = 3600,  # 1 hour default cache
        max_retries: int = 3,
        timeout: int = 30,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.api_key = api_key
        self.base_url = "https://api.fda.gov"
        self.cache_ttl = cache_ttl
        self.max_retries = max_retries
        self.timeout = timeout
        
        # Rate limiter (240 requests per minute as per FDA limits)
        self.rate_limiter = AsyncRateLimiter(240, 60)
        
        # Circuit breaker for resilience
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60)
        
        # Redis cache client
        self.redis_client = redis_client
        
        # HTTP client (can be injected for testing)
        self.http_client = http_client
        
        # HTTP client configuration
        self.client_config = {
            "timeout": httpx.Timeout(timeout),
            "limits": httpx.Limits(max_keepalive_connections=10, max_connections=20)
        }
    
    def _generate_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generate cache key for request"""
        # Sort params for consistent cache keys
        sorted_params = sorted(params.items())
        param_string = urlencode(sorted_params)
        cache_string = f"{endpoint}:{param_string}"
        return f"openfda:{hashlib.md5(cache_string.encode()).hexdigest()}"
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get data from Redis cache"""
        if not self.redis_client:
            return None
        
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache read error: {e}")
        
        return None
    
    async def _set_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """Set data in Redis cache"""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
    
    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Make HTTP request to FDA API with rate limiting and caching"""
        if params is None:
            params = {}
        
        # Add API key if available
        if self.api_key:
            params["api_key"] = self.api_key
        
        # Check cache first
        cache_key = self._generate_cache_key(endpoint, params)
        if use_cache:
            cached_result = await self._get_from_cache(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for {endpoint}")
                return cached_result
        
        # Apply rate limiting
        await self.rate_limiter.acquire()
        
        # Make request with circuit breaker protection
        async def _request():
            url = f"{self.base_url}/{endpoint}"
            
            async with httpx.AsyncClient(**self.client_config) as client:
                for attempt in range(self.max_retries + 1):
                    try:
                        logger.debug(f"Making FDA API request: {url} (attempt {attempt + 1})")
                        response = await client.get(url, params=params)
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            # Cache successful response
                            if use_cache:
                                await self._set_cache(cache_key, data)
                            
                            return data
                        
                        elif response.status_code == 429:
                            # Rate limit exceeded
                            retry_after = int(response.headers.get("Retry-After", 60))
                            logger.warning(f"Rate limit exceeded, waiting {retry_after} seconds")
                            if attempt == self.max_retries:
                                raise RateLimitExceededError(
                                    f"Rate limit exceeded after {self.max_retries + 1} attempts",
                                    status_code=429
                                )
                            await asyncio.sleep(retry_after)
                            continue
                        
                        elif response.status_code == 401:
                            # Authentication error
                            raise FDAAPIError(
                                "Authentication failed - check FDA_API_KEY",
                                status_code=401
                            )
                        
                        elif response.status_code == 403:
                            # Forbidden - API key may be invalid or expired
                            raise FDAAPIError(
                                "Access forbidden - API key may be invalid or expired",
                                status_code=403
                            )
                        
                        elif response.status_code == 404:
                            raise PredicateNotFoundError(
                                f"No data found for query: {params}",
                                status_code=404
                            )
                        
                        else:
                            error_msg = f"FDA API error: {response.status_code}"
                            try:
                                error_data = response.json()
                                error_msg += f" - {error_data.get('error', {}).get('message', 'Unknown error')}"
                            except:
                                error_msg += f" - {response.text}"
                            
                            raise FDAAPIError(
                                error_msg,
                                status_code=response.status_code,
                                response_data=response.json() if response.content else None
                            )
                    
                    except httpx.RequestError as e:
                        if attempt == self.max_retries:
                            raise FDAAPIError(f"Network error after {self.max_retries + 1} attempts: {str(e)}")
                        
                        wait_time = 2 ** attempt  # Exponential backoff
                        logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                        await asyncio.sleep(wait_time)
            
            raise FDAAPIError(f"Failed to complete request after {self.max_retries + 1} attempts")
        
        return await self.circuit_breaker.call(_request)
    
    async def search_predicates(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[FDASearchResult]:
        """
        Search for predicate devices with advanced query building
        
        Args:
            search_terms: List of search terms for device name and intended use
            product_code: FDA product code filter
            device_class: Device class filter (I, II, III)
            limit: Maximum number of results
            skip: Number of results to skip (for pagination)
        
        Returns:
            List of FDA search results
        """
        try:
            # Build search query
            query_parts = []
            
            # Add search terms for device name and statement/summary
            if search_terms:
                term_queries = []
                for term in search_terms:
                    # Escape special characters and add quotes for exact phrase matching
                    escaped_term = term.replace('"', '\\"')
                    term_queries.append(f'device_name:"{escaped_term}"')
                    term_queries.append(f'statement_or_summary:"{escaped_term}"')
                
                # Combine with OR logic
                query_parts.append(f"({' OR '.join(term_queries)})")
            
            # Add product code filter
            if product_code:
                query_parts.append(f'product_code:"{product_code}"')
            
            # Add device class filter
            if device_class:
                query_parts.append(f'device_class:"{device_class}"')
            
            # Combine all query parts with AND logic
            search_query = " AND ".join(query_parts) if query_parts else "*"
            
            params = {
                "search": search_query,
                "limit": min(limit, 1000),  # FDA API limit
                "skip": skip,
                "sort": "date_received:desc"
            }
            
            logger.info(f"Searching FDA 510(k) database with query: {search_query}")
            data = await self._make_request("device/510k.json", params)
            
            results = []
            for item in data.get("results", []):
                try:
                    result = FDASearchResult(
                        k_number=item.get("k_number", ""),
                        device_name=item.get("device_name", ""),
                        intended_use=item.get("statement_or_summary", ""),
                        product_code=item.get("product_code", ""),
                        clearance_date=item.get("date_received", ""),
                        applicant=item.get("applicant", ""),
                        contact=item.get("contact", ""),
                        decision_description=item.get("decision_description", ""),
                        statement_or_summary=item.get("statement_or_summary", "")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Error parsing FDA result: {e}")
                    continue
            
            logger.info(f"Found {len(results)} predicate devices")
            return results
        
        except PredicateNotFoundError:
            logger.info("No predicate devices found for search criteria")
            return []
        except FDAAPIError:
            # Re-raise FDA API errors as-is
            raise
        except Exception as e:
            logger.error(f"Error searching predicates: {e}")
            raise FDAAPIError(f"Failed to search predicates: {str(e)}")
    
    async def get_device_details(self, k_number: str) -> Optional[FDASearchResult]:
        """
        Get detailed information for a specific K-number
        
        Args:
            k_number: FDA K-number (e.g., "K123456")
        
        Returns:
            Detailed device information or None if not found
        """
        try:
            params = {
                "search": f'k_number:"{k_number}"',
                "limit": 1
            }
            
            logger.info(f"Getting device details for K-number: {k_number}")
            data = await self._make_request("device/510k.json", params)
            
            results = data.get("results", [])
            if not results:
                logger.warning(f"No device found for K-number: {k_number}")
                return None
            
            item = results[0]
            return FDASearchResult(
                k_number=item.get("k_number", ""),
                device_name=item.get("device_name", ""),
                intended_use=item.get("statement_or_summary", ""),
                product_code=item.get("product_code", ""),
                clearance_date=item.get("date_received", ""),
                applicant=item.get("applicant", ""),
                contact=item.get("contact", ""),
                decision_description=item.get("decision_description", ""),
                statement_or_summary=item.get("statement_or_summary", "")
            )
        
        except Exception as e:
            logger.error(f"Error getting device details for {k_number}: {e}")
            raise FDAAPIError(f"Failed to get device details: {str(e)}")
    
    async def lookup_device_classification(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        regulation_number: Optional[str] = None
    ) -> List[DeviceClassificationResult]:
        """
        Lookup device classification information
        
        Args:
            product_code: FDA product code
            device_name: Device name to search
            regulation_number: CFR regulation number
        
        Returns:
            List of device classification results
        """
        try:
            query_parts = []
            
            if product_code:
                query_parts.append(f'product_code:"{product_code}"')
            
            if device_name:
                escaped_name = device_name.replace('"', '\\"')
                query_parts.append(f'device_name:"{escaped_name}"')
            
            if regulation_number:
                query_parts.append(f'regulation_number:"{regulation_number}"')
            
            if not query_parts:
                raise ValueError("At least one search parameter must be provided")
            
            search_query = " AND ".join(query_parts)
            
            params = {
                "search": search_query,
                "limit": 100
            }
            
            logger.info(f"Looking up device classification with query: {search_query}")
            data = await self._make_request("device/classification.json", params)
            
            results = []
            for item in data.get("results", []):
                try:
                    result = DeviceClassificationResult(
                        device_class=item.get("device_class", ""),
                        product_code=item.get("product_code", ""),
                        device_name=item.get("device_name", ""),
                        regulation_number=item.get("regulation_number", ""),
                        medical_specialty_description=item.get("medical_specialty_description", ""),
                        device_class_description=item.get("device_class_description", "")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Error parsing classification result: {e}")
                    continue
            
            logger.info(f"Found {len(results)} classification results")
            return results
        
        except Exception as e:
            logger.error(f"Error looking up device classification: {e}")
            raise FDAAPIError(f"Failed to lookup device classification: {str(e)}")
    
    async def search_adverse_events(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        manufacturer_name: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100
    ) -> List[AdverseEventResult]:
        """
        Search for adverse events related to predicate devices
        
        Args:
            product_code: FDA product code
            device_name: Device name to search
            manufacturer_name: Manufacturer name
            date_from: Start date (YYYY-MM-DD format)
            date_to: End date (YYYY-MM-DD format)
            limit: Maximum number of results
        
        Returns:
            List of adverse event results
        """
        try:
            query_parts = []
            
            if product_code:
                query_parts.append(f'device.product_code:"{product_code}"')
            
            if device_name:
                escaped_name = device_name.replace('"', '\\"')
                query_parts.append(f'device.generic_name:"{escaped_name}"')
            
            if manufacturer_name:
                escaped_manufacturer = manufacturer_name.replace('"', '\\"')
                query_parts.append(f'device.manufacturer_d_name:"{escaped_manufacturer}"')
            
            # Add date range filter
            if date_from or date_to:
                date_query = "date_received:["
                date_query += date_from.replace("-", "") if date_from else "19000101"
                date_query += " TO "
                date_query += date_to.replace("-", "") if date_to else "99991231"
                date_query += "]"
                query_parts.append(date_query)
            
            search_query = " AND ".join(query_parts) if query_parts else "*"
            
            params = {
                "search": search_query,
                "limit": min(limit, 1000),  # FDA API limit
                "sort": "date_received:desc"
            }
            
            logger.info(f"Searching adverse events with query: {search_query}")
            data = await self._make_request("device/event.json", params)
            
            results = []
            for item in data.get("results", []):
                try:
                    # Extract device information
                    device_info = item.get("device", [{}])[0] if item.get("device") else {}
                    
                    result = AdverseEventResult(
                        report_number=item.get("report_number", ""),
                        event_date=item.get("date_received", ""),
                        device_name=device_info.get("generic_name", ""),
                        manufacturer_name=device_info.get("manufacturer_d_name", ""),
                        event_type=item.get("event_type", ""),
                        patient_outcome=item.get("patient", [{}])[0].get("patient_outcome", "") if item.get("patient") else None,
                        device_problem_flag=device_info.get("device_problem_flag", "")
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Error parsing adverse event result: {e}")
                    continue
            
            logger.info(f"Found {len(results)} adverse events")
            return results
        
        except Exception as e:
            logger.error(f"Error searching adverse events: {e}")
            raise FDAAPIError(f"Failed to search adverse events: {str(e)}")
    
    async def get_product_code_info(self, product_code: str) -> Optional[DeviceClassificationResult]:
        """
        Get detailed information for a specific product code
        
        Args:
            product_code: FDA product code (e.g., "LLZ")
        
        Returns:
            Product code classification information
        """
        try:
            classifications = await self.lookup_device_classification(product_code=product_code)
            return classifications[0] if classifications else None
        except Exception as e:
            logger.error(f"Error getting product code info for {product_code}: {e}")
            raise FDAAPIError(f"Failed to get product code info: {str(e)}")
    
    async def validate_api_configuration(self) -> Dict[str, Any]:
        """
        Validate API configuration and connectivity
        
        Returns:
            Configuration validation results
        """
        validation_result = {
            "api_key_configured": bool(self.api_key),
            "base_url_accessible": False,
            "rate_limiter_configured": True,
            "circuit_breaker_configured": True,
            "cache_configured": bool(self.redis_client),
            "errors": [],
            "warnings": []
        }
        
        # Check API key
        if not self.api_key:
            validation_result["warnings"].append(
                "FDA_API_KEY not configured - API requests may be rate limited"
            )
        
        # Test basic connectivity
        try:
            params = {"search": "device_class:II", "limit": 1}
            await self._make_request("device/510k.json", params, use_cache=False)
            validation_result["base_url_accessible"] = True
        except RateLimitExceededError:
            validation_result["errors"].append("Rate limit exceeded during validation")
        except FDAAPIError as e:
            if e.status_code == 401:
                validation_result["errors"].append("Authentication failed - invalid API key")
            elif e.status_code == 403:
                validation_result["errors"].append("Access forbidden - API key may be expired")
            else:
                validation_result["errors"].append(f"API error: {e}")
        except Exception as e:
            validation_result["errors"].append(f"Connectivity test failed: {e}")
        
        return validation_result

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on FDA API
        
        Returns:
            Health status information
        """
        try:
            # Simple query to test API availability
            params = {
                "search": "device_class:II",
                "limit": 1
            }
            
            start_time = datetime.now()
            await self._make_request("device/510k.json", params, use_cache=False)
            response_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "circuit_breaker_state": self.circuit_breaker.state,
                "rate_limiter_requests": len(self.rate_limiter.requests),
                "api_key_configured": bool(self.api_key),
                "timestamp": datetime.now().isoformat()
            }
        
        except RateLimitExceededError as e:
            return {
                "status": "rate_limited",
                "error": str(e),
                "circuit_breaker_state": self.circuit_breaker.state,
                "api_key_configured": bool(self.api_key),
                "timestamp": datetime.now().isoformat()
            }
        except FDAAPIError as e:
            status = "authentication_error" if e.status_code in [401, 403] else "api_error"
            return {
                "status": status,
                "error": str(e),
                "status_code": e.status_code,
                "circuit_breaker_state": self.circuit_breaker.state,
                "api_key_configured": bool(self.api_key),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "circuit_breaker_state": self.circuit_breaker.state,
                "api_key_configured": bool(self.api_key),
                "timestamp": datetime.now().isoformat()
            }
    
    async def close(self) -> None:
        """Clean up resources"""
        if self.redis_client:
            await self.redis_client.close()


# Utility functions for common operations
async def create_production_openfda_service() -> OpenFDAService:
    """
    Create OpenFDA service for production use with real API
    
    Returns:
        Configured OpenFDA service instance for production
    """
    import os
    
    api_key = os.getenv("FDA_API_KEY")
    if not api_key:
        logger.warning("FDA_API_KEY not set, some features may be limited")

    redis_url = os.getenv("REDIS_URL")
    return await create_openfda_service(
        api_key=api_key,
        redis_url=redis_url,
        cache_ttl=3600
    )


async def create_openfda_service(
    api_key: Optional[str] = None,
    redis_url: Optional[str] = None,
    cache_ttl: int = 3600
) -> OpenFDAService:
    """
    Factory function to create OpenFDA service with Redis cache
    
    Args:
        api_key: FDA API key (optional but recommended)
        redis_url: Redis connection URL
        cache_ttl: Cache time-to-live in seconds
    
    Returns:
        Configured OpenFDA service instance
    """
    redis_client = None
    if redis_url:
        try:
            redis_client = redis.from_url(redis_url)
            # Test connection
            await redis_client.ping()
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            redis_client = None
    
    return OpenFDAService(
        api_key=api_key,
        redis_client=redis_client,
        cache_ttl=cache_ttl
    )


def create_successful_openfda_mock() -> OpenFDAService:
    """
    Create a mock OpenFDA service for testing with successful responses
    
    Returns:
        Mock OpenFDA service instance
    """
    from unittest.mock import Mock, AsyncMock
    
    mock_service = Mock(spec=OpenFDAService)
    
    # Mock search_predicates method
    mock_service.search_predicates = AsyncMock(return_value=[
        FDASearchResult(
            k_number="K123456",
            device_name="Test Device",
            intended_use="Test indication for medical device",
            product_code="ABC",
            clearance_date="2023-01-01",
            applicant="Test Company",
            contact="test@example.com",
            decision_description="Substantially Equivalent",
            statement_or_summary="Test device for regulatory testing",
            confidence_score=0.85
        )
    ])
    
    # Mock get_device_details method
    mock_service.get_device_details = AsyncMock(return_value=FDASearchResult(
        k_number="K123456",
        device_name="Test Device",
        intended_use="Test indication for medical device",
        product_code="ABC",
        clearance_date="2023-01-01",
        applicant="Test Company",
        contact="test@example.com",
        decision_description="Substantially Equivalent",
        statement_or_summary="Detailed test device information for regulatory testing",
        confidence_score=0.85
    ))
    
    # Mock lookup_device_classification method
    mock_service.lookup_device_classification = AsyncMock(return_value=[
        DeviceClassificationResult(
            device_class="II",
            product_code="ABC",
            device_name="Test Device Classification",
            regulation_number="21 CFR 123.456",
            medical_specialty_description="Test Medical Specialty",
            device_class_description="Class II Medical Device",
            confidence_score=0.90
        )
    ])
    
    # Mock search_adverse_events method
    mock_service.search_adverse_events = AsyncMock(return_value=[
        AdverseEventResult(
            report_number="12345678",
            event_date="2023-01-01",
            device_name="Test Device",
            manufacturer_name="Test Manufacturer",
            event_type="Malfunction",
            patient_outcome="No Adverse Outcome",
            device_problem_flag="Y"
        )
    ])
    
    # Mock get_product_code_info method
    mock_service.get_product_code_info = AsyncMock(return_value=DeviceClassificationResult(
        device_class="II",
        product_code="ABC",
        device_name="Test Product Code Device",
        regulation_number="21 CFR 123.456",
        medical_specialty_description="Test Medical Specialty",
        device_class_description="Class II Medical Device",
        confidence_score=0.90
    ))
    
    # Mock health_check method
    mock_service.health_check = AsyncMock(return_value={
        "status": "healthy",
        "response_time_seconds": 0.1,
        "circuit_breaker_state": "CLOSED",
        "rate_limiter_requests": 0,
        "timestamp": "2023-01-01T00:00:00"
    })
    
    # Mock close method
    mock_service.close = AsyncMock()
    
    return mock_service


def calculate_predicate_confidence(
    user_device_description: str,
    user_intended_use: str,
    predicate: FDASearchResult
) -> float:
    """
    Calculate confidence score for predicate match
    
    This is a simple implementation that can be enhanced with ML models
    
    Args:
        user_device_description: User's device description
        user_intended_use: User's intended use statement
        predicate: FDA predicate device result
    
    Returns:
        Confidence score between 0.0 and 1.0
    """
    try:
        # Simple keyword-based similarity scoring
        # In production, this should use more sophisticated NLP/ML approaches
        
        score = 0.0
        
        # Compare device names (30% weight)
        if predicate.device_name:
            user_words = set(user_device_description.lower().split())
            predicate_words = set(predicate.device_name.lower().split())
            name_similarity = len(user_words.intersection(predicate_words)) / max(len(user_words), 1)
            score += name_similarity * 0.3
        
        # Compare intended use (50% weight)
        if predicate.intended_use:
            user_use_words = set(user_intended_use.lower().split())
            predicate_use_words = set(predicate.intended_use.lower().split())
            use_similarity = len(user_use_words.intersection(predicate_use_words)) / max(len(user_use_words), 1)
            score += use_similarity * 0.5
        
        # Bonus for recent clearance (20% weight)
        if predicate.clearance_date:
            try:
                clearance_year = int(predicate.clearance_date[:4])
                current_year = datetime.now().year
                years_ago = current_year - clearance_year
                recency_score = max(0, 1 - (years_ago / 10))  # Decay over 10 years
                score += recency_score * 0.2
            except:
                pass
        
        return min(score, 1.0)
    
    except Exception as e:
        logger.warning(f"Error calculating confidence score: {e}")
        return 0.0