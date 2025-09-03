"""
Performance Cache Service

This service provides Redis-based caching for frequently accessed FDA data
and other performance-critical operations.
"""

import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict

import redis.asyncio as redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    data: Any
    created_at: datetime
    expires_at: Optional[datetime] = None
    hit_count: int = 0
    size_bytes: int = 0


class CacheStats(BaseModel):
    """Cache statistics"""
    total_keys: int
    total_size_bytes: int
    hit_rate: float
    miss_rate: float
    avg_response_time_ms: float
    most_accessed_keys: List[str]


class PerformanceCache:
    """
    High-performance Redis cache for FDA data and API responses
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        default_ttl: int = 3600,  # 1 hour
        key_prefix: str = "mdra"
    ):
        self.redis_client = redis_client
        self.default_ttl = default_ttl
        self.key_prefix = key_prefix
        self.stats = {
            "hits": 0,
            "misses": 0,
            "total_requests": 0,
            "total_response_time": 0.0
        }
    
    def _generate_key(self, namespace: str, identifier: str) -> str:
        """Generate cache key with namespace and identifier"""
        # Create hash for long identifiers
        if len(identifier) > 100:
            identifier = hashlib.md5(identifier.encode()).hexdigest()
        
        return f"{self.key_prefix}:{namespace}:{identifier}"
    
    async def get(self, namespace: str, identifier: str) -> Optional[Any]:
        """Get cached data"""
        start_time = datetime.now()
        key = self._generate_key(namespace, identifier)
        
        try:
            cached_data = await self.redis_client.get(key)
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            self.stats["total_requests"] += 1
            self.stats["total_response_time"] += response_time
            
            if cached_data:
                self.stats["hits"] += 1
                # Increment hit count
                await self.redis_client.hincrby(f"{key}:meta", "hit_count", 1)
                
                logger.debug(f"Cache hit for key: {key}")
                return json.loads(cached_data)
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache miss for key: {key}")
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.stats["misses"] += 1
            return None
    
    async def set(
        self,
        namespace: str,
        identifier: str,
        data: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Set cached data with TTL"""
        key = self._generate_key(namespace, identifier)
        ttl = ttl or self.default_ttl
        
        try:
            # Serialize data
            serialized_data = json.dumps(data, default=str)
            size_bytes = len(serialized_data.encode('utf-8'))
            
            # Set data with TTL
            await self.redis_client.setex(key, ttl, serialized_data)
            
            # Set metadata
            metadata = {
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(seconds=ttl)).isoformat(),
                "size_bytes": size_bytes,
                "hit_count": 0
            }
            
            await self.redis_client.hset(f"{key}:meta", mapping=metadata)
            await self.redis_client.expire(f"{key}:meta", ttl)
            
            logger.debug(f"Cache set for key: {key}, size: {size_bytes} bytes, TTL: {ttl}s")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, namespace: str, identifier: str) -> bool:
        """Delete cached data"""
        key = self._generate_key(namespace, identifier)
        
        try:
            deleted = await self.redis_client.delete(key, f"{key}:meta")
            logger.debug(f"Cache delete for key: {key}, deleted: {deleted}")
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def exists(self, namespace: str, identifier: str) -> bool:
        """Check if key exists in cache"""
        key = self._generate_key(namespace, identifier)
        
        try:
            return await self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    async def get_ttl(self, namespace: str, identifier: str) -> Optional[int]:
        """Get remaining TTL for cached data"""
        key = self._generate_key(namespace, identifier)
        
        try:
            ttl = await self.redis_client.ttl(key)
            return ttl if ttl > 0 else None
        except Exception as e:
            logger.error(f"Cache TTL error for key {key}: {e}")
            return None
    
    async def extend_ttl(self, namespace: str, identifier: str, additional_seconds: int) -> bool:
        """Extend TTL for cached data"""
        key = self._generate_key(namespace, identifier)
        
        try:
            current_ttl = await self.redis_client.ttl(key)
            if current_ttl > 0:
                new_ttl = current_ttl + additional_seconds
                await self.redis_client.expire(key, new_ttl)
                await self.redis_client.expire(f"{key}:meta", new_ttl)
                return True
            return False
        except Exception as e:
            logger.error(f"Cache extend TTL error for key {key}: {e}")
            return False
    
    async def get_stats(self) -> CacheStats:
        """Get cache statistics"""
        try:
            # Get Redis info
            info = await self.redis_client.info()
            total_keys = info.get('db0', {}).get('keys', 0) if 'db0' in info else 0
            
            # Calculate hit rate
            total_requests = self.stats["total_requests"]
            hit_rate = self.stats["hits"] / total_requests if total_requests > 0 else 0
            miss_rate = self.stats["misses"] / total_requests if total_requests > 0 else 0
            
            # Calculate average response time
            avg_response_time = (
                self.stats["total_response_time"] / total_requests 
                if total_requests > 0 else 0
            )
            
            # Get most accessed keys
            most_accessed_keys = await self._get_most_accessed_keys()
            
            return CacheStats(
                total_keys=total_keys,
                total_size_bytes=await self._calculate_total_size(),
                hit_rate=hit_rate,
                miss_rate=miss_rate,
                avg_response_time_ms=avg_response_time,
                most_accessed_keys=most_accessed_keys
            )
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return CacheStats(
                total_keys=0,
                total_size_bytes=0,
                hit_rate=0.0,
                miss_rate=0.0,
                avg_response_time_ms=0.0,
                most_accessed_keys=[]
            )
    
    async def _get_most_accessed_keys(self, limit: int = 10) -> List[str]:
        """Get most accessed cache keys"""
        try:
            # Scan for metadata keys
            keys = []
            async for key in self.redis_client.scan_iter(match=f"{self.key_prefix}:*:meta"):
                hit_count = await self.redis_client.hget(key, "hit_count")
                if hit_count:
                    keys.append((key.replace(":meta", ""), int(hit_count)))
            
            # Sort by hit count and return top keys
            keys.sort(key=lambda x: x[1], reverse=True)
            return [key[0] for key in keys[:limit]]
            
        except Exception as e:
            logger.error(f"Error getting most accessed keys: {e}")
            return []
    
    async def _calculate_total_size(self) -> int:
        """Calculate total cache size in bytes"""
        try:
            total_size = 0
            async for key in self.redis_client.scan_iter(match=f"{self.key_prefix}:*:meta"):
                size_bytes = await self.redis_client.hget(key, "size_bytes")
                if size_bytes:
                    total_size += int(size_bytes)
            
            return total_size
            
        except Exception as e:
            logger.error(f"Error calculating total cache size: {e}")
            return 0
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace"""
        try:
            pattern = f"{self.key_prefix}:{namespace}:*"
            keys_to_delete = []
            
            async for key in self.redis_client.scan_iter(match=pattern):
                keys_to_delete.append(key)
                # Also add metadata key
                keys_to_delete.append(f"{key}:meta")
            
            if keys_to_delete:
                deleted = await self.redis_client.delete(*keys_to_delete)
                logger.info(f"Cleared {deleted} keys from namespace: {namespace}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Error clearing namespace {namespace}: {e}")
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform cache health check"""
        try:
            start_time = datetime.now()
            
            # Test basic operations
            test_key = "health_check_test"
            test_data = {"timestamp": datetime.now().isoformat()}
            
            # Test set
            await self.set("health", test_key, test_data, ttl=60)
            
            # Test get
            retrieved_data = await self.get("health", test_key)
            
            # Test delete
            await self.delete("health", test_key)
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Get Redis info
            info = await self.redis_client.info()
            
            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "redis_version": info.get("redis_version", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "operations_successful": retrieved_data is not None,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


class CacheManager:
    """
    High-level cache manager for different data types
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.cache = PerformanceCache(redis_client)
    
    # FDA Data Caching
    async def cache_fda_search(self, search_query: str, results: List[Dict[str, Any]], ttl: int = 3600) -> bool:
        """Cache FDA search results"""
        return await self.cache.set("fda_search", search_query, results, ttl)
    
    async def get_fda_search(self, search_query: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached FDA search results"""
        return await self.cache.get("fda_search", search_query)
    
    async def cache_device_classification(self, device_key: str, classification: Dict[str, Any], ttl: int = 7200) -> bool:
        """Cache device classification results (2 hours TTL)"""
        return await self.cache.set("device_classification", device_key, classification, ttl)
    
    async def get_device_classification(self, device_key: str) -> Optional[Dict[str, Any]]:
        """Get cached device classification"""
        return await self.cache.get("device_classification", device_key)
    
    async def cache_predicate_comparison(self, comparison_key: str, comparison: Dict[str, Any], ttl: int = 1800) -> bool:
        """Cache predicate comparison results (30 minutes TTL)"""
        return await self.cache.set("predicate_comparison", comparison_key, comparison, ttl)
    
    async def get_predicate_comparison(self, comparison_key: str) -> Optional[Dict[str, Any]]:
        """Get cached predicate comparison"""
        return await self.cache.get("predicate_comparison", comparison_key)
    
    # Project Data Caching
    async def cache_project_dashboard(self, project_id: int, dashboard_data: Dict[str, Any], ttl: int = 300) -> bool:
        """Cache project dashboard data (5 minutes TTL)"""
        return await self.cache.set("project_dashboard", str(project_id), dashboard_data, ttl)
    
    async def get_project_dashboard(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Get cached project dashboard data"""
        return await self.cache.get("project_dashboard", str(project_id))
    
    # Agent Response Caching
    async def cache_agent_response(self, agent_key: str, response: Dict[str, Any], ttl: int = 1800) -> bool:
        """Cache agent response (30 minutes TTL)"""
        return await self.cache.set("agent_response", agent_key, response, ttl)
    
    async def get_agent_response(self, agent_key: str) -> Optional[Dict[str, Any]]:
        """Get cached agent response"""
        return await self.cache.get("agent_response", agent_key)
    
    # Utility methods
    async def clear_project_cache(self, project_id: int) -> None:
        """Clear all cached data for a project"""
        await self.cache.delete("project_dashboard", str(project_id))
        # Clear other project-related caches as needed
    
    async def get_cache_stats(self) -> CacheStats:
        """Get comprehensive cache statistics"""
        return await self.cache.get_stats()
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform cache health check"""
        return await self.cache.health_check()


# Factory function for creating cache manager
async def create_cache_manager(redis_url: str = "redis://localhost:6379") -> CacheManager:
    """
    Create cache manager with Redis connection
    
    Args:
        redis_url: Redis connection URL
    
    Returns:
        Configured cache manager instance
    """
    try:
        redis_client = redis.from_url(redis_url)
        await redis_client.ping()
        logger.info(f"Connected to Redis at {redis_url}")
        return CacheManager(redis_client)
    except Exception as e:
        logger.error(f"Failed to connect to Redis at {redis_url}: {e}")
        raise


# Cache decorators for easy integration
def cache_result(namespace: str, ttl: int = 3600):
    """Decorator to cache function results"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache first
            if hasattr(wrapper, '_cache_manager'):
                cached_result = await wrapper._cache_manager.cache.get(namespace, cache_key)
                if cached_result is not None:
                    return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            if hasattr(wrapper, '_cache_manager'):
                await wrapper._cache_manager.cache.set(namespace, cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator