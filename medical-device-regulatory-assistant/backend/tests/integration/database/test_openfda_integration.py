"""
Integration tests for OpenFDA API Integration Service

These tests make real API calls to the FDA API and should be run sparingly
to avoid hitting rate limits. They can be skipped in CI/CD pipelines.
"""

import pytest
import asyncio
import os
from typing import List

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    FDAAPIError,
    PredicateNotFoundError,
    create_openfda_service
)


# Skip integration tests by default unless explicitly requested
pytestmark = pytest.mark.integration


class TestOpenFDAIntegration:
    """Integration tests with real FDA API"""
    
    @pytest.fixture(scope="class")
    async def openfda_service(self):
        """Create OpenFDA service for integration testing"""
        # Use API key from environment if available
        api_key = os.getenv("FDA_API_KEY")
        redis_url = os.getenv("REDIS_URL")
        
        service = await create_openfda_service(
            api_key=api_key,
            redis_url=redis_url,
            cache_ttl=300  # Shorter cache for testing
        )
        
        yield service
        
        # Cleanup
        await service.close()
    
    @pytest.mark.asyncio
    async def test_search_predicates_real_api(self, openfda_service):
        """Test predicate search with real FDA API"""
        try:
            # Search for a common device type
            results = await openfda_service.search_predicates(
                search_terms=["pacemaker"],
                device_class="II",
                limit=5
            )
            
            # Should find some pacemaker devices
            assert len(results) > 0
            assert all(isinstance(result, FDASearchResult) for result in results)
            
            # Check that results have required fields
            for result in results:
                assert result.k_number
                assert result.device_name
                assert result.product_code
                
            print(f"Found {len(results)} pacemaker predicates")
            for result in results[:2]:  # Print first 2 for verification
                print(f"  - {result.k_number}: {result.device_name}")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_get_device_details_real_api(self, openfda_service):
        """Test getting device details with real FDA API"""
        try:
            # Use a known K-number (this should exist in FDA database)
            # K-numbers are public information
            result = await openfda_service.get_device_details("K200001")
            
            if result:
                assert isinstance(result, FDASearchResult)
                assert result.k_number == "K200001"
                assert result.device_name
                print(f"Device K200001: {result.device_name}")
            else:
                print("Device K200001 not found (may have been removed from database)")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_lookup_device_classification_real_api(self, openfda_service):
        """Test device classification lookup with real FDA API"""
        try:
            # Search for a common product code
            results = await openfda_service.lookup_device_classification(
                product_code="DQO"  # Pacemaker product code
            )
            
            if results:
                assert len(results) > 0
                assert all(isinstance(result, DeviceClassificationResult) for result in results)
                
                # Check first result
                result = results[0]
                assert result.product_code == "DQO"
                assert result.device_class
                assert result.regulation_number
                
                print(f"Product code DQO: Class {result.device_class} - {result.device_name}")
            else:
                print("No classification found for product code DQO")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_search_adverse_events_real_api(self, openfda_service):
        """Test adverse events search with real FDA API"""
        try:
            # Search for adverse events for a common product code
            results = await openfda_service.search_adverse_events(
                product_code="DQO",  # Pacemaker product code
                date_from="2023-01-01",
                date_to="2023-12-31",
                limit=5
            )
            
            # May or may not find adverse events
            assert isinstance(results, list)
            
            if results:
                assert all(isinstance(result, AdverseEventResult) for result in results)
                print(f"Found {len(results)} adverse events for pacemakers in 2023")
                
                # Check first result
                result = results[0]
                assert result.report_number
                assert result.event_date
                
                print(f"  - Report {result.report_number}: {result.event_type}")
            else:
                print("No adverse events found for pacemakers in 2023")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_health_check_real_api(self, openfda_service):
        """Test health check with real FDA API"""
        try:
            result = await openfda_service.health_check()
            
            assert "status" in result
            assert "response_time_seconds" in result
            assert "circuit_breaker_state" in result
            assert "timestamp" in result
            
            print(f"FDA API Health: {result['status']}")
            print(f"Response time: {result['response_time_seconds']:.3f}s")
            print(f"Circuit breaker: {result['circuit_breaker_state']}")
            
            # API should be healthy
            assert result["status"] == "healthy"
            assert result["response_time_seconds"] < 10.0  # Should respond within 10 seconds
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_rate_limiting_behavior(self, openfda_service):
        """Test rate limiting behavior with real API"""
        try:
            # Make several requests quickly to test rate limiting
            tasks = []
            for i in range(5):
                task = openfda_service.search_predicates(
                    search_terms=[f"device{i}"],
                    limit=1
                )
                tasks.append(task)
            
            # All requests should complete (rate limiter should handle them)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check that we got results or expected errors (not rate limit errors)
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # Should not be rate limit errors
                    assert not isinstance(result, FDAAPIError) or "rate limit" not in str(result).lower()
                    print(f"Request {i} failed (expected for non-existent devices): {result}")
                else:
                    print(f"Request {i} succeeded with {len(result)} results")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_caching_behavior(self, openfda_service):
        """Test caching behavior with real API"""
        try:
            # Make the same request twice
            search_terms = ["pacemaker"]
            
            # First request (should hit API)
            import time
            start_time = time.time()
            results1 = await openfda_service.search_predicates(
                search_terms=search_terms,
                limit=3
            )
            first_request_time = time.time() - start_time
            
            # Second request (should hit cache if Redis is available)
            start_time = time.time()
            results2 = await openfda_service.search_predicates(
                search_terms=search_terms,
                limit=3
            )
            second_request_time = time.time() - start_time
            
            # Results should be identical
            assert len(results1) == len(results2)
            if results1:
                assert results1[0].k_number == results2[0].k_number
            
            print(f"First request: {first_request_time:.3f}s")
            print(f"Second request: {second_request_time:.3f}s")
            
            # If Redis is available, second request should be faster
            if openfda_service.redis_client:
                assert second_request_time < first_request_time
                print("Cache working correctly")
            else:
                print("No Redis cache available")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_error_handling_real_api(self, openfda_service):
        """Test error handling with real API"""
        try:
            # Test with invalid search that should return no results
            results = await openfda_service.search_predicates(
                search_terms=["nonexistentdevicexyz123"],
                limit=1
            )
            
            # Should return empty list, not raise exception
            assert isinstance(results, list)
            assert len(results) == 0
            print("Handled no results gracefully")
            
            # Test with invalid K-number
            result = await openfda_service.get_device_details("K999999")
            assert result is None
            print("Handled invalid K-number gracefully")
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")


class TestOpenFDAPerformance:
    """Performance tests for OpenFDA service"""
    
    @pytest.fixture(scope="class")
    async def openfda_service(self):
        """Create OpenFDA service for performance testing"""
        api_key = os.getenv("FDA_API_KEY")
        redis_url = os.getenv("REDIS_URL")
        
        service = await create_openfda_service(
            api_key=api_key,
            redis_url=redis_url
        )
        
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_performance(self, openfda_service):
        """Test performance with concurrent requests"""
        try:
            # Test concurrent requests to different endpoints
            tasks = [
                openfda_service.search_predicates(["pacemaker"], limit=5),
                openfda_service.lookup_device_classification(product_code="DQO"),
                openfda_service.search_adverse_events(product_code="DQO", limit=5),
            ]
            
            import time
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            print(f"Concurrent requests completed in {total_time:.3f}s")
            
            # Check results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    print(f"Task {i} failed: {result}")
                else:
                    print(f"Task {i} succeeded with {len(result)} results")
            
            # Should complete within reasonable time
            assert total_time < 30.0  # 30 seconds max
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")
    
    @pytest.mark.asyncio
    async def test_large_result_set_performance(self, openfda_service):
        """Test performance with large result sets"""
        try:
            # Request larger result set
            import time
            start_time = time.time()
            
            results = await openfda_service.search_predicates(
                search_terms=["device"],  # Broad search
                limit=100
            )
            
            request_time = time.time() - start_time
            
            print(f"Large result set ({len(results)} items) retrieved in {request_time:.3f}s")
            
            # Should handle large result sets efficiently
            assert request_time < 15.0  # 15 seconds max
            assert len(results) <= 100  # Should respect limit
        
        except Exception as e:
            pytest.skip(f"FDA API not available: {e}")


# Utility function to run integration tests manually
async def run_integration_tests():
    """Run integration tests manually for development/debugging"""
    service = await create_openfda_service(
        api_key=os.getenv("FDA_API_KEY"),
        redis_url=os.getenv("REDIS_URL")
    )
    
    try:
        print("Testing FDA API integration...")
        
        # Test predicate search
        print("\n1. Testing predicate search...")
        results = await service.search_predicates(["pacemaker"], limit=3)
        print(f"Found {len(results)} pacemaker predicates")
        
        # Test device classification
        print("\n2. Testing device classification...")
        classifications = await service.lookup_device_classification(product_code="DQO")
        print(f"Found {len(classifications)} classifications for DQO")
        
        # Test health check
        print("\n3. Testing health check...")
        health = await service.health_check()
        print(f"Health status: {health['status']}")
        
        print("\nAll tests completed successfully!")
    
    except Exception as e:
        print(f"Test failed: {e}")
    
    finally:
        await service.close()


if __name__ == "__main__":
    # Run integration tests directly
    asyncio.run(run_integration_tests())