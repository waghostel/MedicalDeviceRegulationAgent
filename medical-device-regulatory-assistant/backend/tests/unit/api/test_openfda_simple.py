"""
Simple integration tests for OpenFDA service functionality
"""

import pytest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    calculate_predicate_confidence
)


class TestOpenFDASimple:
    """Simple tests for OpenFDA service"""
    
    @pytest.fixture
    def openfda_service(self):
        """Create OpenFDA service for testing"""
        return OpenFDAService(
            api_key="test_key",
            redis_client=None,
            cache_ttl=300
        )
    
    @pytest.mark.asyncio
    async def test_predicate_search_with_mock(self, openfda_service):
        """Test predicate search with mocked response"""
        # Mock response data
        mock_data = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "k_number": "K123456",
                    "device_name": "Test Pacemaker",
                    "statement_or_summary": "Cardiac rhythm management device",
                    "product_code": "DQO",
                    "date_received": "2023-01-15",
                    "applicant": "Test Company"
                }
            ]
        }
        
        # Mock the _make_request method
        async def mock_make_request(endpoint, params=None, use_cache=True):
            return mock_data
        
        openfda_service._make_request = mock_make_request
        
        # Test the search
        results = await openfda_service.search_predicates(
            search_terms=["pacemaker"],
            product_code="DQO"
        )
        
        assert len(results) == 1
        result = results[0]
        assert isinstance(result, FDASearchResult)
        assert result.k_number == "K123456"
        assert result.device_name == "Test Pacemaker"
        assert result.product_code == "DQO"
        
        print(f"✓ Predicate search test passed: Found {result.k_number}")
    
    @pytest.mark.asyncio
    async def test_device_classification_with_mock(self, openfda_service):
        """Test device classification with mocked response"""
        # Mock response data
        mock_data = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "product_code": "DQO",
                    "device_name": "Pacemaker",
                    "device_class": "2",
                    "regulation_number": "21 CFR 870.3610",
                    "medical_specialty_description": "Cardiovascular",
                    "device_class_description": "Class II Medical Device"
                }
            ]
        }
        
        # Mock the _make_request method
        async def mock_make_request(endpoint, params=None, use_cache=True):
            return mock_data
        
        openfda_service._make_request = mock_make_request
        
        # Test the classification
        results = await openfda_service.lookup_device_classification(
            product_code="DQO"
        )
        
        assert len(results) == 1
        result = results[0]
        assert isinstance(result, DeviceClassificationResult)
        assert result.product_code == "DQO"
        assert result.device_class == "2"
        assert result.regulation_number == "21 CFR 870.3610"
        
        print(f"✓ Classification test passed: {result.product_code} is Class {result.device_class}")
    
    @pytest.mark.asyncio
    async def test_adverse_events_with_mock(self, openfda_service):
        """Test adverse events search with mocked response"""
        # Mock response data
        mock_data = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "report_number": "12345678",
                    "date_received": "20230315",
                    "event_type": "Malfunction",
                    "device": [
                        {
                            "generic_name": "Pacemaker",
                            "manufacturer_d_name": "Test Manufacturer",
                            "product_code": "DQO",
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
        
        # Mock the _make_request method
        async def mock_make_request(endpoint, params=None, use_cache=True):
            return mock_data
        
        openfda_service._make_request = mock_make_request
        
        # Test the adverse events search
        results = await openfda_service.search_adverse_events(
            product_code="DQO",
            limit=10
        )
        
        assert len(results) == 1
        result = results[0]
        assert isinstance(result, AdverseEventResult)
        assert result.report_number == "12345678"
        assert result.device_name == "Pacemaker"
        assert result.event_type == "Malfunction"
        
        print(f"✓ Adverse events test passed: Found report {result.report_number}")
    
    def test_confidence_calculation(self):
        """Test predicate confidence calculation"""
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="cardiac pacemaker system",
            intended_use="for cardiac rhythm management in patients with bradycardia",
            product_code="DQO",
            clearance_date="2023-01-15"
        )
        
        # Test high similarity
        confidence = calculate_predicate_confidence(
            user_device_description="cardiac pacemaker device",
            user_intended_use="cardiac rhythm management for bradycardia patients",
            predicate=predicate
        )
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Should be high due to similar keywords
        
        print(f"✓ Confidence calculation test passed: {confidence:.2f}")
    
    def test_service_initialization(self, openfda_service):
        """Test service initialization and basic properties"""
        assert openfda_service.api_key == "test_key"
        assert openfda_service.base_url == "https://api.fda.gov"
        assert openfda_service.cache_ttl == 300
        assert openfda_service.circuit_breaker.state == "CLOSED"
        assert len(openfda_service.rate_limiter.requests) == 0
        
        print("✓ Service initialization test passed")
    
    @pytest.mark.asyncio
    async def test_cache_key_generation(self, openfda_service):
        """Test cache key generation"""
        key1 = openfda_service._generate_cache_key("test", {"param": "value"})
        key2 = openfda_service._generate_cache_key("test", {"param": "value"})
        key3 = openfda_service._generate_cache_key("test", {"param": "different"})
        
        assert key1 == key2  # Same params should generate same key
        assert key1 != key3  # Different params should generate different keys
        assert key1.startswith("openfda:")
        
        print("✓ Cache key generation test passed")
    
    @pytest.mark.asyncio
    async def test_error_handling(self, openfda_service):
        """Test error handling"""
        # Mock the _make_request method to raise an exception
        async def mock_make_request_error(endpoint, params=None, use_cache=True):
            raise Exception("Test error")
        
        openfda_service._make_request = mock_make_request_error
        
        # Test that errors are properly handled
        try:
            await openfda_service.search_predicates(["test"])
            assert False, "Should have raised an exception"
        except Exception as e:
            assert "Failed to search predicates" in str(e)
        
        print("✓ Error handling test passed")


if __name__ == "__main__":
    # Run simple tests
    pytest.main([__file__, "-v"])