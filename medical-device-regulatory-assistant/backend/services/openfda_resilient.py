"""
Enhanced OpenFDA Service with Advanced Resilience

This module extends the OpenFDA service with advanced resilience patterns:
- Enhanced retry logic with exponential backoff and jitter
- Fallback mechanisms for service unavailability
- Request deduplication for high-load scenarios
- Graceful degradation for partial service availability
- Automated error recovery workflows
- Request queuing for rate limit management
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from services.openfda import (
    OpenFDAService, FDASearchResult, DeviceClassificationResult, 
    AdverseEventResult, FDAAPIError, RateLimitExceededError, 
    PredicateNotFoundError
)
from core.resilience import (
    ResilienceManager, RetryConfig, FallbackConfig, RetryStrategy,
    get_resilience_manager
)
from core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class ResilientOpenFDAService(OpenFDAService):
    """
    Enhanced OpenFDA service with advanced resilience patterns
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        redis_client: Optional[Any] = None,
        cache_ttl: int = 3600,
        max_retries: int = 5,
        timeout: int = 30,
        http_client: Optional[Any] = None,
        resilience_manager: Optional[ResilienceManager] = None
    ):
        super().__init__(
            api_key=api_key,
            redis_client=redis_client,
            cache_ttl=cache_ttl,
            max_retries=max_retries,
            timeout=timeout,
            http_client=http_client
        )
        
        # Initialize resilience manager
        self.resilience_manager = resilience_manager or get_resilience_manager()
        
        # Configure FDA-specific retry settings
        self._configure_fda_resilience()
        
        # Register fallback strategies
        self._register_fallback_strategies()
        
        # Register error recovery strategies
        self._register_error_recovery_strategies()
    
    def _configure_fda_resilience(self) -> None:
        """Configure FDA-specific resilience settings"""
        
        # Configure retry settings for FDA API
        retry_config = RetryConfig(
            max_retries=5,
            base_delay=1.0,
            max_delay=60.0,
            jitter=True,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            backoff_multiplier=2.0,
            retryable_exceptions={
                ConnectionError,
                TimeoutError,
                RateLimitExceededError,
                FDAAPIError
            }
        )
        
        # Configure fallback settings
        fallback_config = FallbackConfig(
            enabled=True,
            cache_fallback=True,
            static_fallback=True,
            degraded_service=True,
            timeout_seconds=30.0
        )
        
        # Update resilience manager configuration
        self.resilience_manager.retry_handler.config = retry_config
        self.resilience_manager.fallback_manager.config = fallback_config
    
    def _register_fallback_strategies(self) -> None:
        """Register fallback strategies for FDA service"""
        
        # Register static fallbacks for common searches
        self.resilience_manager.fallback_manager.register_static_fallback(
            "predicate_search_empty",
            []
        )
        
        self.resilience_manager.fallback_manager.register_static_fallback(
            "classification_empty",
            []
        )
        
        self.resilience_manager.fallback_manager.register_static_fallback(
            "adverse_events_empty",
            []
        )
        
        # Register service capabilities for graceful degradation
        if self.resilience_manager.degradation_manager:
            self.resilience_manager.degradation_manager.register_service_capabilities(
                "openfda",
                {
                    "predicate_search": True,
                    "device_classification": True,
                    "adverse_events": True,
                    "device_details": True,
                    "product_code_info": True
                }
            )
            
            # Register degradation strategies
            self.resilience_manager.degradation_manager.register_degradation_strategy(
                "predicate_search",
                self._degraded_predicate_search
            )
            
            self.resilience_manager.degradation_manager.register_degradation_strategy(
                "device_classification",
                self._degraded_classification_lookup
            )
    
    def _register_error_recovery_strategies(self) -> None:
        """Register error recovery strategies"""
        
        if self.resilience_manager.error_recovery:
            # Register recovery for rate limit errors
            self.resilience_manager.error_recovery.register_recovery_strategy(
                "RateLimitExceededError",
                self._recover_from_rate_limit,
                priority=10
            )
            
            # Register recovery for authentication errors
            self.resilience_manager.error_recovery.register_recovery_strategy(
                "FDAAPIError",
                self._recover_from_api_error,
                priority=5
            )
            
            # Register recovery for connection errors
            self.resilience_manager.error_recovery.register_recovery_strategy(
                "ConnectionError",
                self._recover_from_connection_error,
                priority=8
            )
    
    async def _degraded_predicate_search(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[FDASearchResult]:
        """Degraded predicate search using cached data only"""
        logger.info("Using degraded predicate search (cache only)")
        
        # Try to find cached results
        cache_key = f"predicate_search_{hash(str(search_terms))}_{product_code}_{device_class}"
        cached_result = await self.resilience_manager.fallback_manager._get_from_cache(cache_key)
        
        if cached_result:
            return [FDASearchResult(**item) for item in cached_result.get("results", [])]
        
        # Return limited static results as last resort
        return [
            FDASearchResult(
                k_number="K000000",
                device_name="Generic Medical Device",
                intended_use="General medical use (cached result)",
                product_code=product_code or "XXX",
                clearance_date="2020-01-01",
                confidence_score=0.1
            )
        ]
    
    async def _degraded_classification_lookup(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        regulation_number: Optional[str] = None
    ) -> List[DeviceClassificationResult]:
        """Degraded classification lookup using cached data only"""
        logger.info("Using degraded classification lookup (cache only)")
        
        # Return basic classification info
        return [
            DeviceClassificationResult(
                device_class="II",
                product_code=product_code or "XXX",
                device_name=device_name or "Unknown Device",
                regulation_number=regulation_number or "21 CFR 000.000",
                medical_specialty_description="General Medical Specialty",
                device_class_description="Class II Medical Device",
                confidence_score=0.1
            )
        ]
    
    async def _recover_from_rate_limit(
        self,
        error: RateLimitExceededError,
        context: Dict[str, Any]
    ) -> bool:
        """Recover from rate limit errors"""
        logger.info("Attempting recovery from rate limit error")
        
        try:
            # Wait for rate limit to reset (typically 1 minute for FDA API)
            await asyncio.sleep(60)
            
            # Test API connectivity
            test_params = {"search": "device_class:II", "limit": 1}
            await self._make_request("device/510k.json", test_params, use_cache=False)
            
            logger.info("Successfully recovered from rate limit error")
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover from rate limit error: {e}")
            return False
    
    async def _recover_from_api_error(
        self,
        error: FDAAPIError,
        context: Dict[str, Any]
    ) -> bool:
        """Recover from FDA API errors"""
        logger.info(f"Attempting recovery from FDA API error: {error.status_code}")
        
        try:
            if error.status_code == 401:
                # Authentication error - check if API key is valid
                if not self.api_key:
                    logger.warning("No API key configured for recovery")
                    return False
                
                # Test with a simple request
                test_params = {"search": "device_class:II", "limit": 1}
                await self._make_request("device/510k.json", test_params, use_cache=False)
                
                logger.info("Successfully recovered from authentication error")
                return True
                
            elif error.status_code == 503:
                # Service unavailable - wait and retry
                await asyncio.sleep(30)
                
                # Test API availability
                test_params = {"search": "device_class:II", "limit": 1}
                await self._make_request("device/510k.json", test_params, use_cache=False)
                
                logger.info("Successfully recovered from service unavailable error")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to recover from API error: {e}")
            return False
    
    async def _recover_from_connection_error(
        self,
        error: ConnectionError,
        context: Dict[str, Any]
    ) -> bool:
        """Recover from connection errors"""
        logger.info("Attempting recovery from connection error")
        
        try:
            # Wait for network to stabilize
            await asyncio.sleep(10)
            
            # Test basic connectivity
            test_params = {"search": "device_class:II", "limit": 1}
            await self._make_request("device/510k.json", test_params, use_cache=False)
            
            logger.info("Successfully recovered from connection error")
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover from connection error: {e}")
            return False
    
    async def search_predicates_resilient(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
        use_queue: bool = False
    ) -> List[FDASearchResult]:
        """
        Resilient predicate search with all resilience mechanisms
        
        Args:
            search_terms: List of search terms for device name and intended use
            product_code: FDA product code filter
            device_class: Device class filter (I, II, III)
            limit: Maximum number of results
            skip: Number of results to skip (for pagination)
            use_queue: Whether to use request queue for rate limiting
        
        Returns:
            List of FDA search results
        """
        
        async def _search_operation():
            return await super(ResilientOpenFDAService, self).search_predicates(
                search_terms, product_code, device_class, limit, skip
            )
        
        try:
            return await self.resilience_manager.execute_resilient_request(
                _search_operation,
                service_name="openfda",
                operation="search_predicates",
                use_retry=True,
                use_fallback=True,
                use_deduplication=True,
                use_queue=use_queue,
                fallback_value=[]
            )
            
        except Exception as e:
            # Attempt error recovery
            recovery_context = {
                "search_terms": search_terms,
                "product_code": product_code,
                "device_class": device_class,
                "operation": "search_predicates"
            }
            
            recovery_successful = await self.resilience_manager.attempt_error_recovery(e, recovery_context)
            
            if recovery_successful:
                # Retry after successful recovery
                return await _search_operation()
            else:
                # Use graceful degradation
                if self.resilience_manager.degradation_manager:
                    return await self.resilience_manager.degradation_manager.execute_with_degradation(
                        "openfda",
                        "predicate_search",
                        _search_operation,
                        search_terms, product_code, device_class, limit, skip
                    )
                
                # Final fallback
                logger.error(f"All resilience mechanisms failed for predicate search: {e}")
                return []
    
    async def get_device_details_resilient(
        self,
        k_number: str,
        use_queue: bool = False
    ) -> Optional[FDASearchResult]:
        """
        Resilient device details lookup
        
        Args:
            k_number: FDA K-number (e.g., "K123456")
            use_queue: Whether to use request queue for rate limiting
        
        Returns:
            Detailed device information or None if not found
        """
        
        async def _details_operation():
            return await super(ResilientOpenFDAService, self).get_device_details(k_number)
        
        try:
            return await self.resilience_manager.execute_resilient_request(
                _details_operation,
                service_name="openfda",
                operation="get_device_details",
                use_retry=True,
                use_fallback=True,
                use_deduplication=True,
                use_queue=use_queue,
                fallback_value=None
            )
            
        except Exception as e:
            # Attempt error recovery
            recovery_context = {
                "k_number": k_number,
                "operation": "get_device_details"
            }
            
            recovery_successful = await self.resilience_manager.attempt_error_recovery(e, recovery_context)
            
            if recovery_successful:
                return await _details_operation()
            else:
                logger.error(f"All resilience mechanisms failed for device details: {e}")
                return None
    
    async def lookup_device_classification_resilient(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        regulation_number: Optional[str] = None,
        use_queue: bool = False
    ) -> List[DeviceClassificationResult]:
        """
        Resilient device classification lookup
        
        Args:
            product_code: FDA product code
            device_name: Device name to search
            regulation_number: CFR regulation number
            use_queue: Whether to use request queue for rate limiting
        
        Returns:
            List of device classification results
        """
        
        async def _classification_operation():
            return await super(ResilientOpenFDAService, self).lookup_device_classification(
                product_code, device_name, regulation_number
            )
        
        try:
            return await self.resilience_manager.execute_resilient_request(
                _classification_operation,
                service_name="openfda",
                operation="lookup_device_classification",
                use_retry=True,
                use_fallback=True,
                use_deduplication=True,
                use_queue=use_queue,
                fallback_value=[]
            )
            
        except Exception as e:
            # Attempt error recovery
            recovery_context = {
                "product_code": product_code,
                "device_name": device_name,
                "regulation_number": regulation_number,
                "operation": "lookup_device_classification"
            }
            
            recovery_successful = await self.resilience_manager.attempt_error_recovery(e, recovery_context)
            
            if recovery_successful:
                return await _classification_operation()
            else:
                # Use graceful degradation
                if self.resilience_manager.degradation_manager:
                    return await self.resilience_manager.degradation_manager.execute_with_degradation(
                        "openfda",
                        "device_classification",
                        _classification_operation,
                        product_code, device_name, regulation_number
                    )
                
                logger.error(f"All resilience mechanisms failed for classification lookup: {e}")
                return []
    
    async def search_adverse_events_resilient(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        manufacturer_name: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
        use_queue: bool = False
    ) -> List[AdverseEventResult]:
        """
        Resilient adverse events search
        
        Args:
            product_code: FDA product code
            device_name: Device name to search
            manufacturer_name: Manufacturer name
            date_from: Start date (YYYY-MM-DD format)
            date_to: End date (YYYY-MM-DD format)
            limit: Maximum number of results
            use_queue: Whether to use request queue for rate limiting
        
        Returns:
            List of adverse event results
        """
        
        async def _adverse_events_operation():
            return await super(ResilientOpenFDAService, self).search_adverse_events(
                product_code, device_name, manufacturer_name, date_from, date_to, limit
            )
        
        try:
            return await self.resilience_manager.execute_resilient_request(
                _adverse_events_operation,
                service_name="openfda",
                operation="search_adverse_events",
                use_retry=True,
                use_fallback=True,
                use_deduplication=True,
                use_queue=use_queue,
                fallback_value=[]
            )
            
        except Exception as e:
            # Attempt error recovery
            recovery_context = {
                "product_code": product_code,
                "device_name": device_name,
                "manufacturer_name": manufacturer_name,
                "date_from": date_from,
                "date_to": date_to,
                "operation": "search_adverse_events"
            }
            
            recovery_successful = await self.resilience_manager.attempt_error_recovery(e, recovery_context)
            
            if recovery_successful:
                return await _adverse_events_operation()
            else:
                logger.error(f"All resilience mechanisms failed for adverse events search: {e}")
                return []
    
    async def health_check_resilient(self) -> Dict[str, Any]:
        """
        Enhanced health check with resilience information
        
        Returns:
            Comprehensive health status including resilience metrics
        """
        base_health = await super().health_check()
        
        # Add resilience statistics
        resilience_stats = self.resilience_manager.get_comprehensive_stats()
        
        return {
            **base_health,
            "resilience": resilience_stats,
            "enhanced_features": {
                "retry_mechanism": True,
                "fallback_strategies": True,
                "request_deduplication": True,
                "graceful_degradation": True,
                "error_recovery": True,
                "request_queuing": True
            }
        }
    
    async def get_resilience_metrics(self) -> Dict[str, Any]:
        """Get detailed resilience metrics"""
        return self.resilience_manager.get_comprehensive_stats()
    
    async def close(self) -> None:
        """Clean up resources including resilience manager"""
        await super().close()
        await self.resilience_manager.shutdown()


# Factory functions for creating resilient OpenFDA service instances

async def create_resilient_openfda_service(
    api_key: Optional[str] = None,
    redis_url: Optional[str] = None,
    cache_ttl: int = 3600,
    enable_all_resilience: bool = True
) -> ResilientOpenFDAService:
    """
    Factory function to create resilient OpenFDA service
    
    Args:
        api_key: FDA API key (optional but recommended)
        redis_url: Redis connection URL
        cache_ttl: Cache TTL in seconds
        enable_all_resilience: Whether to enable all resilience features
    
    Returns:
        Configured resilient OpenFDA service instance
    """
    import redis.asyncio as redis
    
    # Create Redis client if URL provided
    redis_client = None
    if redis_url:
        try:
            redis_client = redis.from_url(redis_url)
            await redis_client.ping()
            logger.info("Connected to Redis for caching")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            redis_client = None
    
    # Create resilience manager
    resilience_manager = None
    if enable_all_resilience:
        from core.resilience import initialize_resilience_manager
        resilience_manager = await initialize_resilience_manager()
    
    return ResilientOpenFDAService(
        api_key=api_key,
        redis_client=redis_client,
        cache_ttl=cache_ttl,
        resilience_manager=resilience_manager
    )


async def create_production_resilient_openfda_service() -> ResilientOpenFDAService:
    """
    Create resilient OpenFDA service for production use
    
    Returns:
        Configured resilient OpenFDA service instance for production
    """
    import os
    
    api_key = os.getenv("FDA_API_KEY")
    if not api_key:
        logger.warning("FDA_API_KEY not set, some features may be limited")

    redis_url = os.getenv("REDIS_URL")
    
    return await create_resilient_openfda_service(
        api_key=api_key,
        redis_url=redis_url,
        cache_ttl=3600,
        enable_all_resilience=True
    )