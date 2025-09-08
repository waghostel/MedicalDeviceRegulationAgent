"""
Unit tests for FDA Predicate Search Agent Tool
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from typing import List, Dict, Any

from backend.tools.fda_predicate_search_tool import (
    FDAPredicateSearchTool,
    PredicateMatch,
    ComparisonMatrix,
    TechnicalCharacteristic,
    PredicateSearchResult
)
from services.openfda import (
    FDASearchResult,
    FDAAPIError,
    PredicateNotFoundError
)


class TestFDAPredicateSearchTool:
    """Test suite for FDA Predicate Search Tool"""
    
    @pytest.fixture
    def mock_openfda_service(self):
        """Create mock OpenFDA service"""
        service = AsyncMock()
        return service
    
    @pytest.fixture
    def predicate_search_tool(self, mock_openfda_service):
        """Create predicate search tool with mocked service"""
        tool = FDAPredicateSearchTool(openfda_service=mock_openfda_service)
        return tool
    
    @pytest.fixture
    def sample_fda_results(self) -> List[FDASearchResult]:
        """Sample FDA search results for testing"""
        return [
            FDASearchResult(
                k_number="K123456",
                device_name="Cardiac Monitor System",
                intended_use="For continuous monitoring of cardiac rhythm in hospital settings",
                product_code="DQK",
                clearance_date="2023-01-15",
                applicant="MedTech Corp",
                contact="John Doe",
                decision_description="Substantially Equivalent",
                statement_or_summary="Device monitors ECG signals wirelessly"
            ),
            FDASearchResult(
                k_number="K789012",
                device_name="Wireless ECG Monitor",
                intended_use="For remote monitoring of heart rhythm abnormalities",
                product_code="DQK",
                clearance_date="2022-06-20",
                applicant="CardioTech Inc",
                contact="Jane Smith",
                decision_description="Substantially Equivalent",
                statement_or_summary="Bluetooth-enabled ECG monitoring device"
            ),
            FDASearchResult(
                k_number="K345678",
                device_name="Implantable Cardiac Device",
                intended_use="For permanent cardiac rhythm management",
                product_code="DTK",
                clearance_date="2021-03-10",
                applicant="ImplantCorp",
                contact="Bob Johnson",
                decision_description="Substantially Equivalent",
                statement_or_summary="Titanium implantable pacemaker with wireless connectivity"
            )
        ]
    
    @pytest.fixture
    def sample_device_description(self) -> str:
        """Sample device description for testing"""
        return "Wireless cardiac monitoring device with Bluetooth connectivity and mobile app integration for real-time ECG analysis"
    
    @pytest.fixture
    def sample_intended_use(self) -> str:
        """Sample intended use for testing"""
        return "For continuous monitoring of cardiac rhythm in ambulatory patients to detect arrhythmias"
    
    def test_tool_initialization(self):
        """Test tool initialization"""
        tool = FDAPredicateSearchTool()
        
        assert tool.name == "fda_predicate_search"
        assert "predicate device" in tool.description.lower()
        assert tool.openfda_service is None
    
    def test_extract_keywords(self, predicate_search_tool):
        """Test keyword extraction functionality"""
        text = "Wireless cardiac monitoring device with Bluetooth connectivity"
        keywords = predicate_search_tool._extract_keywords(text)
        
        expected_keywords = {"wireless", "cardiac", "monitoring", "bluetooth", "connectivity"}
        assert expected_keywords.issubset(keywords)
        assert "the" not in keywords  # Stop words should be removed
        assert "and" not in keywords
    
    def test_extract_technological_characteristics(self, predicate_search_tool):
        """Test technological characteristic extraction"""
        device_desc = "Titanium implantable cardiac device with Bluetooth wireless connectivity and rechargeable battery"
        intended_use = "For permanent cardiac rhythm monitoring and pacing therapy"
        
        characteristics = predicate_search_tool._extract_technological_characteristics(
            device_desc, intended_use
        )
        
        assert "materials" in characteristics
        assert "titanium" in characteristics["materials"]
        assert "connectivity" in characteristics
        assert "bluetooth" in characteristics["connectivity"]
        assert "energy_source" in characteristics
        assert "rechargeable" in characteristics["energy_source"]
        assert "implantation" in characteristics
        assert "implantable" in characteristics["implantation"]
    
    def test_calculate_semantic_similarity(self, predicate_search_tool, sample_fda_results):
        """Test semantic similarity calculation"""
        user_description = "Wireless cardiac monitoring device with Bluetooth"
        user_intended_use = "For continuous cardiac rhythm monitoring"
        predicate = sample_fda_results[0]  # Cardiac Monitor System
        
        similarity_score, reasons = predicate_search_tool._calculate_semantic_similarity(
            user_description, user_intended_use, predicate
        )
        
        assert 0.0 <= similarity_score <= 1.0
        assert isinstance(reasons, list)
        assert len(reasons) > 0
        # Should have high similarity due to cardiac monitoring overlap
        assert similarity_score > 0.3
    
    def test_assess_difference_impact(self, predicate_search_tool):
        """Test difference impact assessment"""
        # High impact - materials
        impact = predicate_search_tool._assess_difference_impact(
            "materials", "titanium", "stainless steel"
        )
        assert impact == "high"
        
        # Medium impact - software
        impact = predicate_search_tool._assess_difference_impact(
            "software", "ai algorithm", "basic software"
        )
        assert impact == "medium"
        
        # Low impact - connectivity
        impact = predicate_search_tool._assess_difference_impact(
            "connectivity", "bluetooth", "wifi"
        )
        assert impact == "low"
    
    def test_generate_comparison_matrix(self, predicate_search_tool):
        """Test comparison matrix generation"""
        user_characteristics = {
            "materials": "titanium",
            "connectivity": "bluetooth",
            "energy_source": "rechargeable battery",
            "implantation": "implantable"
        }
        
        predicate_characteristics = {
            "materials": "titanium",
            "connectivity": "wifi",
            "energy_source": "rechargeable battery",
            "implantation": "implantable"
        }
        
        user_description = "Implantable cardiac device"
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="Cardiac Implant",
            intended_use="Cardiac therapy",
            product_code="DTK",
            clearance_date="2023-01-01"
        )
        
        matrix = predicate_search_tool._generate_comparison_matrix(
            user_characteristics, predicate_characteristics, user_description, predicate
        )
        
        assert isinstance(matrix, ComparisonMatrix)
        assert len(matrix.similarities) > 0  # Should have titanium, battery, implantable matches
        assert len(matrix.differences) > 0  # Should have connectivity difference
        assert matrix.risk_assessment in ["low", "medium", "high"]
        assert isinstance(matrix.testing_recommendations, list)
        assert 0.0 <= matrix.confidence_score <= 1.0
    
    def test_generate_testing_recommendations(self, predicate_search_tool):
        """Test testing recommendation generation"""
        differences = [
            TechnicalCharacteristic(
                category="materials",
                user_device="titanium",
                predicate_device="stainless steel",
                similarity="different",
                impact="high",
                justification="Different materials"
            ),
            TechnicalCharacteristic(
                category="software",
                user_device="ai algorithm",
                predicate_device="basic software",
                similarity="different",
                impact="medium",
                justification="Different software complexity"
            )
        ]
        
        user_description = "Implantable cardiac device with AI"
        predicate = FDASearchResult(
            k_number="K123456",
            device_name="Basic Cardiac Device",
            intended_use="Basic cardiac therapy",
            product_code="DTK",
            clearance_date="2023-01-01"
        )
        
        recommendations = predicate_search_tool._generate_testing_recommendations(
            differences, user_description, predicate
        )
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        assert any("biocompatibility" in rec.lower() for rec in recommendations)
        assert any("software" in rec.lower() for rec in recommendations)
        assert any("clinical" in rec.lower() for rec in recommendations)  # Due to implantable + AI
    
    def test_assess_substantial_equivalence(self, predicate_search_tool):
        """Test substantial equivalence assessment"""
        # High similarity case
        similarities = [
            TechnicalCharacteristic("materials", "titanium", "titanium", "identical", "none", "Same"),
            TechnicalCharacteristic("energy", "battery", "battery", "identical", "none", "Same"),
        ]
        differences = [
            TechnicalCharacteristic("connectivity", "bluetooth", "wifi", "different", "low", "Different")
        ]
        
        assessment = predicate_search_tool._assess_substantial_equivalence(similarities, differences)
        assert "strong" in assessment.lower() or "manageable" in assessment.lower()
        
        # High difference case
        similarities = []
        differences = [
            TechnicalCharacteristic("materials", "titanium", "plastic", "different", "high", "Different"),
            TechnicalCharacteristic("implantation", "implantable", "external", "different", "high", "Different")
        ]
        
        assessment = predicate_search_tool._assess_substantial_equivalence(similarities, differences)
        assert "unlikely" in assessment.lower() or "de novo" in assessment.lower()
    
    @pytest.mark.asyncio
    async def test_search_and_analyze_predicates_success(
        self, predicate_search_tool, sample_fda_results, sample_device_description, sample_intended_use
    ):
        """Test successful predicate search and analysis"""
        # Mock the OpenFDA service
        predicate_search_tool.openfda_service.search_predicates.return_value = sample_fda_results
        
        results = await predicate_search_tool._search_and_analyze_predicates(
            device_description=sample_device_description,
            intended_use=sample_intended_use,
            max_results=5
        )
        
        assert isinstance(results, list)
        assert len(results) > 0
        assert len(results) <= 5
        
        # Check first result structure
        first_result = results[0]
        assert isinstance(first_result, PredicateMatch)
        assert first_result.k_number
        assert first_result.device_name
        assert 0.0 <= first_result.confidence_score <= 1.0
        assert isinstance(first_result.similarity_reasons, list)
        assert isinstance(first_result.comparison_matrix, ComparisonMatrix)
        assert isinstance(first_result.testing_recommendations, list)
        
        # Results should be sorted by confidence score (descending)
        for i in range(len(results) - 1):
            assert results[i].confidence_score >= results[i + 1].confidence_score
    
    @pytest.mark.asyncio
    async def test_search_and_analyze_predicates_no_results(
        self, predicate_search_tool, sample_device_description, sample_intended_use
    ):
        """Test predicate search with no results"""
        # Mock empty results
        predicate_search_tool.openfda_service.search_predicates.return_value = []
        
        exception_raised = False
        try:
            await predicate_search_tool._search_and_analyze_predicates(
                device_description=sample_device_description,
                intended_use=sample_intended_use
            )
        except PredicateNotFoundError:
            exception_raised = True
        
        assert exception_raised, "PredicateNotFoundError should have been raised"
    
    def test_generate_search_recommendations(self, predicate_search_tool):
        """Test search recommendation generation"""
        # Test with no predicates
        recommendations = predicate_search_tool._generate_search_recommendations(
            [], "test device", "test use"
        )
        assert len(recommendations) > 0
        assert any("de novo" in rec.lower() for rec in recommendations)
        
        # Test with high confidence predicates
        high_confidence_predicates = [
            PredicateMatch(
                k_number="K123456",
                device_name="Test Device",
                intended_use="Test Use",
                product_code="ABC",
                clearance_date="2023-01-01",
                applicant="Test Corp",
                confidence_score=0.8,
                similarity_reasons=["high similarity"],
                technological_characteristics={},
                comparison_matrix=ComparisonMatrix([], [], "low", [], "good", 0.8),
                testing_recommendations=[],
                regulatory_considerations=[]
            )
        ]
        
        recommendations = predicate_search_tool._generate_search_recommendations(
            high_confidence_predicates, "test device", "test use"
        )
        assert len(recommendations) > 0
        assert any("strong" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_arun_success(
        self, predicate_search_tool, sample_fda_results, sample_device_description, sample_intended_use
    ):
        """Test successful tool execution"""
        # Mock the OpenFDA service
        predicate_search_tool.openfda_service.search_predicates.return_value = sample_fda_results
        
        result = await predicate_search_tool._arun(
            device_description=sample_device_description,
            intended_use=sample_intended_use,
            max_results=3
        )
        
        assert isinstance(result, dict)
        
        # Check required fields
        assert "search_summary" in result
        assert "top_predicates" in result
        assert "search_statistics" in result
        assert "recommendations" in result
        assert "confidence_score" in result
        assert "sources" in result
        
        # Check search summary
        summary = result["search_summary"]
        assert summary["device_description"] == sample_device_description
        assert summary["intended_use"] == sample_intended_use
        assert "search_timestamp" in summary
        
        # Check predicates
        predicates = result["top_predicates"]
        assert isinstance(predicates, list)
        assert len(predicates) <= 3
        
        # Check statistics
        stats = result["search_statistics"]
        assert "total_predicates_found" in stats
        assert "average_confidence_score" in stats
        assert stats["total_predicates_found"] == len(predicates)
        
        # Check recommendations
        assert isinstance(result["recommendations"], list)
        assert len(result["recommendations"]) > 0
        
        # Check confidence score
        assert 0.0 <= result["confidence_score"] <= 1.0
        
        # Check sources
        assert isinstance(result["sources"], list)
        assert len(result["sources"]) > 0
    
    @pytest.mark.asyncio
    async def test_arun_no_predicates_found(
        self, predicate_search_tool, sample_device_description, sample_intended_use
    ):
        """Test tool execution when no predicates are found"""
        # Mock empty results
        predicate_search_tool.openfda_service.search_predicates.return_value = []
        
        result = await predicate_search_tool._arun(
            device_description=sample_device_description,
            intended_use=sample_intended_use
        )
        
        assert isinstance(result, dict)
        assert result["search_summary"]["predicates_analyzed"] == 0
        assert result["top_predicates"] == []
        assert result["confidence_score"] == 0.0
        assert len(result["recommendations"]) > 0
        assert any("de novo" in rec.lower() for rec in result["recommendations"])
    
    @pytest.mark.asyncio
    async def test_arun_with_filters(
        self, predicate_search_tool, sample_fda_results, sample_device_description, sample_intended_use
    ):
        """Test tool execution with filters"""
        predicate_search_tool.openfda_service.search_predicates.return_value = sample_fda_results
        
        result = await predicate_search_tool._arun(
            device_description=sample_device_description,
            intended_use=sample_intended_use,
            product_code="DQK",
            device_class="II",
            technology_characteristics=["wireless", "bluetooth"],
            max_results=5
        )
        
        assert isinstance(result, dict)
        
        # Check that filters were applied
        stats = result["search_statistics"]
        filters = stats["filters_applied"]
        assert filters["product_code"] == "DQK"
        assert filters["device_class"] == "II"
        assert filters["technology_characteristics"] == ["wireless", "bluetooth"]
    
    @pytest.mark.asyncio
    async def test_arun_api_error(
        self, predicate_search_tool, sample_device_description, sample_intended_use
    ):
        """Test tool execution with API error"""
        # Mock API error
        predicate_search_tool.openfda_service.search_predicates.side_effect = FDAAPIError("API Error")
        
        with pytest.raises(FDAAPIError):
            await predicate_search_tool._arun(
                device_description=sample_device_description,
                intended_use=sample_intended_use
            )
    
    def test_get_schema(self, predicate_search_tool):
        """Test schema generation"""
        schema = predicate_search_tool.get_schema()
        
        assert isinstance(schema, dict)
        assert "input_schema" in schema
        assert "output_schema" in schema
        
        # Check input schema
        input_schema = schema["input_schema"]
        assert input_schema["type"] == "object"
        assert "properties" in input_schema
        assert "device_description" in input_schema["properties"]
        assert "intended_use" in input_schema["properties"]
        assert "required" in input_schema
        assert "device_description" in input_schema["required"]
        assert "intended_use" in input_schema["required"]
        
        # Check output schema
        output_schema = schema["output_schema"]
        assert output_schema["type"] == "object"
        assert "properties" in output_schema
        assert "search_summary" in output_schema["properties"]
        assert "top_predicates" in output_schema["properties"]
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, predicate_search_tool, sample_fda_results):
        """Test successful health check"""
        predicate_search_tool.openfda_service.search_predicates.return_value = []
        
        is_healthy = await predicate_search_tool.health_check()
        assert is_healthy is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, predicate_search_tool):
        """Test health check failure"""
        predicate_search_tool.openfda_service.search_predicates.side_effect = Exception("Health check failed")
        
        is_healthy = await predicate_search_tool.health_check()
        assert is_healthy is False
    
    def test_synchronous_run(self, predicate_search_tool, sample_fda_results, sample_device_description, sample_intended_use):
        """Test synchronous wrapper"""
        predicate_search_tool.openfda_service.search_predicates.return_value = sample_fda_results
        
        result = predicate_search_tool._run(
            device_description=sample_device_description,
            intended_use=sample_intended_use
        )
        
        assert isinstance(result, dict)
        assert "search_summary" in result


class TestPredicateSearchIntegration:
    """Integration tests for predicate search functionality"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_cardiac_device_search(self):
        """Test end-to-end search for cardiac monitoring device"""
        # This test would use real FDA API in integration environment
        # For unit tests, we mock the service
        
        mock_service = AsyncMock()
        mock_service.search_predicates.return_value = [
            FDASearchResult(
                k_number="K193304",
                device_name="CardioSecur Active ECG System",
                intended_use="For recording, storing, and transmitting ECG data",
                product_code="DQK",
                clearance_date="2019-12-20",
                applicant="CardioSecur GmbH",
                statement_or_summary="15-lead ECG system with smartphone connectivity"
            )
        ]
        
        tool = FDAPredicateSearchTool(openfda_service=mock_service)
        
        result = await tool._arun(
            device_description="Wireless 12-lead ECG monitoring device with smartphone connectivity and cloud data storage",
            intended_use="For continuous cardiac rhythm monitoring in ambulatory patients to detect arrhythmias and other cardiac abnormalities",
            max_results=5
        )
        
        assert result["search_summary"]["predicates_analyzed"] > 0
        assert result["confidence_score"] > 0.0
        assert len(result["top_predicates"]) > 0
        
        # Check first predicate has proper analysis
        first_predicate = result["top_predicates"][0]
        assert first_predicate["k_number"] == "K193304"
        assert first_predicate["confidence_score"] > 0.0
        assert len(first_predicate["similarity_reasons"]) > 0
        assert "comparison_matrix" in first_predicate
        assert len(first_predicate["testing_recommendations"]) > 0
    
    @pytest.mark.asyncio
    async def test_end_to_end_software_device_search(self):
        """Test end-to-end search for software medical device"""
        
        mock_service = AsyncMock()
        mock_service.search_predicates.return_value = [
            FDASearchResult(
                k_number="K201234",
                device_name="AI Diagnostic Software",
                intended_use="For computer-aided detection of abnormalities in medical images",
                product_code="QAS",
                clearance_date="2020-05-15",
                applicant="AI MedTech Inc",
                statement_or_summary="Machine learning algorithm for radiology image analysis"
            )
        ]
        
        tool = FDAPredicateSearchTool(openfda_service=mock_service)
        
        result = await tool._arun(
            device_description="Machine learning software for automated analysis of chest X-rays to detect pneumonia",
            intended_use="For computer-aided detection of pneumonia in chest radiographs to assist radiologists",
            technology_characteristics=["artificial intelligence", "machine learning", "software"],
            max_results=3
        )
        
        assert result["search_summary"]["predicates_analyzed"] > 0
        
        # Check software-specific recommendations
        first_predicate = result["top_predicates"][0]
        testing_recs = first_predicate["testing_recommendations"]
        # Should have software-related testing recommendations
        assert len(testing_recs) > 0
        # Check if any recommendations mention software, validation, or verification
        software_related = any(
            keyword in rec.lower() 
            for rec in testing_recs 
            for keyword in ["software", "validation", "verification", "iec 62304"]
        )
        assert software_related
    
    def test_comparison_matrix_edge_cases(self):
        """Test comparison matrix generation with edge cases"""
        tool = FDAPredicateSearchTool()
        
        # Test with minimal characteristics
        user_chars = {"materials": "not specified"}
        pred_chars = {"materials": "not specified"}
        
        matrix = tool._generate_comparison_matrix(
            user_chars, pred_chars, "simple device", 
            FDASearchResult("K123", "Simple Device", "Simple use", "ABC", "2023-01-01")
        )
        
        assert isinstance(matrix, ComparisonMatrix)
        assert len(matrix.similarities) == 0  # No characteristics to compare
        assert len(matrix.differences) == 0
        assert matrix.confidence_score >= 0.0
    
    def test_keyword_extraction_edge_cases(self):
        """Test keyword extraction with various edge cases"""
        tool = FDAPredicateSearchTool()
        
        # Empty text
        keywords = tool._extract_keywords("")
        assert len(keywords) == 0
        
        # Text with only stop words
        keywords = tool._extract_keywords("the and for but not")
        assert len(keywords) == 0
        
        # Text with special characters
        keywords = tool._extract_keywords("device-name with_underscores and (parentheses)")
        assert "name" in keywords
        # Note: with_underscores is treated as a single word due to regex pattern
        assert "with_underscores" in keywords or "underscores" in keywords
        assert "parentheses" in keywords
        
        # Very short words should be filtered
        keywords = tool._extract_keywords("a bb ccc dddd")
        assert "a" not in keywords
        assert "bb" not in keywords
        assert "ccc" in keywords
        assert "dddd" in keywords


if __name__ == "__main__":
    pytest.main([__file__])