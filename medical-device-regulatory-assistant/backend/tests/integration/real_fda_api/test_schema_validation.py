"""
FDA API Response Schema Validation Tests

This module contains tests that validate the schema and data integrity of responses
from the real FDA API. It ensures that the API responses match expected formats
and contain valid data structures.
"""

import pytest
import pytest_asyncio
from typing import Dict, Any, List
from datetime import datetime
import re

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    create_production_openfda_service
)


pytestmark = pytest.mark.real_api


class TestFDAAPISchemaValidation:
    """Test schema validation for FDA API responses"""
    
    @pytest_asyncio.fixture(scope="class")
    async def schema_validation_service(self):
        """Create service for schema validation testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_predicate_search_response_schema(self, schema_validation_service):
        """Test schema validation for predicate search responses"""
        # Search for devices that should return results
        results = await schema_validation_service.search_predicates(
            search_terms=["pacemaker"],
            device_class="II",
            limit=5
        )
        
        assert isinstance(results, list), "Results should be a list"
        
        if results:  # If we have results, validate their schema
            for result in results:
                self._validate_fda_search_result_schema(result)
    
    @pytest.mark.asyncio
    async def test_device_classification_response_schema(self, schema_validation_service):
        """Test schema validation for device classification responses"""
        # Use a known product code
        results = await schema_validation_service.lookup_device_classification(
            product_code="DQO"  # Pacemaker product code
        )
        
        assert isinstance(results, list), "Results should be a list"
        
        if results:  # If we have results, validate their schema
            for result in results:
                self._validate_device_classification_schema(result)
    
    @pytest.mark.asyncio
    async def test_adverse_events_response_schema(self, schema_validation_service):
        """Test schema validation for adverse events responses"""
        # Search for adverse events
        results = await schema_validation_service.search_adverse_events(
            product_code="DQO",
            limit=3
        )
        
        assert isinstance(results, list), "Results should be a list"
        
        if results:  # If we have results, validate their schema
            for result in results:
                self._validate_adverse_event_schema(result)
    
    @pytest.mark.asyncio
    async def test_device_details_response_schema(self, schema_validation_service):
        """Test schema validation for device details responses"""
        # First get a valid K-number from a search
        search_results = await schema_validation_service.search_predicates(
            search_terms=["pacemaker"],
            limit=1
        )
        
        if search_results:
            k_number = search_results[0].k_number
            
            # Get device details
            result = await schema_validation_service.get_device_details(k_number)
            
            if result:  # If device exists
                self._validate_fda_search_result_schema(result)
    
    def _validate_fda_search_result_schema(self, result: FDASearchResult):
        """Validate FDA search result schema"""
        # Check type
        assert isinstance(result, FDASearchResult), "Result should be FDASearchResult instance"
        
        # Check required fields
        assert result.k_number, "K-number should not be empty"
        assert result.device_name, "Device name should not be empty"
        assert result.product_code, "Product code should not be empty"
        assert result.clearance_date, "Clearance date should not be empty"
        
        # Validate K-number format
        assert re.match(r'^K\d+$', result.k_number), f"K-number should match format K123456, got {result.k_number}"
        
        # Validate product code format (3 uppercase letters)
        assert re.match(r'^[A-Z]{3}$', result.product_code), f"Product code should be 3 uppercase letters, got {result.product_code}"
        
        # Validate clearance date format (should be a valid date string)
        assert len(result.clearance_date) >= 8, f"Clearance date should be valid format, got {result.clearance_date}"
        
        # Validate confidence score if present
        if hasattr(result, 'confidence_score') and result.confidence_score is not None:
            assert 0.0 <= result.confidence_score <= 1.0, f"Confidence score should be between 0 and 1, got {result.confidence_score}"
        
        # Validate optional fields are strings if present
        optional_string_fields = ['applicant', 'contact', 'decision_description', 'statement_or_summary']
        for field in optional_string_fields:
            value = getattr(result, field, None)
            if value is not None:
                assert isinstance(value, str), f"{field} should be string if present, got {type(value)}"
    
    def _validate_device_classification_schema(self, result: DeviceClassificationResult):
        """Validate device classification result schema"""
        # Check type
        assert isinstance(result, DeviceClassificationResult), "Result should be DeviceClassificationResult instance"
        
        # Check required fields
        assert result.device_class, "Device class should not be empty"
        assert result.product_code, "Product code should not be empty"
        assert result.device_name, "Device name should not be empty"
        assert result.regulation_number, "Regulation number should not be empty"
        
        # Validate device class
        assert result.device_class in ["I", "II", "III"], f"Device class should be I, II, or III, got {result.device_class}"
        
        # Validate product code format
        assert re.match(r'^[A-Z]{3}$', result.product_code), f"Product code should be 3 uppercase letters, got {result.product_code}"
        
        # Validate regulation number format (should contain numbers and dots)
        assert re.search(r'\d', result.regulation_number), f"Regulation number should contain digits, got {result.regulation_number}"
        
        # Validate confidence score if present
        if hasattr(result, 'confidence_score') and result.confidence_score is not None:
            assert 0.0 <= result.confidence_score <= 1.0, f"Confidence score should be between 0 and 1, got {result.confidence_score}"
        
        # Validate optional fields
        optional_string_fields = ['medical_specialty_description', 'device_class_description']
        for field in optional_string_fields:
            value = getattr(result, field, None)
            if value is not None:
                assert isinstance(value, str), f"{field} should be string if present, got {type(value)}"
    
    def _validate_adverse_event_schema(self, result: AdverseEventResult):
        """Validate adverse event result schema"""
        # Check type
        assert isinstance(result, AdverseEventResult), "Result should be AdverseEventResult instance"
        
        # Check required fields
        assert result.report_number, "Report number should not be empty"
        assert result.event_date, "Event date should not be empty"
        
        # Validate report number format (should be numeric or alphanumeric)
        assert re.match(r'^[A-Z0-9\-]+$', result.report_number), f"Report number should be alphanumeric, got {result.report_number}"
        
        # Validate event date format
        assert len(result.event_date) >= 8, f"Event date should be valid format, got {result.event_date}"
        
        # Validate optional fields are strings if present
        optional_string_fields = ['device_name', 'manufacturer_name', 'event_type', 'patient_outcome', 'device_problem_flag']
        for field in optional_string_fields:
            value = getattr(result, field, None)
            if value is not None:
                assert isinstance(value, str), f"{field} should be string if present, got {type(value)}"


class TestFDAAPIDataIntegrity:
    """Test data integrity and consistency of FDA API responses"""
    
    @pytest_asyncio.fixture(scope="class")
    async def data_integrity_service(self):
        """Create service for data integrity testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_predicate_search_data_consistency(self, data_integrity_service):
        """Test data consistency in predicate search results"""
        # Search for the same device twice
        search_terms = ["cardiac pacemaker"]
        
        results1 = await data_integrity_service.search_predicates(
            search_terms=search_terms,
            device_class="II",
            limit=10
        )
        
        results2 = await data_integrity_service.search_predicates(
            search_terms=search_terms,
            device_class="II",
            limit=10
        )
        
        # Results should be consistent
        assert len(results1) == len(results2), "Search results should be consistent across calls"
        
        if results1 and results2:
            # Compare first few results
            for i in range(min(3, len(results1), len(results2))):
                assert results1[i].k_number == results2[i].k_number, "K-numbers should be consistent"
                assert results1[i].device_name == results2[i].device_name, "Device names should be consistent"
    
    @pytest.mark.asyncio
    async def test_device_classification_data_integrity(self, data_integrity_service):
        """Test data integrity in device classification results"""
        # Look up the same product code twice
        product_code = "DQO"
        
        results1 = await data_integrity_service.lookup_device_classification(
            product_code=product_code
        )
        
        results2 = await data_integrity_service.lookup_device_classification(
            product_code=product_code
        )
        
        # Results should be identical
        assert len(results1) == len(results2), "Classification results should be consistent"
        
        if results1 and results2:
            for i in range(len(results1)):
                assert results1[i].device_class == results2[i].device_class, "Device class should be consistent"
                assert results1[i].regulation_number == results2[i].regulation_number, "Regulation number should be consistent"
    
    @pytest.mark.asyncio
    async def test_cross_reference_data_integrity(self, data_integrity_service):
        """Test data integrity across different API endpoints"""
        # Get a device from predicate search
        search_results = await data_integrity_service.search_predicates(
            search_terms=["pacemaker"],
            limit=1
        )
        
        if search_results:
            device = search_results[0]
            
            # Get classification for the same product code
            classification_results = await data_integrity_service.lookup_device_classification(
                product_code=device.product_code
            )
            
            if classification_results:
                classification = classification_results[0]
                
                # Product codes should match
                assert device.product_code == classification.product_code, "Product codes should match across endpoints"
                
                # Device names should be related (may not be identical due to different data sources)
                assert device.device_name, "Device name from search should not be empty"
                assert classification.device_name, "Device name from classification should not be empty"
    
    @pytest.mark.asyncio
    async def test_date_format_consistency(self, data_integrity_service):
        """Test date format consistency across API responses"""
        # Get results from different endpoints
        search_results = await data_integrity_service.search_predicates(
            search_terms=["device"],
            limit=3
        )
        
        adverse_events = await data_integrity_service.search_adverse_events(
            product_code="DQO",
            limit=3
        )
        
        # Validate date formats are consistent
        date_formats = set()
        
        for result in search_results:
            if result.clearance_date:
                date_formats.add(self._detect_date_format(result.clearance_date))
        
        for event in adverse_events:
            if event.event_date:
                date_formats.add(self._detect_date_format(event.event_date))
        
        # Should have consistent date formats (allowing for some variation)
        assert len(date_formats) <= 2, f"Date formats should be consistent, found: {date_formats}"
    
    def _detect_date_format(self, date_string: str) -> str:
        """Detect the format of a date string"""
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_string):
            return "YYYY-MM-DD"
        elif re.match(r'^\d{8}$', date_string):
            return "YYYYMMDD"
        elif re.match(r'^\d{2}/\d{2}/\d{4}$', date_string):
            return "MM/DD/YYYY"
        elif re.match(r'^\d{4}/\d{2}/\d{2}$', date_string):
            return "YYYY/MM/DD"
        else:
            return "UNKNOWN"


class TestFDAAPIResponseValidation:
    """Test validation of FDA API response structures"""
    
    @pytest_asyncio.fixture(scope="class")
    async def response_validation_service(self):
        """Create service for response validation testing"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_empty_results_handling(self, response_validation_service):
        """Test handling of empty results from FDA API"""
        # Search for something that should return no results
        results = await response_validation_service.search_predicates(
            search_terms=["nonexistent_device_xyz_12345"],
            limit=1
        )
        
        # Should return empty list, not None or raise exception
        assert isinstance(results, list), "Empty results should return empty list"
        assert len(results) == 0, "Should return empty list for no results"
    
    @pytest.mark.asyncio
    async def test_large_result_set_handling(self, response_validation_service):
        """Test handling of large result sets"""
        # Search for something that should return many results
        results = await response_validation_service.search_predicates(
            search_terms=["device"],
            limit=100  # Large but reasonable limit
        )
        
        assert isinstance(results, list), "Large results should return list"
        assert len(results) <= 100, "Results should respect limit parameter"
        
        # All results should be valid
        for result in results:
            self._validate_basic_result_structure(result)
    
    @pytest.mark.asyncio
    async def test_pagination_consistency(self, response_validation_service):
        """Test pagination consistency"""
        # Get first page
        page1 = await response_validation_service.search_predicates(
            search_terms=["pacemaker"],
            limit=5,
            skip=0
        )
        
        # Get second page
        page2 = await response_validation_service.search_predicates(
            search_terms=["pacemaker"],
            limit=5,
            skip=5
        )
        
        # Pages should not overlap
        if page1 and page2:
            page1_k_numbers = {result.k_number for result in page1}
            page2_k_numbers = {result.k_number for result in page2}
            
            overlap = page1_k_numbers.intersection(page2_k_numbers)
            assert len(overlap) == 0, f"Pages should not overlap, found overlap: {overlap}"
    
    def _validate_basic_result_structure(self, result):
        """Validate basic structure of any result object"""
        assert hasattr(result, '__dict__'), "Result should have attributes"
        
        # Should have some basic identifying information
        has_identifier = any([
            hasattr(result, 'k_number') and result.k_number,
            hasattr(result, 'product_code') and result.product_code,
            hasattr(result, 'report_number') and result.report_number
        ])
        
        assert has_identifier, "Result should have at least one identifier field"