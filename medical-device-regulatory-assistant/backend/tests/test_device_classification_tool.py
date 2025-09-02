"""
Unit tests for Device Classification Tool

Tests cover various device types, edge cases, and error conditions
to ensure robust classification functionality.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List, Dict, Any

from backend.tools.device_classification_tool import (
    DeviceClassificationTool,
    DeviceClassificationInput,
    ClassificationResult
)
from backend.services.openfda import (
    DeviceClassificationResult,
    FDAAPIError,
    OpenFDAService
)


class TestDeviceClassificationTool:
    """Test suite for Device Classification Tool"""
    
    @pytest.fixture
    def mock_openfda_service(self):
        """Create mock OpenFDA service"""
        service = Mock(spec=OpenFDAService)
        service.lookup_device_classification = AsyncMock()
        service.health_check = AsyncMock(return_value={"status": "healthy"})
        return service
    
    @pytest.fixture
    def classification_tool(self, mock_openfda_service):
        """Create classification tool with mocked dependencies"""
        return DeviceClassificationTool(openfda_service=mock_openfda_service)
    
    @pytest.fixture
    def sample_fda_results(self):
        """Sample FDA classification results for testing"""
        return [
            DeviceClassificationResult(
                device_class="II",
                product_code="LLZ",
                device_name="Software Medical Device",
                regulation_number="21 CFR 870.1340",
                medical_specialty_description="Cardiovascular",
                device_class_description="Class II Medical Device"
            ),
            DeviceClassificationResult(
                device_class="II",
                product_code="QAS",
                device_name="Clinical Decision Support Software",
                regulation_number="21 CFR 870.1340",
                medical_specialty_description="General",
                device_class_description="Class II Medical Device"
            )
        ]
    
    # Test basic functionality
    @pytest.mark.asyncio
    async def test_basic_classification_class_ii_software(self, classification_tool, sample_fda_results):
        """Test classification of typical Class II software device"""
        
        # Mock FDA service response
        classification_tool.openfda_service.lookup_device_classification.return_value = sample_fda_results
        
        result = await classification_tool._arun(
            device_description="AI-powered diagnostic software for analyzing medical images",
            intended_use="To assist radiologists in detecting abnormalities in chest X-rays"
        )
        
        assert result["device_class"] == "II"
        assert result["regulatory_pathway"] == "510k"
        assert result["confidence_score"] > 0.5
        assert "software" in result["reasoning"].lower()
        assert len(result["cfr_sections"]) > 0
        assert "21 CFR 820.70(i)" in result["cfr_sections"]  # Software validation
        assert len(result["special_controls"]) > 0
        assert result["predicate_requirements"] is True
    
    @pytest.mark.asyncio
    async def test_class_i_device_classification(self, classification_tool):
        """Test classification of Class I device"""
        
        # Mock empty FDA results to test fallback logic
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Simple gauze bandage for wound dressing",
            intended_use="To cover and protect minor wounds and cuts"
        )
        
        assert result["device_class"] == "I"
        assert result["regulatory_pathway"] == "510k"
        assert "gauze" in result["reasoning"].lower()
        assert len(result["cfr_sections"]) > 0
        assert "21 CFR 807.81" in result["cfr_sections"]  # Registration requirement
    
    @pytest.mark.asyncio
    async def test_class_iii_device_classification(self, classification_tool):
        """Test classification of Class III high-risk device"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Implantable cardiac pacemaker with advanced algorithms",
            intended_use="To regulate heart rhythm in patients with bradycardia"
        )
        
        assert result["device_class"] == "III"
        assert result["regulatory_pathway"] == "PMA"
        assert "implantable" in result["reasoning"].lower()
        assert len(result["cfr_sections"]) > 0
        assert "21 CFR 814" in result["cfr_sections"]  # PMA requirements
    
    @pytest.mark.asyncio
    async def test_novel_device_de_novo_pathway(self, classification_tool):
        """Test De Novo pathway determination for novel devices"""
        
        # Mock low confidence scenario (novel device)
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Revolutionary brain-computer interface for paralyzed patients",
            intended_use="To enable direct neural control of external devices"
        )
        
        assert result["device_class"] == "III"
        assert result["regulatory_pathway"] == "De Novo"
        # Novel devices get De Novo pathway regardless of confidence when "revolutionary" is detected
        assert "brain" in result["reasoning"].lower() or "revolutionary" in result["reasoning"].lower()
    
    # Test technology categorization
    @pytest.mark.asyncio
    async def test_software_technology_categorization(self, classification_tool):
        """Test proper categorization of software devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Machine learning algorithm for ECG analysis",
            intended_use="To detect arrhythmias in electrocardiogram data",
            technology_type="software"
        )
        
        assert result["device_class"] == "II"  # AI/ML typically Class II
        assert "Software documentation and validation" in result["special_controls"]
        assert "Cybersecurity controls" in result["special_controls"]
    
    @pytest.mark.asyncio
    async def test_diagnostic_device_categorization(self, classification_tool):
        """Test categorization of diagnostic devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Blood glucose test strips for diabetes monitoring",
            intended_use="To measure glucose levels in capillary blood samples"
        )
        
        # Should be categorized as diagnostic
        assert "diagnostic" in result["reasoning"].lower() or "test" in result["reasoning"].lower()
        assert "Clinical performance studies" in result["special_controls"] or result["device_class"] == "I"
    
    @pytest.mark.asyncio
    async def test_cardiovascular_device_categorization(self, classification_tool):
        """Test categorization of cardiovascular devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Coronary stent for treating blocked arteries",
            intended_use="To maintain vessel patency in coronary arteries"
        )
        
        assert result["device_class"] in ["II", "III"]  # Stents are typically Class II or III
        if result["device_class"] == "II":
            assert "Biocompatibility testing" in result["special_controls"]
    
    # Test confidence scoring
    @pytest.mark.asyncio
    async def test_confidence_scoring_with_fda_matches(self, classification_tool, sample_fda_results):
        """Test confidence scoring when FDA database has matching devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = sample_fda_results
        
        result = await classification_tool._arun(
            device_description="Clinical decision support software",
            intended_use="To provide treatment recommendations to physicians"
        )
        
        # Should have higher confidence with FDA matches
        assert result["confidence_score"] > 0.6
        assert len(result["alternative_classifications"]) > 0
        assert result["alternative_classifications"][0]["device_class"] == "II"
    
    @pytest.mark.asyncio
    async def test_confidence_scoring_without_fda_matches(self, classification_tool):
        """Test confidence scoring when no FDA matches are found"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Completely novel quantum healing device",
            intended_use="To heal using quantum energy fields"
        )
        
        # Should have lower confidence without FDA matches
        assert result["confidence_score"] <= 0.4
        assert len(result["alternative_classifications"]) == 0
    
    # Test risk factor analysis
    @pytest.mark.asyncio
    async def test_risk_factors_influence_classification(self, classification_tool):
        """Test that risk factors influence device classification"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Surgical instrument for minimally invasive procedures",
            intended_use="To perform precise tissue manipulation during surgery",
            risk_factors=["invasive procedure", "surgical complications", "life-critical application"]
        )
        
        assert result["device_class"] == "III"  # High risk factors should push to Class III
        assert ("risk factors" in result["reasoning"].lower() or 
                "high-risk technology" in result["reasoning"].lower() or
                "surgical" in result["reasoning"].lower())
    
    # Test product code selection
    @pytest.mark.asyncio
    async def test_product_code_selection_from_fda_data(self, classification_tool, sample_fda_results):
        """Test product code selection when FDA data is available"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = sample_fda_results
        
        result = await classification_tool._arun(
            device_description="Software for medical image analysis",
            intended_use="To analyze CT scans for diagnostic purposes"
        )
        
        # Should select product code from FDA results
        assert result["product_code"] in ["LLZ", "QAS"]  # From sample FDA results
        assert result["product_code"] != "ZZZ"  # Not the fallback code
    
    @pytest.mark.asyncio
    async def test_product_code_fallback_logic(self, classification_tool):
        """Test product code fallback when no FDA data is available"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Novel therapeutic device with no precedent",
            intended_use="To provide completely new type of therapy"
        )
        
        # Should use fallback product code
        assert result["product_code"] == "ZZZ"
        assert "to be determined" in result["product_code_description"].lower()
    
    # Test CFR sections
    @pytest.mark.asyncio
    async def test_cfr_sections_completeness(self, classification_tool):
        """Test that appropriate CFR sections are included"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Class II diagnostic device",
            intended_use="For diagnostic testing"
        )
        
        cfr_sections = result["cfr_sections"]
        
        # Should include basic requirements
        assert "21 CFR 820" in cfr_sections  # QSR
        assert "21 CFR 807.81" in cfr_sections  # Registration
        assert "21 CFR 801" in cfr_sections  # Labeling
        
        if result["device_class"] == "II":
            assert "21 CFR 807.87" in cfr_sections  # 510(k) requirements
    
    # Test special controls
    @pytest.mark.asyncio
    async def test_special_controls_for_class_ii(self, classification_tool):
        """Test that Class II devices get appropriate special controls"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Diagnostic imaging software with AI",
            intended_use="To enhance medical image interpretation"
        )
        
        if result["device_class"] == "II":
            assert len(result["special_controls"]) > 0
            # Software devices should have software-specific controls
            controls_text = " ".join(result["special_controls"]).lower()
            assert "software" in controls_text or "validation" in controls_text
    
    @pytest.mark.asyncio
    async def test_no_special_controls_for_class_i_iii(self, classification_tool):
        """Test that Class I and III devices don't get special controls"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        # Test Class I
        result_i = await classification_tool._arun(
            device_description="Simple bandage",
            intended_use="To cover wounds"
        )
        
        if result_i["device_class"] == "I":
            assert len(result_i["special_controls"]) == 0
        
        # Test Class III
        result_iii = await classification_tool._arun(
            device_description="Implantable heart valve",
            intended_use="To replace damaged heart valve"
        )
        
        if result_iii["device_class"] == "III":
            assert len(result_iii["special_controls"]) == 0
    
    # Test error handling
    @pytest.mark.asyncio
    async def test_fda_api_error_handling(self, classification_tool):
        """Test graceful handling of FDA API errors"""
        
        # Mock FDA service to raise an error
        classification_tool.openfda_service.lookup_device_classification.side_effect = FDAAPIError("API Error")
        
        result = await classification_tool._arun(
            device_description="Test device",
            intended_use="Test purpose"
        )
        
        # Should still return a result despite FDA API error
        assert "device_class" in result
        assert result["confidence_score"] <= 0.4  # Lower confidence due to no FDA data
    
    @pytest.mark.asyncio
    async def test_invalid_input_handling(self, classification_tool):
        """Test handling of invalid or empty inputs"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        # Test empty description
        result = await classification_tool._arun(
            device_description="",
            intended_use="Test purpose"
        )
        
        assert "device_class" in result  # Should still classify
        
        # Test empty intended use
        result = await classification_tool._arun(
            device_description="Test device",
            intended_use=""
        )
        
        assert "device_class" in result  # Should still classify
    
    # Test edge cases
    @pytest.mark.asyncio
    async def test_mixed_risk_indicators(self, classification_tool):
        """Test classification when device has mixed risk indicators"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Simple external bandage with embedded sensors for monitoring",
            intended_use="To cover wounds while monitoring healing progress"
        )
        
        # Should handle conflicting indicators (simple + sensors)
        assert result["device_class"] in ["I", "II"]
        assert result["confidence_score"] > 0.0
    
    @pytest.mark.asyncio
    async def test_very_long_descriptions(self, classification_tool):
        """Test handling of very long device descriptions"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        long_description = "This is a very long device description " * 100
        
        result = await classification_tool._arun(
            device_description=long_description,
            intended_use="Test purpose"
        )
        
        assert "device_class" in result
        assert len(result["reasoning"]) > 0
    
    @pytest.mark.asyncio
    async def test_special_characters_in_input(self, classification_tool):
        """Test handling of special characters in input"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Device with special chars: @#$%^&*()[]{}",
            intended_use="Purpose with unicode: αβγδε"
        )
        
        assert "device_class" in result
        assert result["confidence_score"] > 0.0
    
    # Test synchronous wrapper
    def test_synchronous_run_method(self, classification_tool):
        """Test that synchronous _run method works correctly"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = classification_tool._run(
            device_description="Test device",
            intended_use="Test purpose"
        )
        
        assert isinstance(result, dict)
        assert "device_class" in result
    
    # Test schema methods
    def test_get_schema_method(self, classification_tool):
        """Test that get_schema returns proper schema"""
        
        schema = classification_tool.get_schema()
        
        assert "input_schema" in schema
        assert "output_schema" in schema
        
        # Check required input fields
        input_props = schema["input_schema"]["properties"]
        assert "device_description" in input_props
        assert "intended_use" in input_props
        
        # Check output fields
        output_props = schema["output_schema"]["properties"]
        assert "device_class" in output_props
        assert "product_code" in output_props
        assert "confidence_score" in output_props
    
    @pytest.mark.asyncio
    async def test_health_check_method(self, classification_tool):
        """Test health check functionality"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        is_healthy = await classification_tool.health_check()
        
        assert isinstance(is_healthy, bool)
        # Should be True if basic functionality works
    
    # Test alternative classifications
    @pytest.mark.asyncio
    async def test_alternative_classifications_ranking(self, classification_tool, sample_fda_results):
        """Test that alternative classifications are properly ranked"""
        
        # Add more diverse FDA results
        diverse_results = sample_fda_results + [
            DeviceClassificationResult(
                device_class="I",
                product_code="ABC",
                device_name="Simple Medical Device",
                regulation_number="21 CFR 880.1234",
                medical_specialty_description="General",
                device_class_description="Class I Medical Device"
            )
        ]
        
        classification_tool.openfda_service.lookup_device_classification.return_value = diverse_results
        
        result = await classification_tool._arun(
            device_description="Software medical device for analysis",
            intended_use="To analyze medical data"
        )
        
        alternatives = result["alternative_classifications"]
        
        # Should have alternatives
        assert len(alternatives) > 0
        
        # Should be sorted by similarity score
        if len(alternatives) > 1:
            assert alternatives[0]["similarity_score"] >= alternatives[1]["similarity_score"]
    
    # Test comprehensive device types
    @pytest.mark.asyncio
    async def test_orthopedic_device_classification(self, classification_tool):
        """Test classification of orthopedic devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Titanium hip implant for joint replacement",
            intended_use="To replace damaged hip joint in patients with arthritis"
        )
        
        assert result["device_class"] in ["II", "III"]  # Implants are typically Class II or III
        assert "orthopedic" in result["reasoning"].lower() or "implant" in result["reasoning"].lower()
    
    @pytest.mark.asyncio
    async def test_dental_device_classification(self, classification_tool):
        """Test classification of dental devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Dental filling material for tooth restoration",
            intended_use="To restore damaged tooth structure"
        )
        
        assert result["device_class"] in ["I", "II"]  # Dental materials typically Class I or II
        assert "dental" in result["reasoning"].lower() or "tooth" in result["reasoning"].lower()
    
    @pytest.mark.asyncio
    async def test_ophthalmic_device_classification(self, classification_tool):
        """Test classification of ophthalmic devices"""
        
        classification_tool.openfda_service.lookup_device_classification.return_value = []
        
        result = await classification_tool._arun(
            device_description="Intraocular lens for cataract surgery",
            intended_use="To replace natural lens removed during cataract surgery"
        )
        
        assert result["device_class"] in ["II", "III"]  # IOLs are typically Class II or III
        assert "ophthalmic" in result["reasoning"].lower() or "eye" in result["reasoning"].lower()


# Integration tests with real OpenFDA service (optional, requires network)
@pytest.mark.integration
class TestDeviceClassificationToolIntegration:
    """Integration tests with real OpenFDA service"""
    
    @pytest.fixture
    def real_classification_tool(self):
        """Create classification tool with real OpenFDA service"""
        return DeviceClassificationTool()
    
    @pytest.mark.asyncio
    async def test_real_fda_api_integration(self, real_classification_tool):
        """Test integration with real FDA API (requires network)"""
        
        result = await real_classification_tool._arun(
            device_description="Blood pressure monitor for home use",
            intended_use="To measure blood pressure in home setting"
        )
        
        assert "device_class" in result
        assert result["confidence_score"] > 0.0
        assert len(result["sources"]) > 0
    
    @pytest.mark.asyncio
    async def test_real_health_check(self, real_classification_tool):
        """Test health check with real service"""
        
        is_healthy = await real_classification_tool.health_check()
        
        # May be True or False depending on network/API availability
        assert isinstance(is_healthy, bool)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])