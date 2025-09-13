"""
Intelligent Cache Service

Advanced caching strategies with query pattern analysis, freshness validation,
and intelligent cache warming based on usage patterns.
"""

import json
import time
import logging
import hashlib
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Set, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum

import redis.asyncio as redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CacheStrategy(str, Enum):
    """Cache strategy types"""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live
    ADAPTIVE = "adaptive"  # Adaptive based on usage patterns


class DataFreshness(str, Enum):
    """Data freshness levels"""
    REAL_TIME = "real_time"  # < 1 minute
    FRESH = "fresh"  # < 5 minutes
    RECENT = "recent"  # < 30 minutes
    STALE = "stale"  # < 2 hours
    EXPIRED = "expired"  # > 2 hours


@dataclass
class QueryPattern:
    """Query pattern analysis data"""
    pattern_id: str
    query_template: str
    frequency: int
    avg_response_time: float
    last_accessed: datetime
    cache_hit_rate: float
    data_size_bytes: int
    freshness_requirement: DataFreshness


@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    hit_count: int = 0
    miss_count: int = 0
    eviction_count: int = 0
    total_size_bytes: int = 0
    avg_response_time_ms: float = 0.0
    pattern_count: int = 0


class IntelligentCache:
    """
    Intelligent caching system with pattern analysis and adaptive strategies
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        default_ttl: int = 3600,
        max_memory_mb: int = 512,
        key_prefix: str = "intelligent_cache"
    ):
        self.redis_client = redis_client
        self.default_ttl = default_ttl
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.key_prefix = key_prefix
        
        # Pattern analysis
        self.query_patterns: Dict[str, QueryPattern] = {}
        self.access_history: List[Tuple[str, datetime, float]] = []
        self.pattern_counter = Counter()
        
        # Performance metrics
        self.metrics = CacheMetrics()
        
        # Configuration
        self.freshness_thresholds = {
            DataFreshness.REAL_TIME: 60,      # 1 minute
            DataFreshness.FRESH: 300,         # 5 minutes
            DataFreshness.RECENT: 1800,       # 30 minutes
            DataFreshness.STALE: 7200,        # 2 hours
            DataFreshness.EXPIRED: float('inf')
        }
        
        # Background tasks
        self._analysis_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
    
    def _generate_cache_key(self, namespace: str, identifier: str) -> str:
        """Generate cache key with namespace"""
        if len(identifier) > 200:
            identifier = hashlib.sha256(identifier.encode()).hexdigest()
        return f"{self.key_prefix}:{namespace}:{identifier}"
    
    def _generate_pattern_id(self, namespace: str, query_template: str) -> str:
        """Generate pattern ID for query analysis"""
        pattern_string = f"{namespace}:{query_template}"
        return hashlib.md5(pattern_string.encode()).hexdigest()
    
    def _extract_query_template(self, identifier: str) -> str:
        """Extract query template from identifier for pattern analysis"""
        # Simple template extraction - replace specific values with placeholders
        import re
        
        # Replace UUIDs, IDs, timestamps with placeholders
        template = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '{UUID}', identifier)
        template = re.sub(r'\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\b', '{TIMESTAMP}', template)
        template = re.sub(r'\b\d+\b', '{ID}', template)
        template = re.sub(r'["\'][^"\']*["\']', '{STRING}', template)
        
        return template
    
    async def get_with_freshness_check(
        self,
        namespace: str,
        identifier: str,
        max_age: Optional[int] = None,
        required_freshness: DataFreshness = DataFreshness.RECENT
    ) -> Optional[Any]:
        """Get cached data with freshness validation"""
        start_time = time.time()
        cache_key = self._generate_cache_key(namespace, identifier)
        
        try:
            # Get data and metadata
            pipe = self.redis_client.pipeline()
            pipe.get(cache_key)
            pipe.hgetall(f"{cache_key}:meta")
            results = await pipe.execute()
            
            cached_data, metadata = results
            response_time = (time.time() - start_time) * 1000
            
            if cached_data and metadata:
                # Check freshness
                created_timestamp = float(metadata.get(b'created_at', 0))
                age_seconds = time.time() - created_timestamp
                
                # Determine data freshness
                freshness = self._determine_freshness(age_seconds)
                
                # Check if data meets freshness requirements
                if self._meets_freshness_requirement(freshness, required_freshness):
                    # Update access patterns
                    await self._record_access(namespace, identifier, response_time, True)
                    
                    self.metrics.hit_count += 1
                    logger.debug(f"Cache hit with freshness {freshness.value}: {cache_key}")
                    
                    return json.loads(cached_data)
                else:
                    logger.debug(f"Cache data too stale ({freshness.value} vs {required_freshness.value}): {cache_key}")
            
            # Cache miss or stale data
            await self._record_access(namespace, identifier, response_time, False)
            self.metrics.miss_count += 1
            return None
            
        except Exception as e:
            logger.error(f"Cache get error for key {cache_key}: {e}")
            self.metrics.miss_count += 1
            return None
    
    async def set_with_strategy(
        self,
        namespace: str,
        identifier: str,
        data: Any,
        ttl: Optional[int] = None,
        strategy: CacheStrategy = CacheStrategy.ADAPTIVE,
        priority: int = 1
    ) -> bool:
        """Set cached data with intelligent strategy"""
        cache_key = self._generate_cache_key(namespace, identifier)
        
        try:
            # Serialize data
            serialized_data = json.dumps(data, default=str)
            data_size = len(serialized_data.encode('utf-8'))
            
            # Determine TTL based on strategy
            effective_ttl = await self._calculate_adaptive_ttl(
                namespace, identifier, ttl, strategy, data_size
            )
            
            # Check memory limits and evict if necessary
            await self._ensure_memory_limit(data_size)
            
            # Set data with metadata
            now = time.time()
            metadata = {
                "created_at": str(now),
                "expires_at": str(now + effective_ttl),
                "size_bytes": str(data_size),
                "access_count": "0",
                "strategy": strategy.value,
                "priority": str(priority),
                "namespace": namespace
            }
            
            pipe = self.redis_client.pipeline()
            pipe.setex(cache_key, effective_ttl, serialized_data)
            pipe.hset(f"{cache_key}:meta", mapping=metadata)
            pipe.expire(f"{cache_key}:meta", effective_ttl)
            await pipe.execute()
            
            # Update metrics
            self.metrics.total_size_bytes += data_size
            
            logger.debug(f"Cache set with strategy {strategy.value}, TTL {effective_ttl}s: {cache_key}")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {cache_key}: {e}")
            return False
    
    async def _calculate_adaptive_ttl(
        self,
        namespace: str,
        identifier: str,
        base_ttl: Optional[int],
        strategy: CacheStrategy,
        data_size: int
    ) -> int:
        """Calculate adaptive TTL based on usage patterns"""
        if base_ttl:
            return base_ttl
        
        # Get pattern information
        pattern_template = self._extract_query_template(identifier)
        pattern_id = self._generate_pattern_id(namespace, pattern_template)
        
        if strategy == CacheStrategy.ADAPTIVE and pattern_id in self.query_patterns:
            pattern = self.query_patterns[pattern_id]
            
            # Adaptive TTL based on access frequency and response time
            base_adaptive_ttl = self.default_ttl
            
            # Increase TTL for frequently accessed data
            if pattern.frequency > 10:
                base_adaptive_ttl *= min(2.0, 1 + (pattern.frequency / 100))
            
            # Increase TTL for slow-to-generate data
            if pattern.avg_response_time > 1.0:
                base_adaptive_ttl *= min(3.0, 1 + pattern.avg_response_time)
            
            # Decrease TTL for large data to manage memory
            if data_size > 1024 * 1024:  # 1MB
                base_adaptive_ttl *= 0.5
            
            return int(base_adaptive_ttl)
        
        # Default TTL for other strategies
        strategy_multipliers = {
            CacheStrategy.LRU: 1.0,
            CacheStrategy.LFU: 1.5,
            CacheStrategy.TTL: 1.0
        }
        
        return int(self.default_ttl * strategy_multipliers.get(strategy, 1.0))
    
    def _determine_freshness(self, age_seconds: float) -> DataFreshness:
        """Determine data freshness based on age"""
        for freshness, threshold in self.freshness_thresholds.items():
            if age_seconds <= threshold:
                return freshness
        return DataFreshness.EXPIRED
    
    def _meets_freshness_requirement(
        self,
        actual_freshness: DataFreshness,
        required_freshness: DataFreshness
    ) -> bool:
        """Check if actual freshness meets requirement"""
        freshness_order = [
            DataFreshness.REAL_TIME,
            DataFreshness.FRESH,
            DataFreshness.RECENT,
            DataFreshness.STALE,
            DataFreshness.EXPIRED
        ]
        
        actual_index = freshness_order.index(actual_freshness)
        required_index = freshness_order.index(required_freshness)
        
        return actual_index <= required_index
    
    async def _record_access(
        self,
        namespace: str,
        identifier: str,
        response_time_ms: float,
        cache_hit: bool
    ) -> None:
        """Record access for pattern analysis"""
        # Update access history
        self.access_history.append((identifier, datetime.now(), response_time_ms))
        
        # Keep only recent history (last 1000 accesses)
        if len(self.access_history) > 1000:
            self.access_history = self.access_history[-1000:]
        
        # Update pattern analysis
        pattern_template = self._extract_query_template(identifier)
        pattern_id = self._generate_pattern_id(namespace, pattern_template)
        
        if pattern_id not in self.query_patterns:
            self.query_patterns[pattern_id] = QueryPattern(
                pattern_id=pattern_id,
                query_template=pattern_template,
                frequency=0,
                avg_response_time=0.0,
                last_accessed=datetime.now(),
                cache_hit_rate=0.0,
                data_size_bytes=0,
                freshness_requirement=DataFreshness.RECENT
            )
        
        pattern = self.query_patterns[pattern_id]
        pattern.frequency += 1
        pattern.last_accessed = datetime.now()
        
        # Update average response time
        pattern.avg_response_time = (
            (pattern.avg_response_time * (pattern.frequency - 1) + response_time_ms) /
            pattern.frequency
        )
        
        # Update cache hit rate
        if cache_hit:
            pattern.cache_hit_rate = (
                (pattern.cache_hit_rate * (pattern.frequency - 1) + 1.0) /
                pattern.frequency
            )
        else:
            pattern.cache_hit_rate = (
                pattern.cache_hit_rate * (pattern.frequency - 1) /
                pattern.frequency
            )
    
    async def _ensure_memory_limit(self, new_data_size: int) -> None:
        """Ensure cache doesn't exceed memory limits"""
        if self.metrics.total_size_bytes + new_data_size <= self.max_memory_bytes:
            return
        
        # Need to evict data
        bytes_to_evict = (self.metrics.total_size_bytes + new_data_size) - self.max_memory_bytes
        await self._evict_data(bytes_to_evict)
    
    async def _evict_data(self, bytes_to_evict: int) -> None:
        """Evict data based on strategy"""
        evicted_bytes = 0
        evicted_keys = []
        
        try:
            # Get all cache keys with metadata
            pattern = f"{self.key_prefix}:*"
            keys_to_check = []
            
            async for key in self.redis_client.scan_iter(match=pattern):
                if not key.endswith(b':meta'):
                    keys_to_check.append(key.decode())
            
            # Get metadata for all keys
            if keys_to_check:
                pipe = self.redis_client.pipeline()
                for key in keys_to_check:
                    pipe.hgetall(f"{key}:meta")
                metadata_results = await pipe.execute()
                
                # Create eviction candidates with scores
                candidates = []
                for i, key in enumerate(keys_to_check):
                    metadata = metadata_results[i]
                    if metadata:
                        score = await self._calculate_eviction_score(key, metadata)
                        size = int(metadata.get(b'size_bytes', 0))
                        candidates.append((score, key, size))
                
                # Sort by eviction score (higher score = more likely to evict)
                candidates.sort(reverse=True)
                
                # Evict keys until we have enough space
                for score, key, size in candidates:
                    if evicted_bytes >= bytes_to_evict:
                        break
                    
                    await self.redis_client.delete(key, f"{key}:meta")
                    evicted_bytes += size
                    evicted_keys.append(key)
                    self.metrics.eviction_count += 1
                
                self.metrics.total_size_bytes -= evicted_bytes
                logger.info(f"Evicted {len(evicted_keys)} keys, freed {evicted_bytes} bytes")
        
        except Exception as e:
            logger.error(f"Error during cache eviction: {e}")
    
    async def _calculate_eviction_score(self, key: str, metadata: Dict) -> float:
        """Calculate eviction score (higher = more likely to evict)"""
        try:
            created_at = float(metadata.get(b'created_at', 0))
            access_count = int(metadata.get(b'access_count', 0))
            size_bytes = int(metadata.get(b'size_bytes', 0))
            priority = int(metadata.get(b'priority', 1))
            
            # Age factor (older = higher score)
            age_hours = (time.time() - created_at) / 3600
            age_score = min(age_hours / 24, 1.0)  # Normalize to 0-1 over 24 hours
            
            # Access frequency factor (less accessed = higher score)
            access_score = 1.0 / (1 + access_count)
            
            # Size factor (larger = higher score for memory efficiency)
            size_score = min(size_bytes / (1024 * 1024), 1.0)  # Normalize to 0-1 over 1MB
            
            # Priority factor (lower priority = higher score)
            priority_score = 1.0 / priority
            
            # Combined score
            total_score = (age_score * 0.4 + access_score * 0.3 + 
                          size_score * 0.2 + priority_score * 0.1)
            
            return total_score
            
        except Exception as e:
            logger.error(f"Error calculating eviction score for {key}: {e}")
            return 1.0  # High score to evict problematic entries
    
    async def get_pattern_analysis(self) -> Dict[str, Any]:
        """Get query pattern analysis"""
        # Sort patterns by frequency
        sorted_patterns = sorted(
            self.query_patterns.values(),
            key=lambda p: p.frequency,
            reverse=True
        )
        
        return {
            "total_patterns": len(self.query_patterns),
            "total_accesses": sum(p.frequency for p in self.query_patterns.values()),
            "avg_hit_rate": sum(p.cache_hit_rate for p in self.query_patterns.values()) / len(self.query_patterns) if self.query_patterns else 0,
            "top_patterns": [
                {
                    "pattern_id": p.pattern_id,
                    "template": p.query_template,
                    "frequency": p.frequency,
                    "hit_rate": p.cache_hit_rate,
                    "avg_response_time": p.avg_response_time,
                    "last_accessed": p.last_accessed.isoformat()
                }
                for p in sorted_patterns[:10]
            ],
            "recommendations": await self._generate_caching_recommendations()
        }
    
    async def _generate_caching_recommendations(self) -> List[str]:
        """Generate caching recommendations based on patterns"""
        recommendations = []
        
        if not self.query_patterns:
            return ["No query patterns available for analysis"]
        
        # Analyze patterns
        high_frequency_patterns = [p for p in self.query_patterns.values() if p.frequency > 50]
        low_hit_rate_patterns = [p for p in self.query_patterns.values() if p.cache_hit_rate < 0.5]
        slow_patterns = [p for p in self.query_patterns.values() if p.avg_response_time > 1000]
        
        if high_frequency_patterns:
            recommendations.append(f"Consider increasing TTL for {len(high_frequency_patterns)} high-frequency patterns")
        
        if low_hit_rate_patterns:
            recommendations.append(f"Investigate {len(low_hit_rate_patterns)} patterns with low cache hit rates")
        
        if slow_patterns:
            recommendations.append(f"Prioritize caching for {len(slow_patterns)} slow-response patterns")
        
        # Memory usage recommendations
        if self.metrics.total_size_bytes > self.max_memory_bytes * 0.8:
            recommendations.append("Cache memory usage is high - consider increasing memory limit or reducing TTL")
        
        if self.metrics.eviction_count > 100:
            recommendations.append("High eviction rate detected - consider optimizing cache strategy")
        
        return recommendations
    
    async def start_background_tasks(self) -> None:
        """Start background analysis and cleanup tasks"""
        if self._running:
            return
        
        self._running = True
        self._analysis_task = asyncio.create_task(self._pattern_analysis_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Intelligent cache background tasks started")
    
    async def stop_background_tasks(self) -> None:
        """Stop background tasks"""
        self._running = False
        
        if self._analysis_task:
            self._analysis_task.cancel()
            try:
                await self._analysis_task
            except asyncio.CancelledError:
                pass
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Intelligent cache background tasks stopped")
    
    async def _pattern_analysis_loop(self) -> None:
        """Background task for pattern analysis"""
        while self._running:
            try:
                await self._analyze_patterns()
                await asyncio.sleep(300)  # Run every 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in pattern analysis loop: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_loop(self) -> None:
        """Background task for cache cleanup"""
        while self._running:
            try:
                await self._cleanup_expired_entries()
                await asyncio.sleep(600)  # Run every 10 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(60)
    
    async def _analyze_patterns(self) -> None:
        """Analyze query patterns and update strategies"""
        # Clean up old patterns (not accessed in last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        patterns_to_remove = [
            pattern_id for pattern_id, pattern in self.query_patterns.items()
            if pattern.last_accessed < cutoff_time
        ]
        
        for pattern_id in patterns_to_remove:
            del self.query_patterns[pattern_id]
        
        if patterns_to_remove:
            logger.info(f"Cleaned up {len(patterns_to_remove)} old query patterns")
    
    async def _cleanup_expired_entries(self) -> None:
        """Clean up expired cache entries"""
        try:
            # Find expired keys
            pattern = f"{self.key_prefix}:*:meta"
            expired_keys = []
            
            async for meta_key in self.redis_client.scan_iter(match=pattern):
                metadata = await self.redis_client.hgetall(meta_key)
                if metadata:
                    expires_at = float(metadata.get(b'expires_at', 0))
                    if time.time() > expires_at:
                        cache_key = meta_key.decode().replace(':meta', '')
                        expired_keys.append(cache_key)
            
            # Delete expired keys
            if expired_keys:
                keys_to_delete = []
                for key in expired_keys:
                    keys_to_delete.extend([key, f"{key}:meta"])
                
                await self.redis_client.delete(*keys_to_delete)
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
        
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Test basic operations
            test_key = "health_check"
            test_data = {"timestamp": datetime.now().isoformat()}
            
            start_time = time.time()
            await self.set_with_strategy("health", test_key, test_data, ttl=60)
            retrieved = await self.get_with_freshness_check("health", test_key)
            await self.redis_client.delete(self._generate_cache_key("health", test_key))
            response_time = (time.time() - start_time) * 1000
            
            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "operations_successful": retrieved is not None,
                "metrics": asdict(self.metrics),
                "pattern_count": len(self.query_patterns),
                "background_tasks_running": self._running,
                "memory_usage_bytes": self.metrics.total_size_bytes,
                "memory_usage_percent": (self.metrics.total_size_bytes / self.max_memory_bytes) * 100,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Factory function
async def create_intelligent_cache(
    redis_url: str = "redis://localhost:6379",
    max_memory_mb: int = 512
) -> IntelligentCache:
    """Create intelligent cache instance"""
    redis_client = redis.from_url(redis_url)
    await redis_client.ping()
    
    cache = IntelligentCache(redis_client, max_memory_mb=max_memory_mb)
    await cache.start_background_tasks()
    
    return cache