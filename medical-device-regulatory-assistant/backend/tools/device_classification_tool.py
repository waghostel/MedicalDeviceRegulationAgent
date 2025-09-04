"""
Device Classification Agent Tool

This tool provides automated FDA device classification with product codes,
regulatory pathway determination, and CFR section identification.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import re

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, ConfigDict
from typing import ClassVar

try:
    from services.openfda import (
        OpenFDAService, 
        DeviceClassificationResult, 
        FDAAPIError,
        create_openfda_service
    )
    from models.device_classification import DeviceClass, RegulatoryPathway
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from services.openfda import (
        OpenFDAService, 
        DeviceClassificationResult, 
        FDAAPIError,
        create_openfda_service
    )
    from models.device_classification import DeviceClass, RegulatoryPathway


logger = logging.getLogger(__name__)


class DeviceClassificationInput(BaseModel):
    """Input schema for device classification tool"""
    device_description: str = Field(
        description="Detailed description of the medical device including technology, materials, and function"
    )
    intended_use: str = Field(
        description="Intended use statement describing the medical purpose and target population"
    )
    technology_type: Optional[str] = Field(
        default=None,
        description="Technology type (e.g., 'software', 'implantable', 'diagnostic', 'therapeutic')"
    )
    risk_factors: Optional[List[str]] = Field(
        default=None,
        description="Known risk factors or safety considerations"
    )


@dataclass
class ClassificationResult:
    """Device classification analysis result"""
    device_class: str
    product_code: str
    product_code_description: str
    regulatory_pathway: str
    cfr_sections: List[str]
    confidence_score: float
    reasoning: str
    sources: List[Dict[str, str]]
    alternative_classifications: List[Dict[str, Any]]
    special_controls: List[str]
    predicate_requirements: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DeviceClassificationTool(BaseTool):
    """
    LangChain tool for FDA device classification with product code determination
    """
    
    name: str = "device_classification"
    description: str = """
    Classify medical devices according to FDA regulations and determine appropriate product codes.
    
    This tool analyzes device descriptions and intended use to:
    - Determine FDA device class (I, II, III)
    - Identify appropriate product code
    - Determine regulatory pathway (510(k), PMA, De Novo)
    - Identify applicable CFR sections
    - Assess confidence and provide reasoning
    
    Input should include device description and intended use statement.
    """
    
    # Define fields for Pydantic model
    openfda_service: Optional[OpenFDAService] = Field(default=None, exclude=True)
    api_key: Optional[str] = Field(default=None, exclude=True)
    redis_url: Optional[str] = Field(default=None, exclude=True)
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    # Class-level constants for device classification
    CLASS_I_KEYWORDS: ClassVar[set] = {
        'bandage', 'gauze', 'tape', 'sponge', 'simple', 'non-invasive',
        'external', 'manual', 'mechanical', 'basic', 'traditional'
    }
    
    CLASS_III_KEYWORDS: ClassVar[set] = {
        'implantable', 'life-sustaining', 'life-supporting', 'heart valve',
        'pacemaker', 'defibrillator', 'artificial heart', 'high risk',
        'permanent implant', 'brain', 'spinal', 'cardiovascular implant'
    }
    
    HIGH_RISK_TECHNOLOGIES: ClassVar[set] = {
        'artificial intelligence', 'machine learning', 'deep learning',
        'neural network', 'ai', 'ml', 'algorithm', 'automated diagnosis',
        'implantable', 'invasive', 'surgical', 'life-critical'
    }
    
    PRODUCT_CODE_PATTERNS: ClassVar[Dict[str, List[str]]] = {
        'software': ['MLI', 'QAS', 'QFD', 'QGD'],
        'diagnostic': ['DQK', 'DRG', 'DXH', 'JJE'],
        'cardiovascular': ['DQA', 'DRF', 'DTK', 'DWK'],
        'orthopedic': ['HRS', 'JDI', 'KWP', 'MNH'],
        'dental': ['EBA', 'EMA', 'EXE', 'KGN'],
        'ophthalmic': ['HQH', 'HQU', 'HRN', 'HTY'],
        'general': ['FRN', 'GDX', 'HDE', 'KGG']
    }
    
    def __init__(
        self,
        openfda_service: Optional[OpenFDAService] = None,
        api_key: Optional[str] = None,
        redis_url: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            openfda_service=openfda_service,
            api_key=api_key,
            redis_url=redis_url,
            **kwargs
        )
    
    async def _get_openfda_service(self) -> OpenFDAService:
        """Get or create OpenFDA service instance"""
        if not self.openfda_service:
            self.openfda_service = await create_openfda_service(
                api_key=self.api_key,
                redis_url=self.redis_url
            )
        return self.openfda_service
    
    def _extract_keywords(self, text: str) -> set:
        """Extract and normalize keywords from text"""
        # Convert to lowercase and extract words
        words = re.findall(r'\b\w+\b', text.lower())
        return set(words)
    
    def _analyze_risk_level(
        self, 
        device_description: str, 
        intended_use: str,
        technology_type: Optional[str] = None,
        risk_factors: Optional[List[str]] = None
    ) -> Tuple[str, float, str]:
        """
        Analyze device risk level based on description and intended use
        
        Returns:
            Tuple of (device_class, confidence, reasoning)
        """
        desc_keywords = self._extract_keywords(device_description)
        use_keywords = self._extract_keywords(intended_use)
        all_keywords = desc_keywords.union(use_keywords)
        
        if technology_type:
            tech_keywords = self._extract_keywords(technology_type)
            all_keywords = all_keywords.union(tech_keywords)
        
        reasoning_parts = []
        
        # Check for Class III indicators (highest risk)
        class_iii_matches = all_keywords.intersection(self.CLASS_III_KEYWORDS)
        if class_iii_matches:
            reasoning_parts.append(f"Class III indicators found: {', '.join(class_iii_matches)}")
            return "III", 0.8, "; ".join(reasoning_parts)
        
        # Check for high-risk technology
        high_risk_matches = all_keywords.intersection(self.HIGH_RISK_TECHNOLOGIES)
        if high_risk_matches:
            reasoning_parts.append(f"High-risk technology detected: {', '.join(high_risk_matches)}")
            # AI/ML devices are typically Class II with special controls
            if any(term in high_risk_matches for term in ['ai', 'artificial', 'machine', 'learning', 'ml', 'algorithm']):
                reasoning_parts.append("AI/ML devices typically require Class II with special controls")
                return "II", 0.7, "; ".join(reasoning_parts)
            else:
                return "III", 0.75, "; ".join(reasoning_parts)
        
        # Check for Class I indicators (lowest risk)
        class_i_matches = all_keywords.intersection(self.CLASS_I_KEYWORDS)
        if class_i_matches:
            reasoning_parts.append(f"Class I indicators found: {', '.join(class_i_matches)}")
            return "I", 0.7, "; ".join(reasoning_parts)
        
        # Check risk factors if provided
        if risk_factors:
            high_risk_factors = [
                factor for factor in risk_factors 
                if any(keyword in factor.lower() for keyword in ['invasive', 'implant', 'life', 'critical', 'surgical'])
            ]
            if high_risk_factors:
                reasoning_parts.append(f"Risk factors identified: {', '.join(high_risk_factors)}")
                return "III", 0.6, "; ".join(reasoning_parts)
        
        # Default to Class II (moderate risk) - most common classification
        reasoning_parts.append("No clear Class I or III indicators; defaulting to Class II (moderate risk)")
        return "II", 0.5, "; ".join(reasoning_parts)
    
    def _determine_technology_category(
        self, 
        device_description: str, 
        intended_use: str,
        technology_type: Optional[str] = None
    ) -> str:
        """Determine the primary technology category for product code selection"""
        
        text = f"{device_description} {intended_use}"
        if technology_type:
            text += f" {technology_type}"
        
        keywords = self._extract_keywords(text)
        
        # Check for novel/unprecedented devices first
        if any(term in keywords for term in ['novel', 'unprecedented', 'new', 'first', 'revolutionary']):
            return 'novel'
        
        # Check for software/AI
        if any(term in keywords for term in ['software', 'algorithm', 'ai', 'artificial', 'machine', 'learning', 'computer']):
            return 'software'
        
        # Check for diagnostic devices
        if any(term in keywords for term in ['diagnostic', 'test', 'screening', 'detection', 'analysis', 'measurement']):
            return 'diagnostic'
        
        # Check for cardiovascular
        if any(term in keywords for term in ['heart', 'cardiac', 'cardiovascular', 'vascular', 'blood', 'circulation', 'coronary', 'artery', 'vessel']):
            return 'cardiovascular'
        
        # Check for orthopedic
        if any(term in keywords for term in ['bone', 'joint', 'orthopedic', 'spine', 'fracture', 'musculoskeletal']):
            return 'orthopedic'
        
        # Check for dental
        if any(term in keywords for term in ['dental', 'tooth', 'oral', 'dentistry', 'gum', 'periodontal']):
            return 'dental'
        
        # Check for ophthalmic
        if any(term in keywords for term in ['eye', 'vision', 'ophthalmic', 'retinal', 'corneal', 'ocular', 'intraocular', 'lens', 'cataract']):
            return 'ophthalmic'
        
        return 'general'
    
    def _determine_regulatory_pathway(
        self, 
        device_class: str, 
        product_code: Optional[str] = None,
        is_novel: bool = False
    ) -> Tuple[str, str]:
        """
        Determine appropriate regulatory pathway
        
        Returns:
            Tuple of (pathway, reasoning)
        """
        if device_class == "I":
            return "510k", "Class I devices typically require 510(k) premarket notification unless exempt"
        
        elif device_class == "II":
            if is_novel:
                return "De Novo", "Novel Class II devices may require De Novo pathway if no predicate exists"
            else:
                return "510k", "Class II devices typically require 510(k) premarket notification"
        
        elif device_class == "III":
            if is_novel:
                return "De Novo", "Novel high-risk devices may qualify for De Novo reclassification"
            else:
                return "PMA", "Class III devices typically require PMA (Premarket Approval)"
        
        return "510k", "Default pathway for most medical devices"
    
    def _get_cfr_sections(self, device_class: str, technology_category: str) -> List[str]:
        """Get applicable CFR sections based on device class and category"""
        
        base_sections = ["21 CFR 820"]  # Quality System Regulation applies to all
        
        if device_class == "I":
            base_sections.extend([
                "21 CFR 807.81",  # Registration and listing
                "21 CFR 801",     # Labeling
            ])
        
        elif device_class == "II":
            base_sections.extend([
                "21 CFR 807.81",  # Registration and listing
                "21 CFR 807.87",  # 510(k) requirements
                "21 CFR 801",     # Labeling
                "21 CFR 814.3",   # Special controls
            ])
        
        elif device_class == "III":
            base_sections.extend([
                "21 CFR 807.81",  # Registration and listing
                "21 CFR 814",     # PMA requirements
                "21 CFR 801",     # Labeling
            ])
        
        # Add technology-specific sections
        if technology_category == 'software':
            base_sections.extend([
                "21 CFR 820.70(i)",  # Software validation
                "21 CFR 870.1340",   # Software guidance reference
            ])
        
        return sorted(list(set(base_sections)))
    
    def _get_special_controls(self, device_class: str, technology_category: str) -> List[str]:
        """Get applicable special controls for Class II devices"""
        
        if device_class != "II":
            return []
        
        controls = []
        
        if technology_category == 'software':
            controls.extend([
                "Software documentation and validation",
                "Cybersecurity controls",
                "Clinical evaluation requirements",
                "Labeling requirements for software"
            ])
        
        elif technology_category == 'diagnostic':
            controls.extend([
                "Clinical performance studies",
                "Analytical performance validation",
                "Quality control procedures",
                "Labeling requirements"
            ])
        
        elif technology_category == 'cardiovascular':
            controls.extend([
                "Biocompatibility testing",
                "Sterilization validation", 
                "Clinical studies",
                "Performance testing"
            ])
        
        else:
            controls.extend([
                "Performance testing",
                "Biocompatibility assessment",
                "Labeling requirements",
                "Clinical evaluation"
            ])
        
        return controls
    
    async def _search_fda_classifications(
        self, 
        device_description: str, 
        intended_use: str
    ) -> List[DeviceClassificationResult]:
        """Search FDA classification database for similar devices"""
        
        try:
            openfda_service = await self._get_openfda_service()
            
            # Extract key terms for search
            desc_words = re.findall(r'\b\w{3,}\b', device_description.lower())
            use_words = re.findall(r'\b\w{3,}\b', intended_use.lower())
            
            # Try different search strategies
            search_results = []
            
            # Search by device name keywords
            for word in desc_words[:3]:  # Limit to top 3 keywords
                try:
                    results = await openfda_service.lookup_device_classification(
                        device_name=word
                    )
                    search_results.extend(results)
                except:
                    continue
            
            # Search by intended use keywords
            for word in use_words[:3]:  # Limit to top 3 keywords
                try:
                    results = await openfda_service.lookup_device_classification(
                        device_name=word
                    )
                    search_results.extend(results)
                except:
                    continue
            
            # Remove duplicates based on product code
            unique_results = {}
            for result in search_results:
                if result.product_code not in unique_results:
                    unique_results[result.product_code] = result
            
            return list(unique_results.values())[:10]  # Limit to top 10
        
        except Exception as e:
            logger.warning(f"Error searching FDA classifications: {e}")
            return []
    
    def _calculate_classification_confidence(
        self,
        predicted_class: str,
        fda_results: List[DeviceClassificationResult],
        device_description: str,
        intended_use: str
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Calculate confidence score and find alternative classifications
        
        Returns:
            Tuple of (confidence_score, alternative_classifications)
        """
        if not fda_results:
            # Base confidence on keyword matching when no FDA data
            desc_keywords = self._extract_keywords(device_description)
            use_keywords = self._extract_keywords(intended_use)
            all_keywords = desc_keywords.union(use_keywords)
            
            # Higher confidence for clear keyword matches
            if predicted_class == "I" and all_keywords.intersection(self.CLASS_I_KEYWORDS):
                return 0.7, []
            elif predicted_class == "III" and all_keywords.intersection(self.CLASS_III_KEYWORDS):
                return 0.7, []
            elif predicted_class == "II" and all_keywords.intersection(self.HIGH_RISK_TECHNOLOGIES):
                return 0.6, []
            
            return 0.4, []  # Low confidence without FDA data or clear keywords
        
        # Count classifications by class
        class_counts = {}
        alternatives = []
        
        for result in fda_results:
            device_class = result.device_class
            if device_class in class_counts:
                class_counts[device_class] += 1
            else:
                class_counts[device_class] = 1
            
            # Calculate similarity score (simplified)
            desc_keywords = self._extract_keywords(device_description)
            fda_keywords = self._extract_keywords(result.device_name)
            similarity = len(desc_keywords.intersection(fda_keywords)) / max(len(desc_keywords), 1)
            
            alternatives.append({
                "device_class": device_class,
                "product_code": result.product_code,
                "device_name": result.device_name,
                "similarity_score": similarity,
                "regulation_number": result.regulation_number
            })
        
        # Sort alternatives by similarity
        alternatives.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        # Calculate confidence based on FDA data agreement
        total_results = len(fda_results)
        matching_class_count = class_counts.get(predicted_class, 0)
        
        if matching_class_count > 0:
            confidence = 0.6 + (matching_class_count / total_results) * 0.3
        else:
            confidence = 0.3  # Low confidence if no FDA matches
        
        return min(confidence, 0.95), alternatives[:5]  # Top 5 alternatives
    
    def _select_best_product_code(
        self,
        technology_category: str,
        fda_results: List[DeviceClassificationResult],
        device_class: str
    ) -> Tuple[str, str]:
        """
        Select the most appropriate product code
        
        Returns:
            Tuple of (product_code, description)
        """
        # First, try to find matching product codes from FDA results
        class_matches = [
            result for result in fda_results 
            if result.device_class == device_class
        ]
        
        if class_matches:
            # Select the most common product code for this class
            code_counts = {}
            for result in class_matches:
                code = result.product_code
                if code in code_counts:
                    code_counts[code] += 1
                else:
                    code_counts[code] = 1
            
            best_code = max(code_counts.keys(), key=lambda k: code_counts[k])
            best_result = next(r for r in class_matches if r.product_code == best_code)
            return best_code, best_result.device_name
        
        # Check for novel devices first
        if technology_category == 'novel':
            return "ZZZ", "Novel device (product code to be determined)"
        
        # Fallback to predefined patterns
        if technology_category in self.PRODUCT_CODE_PATTERNS:
            codes = self.PRODUCT_CODE_PATTERNS[technology_category]
            return codes[0], f"Typical {technology_category} device"
        
        # Default fallback for general devices
        return "ZZZ", "General medical device (product code to be determined)"
    
    def _run(self, **kwargs) -> Dict[str, Any]:
        """Synchronous wrapper for async implementation"""
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        device_description: str,
        intended_use: str,
        technology_type: Optional[str] = None,
        risk_factors: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute device classification analysis
        
        Args:
            device_description: Detailed device description
            intended_use: Intended use statement
            technology_type: Optional technology type
            risk_factors: Optional list of risk factors
        
        Returns:
            Classification result dictionary
        """
        try:
            logger.info(f"Starting device classification for: {device_description[:100]}...")
            
            # Step 1: Analyze risk level and determine device class
            device_class, class_confidence, class_reasoning = self._analyze_risk_level(
                device_description, intended_use, technology_type, risk_factors
            )
            
            # Step 2: Determine technology category
            technology_category = self._determine_technology_category(
                device_description, intended_use, technology_type
            )
            
            # Step 3: Search FDA classification database
            fda_results = await self._search_fda_classifications(
                device_description, intended_use
            )
            
            # Step 4: Calculate final confidence and alternatives
            final_confidence, alternatives = self._calculate_classification_confidence(
                device_class, fda_results, device_description, intended_use
            )
            
            # Step 5: Select best product code
            product_code, product_code_description = self._select_best_product_code(
                technology_category, fda_results, device_class
            )
            
            # Step 6: Determine regulatory pathway
            # Consider novel if confidence is low OR technology category is novel
            is_novel = (final_confidence < 0.6 and len(fda_results) == 0) or technology_category == 'novel'
            regulatory_pathway, pathway_reasoning = self._determine_regulatory_pathway(
                device_class, product_code, is_novel
            )
            
            # Step 7: Get CFR sections and special controls
            cfr_sections = self._get_cfr_sections(device_class, technology_category)
            special_controls = self._get_special_controls(device_class, technology_category)
            
            # Step 8: Build comprehensive reasoning
            reasoning_parts = [
                f"Device Class {device_class} determination: {class_reasoning}",
                f"Technology category identified as: {technology_category}",
                f"Product code selection: {product_code} - {product_code_description}",
                f"Regulatory pathway: {pathway_reasoning}",
                f"FDA database search found {len(fda_results)} similar devices"
            ]
            
            if alternatives:
                reasoning_parts.append(f"Top alternative: Class {alternatives[0]['device_class']} with {alternatives[0]['similarity_score']:.2f} similarity")
            
            # Step 9: Build sources
            sources = [
                {
                    "url": "https://www.fda.gov/medical-devices/classify-your-medical-device/device-classification",
                    "title": "FDA Device Classification Database",
                    "effective_date": datetime.now().strftime("%Y-%m-%d"),
                    "document_type": "FDA_DATABASE",
                    "accessed_date": datetime.now().strftime("%Y-%m-%d")
                },
                {
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/cfrsearch.cfm",
                    "title": "Code of Federal Regulations - Medical Devices",
                    "effective_date": datetime.now().strftime("%Y-%m-%d"),
                    "document_type": "CFR_SECTION",
                    "accessed_date": datetime.now().strftime("%Y-%m-%d")
                }
            ]
            
            # Add FDA result sources
            for result in fda_results[:3]:  # Top 3 sources
                if result.regulation_number:
                    sources.append({
                        "url": f"https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr={result.regulation_number}",
                        "title": f"CFR {result.regulation_number} - {result.device_name}",
                        "effective_date": datetime.now().strftime("%Y-%m-%d"),
                        "document_type": "CFR_SECTION",
                        "accessed_date": datetime.now().strftime("%Y-%m-%d")
                    })
            
            # Step 10: Create final result
            result = ClassificationResult(
                device_class=device_class,
                product_code=product_code,
                product_code_description=product_code_description,
                regulatory_pathway=regulatory_pathway,
                cfr_sections=cfr_sections,
                confidence_score=final_confidence,
                reasoning="; ".join(reasoning_parts),
                sources=sources,
                alternative_classifications=alternatives,
                special_controls=special_controls,
                predicate_requirements=(regulatory_pathway in ["510k", "De Novo"])
            )
            
            logger.info(f"Classification complete: Class {device_class}, Product Code {product_code}, Confidence {final_confidence:.2f}")
            
            return result.to_dict()
        
        except Exception as e:
            logger.error(f"Error in device classification: {e}")
            raise FDAAPIError(f"Device classification failed: {str(e)}")
    
    def get_schema(self) -> Dict[str, Any]:
        """Get tool input/output schema"""
        return {
            "input_schema": {
                "type": "object",
                "properties": {
                    "device_description": {
                        "type": "string",
                        "description": "Detailed description of the medical device"
                    },
                    "intended_use": {
                        "type": "string", 
                        "description": "Intended use statement"
                    },
                    "technology_type": {
                        "type": "string",
                        "description": "Optional technology type"
                    },
                    "risk_factors": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of risk factors"
                    }
                },
                "required": ["device_description", "intended_use"]
            },
            "output_schema": {
                "type": "object",
                "properties": {
                    "device_class": {"type": "string"},
                    "product_code": {"type": "string"},
                    "regulatory_pathway": {"type": "string"},
                    "cfr_sections": {"type": "array", "items": {"type": "string"}},
                    "confidence_score": {"type": "number"},
                    "reasoning": {"type": "string"},
                    "sources": {"type": "array"},
                    "alternative_classifications": {"type": "array"},
                    "special_controls": {"type": "array", "items": {"type": "string"}},
                    "predicate_requirements": {"type": "boolean"}
                }
            }
        }
    
    async def health_check(self) -> bool:
        """Check if tool is healthy and available"""
        try:
            # Test basic functionality
            test_result = await self._arun(
                device_description="Test device",
                intended_use="Test purpose"
            )
            return isinstance(test_result, dict) and "device_class" in test_result
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False