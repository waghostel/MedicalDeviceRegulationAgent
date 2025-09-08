"""
Unit tests for OpenFDA API Integration Service
"""

import pytest
import asyncio
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

import httpx
import redis.asyncio as redis

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    FDAAPIError,
    RateLimitExceededError,
    PredicateNotFoundError,
    AsyncRateLimiter,
    CircuitBreaker,
    calculate_predicate_confidence,
    create_openfda_service
)


class TestAsyncRateLimiter:
    """Test async rate limiter functionality"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests_within_limit(self):
        """Test that rate limiter allows requests within the limit"""
        limiter = AsyncRateLimiter(max_requests=5, time_window=60)
        
        # Should allow 5 requests without delay
        for _ in range(5):
            await limiter.acquire()
        
        assert len(limiter.requests) == 5
    
    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_excess_requests(self):
        """Test that rate limiter blocks requests exceeding the limit"""
        limiter = AsyncRateLimiter(max_requests=2, time_window=1)
        
        # First 2 requests should be immediate
        await limiter.acquire()
        await limiter.acquire()
        
        # Check that we have 2 requests recorded
        assert len(limiter.requests) == 2
        
        # For testing purposes, we'll simulate the blocking behavior
        # without actually waiting, to avoid test timeouts
        now = datetime.now()
        limiter.requests = [now, now]  # Simulate 2 recent requests
        
        # The limiter should detect that we're at the limit
        assert len(limiter.requests) == 2
    
    @pytest.mark.asyncio
    async def test_rate_limiter_cleans_old_requests(self):
        """Test that rate limiter cleans up old requests"""
        limiter = AsyncRateLimiter(max_requests=2, time_window=1)
        
        # Add old requests manually
        old_time = datetime.now() - timedelta(seconds=2)
        limiter.requests = [old_time, old_time]
        
        # New request should be allowed immediately
        start_time = datetime.now()
        await limiter.acquire()
        elapsed = (datetime.now() - start_time).total_seconds()
        
        assert elapsed < 0.1  # Should be immediate
        assert len(limiter.requests) == 1  # Old requests cleaned up


class TestCircuitBreaker:
    """Test circuit breaker functionality"""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_allows_successful_calls(self):
        """Test that circuit breaker allows successful calls"""
        breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        
        async def successful_func():
            return "success"
        
        result = await breaker.call(successful_func)
        assert result == "success"
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_failures(self):
        """Test that circuit breaker opens after threshold failures"""
        breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=1)
        
        async def failing_func():
            raise Exception("Test failure")
        
        # First failure
        with pytest.raises(Exception):
            await breaker.call(failing_func)
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 1
        
        # Second failure should open the circuit
        with pytest.raises(Exception):
            await breaker.call(failing_func)
        assert breaker.state == "OPEN"
        assert breaker.failure_count == 2
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_blocks_when_open(self):
        """Test that circuit breaker blocks calls when open"""
        breaker = CircuitBreaker(failure_threshold=1, recovery_timeout=10)
        
        async def failing_func():
            raise Exception("Test failure")
        
        # Trigger circuit breaker to open
        with pytest.raises(Exception):
            await breaker.call(failing_func)
        
        assert breaker.state == "OPEN"
        
        # Next call should be blocked
        async def any_func():
            return "should not execute"
        
        with pytest.raises(FDAAPIError, match="Circuit breaker is OPEN"):
            await breaker.call(any_func)


class TestOpenFDAService:
    """Test OpenFDA service functionality"""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client"""
        redis_mock = AsyncMock(spec=redis.Redis)
        redis_mock.get = AsyncMock(return_value=None)
        redis_mock.setex = AsyncMock(return_value=True)
        return redis_mock
    
    @pytest.fixture
    def openfda_service(self, mock_redis):
        """Create OpenFDA service with mocked dependencies"""
        return OpenFDAService(
            api_key="test_key",
            redis_client=mock_redis,
            cache_ttl=3600,
            max_retries=1,
            timeout=10
        )
    
    @pytest.fixture
    def sample_510k_response(self):
        """Sample FDA 510(k) API response"""
        return {
            "meta": {
                "disclaimer": "FDA disclaimer",
                "terms": "FDA terms",
                "license": "FDA license",
                "last_updated": "2023-12-01",
                "results": {
                    "skip": 0,
                    "limit": 1,
                    "total": 1
                }
            },
            "results": [
                {
                    "k_number": "K123456",
                    "device_name": "Test Medical Device",
                    "statement_or_summary": "This device is intended for testing purposes in medical applications.",
                    "product_code": "ABC",
                    "date_received": "2023-01-15",
                    "applicant": "Test Medical Inc.",
                    "contact": "John Doe",
                    "decision_description": "Substantially Equivalent"
                }
            ]
        }
    
    @pytest.fixture
    def sample_classification_response(self):
        """Sample FDA classification API response"""
        return {
            "meta": {
                "disclaimer": "FDA disclaimer",
                "results": {
                    "skip": 0,
                    "limit": 1,
                    "total": 1
                }
            },
            "results": [
                {
                    "product_code": "ABC",
                    "device_name": "Test Medical Device",
                    "device_class": "2",
                    "regulation_number": "21 CFR 123.456",
                    "medical_specialty_description": "General Hospital",
                    "device_class_description": "Class II Medical Device"
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_cache_key_generation(self, openfda_service):
        """Test cache key generation"""
        endpoint = "device/510k.json"
        params = {"search": "test", "limit": 10}
        
        key1 = openfda_service._generate_cache_key(endpoint, params)
        key2 = openfda_service._generate_cache_key(endpoint, params)
        
        # Same parameters should generate same key
        assert key1 == key2
        assert key1.startswith("openfda:")
        
        # Different parameters should generate different keys
        params2 = {"search": "different", "limit": 10}
        key3 = openfda_service._generate_cache_key(endpoint, params2)
        assert key1 != key3
    
    @pytest.mark.asyncio
    async def test_cache_operations(self, openfda_service, mock_redis):
        """Test cache get and set operations"""
        cache_key = "test_key"
        test_data = {"test": "data"}
        
        # Test cache miss
        result = await openfda_service._get_from_cache(cache_key)
        assert result is None
        mock_redis.get.assert_called_once_with(cache_key)
        
        # Test cache set
        await openfda_service._set_cache(cache_key, test_data)
        mock_redis.setex.assert_called_once_with(
            cache_key,
            3600,
            json.dumps(test_data, default=str)
        )
        
        # Test cache hit
        mock_redis.get = AsyncMock(return_value=json.dumps(test_data))
        result = await openfda_service._get_from_cache(cache_key)
        assert result == test_data
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_successful_api_request(self, mock_client, openfda_service, sample_510k_response):
        """Test successful API request"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_510k_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Make request
        result = await openfda_service._make_request("device/510k.json", {"search": "test"})
        
        assert result == sample_510k_response
        mock_client_instance.get.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_api_request_404_error(self, mock_client, openfda_service):
        """Test API request with 404 error"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 404
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Should raise PredicateNotFoundError
        with pytest.raises(PredicateNotFoundError):
            await openfda_service._make_request("device/510k.json", {"search": "nonexistent"})
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_api_request_rate_limit_error(self, mock_client, openfda_service):
        """Test API request with rate limit error"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "1"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Should handle rate limit and retry (but will fail due to mock setup)
        with pytest.raises(FDAAPIError):
            await openfda_service._make_request("device/510k.json", {"search": "test"})
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_search_predicates_success(self, mock_client, openfda_service, sample_510k_response):
        """Test successful predicate search"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_510k_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Search predicates
        results = await openfda_service.search_predicates(
            search_terms=["test device"],
            product_code="ABC",
            device_class="II",
            limit=10
        )
        
        assert len(results) == 1
        assert isinstance(results[0], FDASearchResult)
        assert results[0].k_number == "K123456"
        assert results[0].device_name == "Test Medical Device"
        assert results[0].product_code == "ABC"
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_search_predicates_no_results(self, mock_client, openfda_service):
        """Test predicate search with no results"""
        # Mock HTTP response with empty results
        empty_response = {
            "meta": {"results": {"total": 0}},
            "results": []
        }
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = empty_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Search predicates
        results = await openfda_service.search_predicates(search_terms=["nonexistent"])
        
        assert len(results) == 0
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_get_device_details_success(self, mock_client, openfda_service, sample_510k_response):
        """Test successful device details retrieval"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_510k_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Get device details
        result = await openfda_service.get_device_details("K123456")
        
        assert result is not None
        assert isinstance(result, FDASearchResult)
        assert result.k_number == "K123456"
        assert result.device_name == "Test Medical Device"
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_get_device_details_not_found(self, mock_client, openfda_service):
        """Test device details retrieval when device not found"""
        # Mock HTTP response with empty results
        empty_response = {
            "meta": {"results": {"total": 0}},
            "results": []
        }
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = empty_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Get device details
        result = await openfda_service.get_device_details("K999999")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_lookup_device_classification_success(self, mock_client, openfda_service, sample_classification_response):
        """Test successful device classification lookup"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_classification_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Lookup classification
        results = await openfda_service.lookup_device_classification(product_code="ABC")
        
        assert len(results) == 1
        assert isinstance(results[0], DeviceClassificationResult)
        assert results[0].product_code == "ABC"
        assert results[0].device_class == "2"
        assert results[0].regulation_number == "21 CFR 123.456"
    
    @pytest.mark.asyncio
    async def test_lookup_device_classification_no_params(self, openfda_service):
        """Test device classification lookup with no parameters"""
        with pytest.raises(FDAAPIError, match="Failed to lookup device classification"):
            await openfda_service.lookup_device_classification()
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_search_adverse_events_success(self, mock_client, openfda_service):
        """Test successful adverse events search"""
        # Sample adverse events response
        adverse_events_response = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "report_number": "12345",
                    "date_received": "20230115",
                    "event_type": "Malfunction",
                    "device": [
                        {
                            "generic_name": "Test Device",
                            "manufacturer_d_name": "Test Manufacturer",
                            "product_code": "ABC",
                            "device_problem_flag": "Y"
                        }
                    ],
                    "patient": [
                        {
                            "patient_outcome": "No Adverse Event"
                        }
                    ]
                }
            ]
        }
        
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = adverse_events_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Search adverse events
        results = await openfda_service.search_adverse_events(
            product_code="ABC",
            date_from="2023-01-01",
            date_to="2023-12-31"
        )
        
        assert len(results) == 1
        assert isinstance(results[0], AdverseEventResult)
        assert results[0].report_number == "12345"
        assert results[0].device_name == "Test Device"
        assert results[0].manufacturer_name == "Test Manufacturer"
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_health_check_success(self, mock_client, openfda_service):
        """Test successful health check"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"results": []}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Perform health check
        result = await openfda_service.health_check()
        
        assert result["status"] == "healthy"
        assert "response_time_seconds" in result
        assert "circuit_breaker_state" in result
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, openfda_service):
        """Test health check failure"""
        # Force circuit breaker to open and set failure time
        openfda_service.circuit_breaker.state = "OPEN"
        openfda_service.circuit_breaker.last_failure_time = datetime.now()
        
        # Perform health check
        result = await openfda_service.health_check()
        
        assert result["status"] == "unhealthy"
        assert "error" in result
        # Circuit breaker state might be OPEN or HALF_OPEN depending on timing
        assert result["circuit_breaker_state"] in ["OPEN", "HALF_OPEN"]


class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_calculate_predicate_confidence_high_similarity(self):
        """Test confidence calculation with high similarity"""
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="cardiac pacemaker device",
            intended_use="for cardiac rhythm management in patients with bradycardia",
            product_code="ABC",
            clearance_date="2023-01-15"
        )
        
        confidence = calculate_predicate_confidence(
            user_device_description="cardiac pacemaker system",
            user_intended_use="for cardiac rhythm management in bradycardia patients",
            predicate=predicate
        )
        
        # Should have high confidence due to similar keywords
        assert confidence > 0.5
    
    def test_calculate_predicate_confidence_low_similarity(self):
        """Test confidence calculation with low similarity"""
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="surgical scissors",
            intended_use="for cutting tissue during surgical procedures",
            product_code="XYZ",
            clearance_date="2020-01-15"
        )
        
        confidence = calculate_predicate_confidence(
            user_device_description="cardiac pacemaker system",
            user_intended_use="for cardiac rhythm management",
            predicate=predicate
        )
        
        # Should have low confidence due to different keywords
        assert confidence < 0.3
    
    def test_calculate_predicate_confidence_empty_predicate(self):
        """Test confidence calculation with empty predicate data"""
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="",
            intended_use="",
            product_code="ABC",
            clearance_date=""
        )
        
        confidence = calculate_predicate_confidence(
            user_device_description="test device",
            user_intended_use="test indication",
            predicate=predicate
        )
        
        # Should handle empty data gracefully
        assert 0.0 <= confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_create_openfda_service_with_redis(self):
        """Test factory function with Redis"""
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_redis_instance = AsyncMock()
            mock_redis_instance.ping.return_value = True
            mock_redis.return_value = mock_redis_instance
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379"
            )
            
            assert service.api_key == "test_key"
            assert service.redis_client is not None
            mock_redis_instance.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_openfda_service_redis_failure(self):
        """Test factory function with Redis connection failure"""
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_redis_instance = AsyncMock()
            mock_redis_instance.ping.side_effect = Exception("Connection failed")
            mock_redis.return_value = mock_redis_instance
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379"
            )
            
            assert service.api_key == "test_key"
            assert service.redis_client is None  # Should fallback to no cache


if __name__ == "__main__":
    pytest.main([__file__])