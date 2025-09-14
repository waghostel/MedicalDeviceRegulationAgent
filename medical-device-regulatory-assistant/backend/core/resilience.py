"""
Enhanced Error Handling and Resilience Module

This module provides advanced error handling and resilience patterns for production reliability:
- Exponential backoff with jitter for failed requests
- Fallback mechanisms when external services are unavailable
- Request deduplication to prevent duplicate requests during high-load scenarios
- Graceful degradation for partial service availability
- Automated error recovery workflows
- Request queuing for rate limit management
"""

import asyncio
import hashlib
import json
import logging
import random
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar, Union
from dataclasses import dataclass, field
from enum import Enum
from contextlib import asynccontextmanager
import uuid

from core.exceptions import ExternalServiceError, RegulatoryAssistantException

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ServiceState(Enum):
    """Service availability states"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    RECOVERING = "recovering"


class RetryStrategy(Enum):
    """Retry strategy types"""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    IMMEDIATE = "immediate"


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    jitter: bool = True
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    backoff_multiplier: float = 2.0
    retryable_exceptions: Set[type] = field(default_factory=lambda: {
        ConnectionError, TimeoutError, ExternalServiceError
    })


@dataclass
class FallbackConfig:
    """Configuration for fallback behavior"""
    enabled: bool = True
    cache_fallback: bool = True
    static_fallback: bool = True
    degraded_service: bool = True
    timeout_seconds: float = 5.0


@dataclass
class RequestInfo:
    """Information about a request for deduplication"""
    request_id: str
    method: str
    url: str
    params: Dict[str, Any]
    timestamp: datetime
    result: Optional[Any] = None
    error: Optional[Exception] = None
    completed: bool = False


class AdvancedRetryHandler:
    """Advanced retry handler with exponential backoff and jitter"""
    
    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()
        self.retry_counts: Dict[str, int] = {}
        self.last_retry_times: Dict[str, datetime] = {}
    
    async def retry_with_backoff(
        self,
        func: Callable,
        *args,
        operation_id: str = None,
        **kwargs
    ) -> Any:
        """
        Retry function with exponential backoff and jitter
        
        Args:
            func: Function to retry
            *args: Function arguments
            operation_id: Unique identifier for tracking retries
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        
        Raises:
            Exception: Last exception if all retries fail
        """
        if operation_id is None:
            operation_id = f"{func.__name__}_{id(args)}_{id(kwargs)}"
        
        last_exception = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                result = await func(*args, **kwargs)
                
                # Reset retry count on success
                if operation_id in self.retry_counts:
                    del self.retry_counts[operation_id]
                    del self.last_retry_times[operation_id]
                
                return result
                
            except Exception as e:
                last_exception = e
                
                # Check if exception is retryable
                if not any(isinstance(e, exc_type) for exc_type in self.config.retryable_exceptions):
                    logger.warning(f"Non-retryable exception for {operation_id}: {e}")
                    raise e
                
                # Don't retry on last attempt
                if attempt == self.config.max_retries:
                    logger.error(f"All retry attempts failed for {operation_id}: {e}")
                    break
                
                # Calculate delay
                delay = self._calculate_delay(attempt)
                
                # Track retry attempt
                self.retry_counts[operation_id] = attempt + 1
                self.last_retry_times[operation_id] = datetime.utcnow()
                
                logger.warning(
                    f"Retry attempt {attempt + 1}/{self.config.max_retries} "
                    f"for {operation_id} failed: {e}. Retrying in {delay:.2f}s"
                )
                
                await asyncio.sleep(delay)
        
        # All retries failed
        raise last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt"""
        if self.config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.config.base_delay * (self.config.backoff_multiplier ** attempt)
        elif self.config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.base_delay * (attempt + 1)
        elif self.config.strategy == RetryStrategy.FIXED_DELAY:
            delay = self.config.base_delay
        else:  # IMMEDIATE
            delay = 0
        
        # Apply maximum delay limit
        delay = min(delay, self.config.max_delay)
        
        # Add jitter to prevent thundering herd
        if self.config.jitter:
            jitter_amount = delay * 0.1 * random.random()
            delay += jitter_amount
        
        return delay
    
    def get_retry_stats(self, operation_id: str) -> Dict[str, Any]:
        """Get retry statistics for an operation"""
        return {
            "retry_count": self.retry_counts.get(operation_id, 0),
            "last_retry_time": self.last_retry_times.get(operation_id),
            "max_retries": self.config.max_retries
        }


class FallbackManager:
    """Manages fallback mechanisms when services are unavailable"""
    
    def __init__(self, config: FallbackConfig = None):
        self.config = config or FallbackConfig()
        self.cached_responses: Dict[str, Any] = {}
        self.static_fallbacks: Dict[str, Any] = {}
        self.service_states: Dict[str, ServiceState] = {}
    
    async def execute_with_fallback(
        self,
        primary_func: Callable,
        service_name: str,
        cache_key: str = None,
        static_fallback: Any = None,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with fallback mechanisms
        
        Args:
            primary_func: Primary function to execute
            service_name: Name of the service
            cache_key: Key for cached fallback
            static_fallback: Static fallback value
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result or fallback value
        """
        if not self.config.enabled:
            return await primary_func(*args, **kwargs)
        
        try:
            # Try primary function with timeout
            result = await asyncio.wait_for(
                primary_func(*args, **kwargs),
                timeout=self.config.timeout_seconds
            )
            
            # Cache successful result
            if cache_key and self.config.cache_fallback:
                self.cached_responses[cache_key] = {
                    "result": result,
                    "timestamp": datetime.utcnow(),
                    "service": service_name
                }
            
            # Update service state
            self.service_states[service_name] = ServiceState.HEALTHY
            
            return result
            
        except Exception as e:
            logger.warning(f"Primary function failed for {service_name}: {e}")
            
            # Update service state
            self.service_states[service_name] = ServiceState.UNAVAILABLE
            
            # Try fallback mechanisms
            return await self._try_fallbacks(
                service_name, cache_key, static_fallback, e
            )
    
    async def _try_fallbacks(
        self,
        service_name: str,
        cache_key: str,
        static_fallback: Any,
        original_error: Exception
    ) -> Any:
        """Try various fallback mechanisms"""
        
        # Try cached response first
        if cache_key and self.config.cache_fallback:
            cached = self.cached_responses.get(cache_key)
            if cached:
                age = (datetime.utcnow() - cached["timestamp"]).total_seconds()
                if age < 3600:  # Use cache if less than 1 hour old
                    logger.info(f"Using cached fallback for {service_name}")
                    return cached["result"]
        
        # Try static fallback
        if static_fallback is not None and self.config.static_fallback:
            logger.info(f"Using static fallback for {service_name}")
            return static_fallback
        
        # Try degraded service
        if self.config.degraded_service:
            degraded_result = await self._get_degraded_response(service_name)
            if degraded_result is not None:
                logger.info(f"Using degraded service response for {service_name}")
                return degraded_result
        
        # No fallback available
        logger.error(f"No fallback available for {service_name}")
        raise ExternalServiceError(
            service_name=service_name,
            operation="fallback_execution",
            service_message=str(original_error)
        )
    
    async def _get_degraded_response(self, service_name: str) -> Optional[Any]:
        """Get degraded service response"""
        # This would be implemented based on specific service requirements
        # For now, return None to indicate no degraded service available
        return None
    
    def register_static_fallback(self, key: str, value: Any) -> None:
        """Register a static fallback value"""
        self.static_fallbacks[key] = value
    
    def get_service_state(self, service_name: str) -> ServiceState:
        """Get current service state"""
        return self.service_states.get(service_name, ServiceState.HEALTHY)
    
    def clear_cache(self, service_name: str = None) -> None:
        """Clear cached responses"""
        if service_name:
            keys_to_remove = [
                key for key, value in self.cached_responses.items()
                if value.get("service") == service_name
            ]
            for key in keys_to_remove:
                del self.cached_responses[key]
        else:
            self.cached_responses.clear()


class RequestDeduplicator:
    """Prevents duplicate requests during high-load scenarios"""
    
    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self.active_requests: Dict[str, RequestInfo] = {}
        self.completed_requests: Dict[str, RequestInfo] = {}
        self._lock = asyncio.Lock()
    
    def _generate_request_key(
        self,
        method: str,
        url: str,
        params: Dict[str, Any]
    ) -> str:
        """Generate unique key for request deduplication"""
        # Sort params for consistent key generation
        sorted_params = json.dumps(params, sort_keys=True)
        key_string = f"{method}:{url}:{sorted_params}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    async def deduplicate_request(
        self,
        func: Callable,
        method: str,
        url: str,
        params: Dict[str, Any] = None,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute request with deduplication
        
        Args:
            func: Function to execute
            method: HTTP method or operation type
            url: URL or operation identifier
            params: Request parameters
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        """
        if params is None:
            params = {}
        
        request_key = self._generate_request_key(method, url, params)
        
        async with self._lock:
            # Check if request is already active
            if request_key in self.active_requests:
                active_request = self.active_requests[request_key]
                logger.info(f"Duplicate request detected: {request_key}")
                
                # Wait for active request to complete
                while not active_request.completed:
                    await asyncio.sleep(0.1)
                
                if active_request.error:
                    raise active_request.error
                return active_request.result
            
            # Check if we have a recent completed request
            if request_key in self.completed_requests:
                completed_request = self.completed_requests[request_key]
                age = (datetime.utcnow() - completed_request.timestamp).total_seconds()
                
                if age < self.ttl_seconds:
                    logger.info(f"Using cached result for duplicate request: {request_key}")
                    if completed_request.error:
                        raise completed_request.error
                    return completed_request.result
                else:
                    # Remove expired request
                    del self.completed_requests[request_key]
            
            # Create new request info
            request_info = RequestInfo(
                request_id=str(uuid.uuid4()),
                method=method,
                url=url,
                params=params,
                timestamp=datetime.utcnow()
            )
            
            self.active_requests[request_key] = request_info
        
        try:
            # Execute the function
            result = await func(*args, **kwargs)
            
            # Mark as completed with result
            async with self._lock:
                request_info.result = result
                request_info.completed = True
                
                # Move to completed requests
                self.completed_requests[request_key] = request_info
                del self.active_requests[request_key]
            
            return result
            
        except Exception as e:
            # Mark as completed with error
            async with self._lock:
                request_info.error = e
                request_info.completed = True
                
                # Move to completed requests
                self.completed_requests[request_key] = request_info
                del self.active_requests[request_key]
            
            raise e
    
    async def cleanup_expired_requests(self) -> None:
        """Clean up expired completed requests"""
        async with self._lock:
            current_time = datetime.utcnow()
            expired_keys = [
                key for key, request_info in self.completed_requests.items()
                if (current_time - request_info.timestamp).total_seconds() > self.ttl_seconds
            ]
            
            for key in expired_keys:
                del self.completed_requests[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired requests")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get deduplication statistics"""
        return {
            "active_requests": len(self.active_requests),
            "completed_requests": len(self.completed_requests),
            "ttl_seconds": self.ttl_seconds
        }


class GracefulDegradationManager:
    """Manages graceful degradation when services are partially available"""
    
    def __init__(self):
        self.service_capabilities: Dict[str, Dict[str, bool]] = {}
        self.degradation_strategies: Dict[str, Callable] = {}
    
    def register_service_capabilities(
        self,
        service_name: str,
        capabilities: Dict[str, bool]
    ) -> None:
        """Register service capabilities"""
        self.service_capabilities[service_name] = capabilities
    
    def register_degradation_strategy(
        self,
        capability: str,
        strategy: Callable
    ) -> None:
        """Register degradation strategy for a capability"""
        self.degradation_strategies[capability] = strategy
    
    async def execute_with_degradation(
        self,
        service_name: str,
        capability: str,
        primary_func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with graceful degradation
        
        Args:
            service_name: Name of the service
            capability: Required capability
            primary_func: Primary function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result or degraded result
        """
        # Check if service has the required capability
        service_caps = self.service_capabilities.get(service_name, {})
        
        if service_caps.get(capability, True):
            # Capability is available, try primary function
            try:
                return await primary_func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Primary function failed for {service_name}.{capability}: {e}")
                # Mark capability as unavailable
                service_caps[capability] = False
        
        # Use degradation strategy
        if capability in self.degradation_strategies:
            logger.info(f"Using degradation strategy for {service_name}.{capability}")
            return await self.degradation_strategies[capability](*args, **kwargs)
        
        # No degradation strategy available
        raise ExternalServiceError(
            service_name=service_name,
            operation=capability,
            service_message="Capability unavailable and no degradation strategy"
        )
    
    def restore_capability(self, service_name: str, capability: str) -> None:
        """Restore a service capability"""
        if service_name in self.service_capabilities:
            self.service_capabilities[service_name][capability] = True
    
    def get_service_status(self, service_name: str) -> Dict[str, Any]:
        """Get service status and capabilities"""
        capabilities = self.service_capabilities.get(service_name, {})
        available_capabilities = [cap for cap, available in capabilities.items() if available]
        unavailable_capabilities = [cap for cap, available in capabilities.items() if not available]
        
        return {
            "service_name": service_name,
            "available_capabilities": available_capabilities,
            "unavailable_capabilities": unavailable_capabilities,
            "health_percentage": len(available_capabilities) / len(capabilities) * 100 if capabilities else 100
        }


class ErrorRecoveryWorkflow:
    """Automated error recovery workflows for common failure scenarios"""
    
    def __init__(self):
        self.recovery_strategies: Dict[str, List[Callable]] = {}
        self.recovery_history: List[Dict[str, Any]] = []
    
    def register_recovery_strategy(
        self,
        error_type: str,
        recovery_func: Callable,
        priority: int = 0
    ) -> None:
        """Register a recovery strategy for an error type"""
        if error_type not in self.recovery_strategies:
            self.recovery_strategies[error_type] = []
        
        self.recovery_strategies[error_type].append((priority, recovery_func))
        # Sort by priority (higher priority first)
        self.recovery_strategies[error_type].sort(key=lambda x: x[0], reverse=True)
    
    async def attempt_recovery(
        self,
        error: Exception,
        context: Dict[str, Any] = None
    ) -> bool:
        """
        Attempt to recover from an error
        
        Args:
            error: The error to recover from
            context: Additional context for recovery
        
        Returns:
            True if recovery was successful, False otherwise
        """
        error_type = type(error).__name__
        context = context or {}
        
        recovery_attempt = {
            "error_type": error_type,
            "error_message": str(error),
            "timestamp": datetime.utcnow(),
            "context": context,
            "recovery_successful": False,
            "strategies_attempted": []
        }
        
        if error_type in self.recovery_strategies:
            for priority, recovery_func in self.recovery_strategies[error_type]:
                try:
                    logger.info(f"Attempting recovery strategy for {error_type}")
                    
                    success = await recovery_func(error, context)
                    recovery_attempt["strategies_attempted"].append({
                        "function": recovery_func.__name__,
                        "priority": priority,
                        "successful": success
                    })
                    
                    if success:
                        recovery_attempt["recovery_successful"] = True
                        logger.info(f"Recovery successful for {error_type}")
                        break
                        
                except Exception as recovery_error:
                    logger.error(f"Recovery strategy failed: {recovery_error}")
                    recovery_attempt["strategies_attempted"].append({
                        "function": recovery_func.__name__,
                        "priority": priority,
                        "successful": False,
                        "error": str(recovery_error)
                    })
        
        self.recovery_history.append(recovery_attempt)
        return recovery_attempt["recovery_successful"]
    
    def get_recovery_stats(self) -> Dict[str, Any]:
        """Get recovery statistics"""
        total_attempts = len(self.recovery_history)
        successful_recoveries = sum(1 for attempt in self.recovery_history if attempt["recovery_successful"])
        
        error_type_stats = {}
        for attempt in self.recovery_history:
            error_type = attempt["error_type"]
            if error_type not in error_type_stats:
                error_type_stats[error_type] = {"total": 0, "successful": 0}
            
            error_type_stats[error_type]["total"] += 1
            if attempt["recovery_successful"]:
                error_type_stats[error_type]["successful"] += 1
        
        return {
            "total_recovery_attempts": total_attempts,
            "successful_recoveries": successful_recoveries,
            "success_rate": successful_recoveries / total_attempts * 100 if total_attempts > 0 else 0,
            "error_type_stats": error_type_stats,
            "registered_strategies": {
                error_type: len(strategies) 
                for error_type, strategies in self.recovery_strategies.items()
            }
        }


class RequestQueue:
    """Request queuing system for rate limit management"""
    
    def __init__(self, max_concurrent: int = 10, rate_limit_per_minute: int = 240):
        self.max_concurrent = max_concurrent
        self.rate_limit_per_minute = rate_limit_per_minute
        self.queue: asyncio.Queue = asyncio.Queue()
        self.active_requests: Set[str] = set()
        self.request_timestamps: List[datetime] = []
        self.processing_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
    
    async def start_processing(self) -> None:
        """Start processing queued requests"""
        if self.processing_task is None or self.processing_task.done():
            self.processing_task = asyncio.create_task(self._process_queue())
    
    async def stop_processing(self) -> None:
        """Stop processing queued requests"""
        if self.processing_task and not self.processing_task.done():
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
    
    async def enqueue_request(
        self,
        func: Callable,
        request_id: str = None,
        priority: int = 0,
        *args,
        **kwargs
    ) -> Any:
        """
        Enqueue a request for processing
        
        Args:
            func: Function to execute
            request_id: Unique request identifier
            priority: Request priority (higher = more important)
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        """
        if request_id is None:
            request_id = str(uuid.uuid4())
        
        # Create future for result
        result_future = asyncio.Future()
        
        request_item = {
            "id": request_id,
            "func": func,
            "args": args,
            "kwargs": kwargs,
            "priority": priority,
            "future": result_future,
            "timestamp": datetime.utcnow()
        }
        
        await self.queue.put(request_item)
        logger.debug(f"Enqueued request {request_id} with priority {priority}")
        
        # Start processing if not already running
        await self.start_processing()
        
        # Wait for result
        return await result_future
    
    async def _process_queue(self) -> None:
        """Process queued requests with rate limiting"""
        logger.info("Started request queue processing")
        
        try:
            while True:
                # Wait for request
                request_item = await self.queue.get()
                
                # Check rate limits
                await self._enforce_rate_limits()
                
                # Check concurrent request limits
                while len(self.active_requests) >= self.max_concurrent:
                    await asyncio.sleep(0.1)
                
                # Process request
                asyncio.create_task(self._execute_request(request_item))
                
        except asyncio.CancelledError:
            logger.info("Request queue processing stopped")
            raise
        except Exception as e:
            logger.error(f"Error in request queue processing: {e}")
            # Restart processing
            await asyncio.sleep(1)
            await self.start_processing()
    
    async def _enforce_rate_limits(self) -> None:
        """Enforce rate limits"""
        current_time = datetime.utcnow()
        
        # Remove timestamps older than 1 minute
        cutoff_time = current_time - timedelta(minutes=1)
        self.request_timestamps = [
            ts for ts in self.request_timestamps if ts > cutoff_time
        ]
        
        # Check if we're at the rate limit
        if len(self.request_timestamps) >= self.rate_limit_per_minute:
            # Calculate wait time
            oldest_timestamp = min(self.request_timestamps)
            wait_time = 60 - (current_time - oldest_timestamp).total_seconds()
            
            if wait_time > 0:
                logger.warning(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
    
    async def _execute_request(self, request_item: Dict[str, Any]) -> None:
        """Execute a queued request"""
        request_id = request_item["id"]
        func = request_item["func"]
        args = request_item["args"]
        kwargs = request_item["kwargs"]
        future = request_item["future"]
        
        async with self._lock:
            self.active_requests.add(request_id)
            self.request_timestamps.append(datetime.utcnow())
        
        try:
            logger.debug(f"Executing request {request_id}")
            result = await func(*args, **kwargs)
            future.set_result(result)
            
        except Exception as e:
            logger.error(f"Request {request_id} failed: {e}")
            future.set_exception(e)
            
        finally:
            async with self._lock:
                self.active_requests.discard(request_id)
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            "queue_size": self.queue.qsize(),
            "active_requests": len(self.active_requests),
            "max_concurrent": self.max_concurrent,
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "requests_last_minute": len(self.request_timestamps),
            "processing": self.processing_task is not None and not self.processing_task.done()
        }


class ResilienceManager:
    """Central manager for all resilience components"""
    
    def __init__(
        self,
        retry_config: RetryConfig = None,
        fallback_config: FallbackConfig = None,
        enable_deduplication: bool = True,
        enable_graceful_degradation: bool = True,
        enable_error_recovery: bool = True,
        enable_request_queue: bool = True
    ):
        self.retry_handler = AdvancedRetryHandler(retry_config)
        self.fallback_manager = FallbackManager(fallback_config)
        self.request_deduplicator = RequestDeduplicator() if enable_deduplication else None
        self.degradation_manager = GracefulDegradationManager() if enable_graceful_degradation else None
        self.error_recovery = ErrorRecoveryWorkflow() if enable_error_recovery else None
        self.request_queue = RequestQueue() if enable_request_queue else None
        
        # Start background tasks
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_background_tasks()
    
    def _start_background_tasks(self) -> None:
        """Start background maintenance tasks"""
        if self.request_deduplicator:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        
        if self.request_queue:
            asyncio.create_task(self.request_queue.start_processing())
    
    async def _periodic_cleanup(self) -> None:
        """Periodic cleanup of expired data"""
        try:
            while True:
                await asyncio.sleep(300)  # Clean up every 5 minutes
                if self.request_deduplicator:
                    await self.request_deduplicator.cleanup_expired_requests()
        except asyncio.CancelledError:
            pass
    
    async def execute_resilient_request(
        self,
        func: Callable,
        service_name: str,
        operation: str,
        use_retry: bool = True,
        use_fallback: bool = True,
        use_deduplication: bool = True,
        use_queue: bool = False,
        fallback_value: Any = None,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute a request with all resilience mechanisms
        
        Args:
            func: Function to execute
            service_name: Name of the service
            operation: Operation being performed
            use_retry: Whether to use retry mechanism
            use_fallback: Whether to use fallback mechanism
            use_deduplication: Whether to use request deduplication
            use_queue: Whether to use request queue
            fallback_value: Static fallback value
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        """
        
        # Wrap function with resilience mechanisms
        resilient_func = func
        
        # Add retry mechanism
        if use_retry and self.retry_handler:
            async def retry_wrapper(*args, **kwargs):
                return await self.retry_handler.retry_with_backoff(
                    resilient_func, *args, operation_id=f"{service_name}_{operation}", **kwargs
                )
            resilient_func = retry_wrapper
        
        # Add fallback mechanism
        if use_fallback and self.fallback_manager:
            cache_key = f"{service_name}_{operation}_{hash(str(args) + str(kwargs))}"
            original_func = resilient_func
            
            async def fallback_wrapper(*args, **kwargs):
                return await self.fallback_manager.execute_with_fallback(
                    original_func, service_name, cache_key, fallback_value, *args, **kwargs
                )
            resilient_func = fallback_wrapper
        
        # Add deduplication
        if use_deduplication and self.request_deduplicator:
            async def dedup_wrapper(*args, **kwargs):
                return await self.request_deduplicator.deduplicate_request(
                    resilient_func, "POST", f"{service_name}/{operation}", 
                    {"args": str(args), "kwargs": str(kwargs)}, *args, **kwargs
                )
            resilient_func = dedup_wrapper
        
        # Add request queue
        if use_queue and self.request_queue:
            return await self.request_queue.enqueue_request(
                resilient_func, f"{service_name}_{operation}_{int(time.time())}", 0, *args, **kwargs
            )
        else:
            return await resilient_func(*args, **kwargs)
    
    async def attempt_error_recovery(
        self,
        error: Exception,
        context: Dict[str, Any] = None
    ) -> bool:
        """Attempt to recover from an error"""
        if self.error_recovery:
            return await self.error_recovery.attempt_recovery(error, context)
        return False
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive resilience statistics"""
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        if self.retry_handler:
            stats["components"]["retry_handler"] = {
                "active_operations": len(self.retry_handler.retry_counts),
                "config": {
                    "max_retries": self.retry_handler.config.max_retries,
                    "strategy": self.retry_handler.config.strategy.value
                }
            }
        
        if self.fallback_manager:
            stats["components"]["fallback_manager"] = {
                "cached_responses": len(self.fallback_manager.cached_responses),
                "service_states": {
                    service: state.value 
                    for service, state in self.fallback_manager.service_states.items()
                }
            }
        
        if self.request_deduplicator:
            stats["components"]["request_deduplicator"] = self.request_deduplicator.get_stats()
        
        if self.error_recovery:
            stats["components"]["error_recovery"] = self.error_recovery.get_recovery_stats()
        
        if self.request_queue:
            stats["components"]["request_queue"] = self.request_queue.get_queue_stats()
        
        return stats
    
    async def shutdown(self) -> None:
        """Shutdown resilience manager and cleanup resources"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        if self.request_queue:
            await self.request_queue.stop_processing()
        
        logger.info("Resilience manager shutdown complete")


# Global resilience manager instance
_resilience_manager: Optional[ResilienceManager] = None


def get_resilience_manager() -> ResilienceManager:
    """Get global resilience manager instance"""
    global _resilience_manager
    if _resilience_manager is None:
        _resilience_manager = ResilienceManager()
    return _resilience_manager


async def initialize_resilience_manager(
    retry_config: RetryConfig = None,
    fallback_config: FallbackConfig = None,
    **kwargs
) -> ResilienceManager:
    """Initialize global resilience manager"""
    global _resilience_manager
    _resilience_manager = ResilienceManager(
        retry_config=retry_config,
        fallback_config=fallback_config,
        **kwargs
    )
    return _resilience_manager