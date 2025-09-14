"""
Enhanced OpenFDA Service with Intelligent Caching and Performance Optimization

This service extends the base OpenFDA service with:
- Intelligent caching strategies
- Query optimization
- Response compression
- Performance monitoring
- Background cache warming
"""

import asyncio
import gzip
import json
import logging
import time
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass

from .openfda import OpenFDAService, FDASearchResult, DeviceClassificationResult, AdverseEventResult
from .intelligent_cache import IntelligentCache, CacheStrategy, DataFreshness
from .performance_monitor import get_performance_monitor
from .query_optimizer import get_query_optimizer

logger = logging.getLogger(__name__)


@dataclass
class QueryOptimization:
    """Query optimization configuration"""
    use_compression: bool = True
    batch_size: int = 100
    parallel_requests: int = 3
    cache_strategy: CacheStrategy = CacheStrategy.ADAPTIVE
    freshness_requirement: DataFreshness = DataFreshness.RECENT


@dataclass
class PerformanceMetrics:
    """Performance metrics for FDA API calls"""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    avg_response_time_ms: float = 0.0
    compression_ratio: float = 0.0
    background_updates: int = 0


class EnhancedOpenFDAService:
    """
    Enhanced OpenFDA service with intelligent caching and performance optimization
    """
    
    def __init__(
        self,
        base_service: OpenFDAService,
        intelligent_cache: IntelligentCache,
        optimization_config: Optional[QueryOptimization] = None
    ):
        self.base_service = base_service
        self.cache = intelligent_cache
        self.config = optimization_config or QueryOptimization()
        self.metrics = PerformanceMetrics()
        
        # Performance monitoring
        self.performance_monitor = get_performance_monitor()
        self.query_optimizer = get_query_optimizer()
        
        # Background tasks
        self._warming_tasks: Set[asyncio.Task] = set()
        self._running = False
        
        # Frequently accessed queries for warming
        self.popular_queries = [
            {"search_terms": ["cardiac", "pacemaker"], "product_code": "DXX"},
            {"search_terms": ["orthopedic", "implant"], "product_code": "KWP"},
            {"search_terms": ["surgical", "instrument"], "product_code": "GEI"},
            {"search_terms": ["diagnostic", "imaging"], "product_code": "JAK"},
            {"search_terms": ["infusion", "pump"], "product_code": "LRO"}
        ]
    
    async def search_predicates_optimized(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
        use_cache: bool = True,
        freshness: DataFreshness = DataFreshness.RECENT
    ) -> List[FDASearchResult]:
        """
        Optimized predicate search with intelligent caching
        """
        start_time = time.time()
        
        # Generate cache key
        cache_key = self._generate_search_cache_key(
            search_terms, product_code, device_class, limit, skip
        )
        
        try:
            # Try cache first if enabled
            if use_cache:
                cached_results = await self.cache.get_with_freshness_check(
                    "fda_predicate_search",
                    cache_key,
                    required_freshness=freshness
                )
                
                if cached_results:
                    self.metrics.cache_hits += 1
                    response_time = (time.time() - start_time) * 1000
                    self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
                    
                    logger.debug(f"Cache hit for predicate search: {len(cached_results)} results")
                    return [FDASearchResult(**result) for result in cached_results]
            
            # Cache miss - fetch from API with optimization
            async with self.query_optimizer.monitored_query(
                "fda_predicate_search",
                f"search_terms={search_terms}, product_code={product_code}"
            ):
                results = await self.base_service.search_predicates(
                    search_terms=search_terms,
                    product_code=product_code,
                    device_class=device_class,
                    limit=limit,
                    skip=skip
                )
            
            # Cache results with intelligent strategy
            if use_cache and results:
                serializable_results = [result.to_dict() for result in results]
                
                # Compress large result sets
                if self.config.use_compression and len(serializable_results) > 10:
                    compressed_data = await self._compress_data(serializable_results)
                    await self.cache.set_with_strategy(
                        "fda_predicate_search_compressed",
                        cache_key,
                        compressed_data,
                        strategy=self.config.cache_strategy,
                        priority=self._calculate_cache_priority(search_terms, len(results))
                    )
                else:
                    await self.cache.set_with_strategy(
                        "fda_predicate_search",
                        cache_key,
                        serializable_results,
                        strategy=self.config.cache_strategy,
                        priority=self._calculate_cache_priority(search_terms, len(results))
                    )
            
            self.metrics.cache_misses += 1
            self.metrics.total_requests += 1
            
            response_time = (time.time() - start_time) * 1000
            self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
            
            logger.info(f"FDA predicate search completed: {len(results)} results in {response_time:.2f}ms")
            return results
            
        except Exception as e:
            logger.error(f"Error in optimized predicate search: {e}")
            raise
    
    async def get_device_details_optimized(
        self,
        k_number: str,
        use_cache: bool = True,
        freshness: DataFreshness = DataFreshness.FRESH
    ) -> Optional[FDASearchResult]:
        """
        Optimized device details retrieval with caching
        """
        start_time = time.time()
        
        try:
            # Try cache first
            if use_cache:
                cached_result = await self.cache.get_with_freshness_check(
                    "fda_device_details",
                    k_number,
                    required_freshness=freshness
                )
                
                if cached_result:
                    self.metrics.cache_hits += 1
                    response_time = (time.time() - start_time) * 1000
                    self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
                    
                    logger.debug(f"Cache hit for device details: {k_number}")
                    return FDASearchResult(**cached_result)
            
            # Cache miss - fetch from API
            async with self.query_optimizer.monitored_query(
                "fda_device_details",
                f"k_number={k_number}"
            ):
                result = await self.base_service.get_device_details(k_number)
            
            # Cache result
            if use_cache and result:
                await self.cache.set_with_strategy(
                    "fda_device_details",
                    k_number,
                    result.to_dict(),
                    strategy=CacheStrategy.LFU,  # Device details are frequently reused
                    priority=3  # High priority for device details
                )
            
            self.metrics.cache_misses += 1
            self.metrics.total_requests += 1
            
            response_time = (time.time() - start_time) * 1000
            self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in optimized device details retrieval: {e}")
            raise
    
    async def lookup_device_classification_optimized(
        self,
        product_code: Optional[str] = None,
        device_name: Optional[str] = None,
        regulation_number: Optional[str] = None,
        use_cache: bool = True,
        freshness: DataFreshness = DataFreshness.STALE  # Classifications change rarely
    ) -> List[DeviceClassificationResult]:
        """
        Optimized device classification lookup with extended caching
        """
        start_time = time.time()
        
        # Generate cache key
        cache_key = f"pc:{product_code or 'none'}_dn:{device_name or 'none'}_rn:{regulation_number or 'none'}"
        
        try:
            # Try cache first
            if use_cache:
                cached_results = await self.cache.get_with_freshness_check(
                    "fda_device_classification",
                    cache_key,
                    required_freshness=freshness
                )
                
                if cached_results:
                    self.metrics.cache_hits += 1
                    response_time = (time.time() - start_time) * 1000
                    self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
                    
                    logger.debug(f"Cache hit for device classification: {len(cached_results)} results")
                    return [DeviceClassificationResult(**result) for result in cached_results]
            
            # Cache miss - fetch from API
            async with self.query_optimizer.monitored_query(
                "fda_device_classification",
                f"product_code={product_code}, device_name={device_name}"
            ):
                results = await self.base_service.lookup_device_classification(
                    product_code=product_code,
                    device_name=device_name,
                    regulation_number=regulation_number
                )
            
            # Cache results with long TTL (classifications change rarely)
            if use_cache and results:
                serializable_results = [result.to_dict() for result in results]
                await self.cache.set_with_strategy(
                    "fda_device_classification",
                    cache_key,
                    serializable_results,
                    ttl=7200,  # 2 hours TTL
                    strategy=CacheStrategy.LFU,
                    priority=2
                )
            
            self.metrics.cache_misses += 1
            self.metrics.total_requests += 1
            
            response_time = (time.time() - start_time) * 1000
            self.metrics.avg_response_time_ms = self._update_avg_response_time(response_time)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in optimized device classification lookup: {e}")
            raise
    
    async def batch_search_predicates(
        self,
        search_requests: List[Dict[str, Any]],
        max_parallel: Optional[int] = None
    ) -> List[List[FDASearchResult]]:
        """
        Batch predicate search with parallel processing
        """
        max_parallel = max_parallel or self.config.parallel_requests
        
        async def search_single(request: Dict[str, Any]) -> List[FDASearchResult]:
            return await self.search_predicates_optimized(**request)
        
        # Process requests in batches
        results = []
        for i in range(0, len(search_requests), max_parallel):
            batch = search_requests[i:i + max_parallel]
            batch_results = await asyncio.gather(
                *[search_single(request) for request in batch],
                return_exceptions=True
            )
            
            # Handle exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Batch search error for request {i+j}: {result}")
                    results.append([])
                else:
                    results.append(result)
        
        return results
    
    async def warm_popular_caches(self) -> Dict[str, Any]:
        """
        Warm caches with popular queries
        """
        warming_results = {
            "started_at": datetime.now().isoformat(),
            "queries_warmed": 0,
            "queries_failed": 0,
            "errors": []
        }
        
        try:
            for query_config in self.popular_queries:
                try:
                    # Execute query to warm cache
                    await self.search_predicates_optimized(
                        search_terms=query_config["search_terms"],
                        product_code=query_config.get("product_code"),
                        limit=50,  # Reasonable limit for warming
                        use_cache=True
                    )
                    warming_results["queries_warmed"] += 1
                    
                    # Small delay to avoid overwhelming the API
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    warming_results["queries_failed"] += 1
                    warming_results["errors"].append(f"Query {query_config}: {str(e)}")
                    logger.warning(f"Cache warming failed for query {query_config}: {e}")
            
            self.metrics.background_updates += warming_results["queries_warmed"]
            
        except Exception as e:
            warming_results["errors"].append(f"General warming error: {str(e)}")
            logger.error(f"Cache warming process failed: {e}")
        
        warming_results["completed_at"] = datetime.now().isoformat()
        return warming_results
    
    async def start_background_cache_warming(self, interval_minutes: int = 30) -> None:
        """
        Start background cache warming task
        """
        if self._running:
            return
        
        self._running = True
        
        async def warming_loop():
            while self._running:
                try:
                    await self.warm_popular_caches()
                    await asyncio.sleep(interval_minutes * 60)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Background cache warming error: {e}")
                    await asyncio.sleep(60)  # Wait before retrying
        
        task = asyncio.create_task(warming_loop())
        self._warming_tasks.add(task)
        task.add_done_callback(self._warming_tasks.discard)
        
        logger.info(f"Background cache warming started (interval: {interval_minutes} minutes)")
    
    async def stop_background_cache_warming(self) -> None:
        """
        Stop background cache warming
        """
        self._running = False
        
        for task in self._warming_tasks:
            task.cancel()
        
        if self._warming_tasks:
            await asyncio.gather(*self._warming_tasks, return_exceptions=True)
            self._warming_tasks.clear()
        
        logger.info("Background cache warming stopped")
    
    def _generate_search_cache_key(
        self,
        search_terms: List[str],
        product_code: Optional[str],
        device_class: Optional[str],
        limit: int,
        skip: int
    ) -> str:
        """Generate cache key for search parameters"""
        key_parts = [
            f"terms:{','.join(sorted(search_terms))}",
            f"pc:{product_code or 'none'}",
            f"dc:{device_class or 'none'}",
            f"limit:{limit}",
            f"skip:{skip}"
        ]
        return "|".join(key_parts)
    
    def _calculate_cache_priority(self, search_terms: List[str], result_count: int) -> int:
        """Calculate cache priority based on search characteristics"""
        priority = 1  # Default priority
        
        # Higher priority for common medical device terms
        common_terms = {"cardiac", "orthopedic", "surgical", "diagnostic", "implant", "device"}
        if any(term.lower() in common_terms for term in search_terms):
            priority += 1
        
        # Higher priority for searches with many results (likely useful)
        if result_count > 20:
            priority += 1
        
        return min(priority, 5)  # Cap at priority 5
    
    async def _compress_data(self, data: Any) -> str:
        """Compress data for storage"""
        try:
            json_str = json.dumps(data, default=str)
            compressed = gzip.compress(json_str.encode('utf-8'))
            
            # Calculate compression ratio
            original_size = len(json_str.encode('utf-8'))
            compressed_size = len(compressed)
            compression_ratio = compressed_size / original_size
            
            self.metrics.compression_ratio = (
                (self.metrics.compression_ratio + compression_ratio) / 2
                if self.metrics.compression_ratio > 0 else compression_ratio
            )
            
            # Return base64 encoded compressed data
            import base64
            return base64.b64encode(compressed).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Data compression failed: {e}")
            return json.dumps(data, default=str)  # Fallback to uncompressed
    
    async def _decompress_data(self, compressed_data: str) -> Any:
        """Decompress data from storage"""
        try:
            import base64
            compressed = base64.b64decode(compressed_data.encode('utf-8'))
            decompressed = gzip.decompress(compressed)
            return json.loads(decompressed.decode('utf-8'))
        except Exception as e:
            logger.error(f"Data decompression failed: {e}")
            # Try to parse as regular JSON (fallback)
            return json.loads(compressed_data)
    
    def _update_avg_response_time(self, new_time: float) -> float:
        """Update average response time"""
        if self.metrics.avg_response_time_ms == 0:
            return new_time
        
        # Exponential moving average
        alpha = 0.1
        return (alpha * new_time) + ((1 - alpha) * self.metrics.avg_response_time_ms)
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        cache_hit_rate = (
            self.metrics.cache_hits / (self.metrics.cache_hits + self.metrics.cache_misses)
            if (self.metrics.cache_hits + self.metrics.cache_misses) > 0 else 0
        )
        
        # Get cache pattern analysis
        pattern_analysis = await self.cache.get_pattern_analysis()
        
        return {
            "api_metrics": {
                "total_requests": self.metrics.total_requests,
                "cache_hits": self.metrics.cache_hits,
                "cache_misses": self.metrics.cache_misses,
                "cache_hit_rate": cache_hit_rate,
                "avg_response_time_ms": self.metrics.avg_response_time_ms,
                "compression_ratio": self.metrics.compression_ratio,
                "background_updates": self.metrics.background_updates
            },
            "cache_analysis": pattern_analysis,
            "optimization_config": {
                "use_compression": self.config.use_compression,
                "batch_size": self.config.batch_size,
                "parallel_requests": self.config.parallel_requests,
                "cache_strategy": self.config.cache_strategy.value,
                "freshness_requirement": self.config.freshness_requirement.value
            },
            "background_tasks": {
                "warming_active": self._running,
                "active_tasks": len(self._warming_tasks)
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        try:
            # Base service health
            base_health = await self.base_service.health_check()
            
            # Cache health
            cache_health = await self.cache.health_check()
            
            # Performance metrics
            performance_metrics = await self.get_performance_metrics()
            
            overall_status = "healthy"
            if base_health.get("status") != "healthy" or cache_health.get("status") != "healthy":
                overall_status = "degraded"
            
            return {
                "status": overall_status,
                "base_service": base_health,
                "intelligent_cache": cache_health,
                "performance": performance_metrics,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Factory function
async def create_enhanced_openfda_service(
    api_key: Optional[str] = None,
    redis_url: str = "redis://localhost:6379",
    max_cache_memory_mb: int = 512,
    optimization_config: Optional[QueryOptimization] = None
) -> EnhancedOpenFDAService:
    """
    Create enhanced OpenFDA service with intelligent caching
    """
    # Create base service
    from .cache import get_redis_client
    redis_client = await get_redis_client()
    
    base_service = OpenFDAService(
        api_key=api_key,
        redis_client=redis_client
    )
    
    # Create intelligent cache
    from .intelligent_cache import create_intelligent_cache
    intelligent_cache = await create_intelligent_cache(
        redis_url=redis_url,
        max_memory_mb=max_cache_memory_mb
    )
    
    # Create enhanced service
    enhanced_service = EnhancedOpenFDAService(
        base_service=base_service,
        intelligent_cache=intelligent_cache,
        optimization_config=optimization_config
    )
    
    # Start background cache warming
    await enhanced_service.start_background_cache_warming()
    
    return enhanced_service