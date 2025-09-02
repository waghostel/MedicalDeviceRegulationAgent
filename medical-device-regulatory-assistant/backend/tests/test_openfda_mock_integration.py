"""
Mock integration tests for OpenFDA service to verify end-to-end functionality
without making real API calls
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    create_openfda_service,
    calculate_predicate_confidence
)


class TestOpenFDAMockIntegration:
    """Mock integration tests for complete workflows"""
    
    @pytest.fixture
    def openfda_service(self):
        """Create OpenFDA service for mock integration testing"""
        return OpenFDAService(
            api_key="test_key",
            redis_client=None,  # No Redis for simplicity
            cache_ttl=300
        )
    
    @pytest.mark.asyncio
    async def test_complete_predicate_search_workflow(self, openfda_service):
        """Test complete predicate search workflow with mock API"""
        # Mock FDA API response
        mock_response_data = {
            "meta": {"results": {"total": 2}},
            "results": [
                {
                    "k_number": "K123456",
                    "device_name": "Cardiac Pacemaker System",
                    "statement_or_summary": "This device is intended for cardiac rhythm management in patients with bradycardia and other arrhythmias.",
                    "product_code": "DQO",
                    "date_received": "2023-01-15",
                    "applicant": "CardioTech Inc.",
                    "contact": "Dr. Smith",
                    "decision_description": "Substantially Equivalent"
                },
                {
                    "k_number": "K789012",
                    "device_name": "Advanced Pacemaker Device",
                    "statement_or_summary": "Intended for cardiac pacing therapy in patients with heart rhythm disorders.",
                    "product_code": "DQO",
                    "date_received": "2022-06-20",
                    "applicant": "HeartTech Corp.",
                    "contact": "Dr. Johnson",
                    "decision_description": "Substantially Equivalent"
                }
            ]
        }
        
        # Mock the _make_request method directly
        async def mock_make_request(endpoint, params=None, use_cache=True):
            return mock_response_data
        
        openfda_service._make_request = mock_make_request
        
        # Execute predicate search
        results = await openfda_service.search_predicates(
            search_terms=["cardiac pacemaker"],
            product_code="DQO",
            device_class="II",
            limit=10
        )
        
        # Verify results
        assert len(results) == 2
        assert all(isinstance(result, FDASearchResult) for result in results)
        
        # Check first result
        result1 = results[0]
        assert result1.k_number == "K123456"
        assert result1.device_name == "Cardiac Pacemaker System"
        assert result1.product_code == "DQO"
        assert "cardiac rhythm management" in result1.intended_use.lower()
        
        # Check second result
        result2 = results[1]
        assert result2.k_number == "K789012"
        assert result2.device_name == "Advanced Pacemaker Device"
        
        # Calculate confidence scores
        user_description = "cardiac pacemaker system for arrhythmia treatment"
        user_intended_use = "cardiac rhythm management in bradycardia patients"
        
        confidence1 = calculate_predicate_confidence(user_description, user_intended_use, result1)
        confidence2 = calculate_predicate_confidence(user_description, user_intended_use, result2)
        
        # Both should have reasonable confidence scores
        assert 0.0 <= confidence1 <= 1.0
        assert 0.0 <= confidence2 <= 1.0
        
        # First result should have higher confidence due to better keyword match
        assert confidence1 > 0.5  # Should be high due to similar keywords
        
        print(f"Predicate search completed successfully:")
        print(f"  - Found {len(results)} predicates")
        print(f"  - {result1.k_number}: {confidence1:.2f} confidence")
        print(f"  - {result2.k_number}: {confidence2:.2f} confidence")
    
    @pytest.mark.asyncio
    async def test_device_classification_workflow(self, openfda_service):
        """Test device classification workflow with mock API"""
        # Mock classification API response
        mock_response_data = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "product_code": "DQO",
                    "device_name": "Pacemaker",
                    "device_class": "2",
                    "regulation_number": "21 CFR 870.3610",
                    "medical_specialty_description": "Cardiovascular",
                    "device_class_description": "Class II Medical Device Subject to Premarket Notification"
                }
            ]
        }
        
        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute classification lookup
        results = await openfda_service.lookup_device_classification(
            product_code="DQO"
        )
        
        # Verify results
        assert len(results) == 1
        result = results[0]
        assert isinstance(result, DeviceClassificationResult)
        assert result.product_code == "DQO"
        assert result.device_class == "2"
        assert result.regulation_number == "21 CFR 870.3610"
        assert "cardiovascular" in result.medical_specialty_description.lower()
        
        print(f"Device classification completed successfully:")
        print(f"  - Product Code: {result.product_code}")
        print(f"  - Device Class: {result.device_class}")
        print(f"  - Regulation: {result.regulation_number}")
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_adverse_events_monitoring_workflow(self, mock_client, openfda_service):
        """Test adverse events monitoring workflow with mock API"""
        # Mock adverse events API response
        mock_response_data = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "report_number": "12345678",
                    "date_received": "20230315",
                    "event_type": "Malfunction",
                    "device": [
                        {
                            "generic_name": "Pacemaker",
                            "manufacturer_d_name": "CardioTech Inc.",
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
        
        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute adverse events search
        results = await openfda_service.search_adverse_events(
            product_code="DQO",
            date_from="2023-01-01",
            date_to="2023-12-31",
            limit=10
        )
        
        # Verify results
        assert len(results) == 1
        result = results[0]
        assert isinstance(result, AdverseEventResult)
        assert result.report_number == "12345678"
        assert result.device_name == "Pacemaker"
        assert result.manufacturer_name == "CardioTech Inc."
        assert result.event_type == "Malfunction"
        
        print(f"Adverse events monitoring completed successfully:")
        print(f"  - Found {len(results)} adverse events")
        print(f"  - Report: {result.report_number}")
        print(f"  - Event Type: {result.event_type}")
        print(f"  - Outcome: {result.patient_outcome}")
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_complete_regulatory_workflow(self, mock_client, openfda_service):
        """Test complete regulatory workflow: classification -> predicate search -> adverse events"""
        
        # Step 1: Device Classification
        classification_response = {
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
        
        # Step 2: Predicate Search
        predicate_response = {
            "meta": {"results": {"total": 1}},
            "results": [
                {
                    "k_number": "K123456",
                    "device_name": "Similar Pacemaker",
                    "statement_or_summary": "Cardiac rhythm management device",
                    "product_code": "DQO",
                    "date_received": "2023-01-15",
                    "applicant": "Test Company"
                }
            ]
        }
        
        # Step 3: Adverse Events
        adverse_events_response = {
            "meta": {"results": {"total": 0}},
            "results": []
        }
        
        # Mock HTTP responses in sequence
        mock_responses = [
            (200, classification_response),
            (200, predicate_response),
            (200, adverse_events_response)
        ]
        
        response_iter = iter(mock_responses)
        
        def mock_get(*args, **kwargs):
            status_code, data = next(response_iter)
            mock_response = AsyncMock()
            mock_response.status_code = status_code
            mock_response.json.return_value = data
            return mock_response
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.side_effect = mock_get
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Execute complete workflow
        print("Starting complete regulatory workflow...")
        
        # Step 1: Classify device
        classifications = await openfda_service.lookup_device_classification(
            device_name="cardiac pacemaker"
        )
        assert len(classifications) == 1
        classification = classifications[0]
        print(f"1. Classification: {classification.device_class} - {classification.product_code}")
        
        # Step 2: Search predicates using product code
        predicates = await openfda_service.search_predicates(
            search_terms=["pacemaker"],
            product_code=classification.product_code
        )
        assert len(predicates) == 1
        predicate = predicates[0]
        print(f"2. Found predicate: {predicate.k_number} - {predicate.device_name}")
        
        # Step 3: Check adverse events for product code
        adverse_events = await openfda_service.search_adverse_events(
            product_code=classification.product_code,
            date_from="2023-01-01",
            date_to="2023-12-31"
        )
        print(f"3. Adverse events: {len(adverse_events)} found")
        
        print("Complete regulatory workflow executed successfully!")
    
    @pytest.mark.asyncio
    async def test_service_health_and_resilience(self, openfda_service):
        """Test service health check and resilience features"""
        # Test circuit breaker state
        assert openfda_service.circuit_breaker.state == "CLOSED"
        assert openfda_service.circuit_breaker.failure_count == 0
        
        # Test rate limiter
        assert len(openfda_service.rate_limiter.requests) == 0
        
        # Test cache key generation
        key1 = openfda_service._generate_cache_key("test", {"param": "value"})
        key2 = openfda_service._generate_cache_key("test", {"param": "value"})
        assert key1 == key2
        assert key1.startswith("openfda:")
        
        print("Service health and resilience features verified successfully!")


if __name__ == "__main__":
    # Run mock integration tests
    pytest.main([__file__, "-v"])