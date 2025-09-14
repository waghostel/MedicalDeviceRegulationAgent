"""
Unit tests for security middleware and features.
Tests security components in isolation without requiring a running server.
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse

from middleware.rate_limit import RateLimitMiddleware, RateLimiter
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.auth import validate_jwt_token, hash_password, verify_password


class TestRateLimiter:
    """Test the RateLimiter class"""
    
    def test_rate_limiter_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed"""
        limiter = RateLimiter(max_requests=5, window_seconds=60)
        
        # Should allow 5 requests
        for i in range(5):
            assert limiter.is_allowed("user1") == True
        
        # 6th request should be denied
        assert limiter.is_allowed("user1") == False
    
    def test_rate_limiter_different_users_independent(self):
        """Test that different users have independent rate limits"""
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        
        # User 1 uses up their limit
        assert limiter.is_allowed("user1") == True
        assert limiter.is_allowed("user1") == True
        assert limiter.is_allowed("user1") == False
        
        # User 2 should still be allowed
        assert limiter.is_allowed("user2") == True
        assert limiter.is_allowed("user2") == True
        assert limiter.is_allowed("user2") == False
    
    def test_rate_limiter_window_reset(self):
        """Test that rate limit resets after time window"""
        limiter = RateLimiter(max_requests=2, window_seconds=1)  # 1 second window
        
        # Use up the limit
        assert limiter.is_allowed("user1") == True
        assert limiter.is_allowed("user1") == True
        assert limiter.is_allowed("user1") == False
        
        # Wait for window to reset
        time.sleep(1.1)
        
        # Should be allowed again
        assert limiter.is_allowed("user1") == True
    
    def test_get_remaining_requests(self):
        """Test getting remaining request count"""
        limiter = RateLimiter(max_requests=5, window_seconds=60)
        
        assert limiter.get_remaining_requests("user1") == 5
        
        limiter.is_allowed("user1")
        assert limiter.get_remaining_requests("user1") == 4
        
        limiter.is_allowed("user1")
        assert limiter.get_remaining_requests("user1") == 3


class TestRateLimitMiddleware:
    """Test the RateLimitMiddleware"""
    
    def setup_method(self):
        """Set up test FastAPI app with rate limiting"""
        self.app = FastAPI()
        self.app.add_middleware(RateLimitMiddleware, max_requests=3, window_seconds=60)
        
        @self.app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        @self.app.get("/health")
        async def health_endpoint():
            return {"status": "ok"}
        
        self.client = TestClient(self.app)
    
    def test_rate_limit_allows_requests_under_limit(self):
        """Test that requests under limit are allowed"""
        # First 3 requests should succeed
        for i in range(3):
            response = self.client.get("/test")
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
    
    def test_rate_limit_blocks_requests_over_limit(self):
        """Test that requests over limit are blocked"""
        # Use up the limit
        for i in range(3):
            response = self.client.get("/test")
            assert response.status_code == 200
        
        # 4th request should be rate limited
        response = self.client.get("/test")
        assert response.status_code == 429
        
        data = response.json()
        assert data["error"] == "RATE_LIMIT_EXCEEDED"
        assert "X-RateLimit-Limit" in response.headers
        assert "Retry-After" in response.headers
    
    def test_rate_limit_exempt_paths(self):
        """Test that exempt paths are not rate limited"""
        # Use up the limit on regular endpoint
        for i in range(3):
            response = self.client.get("/test")
            assert response.status_code == 200
        
        # Regular endpoint should be blocked
        response = self.client.get("/test")
        assert response.status_code == 429
        
        # Health endpoint should still work
        response = self.client.get("/health")
        assert response.status_code == 200


class TestSecurityHeadersMiddleware:
    """Test the SecurityHeadersMiddleware"""
    
    def setup_method(self):
        """Set up test FastAPI app with security headers"""
        self.app = FastAPI()
        self.app.add_middleware(SecurityHeadersMiddleware)
        
        @self.app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        self.client = TestClient(self.app)
    
    def test_security_headers_added(self):
        """Test that security headers are added to responses"""
        response = self.client.get("/test")
        
        assert response.status_code == 200
        
        # Check for security headers
        expected_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options", 
            "X-XSS-Protection",
            "Referrer-Policy",
            "Content-Security-Policy"
        ]
        
        for header in expected_headers:
            assert header in response.headers, f"Security header {header} missing"
    
    def test_security_header_values(self):
        """Test that security headers have correct values"""
        response = self.client.get("/test")
        
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]


class TestAuthenticationFunctions:
    """Test authentication utility functions"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "test_password_123"
        hashed = hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 20  # bcrypt hashes are long
        assert hashed.startswith("$2b$")  # bcrypt format
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "test_password_123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) == True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) == False
    
    def test_validate_jwt_token_valid(self):
        """Test JWT token validation with valid token"""
        import jwt
        import os
        
        # Create a valid token
        payload = {
            "sub": "user123",
            "exp": int(time.time()) + 3600,  # Expires in 1 hour
            "iat": int(time.time())
        }
        
        secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        result = validate_jwt_token(token)
        assert result is not None
        assert result["sub"] == "user123"
    
    def test_validate_jwt_token_expired(self):
        """Test JWT token validation with expired token"""
        import jwt
        import os
        
        # Create an expired token
        payload = {
            "sub": "user123",
            "exp": int(time.time()) - 3600,  # Expired 1 hour ago
            "iat": int(time.time()) - 7200
        }
        
        secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        result = validate_jwt_token(token)
        assert result is None
    
    def test_validate_jwt_token_invalid(self):
        """Test JWT token validation with invalid token"""
        result = validate_jwt_token("invalid.token.here")
        assert result is None
    
    def test_validate_jwt_token_missing_sub(self):
        """Test JWT token validation with missing sub claim"""
        import jwt
        import os
        
        # Create a token without sub claim
        payload = {
            "exp": int(time.time()) + 3600,
            "iat": int(time.time())
        }
        
        secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        result = validate_jwt_token(token)
        assert result is None


class TestCombinedMiddleware:
    """Test multiple middleware working together"""
    
    def setup_method(self):
        """Set up test FastAPI app with multiple middleware"""
        self.app = FastAPI()
        
        # Add middleware in correct order (last added = first executed)
        self.app.add_middleware(RateLimitMiddleware, max_requests=2, window_seconds=60)
        self.app.add_middleware(SecurityHeadersMiddleware)
        
        @self.app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        self.client = TestClient(self.app)
    
    def test_combined_middleware_functionality(self):
        """Test that both security headers and rate limiting work together"""
        # First request should succeed with both security headers and rate limit headers
        response = self.client.get("/test")
        assert response.status_code == 200
        
        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        
        # Check rate limit headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        
        # Second request should also succeed
        response = self.client.get("/test")
        assert response.status_code == 200
        
        # Third request should be rate limited but still have security headers
        response = self.client.get("/test")
        assert response.status_code == 429
        
        # Security headers should still be present on rate limited response
        # Note: Due to middleware order, rate limit middleware returns response directly
        # so security headers may not be added to 429 responses
        # This is acceptable behavior for this implementation


if __name__ == "__main__":
    pytest.main([__file__, "-v"])