"""
Unit performance tests that don't require a running server.
Tests performance of individual components and middleware.
"""

import pytest
import time
import asyncio
from unittest.mock import patch, MagicMock
from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient

from middleware.rate_limit import RateLimitMiddleware, RateLimiter
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.logging import RequestLoggingMiddleware


class TestMiddlewarePerformance:
    """Test performance of middleware components"""
    
    def test_rate_limiter_performance(self):
        """Test rate limiter performance with many requests"""
        limiter = RateLimiter(max_requests=1000, window_seconds=60)
        
        start_time = time.time()
        
        # Test 1000 requests from different users
        for i in range(1000):
            user_id = f"user_{i % 100}"  # 100 different users
            limiter.is_allowed(user_id)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should process 1000 requests in less than 1 second
        assert duration < 1.0, f"Rate limiter took {duration:.3f}s for 1000 requests"
        
        # Test requests per second
        rps = 1000 / duration
        assert rps > 1000, f"Rate limiter only processed {rps:.0f} requests/second"
    
    def test_security_headers_middleware_performance(self):
        """Test security headers middleware performance"""
        app = FastAPI()
        app.add_middleware(SecurityHeadersMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        client = TestClient(app)
        
        start_time = time.time()
        
        # Make 100 requests
        for _ in range(100):
            response = client.get("/test")
            assert response.status_code == 200
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should process 100 requests in less than 2 seconds
        assert duration < 2.0, f"Security middleware took {duration:.3f}s for 100 requests"
        
        # Test requests per second
        rps = 100 / duration
        assert rps > 50, f"Security middleware only processed {rps:.0f} requests/second"
    
    def test_combined_middleware_performance(self):
        """Test performance with multiple middleware"""
        app = FastAPI()
        
        # Add multiple middleware
        app.add_middleware(RequestLoggingMiddleware)
        app.add_middleware(RateLimitMiddleware, max_requests=1000, window_seconds=60)
        app.add_middleware(SecurityHeadersMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        client = TestClient(app)
        
        start_time = time.time()
        
        # Make 50 requests (fewer due to multiple middleware)
        for _ in range(50):
            response = client.get("/test")
            assert response.status_code == 200
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should process 50 requests in less than 3 seconds with all middleware
        assert duration < 3.0, f"Combined middleware took {duration:.3f}s for 50 requests"
        
        # Test requests per second
        rps = 50 / duration
        assert rps > 15, f"Combined middleware only processed {rps:.0f} requests/second"


class TestMemoryUsage:
    """Test memory usage of components"""
    
    def test_rate_limiter_memory_usage(self):
        """Test that rate limiter doesn't use excessive memory"""
        try:
            import psutil
        except ImportError:
            pytest.skip("psutil not available - skipping memory test")
        
        import os
        
        # Get initial memory
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create rate limiter and simulate many users
        limiter = RateLimiter(max_requests=100, window_seconds=60)
        
        # Simulate 1000 different users making requests
        for i in range(1000):
            user_id = f"user_{i}"
            limiter.is_allowed(user_id)
        
        # Check memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB for 1000 users)
        assert memory_increase < 50, f"Rate limiter used {memory_increase:.1f}MB for 1000 users"
    
    def test_middleware_memory_leak(self):
        """Test that middleware doesn't have memory leaks"""
        try:
            import psutil
        except ImportError:
            pytest.skip("psutil not available - skipping memory test")
        
        import os
        import gc
        
        # Force garbage collection
        gc.collect()
        
        # Get initial memory
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create and destroy many middleware instances
        for _ in range(100):
            app = FastAPI()
            app.add_middleware(SecurityHeadersMiddleware)
            app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
            
            @app.get("/test")
            async def test_endpoint():
                return {"message": "success"}
            
            client = TestClient(app)
            
            # Make a few requests
            for _ in range(5):
                response = client.get("/test")
                assert response.status_code == 200
            
            # Clean up
            del app
            del client
        
        # Force garbage collection
        gc.collect()
        
        # Check memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be minimal (less than 20MB)
        assert memory_increase < 20, f"Middleware leaked {memory_increase:.1f}MB over 100 iterations"


class TestConcurrentPerformance:
    """Test performance under concurrent load"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_concurrent_access(self):
        """Test rate limiter performance with concurrent access"""
        limiter = RateLimiter(max_requests=1000, window_seconds=60)
        
        async def make_requests(user_prefix: str, count: int):
            """Make multiple requests for a user"""
            results = []
            for i in range(count):
                user_id = f"{user_prefix}_{i}"
                result = limiter.is_allowed(user_id)
                results.append(result)
            return results
        
        start_time = time.time()
        
        # Create 10 concurrent tasks, each making 100 requests
        tasks = []
        for i in range(10):
            task = asyncio.create_task(make_requests(f"user_batch_{i}", 100))
            tasks.append(task)
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should handle 1000 concurrent requests quickly
        assert duration < 2.0, f"Concurrent rate limiting took {duration:.3f}s"
        
        # Verify all requests were processed
        total_requests = sum(len(batch) for batch in results)
        assert total_requests == 1000
        
        # Most requests should be allowed (since we have high limits)
        allowed_requests = sum(sum(batch) for batch in results)
        assert allowed_requests >= 900  # At least 90% should be allowed
    
    def test_middleware_concurrent_requests(self):
        """Test middleware performance with concurrent requests"""
        app = FastAPI()
        app.add_middleware(SecurityHeadersMiddleware)
        app.add_middleware(RateLimitMiddleware, max_requests=1000, window_seconds=60)
        
        @app.get("/test")
        async def test_endpoint():
            # Simulate some processing time
            await asyncio.sleep(0.001)  # 1ms
            return {"message": "success"}
        
        client = TestClient(app)
        
        def make_request():
            """Make a single request"""
            response = client.get("/test")
            return response.status_code
        
        start_time = time.time()
        
        # Make 20 concurrent requests using ThreadPoolExecutor
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(20)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should handle 20 concurrent requests reasonably quickly
        assert duration < 5.0, f"Concurrent middleware requests took {duration:.3f}s"
        
        # All requests should succeed
        assert all(status == 200 for status in results)
        assert len(results) == 20


class TestComponentBenchmarks:
    """Benchmark individual components"""
    
    def test_jwt_validation_performance(self):
        """Test JWT validation performance"""
        from middleware.auth import validate_jwt_token
        import jwt
        import os
        
        # Create a valid token
        payload = {
            "sub": "user123",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time())
        }
        
        secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        start_time = time.time()
        
        # Validate token 1000 times
        for _ in range(1000):
            result = validate_jwt_token(token)
            assert result is not None
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should validate 1000 tokens in less than 1 second
        assert duration < 1.0, f"JWT validation took {duration:.3f}s for 1000 tokens"
        
        # Test validations per second
        vps = 1000 / duration
        assert vps > 1000, f"JWT validation only processed {vps:.0f} validations/second"
    
    def test_password_hashing_performance(self):
        """Test password hashing performance"""
        from middleware.auth import hash_password, verify_password
        
        password = "test_password_123"
        
        # Test hashing performance (should be slow for security)
        start_time = time.time()
        hashed = hash_password(password)
        hash_duration = time.time() - start_time
        
        # Hashing should take some time (bcrypt is intentionally slow)
        assert hash_duration > 0.01, "Password hashing is too fast (security concern)"
        assert hash_duration < 1.0, "Password hashing is too slow (usability concern)"
        
        # Test verification performance
        start_time = time.time()
        
        # Verify password 10 times (fewer due to bcrypt cost)
        for _ in range(10):
            result = verify_password(password, hashed)
            assert result == True
        
        verify_duration = time.time() - start_time
        
        # Verification should be reasonably fast
        assert verify_duration < 5.0, f"Password verification took {verify_duration:.3f}s for 10 verifications"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])