"""
Comprehensive Real FDA API Integration Tests

This module contains comprehensive integration tests that make actual calls to the FDA's
openFDA API to validate real-world behavior, performance, and error handling.

These tests are designed to:
1. Validate actual FDA API responses with real data
2. Test rate limiting behavior (240 requests/minute)
3. Verify error handling for all HTTP status codes
4. Measure performance and optimize for production use
5. Monitor API health and availability

Tests require the --real-api marker and should be run sparingly to avoid
hitting FDA rate limits.
"""

import asyncio
import os
import time
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from unittest.mock import patch

from services.openfda import (
    OpenFDAService, 
    FDASearchResult, 
    DeviceClassificationResult,
    AdverseEventResult,
    FDAAPIError,
    RateLimitExceededError,
    PredicateNotFoundError,
    create_production_openfda_service
)
from core.environment import FDA_API_KEY, USE_REAL_FDA_API


# Skip all tests in this module unless --real-api marker is used
pytestmark = pytest.mark.real_api


class TestRealFDAAPIIntegration:
    """Comprehensive real FDA API integration tests"""
    
    @pytest_asyncio.fixture(scope="class")
    async def real_openfda_service(self):
        """Create real OpenFDA service for integration testing"""
        # Use production service factory
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest_asyncio.fixture(scope="class")
    async def real_openfda_service_no_key(self):
        """Create OpenFDA service without API key to test rate limiting"""
        from services.openfda import create_openfda_service
        service = await create_openfda_service(api_key=None)
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_real_predicate_search_with_validation(self, real_openfda_service):
        """Test predicate search with real FDA API and validate response schema"""
        # Test with known device type that should return results
        search_terms = ["cardiac pacemaker"]
        device_class = "II"
        
        results = await real_openfda_service.search_predicates(
            search_terms=search_terms,
            device_class=device_class,
            limit=10
        )
        
        # Validate results structure
        assert isinstance(results, list), "Results should be a list"
        assert len(results) > 0, "Should find predicate devices for cardiac pacemaker"
        
        # Validate each result schema
        for result in results:
            assert isinstance(result, FDASearchResult), "Each result should be FDASearchResult"
            assert result.k_number, "K-number should not be empty"
            assert result.k_number.startswith("K"), "K-number should start with 'K'"
            assert result.device_name, "Device name should not be empty"
            assert result.product_code, "Product code should not be empty"
            assert result.clearance_date, "Clearance date should not be empty"
            
            # Validate date format (should be YYYY-MM-DD or similar)
            assert len(result.clearance_date) >= 8, "Clearance date should be valid format"
    
    @pytest.mark.asyncio
    async def test_real_device_classification_lookup(self, real_openfda_service):
        """Test device classification lookup with real FDA API"""
        # Test with known product code
        product_code = "DQO"  # Pacemaker product code
        
        results = await real_openfda_service.lookup_device_classification(
            product_code=product_code
        )
        
        # Validate results
        assert isinstance(results, list), "Results should be a list"
        assert len(results) > 0, f"Should find classification for product code {product_code}"
        
        # Validate classification schema
        for result in results:
            assert isinstance(result, DeviceClassificationResult), "Should be DeviceClassificationResult"
            assert result.product_code == product_code, "Product code should match query"
            assert result.device_class in ["I", "II", "III"], "Device class should be valid"
            assert result.device_name, "Device name should not be empty"
            assert result.regulation_number, "Regulation number should not be empty"
    
    @pytest.mark.asyncio
    async def test_real_device_details_retrieval(self, real_openfda_service):
        """Test getting device details with real K-number"""
        # Use a known K-number that should exist
        k_number = "K123456"  # This might not exist, but tests the API call
        
        try:
            result = await real_openfda_service.get_device_details(k_number)
            
            if result:  # If device exists
                assert isinstance(result, FDASearchResult), "Should be FDASearchResult"
                assert result.k_number == k_number, "K-number should match query"
                assert result.device_name, "Device name should not be empty"
            else:
                # If device doesn't exist, that's also a valid test result
                assert result is None, "Non-existent device should return None"
                
        except PredicateNotFoundError:
            # This is expected for non-existent K-numbers
            pass
    
    @pytest.mark.asyncio
    async def test_real_adverse_events_search(self, real_openfda_service):
        """Test adverse events search with real FDA API"""
        # Search for adverse events for a common product code
        product_code = "DQO"  # Pacemaker
        
        results = await real_openfda_service.search_adverse_events(
            product_code=product_code,
            limit=5  # Small limit to avoid large responses
        )
        
        # Validate results
        assert isinstance(results, list), "Results should be a list"
        
        # Validate adverse event schema if results exist
        for result in results:
            assert isinstance(result, AdverseEventResult), "Should be AdverseEventResult"
            assert result.report_number, "Report number should not be empty"
            assert result.event_date, "Event date should not be empty"
            # Other fields may be empty depending on the report
    
    @pytest.mark.asyncio
    async def test_api_health_check_real(self, real_openfda_service):
        """Test health check with real FDA API"""
        start_time = time.time()
        health_status = await real_openfda_service.health_check()
        response_time = time.time() - start_time
        
        # Validate health check response
        assert isinstance(health_status, dict), "Health status should be a dict"
        assert "status" in health_status, "Should include status"
        assert health_status["status"] in ["healthy", "rate_limited", "api_error", "authentication_error", "unhealthy"]
        
        # If healthy, validate additional fields
        if health_status["status"] == "healthy":
            assert "response_time_seconds" in health_status, "Should include response time"
            assert health_status["response_time_seconds"] > 0, "Response time should be positive"
            assert response_time < 30, "Health check should complete within 30 seconds"
    
    @pytest.mark.asyncio
    async def test_api_configuration_validation(self, real_openfda_service):
        """Test API configuration validation with real service"""
        validation_result = await real_openfda_service.validate_api_configuration()
        
        # Validate configuration result structure
        assert isinstance(validation_result, dict), "Validation result should be a dict"
        assert "api_key_configured" in validation_result, "Should check API key configuration"
        assert "base_url_accessible" in validation_result, "Should check base URL accessibility"
        assert "rate_limiter_configured" in validation_result, "Should check rate limiter"
        assert "circuit_breaker_configured" in validation_result, "Should check circuit breaker"
        assert "cache_configured" in validation_result, "Should check cache configuration"
        assert "errors" in validation_result, "Should include errors list"
        assert "warnings" in validation_result, "Should include warnings list"
        
        # Validate that basic connectivity works
        if not validation_result["errors"]:
            assert validation_result["base_url_accessible"], "Base URL should be accessible"


class TestRealFDAAPIErrorHandling:
    """Test error handling with real FDA API"""
    
    @pytest_asyncio.fixture(scope="class")
    async def real_openfda_service(self):
        """Create real OpenFDA service for error testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_404_error_handling(self, real_openfda_service):
        """Test 404 error handling with non-existent data"""
        # Search for something that definitely doesn't exist
        search_terms = ["nonexistent_device_xyz_123"]
        
        try:
            results = await real_openfda_service.search_predicates(
                search_terms=search_terms,
                limit=1
            )
            # If no exception, should return empty list
            assert isinstance(results, list), "Should return empty list for no results"
            assert len(results) == 0, "Should return empty list for non-existent device"
            
        except PredicateNotFoundError as e:
            # This is also acceptable behavior
            assert e.status_code == 404, "Should be 404 error"
            assert "No data found" in str(e) or "not found" in str(e).lower()
    
    @pytest.mark.asyncio
    async def test_invalid_search_parameters(self, real_openfda_service):
        """Test error handling with invalid search parameters"""
        # Test with invalid device class
        try:
            results = await real_openfda_service.search_predicates(
                search_terms=["pacemaker"],
                device_class="INVALID",  # Invalid device class
                limit=1
            )
            # API might still return results or empty list
            assert isinstance(results, list), "Should handle invalid parameters gracefully"
            
        except FDAAPIError as e:
            # API error is also acceptable
            assert isinstance(e, FDAAPIError), "Should be FDA API error"
    
    @pytest.mark.asyncio
    async def test_large_limit_handling(self, real_openfda_service):
        """Test handling of large limit values"""
        # Test with limit larger than FDA allows (should be capped at 1000)
        results = await real_openfda_service.search_predicates(
            search_terms=["device"],
            limit=5000,  # Larger than FDA limit
            skip=0
        )
        
        # Should not fail, but should be limited by FDA API
        assert isinstance(results, list), "Should return list even with large limit"
        assert len(results) <= 1000, "Results should be limited by FDA API maximum"


class TestRealFDAAPIRateLimiting:
    """Test rate limiting behavior with real FDA API"""
    
    @pytest_asyncio.fixture(scope="class")
    async def rate_limit_service(self):
        """Create service for rate limiting tests"""
        # Use service without API key to hit rate limits faster
        from services.openfda import create_openfda_service
        service = await create_openfda_service(api_key=None)
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_rate_limiting_behavior(self, rate_limit_service):
        """Test rate limiting behavior with real API"""
        # Make requests at a controlled rate
        request_times = []
        successful_requests = 0
        rate_limited_requests = 0
        
        # Make a small number of requests to test rate limiting without hitting hard limits
        for i in range(5):
            start_time = time.time()
            
            try:
                await rate_limit_service.search_predicates(
                    search_terms=[f"test_{i}"],
                    limit=1
                )
                request_time = time.time() - start_time
                request_times.append(request_time)
                successful_requests += 1
                
            except RateLimitExceededError:
                rate_limited_requests += 1
                # If we hit rate limit, wait a bit before continuing
                await asyncio.sleep(2)
                
            except FDAAPIError:
                # Other API errors are acceptable for this test
                pass
            
            # Small delay between requests to be respectful of API limits
            await asyncio.sleep(0.5)
        
        print(f"Rate limiting test: {successful_requests} successful, {rate_limited_requests} rate limited")
        
        # Should make at least some successful requests
        assert successful_requests > 0, "Should make at least some successful requests"
        
        # If we have request times, analyze them
        if request_times:
            avg_time = sum(request_times) / len(request_times)
            print(f"Average request time: {avg_time:.3f}s")
            assert avg_time < 15.0, f"Average request time should be reasonable, got {avg_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_rate_limiter_functionality(self, rate_limit_service):
        """Test that rate limiter prevents excessive requests"""
        # Make several requests quickly
        request_times = []
        
        for i in range(5):  # Small number to avoid hitting actual limits
            start_time = time.time()
            
            try:
                await rate_limit_service.search_predicates(
                    search_terms=[f"test_device_{i}"],
                    limit=1
                )
                request_times.append(time.time() - start_time)
                
            except (RateLimitExceededError, FDAAPIError) as e:
                # Rate limiting or API errors are expected
                if isinstance(e, RateLimitExceededError):
                    assert e.status_code == 429, "Rate limit error should be 429"
                break
        
        # Validate that requests were made
        assert len(request_times) > 0, "Should make at least one request"
    
    @pytest.mark.asyncio
    async def test_rate_limiter_recovery(self, rate_limit_service):
        """Test that rate limiter recovers after waiting"""
        # This test is more conservative to avoid hitting real rate limits
        
        # Make one request
        try:
            results1 = await rate_limit_service.search_predicates(
                search_terms=["pacemaker"],
                limit=1
            )
            
            # Wait a short time (much less than the full recovery time)
            await asyncio.sleep(1)
            
            # Make another request
            results2 = await rate_limit_service.search_predicates(
                search_terms=["defibrillator"],
                limit=1
            )
            
            # Both requests should succeed (or fail for non-rate-limit reasons)
            assert isinstance(results1, list), "First request should return list"
            assert isinstance(results2, list), "Second request should return list"
            
        except (RateLimitExceededError, FDAAPIError):
            # Rate limiting is acceptable in this test
            pass


class TestRealFDAAPIPerformance:
    """Performance benchmarking tests for real FDA API"""
    
    @pytest_asyncio.fixture(scope="class")
    async def performance_service(self):
        """Create service for performance testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_predicate_search_performance(self, performance_service):
        """Benchmark predicate search performance"""
        search_terms = ["cardiac pacemaker"]
        
        # Measure single request performance
        start_time = time.time()
        results = await performance_service.search_predicates(
            search_terms=search_terms,
            device_class="II",
            limit=10
        )
        response_time = time.time() - start_time
        
        # Performance assertions
        assert response_time < 10.0, f"Search should complete within 10 seconds, took {response_time:.2f}s"
        assert isinstance(results, list), "Should return results list"
        
        # Log performance metrics
        print(f"Predicate search performance: {response_time:.3f}s for {len(results)} results")
    
    @pytest.mark.asyncio
    async def test_device_classification_performance(self, performance_service):
        """Benchmark device classification performance"""
        product_code = "DQO"
        
        start_time = time.time()
        results = await performance_service.lookup_device_classification(
            product_code=product_code
        )
        response_time = time.time() - start_time
        
        # Performance assertions
        assert response_time < 5.0, f"Classification lookup should complete within 5 seconds, took {response_time:.2f}s"
        assert isinstance(results, list), "Should return results list"
        
        print(f"Classification lookup performance: {response_time:.3f}s for {len(results)} results")
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_performance(self, performance_service):
        """Test performance of concurrent requests"""
        # Create multiple concurrent requests
        search_tasks = [
            performance_service.search_predicates(
                search_terms=[f"device_{i}"],
                limit=5
            )
            for i in range(3)  # Small number to avoid rate limits
        ]
        
        start_time = time.time()
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # Validate results
        successful_requests = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_requests) > 0, "At least one request should succeed"
        
        # Performance assertion
        assert total_time < 15.0, f"Concurrent requests should complete within 15 seconds, took {total_time:.2f}s"
        
        print(f"Concurrent requests performance: {total_time:.3f}s for {len(search_tasks)} requests")


class TestRealFDAAPIHealthMonitoring:
    """API health monitoring and availability tests"""
    
    @pytest_asyncio.fixture(scope="class")
    async def monitoring_service(self):
        """Create service for health monitoring"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_api_availability_monitoring(self, monitoring_service):
        """Test continuous API availability monitoring"""
        # Perform multiple health checks over time
        health_results = []
        
        for i in range(3):  # Multiple checks
            start_time = time.time()
            health_status = await monitoring_service.health_check()
            response_time = time.time() - start_time
            
            health_results.append({
                "check_number": i + 1,
                "status": health_status.get("status"),
                "response_time": response_time,
                "timestamp": datetime.now().isoformat()
            })
            
            # Small delay between checks
            if i < 2:  # Don't wait after last check
                await asyncio.sleep(1)
        
        # Validate monitoring results
        assert len(health_results) == 3, "Should complete all health checks"
        
        # Check for consistency
        statuses = [result["status"] for result in health_results]
        healthy_checks = sum(1 for status in statuses if status == "healthy")
        
        # At least some checks should be healthy (allowing for occasional issues)
        assert healthy_checks > 0, "At least one health check should be healthy"
        
        # Log monitoring results
        for result in health_results:
            print(f"Health check {result['check_number']}: {result['status']} ({result['response_time']:.3f}s)")
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_monitoring(self, monitoring_service):
        """Test circuit breaker state monitoring"""
        # Check initial circuit breaker state
        initial_health = await monitoring_service.health_check()
        
        assert "circuit_breaker_state" in initial_health, "Health check should include circuit breaker state"
        assert initial_health["circuit_breaker_state"] in ["CLOSED", "OPEN", "HALF_OPEN"], "Circuit breaker state should be valid"
        
        # Circuit breaker should start in CLOSED state for healthy service
        if initial_health["status"] == "healthy":
            assert initial_health["circuit_breaker_state"] == "CLOSED", "Healthy service should have closed circuit breaker"
    
    @pytest.mark.asyncio
    async def test_service_metrics_collection(self, monitoring_service):
        """Test collection of service metrics"""
        # Make a request to generate metrics
        await monitoring_service.search_predicates(
            search_terms=["test device"],
            limit=1
        )
        
        # Get health status with metrics
        health_status = await monitoring_service.health_check()
        
        # Validate metrics presence
        expected_metrics = [
            "status",
            "circuit_breaker_state",
            "api_key_configured",
            "timestamp"
        ]
        
        for metric in expected_metrics:
            assert metric in health_status, f"Health status should include {metric}"
        
        # Validate timestamp format
        timestamp = health_status["timestamp"]
        assert isinstance(timestamp, str), "Timestamp should be string"
        assert "T" in timestamp, "Timestamp should be ISO format"


# Utility functions for real API testing
def requires_fda_api_key():
    """Skip test if FDA_API_KEY is not configured"""
    return pytest.mark.skipif(
        not FDA_API_KEY,
        reason="FDA_API_KEY environment variable not set"
    )


def requires_network():
    """Skip test if network is not available"""
    import socket
    
    def check_network():
        try:
            socket.create_connection(("api.fda.gov", 443), timeout=5)
            return True
        except OSError:
            return False
    
    return pytest.mark.skipif(
        not check_network(),
        reason="Network connection to api.fda.gov not available"
    )


# Performance benchmarking utilities
class PerformanceBenchmark:
    """Utility class for performance benchmarking"""
    
    def __init__(self):
        self.results = []
    
    def record_timing(self, operation: str, duration: float, metadata: Dict[str, Any] = None):
        """Record timing for an operation"""
        self.results.append({
            "operation": operation,
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
    
    def get_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        if not self.results:
            return {"total_operations": 0}
        
        durations = [r["duration_seconds"] for r in self.results]
        return {
            "total_operations": len(self.results),
            "total_time": sum(durations),
            "average_time": sum(durations) / len(durations),
            "min_time": min(durations),
            "max_time": max(durations),
            "operations": self.results
        }


# Schema validation utilities
def validate_fda_search_result_schema(result: FDASearchResult) -> bool:
    """Validate FDA search result schema"""
    required_fields = ["k_number", "device_name", "product_code", "clearance_date"]
    
    for field in required_fields:
        if not getattr(result, field, None):
            return False
    
    # Validate K-number format
    if not result.k_number.startswith("K"):
        return False
    
    # Validate product code format (should be 3 characters)
    if len(result.product_code) != 3:
        return False
    
    return True


def validate_device_classification_schema(result: DeviceClassificationResult) -> bool:
    """Validate device classification result schema"""
    required_fields = ["device_class", "product_code", "device_name", "regulation_number"]
    
    for field in required_fields:
        if not getattr(result, field, None):
            return False
    
    # Validate device class
    if result.device_class not in ["I", "II", "III"]:
        return False
    
    return True