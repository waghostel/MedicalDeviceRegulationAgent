"""Simple cache service for Redis client management."""

import os
import logging
from typing import Optional
import redis.asyncio as redis

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


async def get_redis_client() -> Optional[redis.Redis]:
    """
    Get Redis client instance.
    
    Returns:
        Redis client if available, None if not configured or connection fails
    """
    global _redis_client
    
    if _redis_client is not None:
        return _redis_client
    
    try:
        # Get Redis URL from environment or use default
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        # Create Redis client
        _redis_client = redis.from_url(redis_url)
        
        # Test connection
        await _redis_client.ping()
        logger.info(f"Connected to Redis at {redis_url}")
        
        return _redis_client
        
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Continuing without cache.")
        return None


async def close_redis_client():
    """Close Redis client connection."""
    global _redis_client
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis client connection closed")


async def init_redis() -> None:
    """Initialize Redis connection."""
    try:
        await get_redis_client()
        logger.info("Redis initialization completed")
    except Exception as e:
        logger.warning(f"Redis initialization failed: {e}. Continuing without cache.")