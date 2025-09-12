"""
Integration tests for OpenFDA API Integration Service

These tests use proper mocking to avoid external API calls while testing
the service integration patterns and error handling.
"""

import pytest
import asyncio
import os
from typing import List, Dict, Any
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

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


class TestOpenFDAServiceIntegration:
    """Integration tests for OpenFDA service with proper mocking"""
    
    @pytest.fixture
    def mock_openfda_service(self):
        """Create proper mock OpenFDA service instance for testing"""
        service = OpenFDAService(api_key="test_key")
        
        # Mock the _make_request method to return test data
        with patch.object(service, '_make_request') as mock_request:
            # Default successful response
            mock_request.return_value = {
                "results": [
                    {
                        "k_number": "K123456",
                        "device_name": "Test Device",
                        "statement_or_summary": "Test intended use",
                        "product_code": "ABC",
                        "date_received": "2023-01-01",
                        "applicant": "Test Company",
                        "contact": "Test Contact",
                        "decision_description": "Substantially Equivalent"
                    }
                ]
            }
            yield service
    
    @pytest.fixture
    def mock_openfda_service_empty(self):
        """Create mock OpenFDA service that returns empty results"""
        service = OpenFDAService(api_key="test_key")
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.return_value = {
                "results": []
            }
            yield service
    
    @pytest.fixture
    def mock_openfda_service_error(self):
        """Create mock OpenFDA service that raises errors"""
        service = OpenFDAService(api_key="test_key")
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = FDAAPIError("Test API error")
            yield service
    
    @pytest.mark.asyncio
    async def test_search_predicates_success(self, mock_openfda_service):
        """Test successful predicate search with proper service instance"""
        results = await mock_openfda_service.search_predicates(
            search_terms=["test device"],
            product_code="ABC",
            limit=10
        )
        
        assert len(results) > 0
        assert isinstance(results[0], FDASearchResult)
        assert results[0].k_number == "K123456"
        assert results[0].device_name == "Test Device"
        assert results[0].product_code == "ABC"
    
    @pytest.mark.asyncio
    async def test_search_predicates_empty_results(self, mock_openfda_service_empty):
        """Test predicate search with no results"""
        results = await mock_openfda_service_empty.search_predicates(
            search_terms=["nonexistent device"]
        )
        
        assert isinstance(results, list)
        assert len(results) == 0
    
    @pytest.mark.asyncio
    async def test_search_predicates_api_error(self, mock_openfda_service_error):
        """Test predicate search with API error"""
        with pytest.raises(FDAAPIError, match="Test API error"):
            await mock_openfda_service_error.search_predicates(
                search_terms=["test device"]
            )
    
    @pytest.mark.asyncio
    async def test_get_device_details_success(self, mock_openfda_service):
        """Test successful device details retrieval"""
        result = await mock_openfda_service.get_device_details("K123456")
        
        assert result is not None
        assert isinstance(result, FDASearchResult)
        assert result.k_number == "K123456"
        assert result.device_name == "Test Device"
    
    @pytest.mark.asyncio
    async def test_get_device_details_not_found(self, mock_openfda_service_empty):
        """Test device details retrieval when device not found"""
        result = await mock_openfda_service_empty.get_device_details("K999999")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_lookup_device_classification_success(self, mock_openfda_service):
        """Test successful device classification lookup"""
        # Mock classification response
        with patch.object(mock_openfda_service, '_make_request') as mock_request:
            mock_request.return_value = {
                "results": [
                    {
                        "product_code": "ABC",
                        "device_name": "Test Device",
                        "device_class": "2",
                        "regulation_number": "21 CFR 123.456",
                        "medical_specialty_description": "General Hospital",
                        "device_class_description": "Class II Medical Device"
                    }
                ]
            }
            
            results = await mock_openfda_service.lookup_device_classification(
                product_code="ABC"
            )
            
            assert len(results) > 0
            assert isinstance(results[0], DeviceClassificationResult)
            assert results[0].product_code == "ABC"
            assert results[0].device_class == "2"
    
    @pytest.mark.asyncio
    async def test_search_adverse_events_success(self, mock_openfda_service):
        """Test successful adverse events search"""
        # Mock adverse events response
        with patch.object(mock_openfda_service, '_make_request') as mock_request:
            mock_request.return_value = {
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
            
            results = await mock_openfda_service.search_adverse_events(
                product_code="ABC",
                date_from="2023-01-01",
                date_to="2023-12-31"
            )
            
            assert len(results) > 0
            assert isinstance(results[0], AdverseEventResult)
            assert results[0].report_number == "12345"
            assert results[0].device_name == "Test Device"
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, mock_openfda_service):
        """Test successful health check"""
        # Mock health check response
        with patch.object(mock_openfda_service, '_make_request') as mock_request:
            mock_request.return_value = {"results": []}
            
            result = await mock_openfda_service.health_check()
            
            assert result["status"] == "healthy"
            assert "response_time_seconds" in result
            assert "circuit_breaker_state" in result
            assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, mock_openfda_service_error):
        """Test health check failure"""
        result = await mock_openfda_service_error.health_check()
        
        assert result["status"] == "unhealthy"
        assert "error" in result
        assert "circuit_breaker_state" in result
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_service_methods_exist(self, mock_openfda_service):
        """Test that all expected service methods exist and are callable"""
        # Verify that the service has all expected methods
        assert hasattr(mock_openfda_service, 'search_predicates')
        assert callable(mock_openfda_service.search_predicates)
        
        assert hasattr(mock_openfda_service, 'get_device_details')
        assert callable(mock_openfda_service.get_device_details)
        
        assert hasattr(mock_openfda_service, 'lookup_device_classification')
        assert callable(mock_openfda_service.lookup_device_classification)
        
        assert hasattr(mock_openfda_service, 'search_adverse_events')
        assert callable(mock_openfda_service.search_adverse_events)
        
        assert hasattr(mock_openfda_service, 'health_check')
        assert callable(mock_openfda_service.health_check)
    
    @pytest.mark.asyncio
    async def test_service_instantiation_pattern(self):
        """Test that service instantiation returns proper service objects"""
        # Test direct instantiation
        service = OpenFDAService(api_key="test_key")
        assert isinstance(service, OpenFDAService)
        assert service.api_key == "test_key"
        
        # Test factory function
        with patch('redis.asyncio.from_url') as mock_redis:
            mock_redis_instance = AsyncMock()
            mock_redis_instance.ping.return_value = True
            mock_redis.return_value = mock_redis_instance
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379"
            )
            
            assert isinstance(service, OpenFDAService)
            assert service.api_key == "test_key"
            assert service.redis_client is not None
    
    @pytest.mark.asyncio
    async def test_service_error_handling(self, mock_openfda_service):
        """Test proper error handling for service unavailability scenarios"""
        # Test PredicateNotFoundError handling
        with patch.object(mock_openfda_service, '_make_request') as mock_request:
            mock_request.side_effect = PredicateNotFoundError("No predicates found")
            
            results = await mock_openfda_service.search_predicates(
                search_terms=["nonexistent"]
            )
            assert results == []
        
        # Test general FDAAPIError handling
        with patch.object(mock_openfda_service, '_make_request') as mock_request:
            mock_request.side_effect = FDAAPIError("Service unavailable")
            
            with pytest.raises(FDAAPIError, match="Service unavailable"):
                await mock_openfda_service.search_predicates(
                    search_terms=["test"]
                )
    
    @pytest.mark.asyncio
    async def test_concurrent_service_calls(self, mock_openfda_service):
        """Test concurrent service method calls"""
        # Test that multiple concurrent calls work properly
        tasks = [
            mock_openfda_service.search_predicates(["device1"]),
            mock_openfda_service.search_predicates(["device2"]),
            mock_openfda_service.get_device_details("K123456")
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All calls should succeed
        for result in results:
            assert not isinstance(result, Exception)
        
        # First two should be lists, third should be FDASearchResult
        assert isinstance(results[0], list)
        assert isinstance(results[1], list)
        assert isinstance(results[2], FDASearchResult)


class TestOpenFDAServiceConfiguration:
    """Test OpenFDA service configuration and setup"""
    
    @pytest.mark.asyncio
    async def test_service_with_redis_configuration(self):
        """Test service configuration with Redis client"""
        mock_redis = AsyncMock()
        mock_redis.ping.return_value = True
        
        service = OpenFDAService(
            api_key="test_key",
            redis_client=mock_redis,
            cache_ttl=1800,
            max_retries=2,
            timeout=20
        )
        
        assert service.api_key == "test_key"
        assert service.redis_client == mock_redis
        assert service.cache_ttl == 1800
        assert service.max_retries == 2
        assert service.timeout == 20
    
    @pytest.mark.asyncio
    async def test_service_without_redis_configuration(self):
        """Test service configuration without Redis client"""
        service = OpenFDAService(api_key="test_key")
        
        assert service.api_key == "test_key"
        assert service.redis_client is None
        assert service.cache_ttl == 3600  # Default value
        assert service.max_retries == 3   # Default value
        assert service.timeout == 30      # Default value
    
    @pytest.mark.asyncio
    async def test_service_factory_with_redis_success(self):
        """Test service factory with successful Redis connection"""
        with patch('redis.asyncio.from_url') as mock_redis_factory:
            mock_redis = AsyncMock()
            mock_redis.ping.return_value = True
            mock_redis_factory.return_value = mock_redis
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379",
                cache_ttl=1800
            )
            
            assert service.api_key == "test_key"
            assert service.redis_client == mock_redis
            assert service.cache_ttl == 1800
            mock_redis.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_service_factory_with_redis_failure(self):
        """Test service factory with Redis connection failure"""
        with patch('redis.asyncio.from_url') as mock_redis_factory:
            mock_redis = AsyncMock()
            mock_redis.ping.side_effect = Exception("Connection failed")
            mock_redis_factory.return_value = mock_redis
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379"
            )
            
            assert service.api_key == "test_key"
            assert service.redis_client is None  # Should fallback to no cache
    
    @pytest.mark.asyncio
    async def test_service_cleanup(self):
        """Test service cleanup and resource management"""
        mock_redis = AsyncMock()
        service = OpenFDAService(redis_client=mock_redis)
        
        await service.close()
        mock_redis.close.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])