"""
Rate limiting middleware for API protection
"""

import time
from typing import Dict, List
from collections import defaultdict, deque


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