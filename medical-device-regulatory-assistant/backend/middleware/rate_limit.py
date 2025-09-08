"""
Rate limiting middleware for API protection
"""

import time
from typing import Dict, List, Callable
from collections import defaultdict, deque
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Maximum requests allowed in the time window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, deque] = defaultdict(deque)
    
    def is_allowed(self, user_id: str) -> bool:
        """
        Check if a request is allowed for the given user
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            True if request is allowed, False if rate limited
        """
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove old requests outside the window
        while user_requests and user_requests[0] <= now - self.window_seconds:
            user_requests.popleft()
        
        # Check if under the limit
        if len(user_requests) < self.max_requests:
            user_requests.append(now)
            return True
        
        return False
    
    def get_remaining_requests(self, user_id: str) -> int:
        """
        Get the number of remaining requests for a user
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Number of remaining requests in the current window
        """
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove old requests outside the window
        while user_requests and user_requests[0] <= now - self.window_seconds:
            user_requests.popleft()
        
        return max(0, self.max_requests - len(user_requests))
    
    def get_reset_time(self, user_id: str) -> float:
        """
        Get the time when the rate limit will reset for a user
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Timestamp when the rate limit will reset
        """
        user_requests = self.requests[user_id]
        if not user_requests:
            return time.time()
        
        return user_requests[0] + self.window_seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting"""
    
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60, **kwargs):
        super().__init__(app)
        self.rate_limiter = RateLimiter(max_requests, window_seconds)
        self.exempt_paths = kwargs.get("exempt_paths", ["/health", "/docs", "/openapi.json"])
    
    def get_client_id(self, request: Request) -> str:
        """
        Get client identifier for rate limiting
        
        Args:
            request: FastAPI request object
            
        Returns:
            Client identifier (IP address or user ID)
        """
        # Try to get user ID from authentication
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"
        
        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting to requests"""
        
        # Skip rate limiting for exempt paths
        if request.url.path in self.exempt_paths:
            return await call_next(request)
        
        client_id = self.get_client_id(request)
        
        if not self.rate_limiter.is_allowed(client_id):
            # Rate limit exceeded
            remaining = self.rate_limiter.get_remaining_requests(client_id)
            reset_time = self.rate_limiter.get_reset_time(client_id)
            
            response = Response(
                content='{"error": "RATE_LIMIT_EXCEEDED", "message": "Too many requests"}',
                status_code=429,
                media_type="application/json"
            )
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.max_requests)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(reset_time))
            response.headers["Retry-After"] = str(int(reset_time - time.time()))
            
            return response
        
        # Process request normally
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        remaining = self.rate_limiter.get_remaining_requests(client_id)
        reset_time = self.rate_limiter.get_reset_time(client_id)
        
        response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_time))
        
        return response