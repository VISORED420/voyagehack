"""
Redis Cache Service
Provides caching functionality for the application
"""
import json
import logging
from typing import Any, Optional, Callable, TypeVar
from functools import wraps
import redis.asyncio as redis
from redis.asyncio import Redis
from datetime import datetime, date

from ..config import settings

logger = logging.getLogger(__name__)

# Type variable for generic return types
T = TypeVar("T")


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return {"__datetime__": True, "value": obj.isoformat()}
        if isinstance(obj, date):
            return {"__date__": True, "value": obj.isoformat()}
        return super().default(obj)


def datetime_decoder(obj):
    """Custom JSON decoder for datetime objects"""
    if "__datetime__" in obj:
        return datetime.fromisoformat(obj["value"])
    if "__date__" in obj:
        return date.fromisoformat(obj["value"])
    return obj


class CacheService:
    """
    Redis-based caching service with automatic serialization/deserialization
    """

    def __init__(self):
        self._redis: Optional[Redis] = None
        self._connected: bool = False

    async def connect(self) -> bool:
        """
        Initialize Redis connection
        Returns True if connected successfully, False otherwise
        """
        if not settings.REDIS_ENABLED:
            logger.info("Redis caching is disabled")
            return False

        try:
            self._redis = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            self._connected = True
            logger.info(f"Connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching will be disabled.")
            self._connected = False
            self._redis = None
            return False

    async def disconnect(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            self._connected = False
            logger.info("Disconnected from Redis")

    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self._connected and self._redis is not None

    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache
        Returns None if key doesn't exist or Redis is not connected
        """
        if not self.is_connected:
            return None

        try:
            data = await self._redis.get(key)
            if data:
                return json.loads(data, object_hook=datetime_decoder)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set a value in cache with optional TTL (in seconds)
        Returns True if successful, False otherwise
        """
        if not self.is_connected:
            return False

        try:
            serialized = json.dumps(value, cls=DateTimeEncoder)
            if ttl:
                await self._redis.setex(key, ttl, serialized)
            else:
                await self._redis.set(key, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache
        Returns True if successful, False otherwise
        """
        if not self.is_connected:
            return False

        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key '{key}': {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern
        Returns number of keys deleted
        """
        if not self.is_connected:
            return 0

        try:
            keys = []
            async for key in self._redis.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                deleted = await self._redis.delete(*keys)
                logger.info(f"Deleted {deleted} keys matching pattern '{pattern}'")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for '{pattern}': {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache"""
        if not self.is_connected:
            return False

        try:
            return await self._redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists error for key '{key}': {e}")
            return False

    async def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key in seconds. Returns -1 if no TTL, -2 if key doesn't exist"""
        if not self.is_connected:
            return -2

        try:
            return await self._redis.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL error for key '{key}': {e}")
            return -2

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter in cache"""
        if not self.is_connected:
            return None

        try:
            return await self._redis.incr(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error for key '{key}': {e}")
            return None

    async def flush_all(self) -> bool:
        """
        Clear all keys from the current database
        Use with caution!
        """
        if not self.is_connected:
            return False

        try:
            await self._redis.flushdb()
            logger.warning("Flushed all keys from Redis database")
            return True
        except Exception as e:
            logger.error(f"Cache flush error: {e}")
            return False

    # Cache key builders for different entities
    @staticmethod
    def key_dashboard(event_id: str) -> str:
        """Generate cache key for dashboard data"""
        return f"dashboard:{event_id}"

    @staticmethod
    def key_stats(event_id: str) -> str:
        """Generate cache key for event stats"""
        return f"stats:{event_id}"

    @staticmethod
    def key_bookings(event_id: str) -> str:
        """Generate cache key for event bookings"""
        return f"bookings:{event_id}"

    @staticmethod
    def key_inventory(event_id: str) -> str:
        """Generate cache key for event inventory"""
        return f"inventory:{event_id}"

    @staticmethod
    def key_guests(event_id: str) -> str:
        """Generate cache key for event guests"""
        return f"guests:{event_id}"

    @staticmethod
    def key_event(event_id: str) -> str:
        """Generate cache key for event details"""
        return f"event:{event_id}"

    @staticmethod
    def key_alerts(event_id: str) -> str:
        """Generate cache key for event alerts"""
        return f"alerts:{event_id}"

    async def invalidate_event_cache(self, event_id: str) -> int:
        """
        Invalidate all cache entries for a specific event
        Returns number of keys invalidated
        """
        pattern = f"*:{event_id}"
        return await self.delete_pattern(pattern)


# Global cache service instance
cache_service = CacheService()


async def get_cache() -> CacheService:
    """Dependency injection helper for FastAPI"""
    return cache_service


def cached(
    key_builder: Callable[..., str],
    ttl: Optional[int] = None,
    prefix: str = ""
):
    """
    Decorator for caching function results

    Usage:
        @cached(lambda event_id: f"dashboard:{event_id}", ttl=60)
        async def get_dashboard(event_id: str):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Build cache key
            cache_key = key_builder(*args, **kwargs)
            if prefix:
                cache_key = f"{prefix}:{cache_key}"

            # Try to get from cache
            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT for key: {cache_key}")
                return cached_value

            # Cache miss - call function
            logger.debug(f"Cache MISS for key: {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            effective_ttl = ttl or settings.CACHE_DEFAULT_TTL
            await cache_service.set(cache_key, result, effective_ttl)

            return result

        return wrapper
    return decorator
