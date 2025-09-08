"""
FDA Predicate Search Agent Tool

This tool provides automated FDA 510(k) predicate device search with:
- Semantic similarity scoring for predicate matching
- Technological characteristic extraction from 510(k) summaries
- Predicate ranking algorithm based on substantial equivalence criteria
- Comparison matrix generation with similarities and differences
- Testing recommendation engine based on identified differences
"""

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Set, ClassVar
from dataclasses import dataclass, asdict
from collections import Counter
import math

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, ConfigDict

try:
    from services.openfda import (
        OpenFDAService, 
        FDASearchResult, 
        FDAAPIError,
        PredicateNotFoundError,
        create_openfda_service,
        calculate_predicate_confidence
    )
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from services.openfda import (
        OpenFDAService, 
        FDASearchResult, 
        FDAAPIError,
        PredicateNotFoundError,
        create_openfda_service,
        calculate_predicate_confidence
    )


logger = logging.getLogger(__name__)


class PredicateSearchInput(BaseModel):
    """Input schema for predicate search tool"""
    device_description: str = Field(
        description="Detailed description of the medical device including technology, materials, and function"
    )
    intended_use: str = Field(
        description="Intended use statement describing the medical purpose and target population"
    )
    product_code: Optional[str] = Field(
        default=None,
        description="FDA product code if known (e.g., 'LLZ', 'DQK')"
    )
    device_class: Optional[str] = Field(
        default=None,
        description="FDA device class if known (I, II, III)"
    )
    technology_characteristics: Optional[List[str]] = Field(
        default=None,
        description="List of key technological characteristics (e.g., 'software', 'implantable', 'wireless')"
    )
    max_results: Optional[int] = Field(
        default=10,
        description="Maximum number of predicate results to return"
    )


@dataclass
class TechnicalCharacteristic:
    """Technical characteristic comparison"""
    category: str
    user_device: str
    predicate_device: str
    similarity: str  # 'identical', 'similar', 'different'
    impact: str  # 'none', 'low', 'medium', 'high'
    justification: str


@dataclass
class ComparisonMatrix:
    """Predicate comparison matrix"""
    similarities: List[TechnicalCharacteristic]
    differences: List[TechnicalCharacteristic]
    risk_assessment: str  # 'low', 'medium', 'high'
    testing_recommendations: List[str]
    substantial_equivalence_assessment: str
    confidence_score: float


@dataclass
class PredicateMatch:
    """Enhanced predicate match with analysis"""
    k_number: str
    device_name: str
    intended_use: str
    product_code: str
    clearance_date: str
    applicant: str
    confidence_score: float
    similarity_reasons: List[str]
    technological_characteristics: Dict[str, str]
    comparison_matrix: ComparisonMatrix
    testing_recommendations: List[str]
    regulatory_considerations: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PredicateSearchResult:
    """Complete predicate search result"""
    search_summary: Dict[str, Any]
    top_predicates: List[PredicateMatch]
    search_statistics: Dict[str, Any]
    recommendations: List[str]
    confidence_score: float
    sources: List[Dict[str, str]]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class FDAPredicateSearchTool(BaseTool):
    """
    LangChain tool for FDA 510(k) predicate device search with advanced analysis
    """
    
    name: str = "fda_predicate_search"
    description: str = """
    Search FDA 510(k) database for predicate devices with comprehensive analysis.
    
    This tool performs advanced predicate device searches including:
    - Semantic similarity scoring for predicate matching
    - Technological characteristic extraction and comparison
    - Substantial equivalence assessment
    - Testing recommendation generation
    - Risk analysis and regulatory considerations
    
    Input should include device description, intended use, and optional filters.
    Returns ranked list of predicate candidates with detailed analysis.
    """
    
    # Define fields for Pydantic model
    openfda_service: Optional[Any] = Field(default=None, exclude=True)
    api_key: Optional[str] = Field(default=None, exclude=True)
    redis_url: Optional[str] = Field(default=None, exclude=True)
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    # Technology categories for characteristic extraction
    TECHNOLOGY_CATEGORIES: ClassVar[Dict[str, List[str]]] = {
        'materials': [
            'titanium', 'stainless steel', 'polymer', 'silicone', 'ceramic',
            'cobalt chromium', 'nitinol', 'peek', 'ptfe', 'polyethylene'
        ],
        'energy_source': [
            'battery', 'rechargeable', 'disposable', 'ac powered', 'usb',
            'wireless charging', 'solar', 'kinetic', 'passive'
        ],
        'connectivity': [
            'bluetooth', 'wifi', 'cellular', 'nfc', 'zigbee', 'wireless',
            'wired', 'usb', 'ethernet', 'cloud connected'
        ],
        'software': [
            'ai', 'machine learning', 'algorithm', 'software', 'app',
            'mobile application', 'web based', 'cloud software', 'firmware'
        ],
        'sterilization': [
            'sterile', 'sterilization', 'gamma', 'eto', 'steam', 'electron beam',
            'single use', 'reusable', 'autoclave'
        ],
        'implantation': [
            'implantable', 'permanent', 'temporary', 'biodegradable',
            'non-implantable', 'external', 'transcutaneous'
        ],
        'measurement': [
            'sensor', 'measurement', 'monitoring', 'detection', 'analysis',
            'diagnostic', 'screening', 'quantitative', 'qualitative'
        ]
    }
    
    # Risk factors for testing recommendations
    RISK_FACTORS: ClassVar[Dict[str, List[str]]] = {
        'high_risk': [
            'implantable', 'life sustaining', 'life supporting', 'invasive',
            'surgical', 'cardiovascular', 'neurological', 'spinal'
        ],
        'biocompatibility': [
            'implantable', 'contact with blood', 'tissue contact',
            'mucosal membrane', 'skin contact', 'permanent'
        ],
        'software_risk': [
            'ai', 'machine learning', 'algorithm', 'automated decision',
            'diagnostic software', 'treatment recommendation'
        ],
        'electromagnetic': [
            'wireless', 'bluetooth', 'wifi', 'cellular', 'rf', 'electromagnetic'
        ]
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
    
    def _extract_keywords(self, text: str) -> Set[str]:
        """Extract and normalize keywords from text"""
        # Convert to lowercase and extract words (3+ characters)
        words = re.findall(r'\b\w{3,}\b', text.lower())
        # Remove common stop words
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
            'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
            'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
            'did', 'use', 'used', 'using', 'device', 'medical', 'system'
        }
        return set(word for word in words if word not in stop_words)
    
    def _extract_technological_characteristics(
        self, 
        device_description: str, 
        intended_use: str,
        technology_characteristics: Optional[List[str]] = None
    ) -> Dict[str, str]:
        """
        Extract technological characteristics from device description
        
        Returns:
            Dictionary mapping characteristic categories to detected values
        """
        text = f"{device_description} {intended_use}".lower()
        if technology_characteristics:
            text += " " + " ".join(technology_characteristics).lower()
        
        characteristics = {}
        
        for category, keywords in self.TECHNOLOGY_CATEGORIES.items():
            detected = []
            for keyword in keywords:
                if keyword in text:
                    detected.append(keyword)
            
            if detected:
                characteristics[category] = ", ".join(detected)
            else:
                characteristics[category] = "not specified"
        
        return characteristics
    
    def _calculate_semantic_similarity(
        self,
        user_description: str,
        user_intended_use: str,
        predicate: FDASearchResult
    ) -> Tuple[float, List[str]]:
        """
        Calculate semantic similarity between user device and predicate
        
        Returns:
            Tuple of (similarity_score, similarity_reasons)
        """
        reasons = []
        
        # Extract keywords
        user_desc_keywords = self._extract_keywords(user_description)
        user_use_keywords = self._extract_keywords(user_intended_use)
        pred_name_keywords = self._extract_keywords(predicate.device_name or "")
        pred_use_keywords = self._extract_keywords(predicate.intended_use or "")
        
        # Calculate different similarity components
        
        # 1. Device name similarity (25% weight)
        name_intersection = user_desc_keywords.intersection(pred_name_keywords)
        name_union = user_desc_keywords.union(pred_name_keywords)
        name_similarity = len(name_intersection) / len(name_union) if name_union else 0
        
        if name_similarity > 0.3:
            reasons.append(f"Device name similarity: {len(name_intersection)} common terms")
        
        # 2. Intended use similarity (40% weight)
        use_intersection = user_use_keywords.intersection(pred_use_keywords)
        use_union = user_use_keywords.union(pred_use_keywords)
        use_similarity = len(use_intersection) / len(use_union) if use_union else 0
        
        if use_similarity > 0.2:
            reasons.append(f"Intended use similarity: {len(use_intersection)} common terms")
        
        # 3. Cross-category similarity (20% weight) - device description vs predicate intended use
        cross_intersection = user_desc_keywords.intersection(pred_use_keywords)
        cross_similarity = len(cross_intersection) / max(len(user_desc_keywords), 1)
        
        if cross_similarity > 0.1:
            reasons.append(f"Cross-category match: {len(cross_intersection)} terms")
        
        # 4. Technology keywords bonus (15% weight)
        tech_keywords = set()
        for keywords in self.TECHNOLOGY_CATEGORIES.values():
            tech_keywords.update(keywords)
        
        user_tech = user_desc_keywords.intersection(tech_keywords)
        pred_tech = pred_name_keywords.union(pred_use_keywords).intersection(tech_keywords)
        tech_intersection = user_tech.intersection(pred_tech)
        tech_similarity = len(tech_intersection) / max(len(user_tech), 1) if user_tech else 0
        
        if tech_similarity > 0:
            reasons.append(f"Technology match: {', '.join(tech_intersection)}")
        
        # Calculate weighted similarity score
        similarity_score = (
            name_similarity * 0.25 +
            use_similarity * 0.40 +
            cross_similarity * 0.20 +
            tech_similarity * 0.15
        )
        
        # Bonus for recent clearance
        if predicate.clearance_date:
            try:
                clearance_year = int(predicate.clearance_date[:4])
                current_year = datetime.now().year
                years_ago = current_year - clearance_year
                if years_ago <= 5:
                    similarity_score *= 1.1  # 10% bonus for recent clearance
                    reasons.append(f"Recent clearance ({clearance_year})")
            except:
                pass
        
        return min(similarity_score, 1.0), reasons
    
    def _generate_comparison_matrix(
        self,
        user_characteristics: Dict[str, str],
        predicate_characteristics: Dict[str, str],
        user_description: str,
        predicate: FDASearchResult
    ) -> ComparisonMatrix:
        """
        Generate detailed comparison matrix between user device and predicate
        
        Returns:
            ComparisonMatrix with similarities, differences, and recommendations
        """
        similarities = []
        differences = []
        
        # Compare technological characteristics
        for category in user_characteristics:
            user_value = user_characteristics[category]
            pred_value = predicate_characteristics.get(category, "not specified")
            
            if user_value == "not specified" and pred_value == "not specified":
                continue
            
            # Determine similarity level
            if user_value == pred_value:
                similarity = "identical"
                impact = "none"
                justification = f"Both devices have {user_value}"
            elif user_value != "not specified" and pred_value != "not specified":
                # Check for partial matches
                user_terms = set(user_value.split(", "))
                pred_terms = set(pred_value.split(", "))
                overlap = user_terms.intersection(pred_terms)
                
                if overlap:
                    similarity = "similar"
                    impact = "low"
                    justification = f"Partial match: {', '.join(overlap)}"
                else:
                    similarity = "different"
                    impact = self._assess_difference_impact(category, user_value, pred_value)
                    justification = f"Different {category}: {user_value} vs {pred_value}"
            else:
                similarity = "different"
                impact = "medium"
                justification = f"One device specifies {category}, other does not"
            
            characteristic = TechnicalCharacteristic(
                category=category,
                user_device=user_value,
                predicate_device=pred_value,
                similarity=similarity,
                impact=impact,
                justification=justification
            )
            
            if similarity in ["identical", "similar"]:
                similarities.append(characteristic)
            else:
                differences.append(characteristic)
        
        # Assess overall risk and generate recommendations
        risk_assessment = self._assess_overall_risk(differences, user_description)
        testing_recommendations = self._generate_testing_recommendations(
            differences, user_description, predicate
        )
        
        # Calculate substantial equivalence assessment
        se_assessment = self._assess_substantial_equivalence(similarities, differences)
        
        # Calculate confidence score for this comparison
        similarity_count = len(similarities)
        difference_count = len(differences)
        high_impact_differences = len([d for d in differences if d.impact == "high"])
        
        if similarity_count + difference_count == 0:
            confidence_score = 0.0
        else:
            confidence_score = (similarity_count - high_impact_differences * 2) / (similarity_count + difference_count)
            confidence_score = max(0.0, min(1.0, confidence_score))
        
        return ComparisonMatrix(
            similarities=similarities,
            differences=differences,
            risk_assessment=risk_assessment,
            testing_recommendations=testing_recommendations,
            substantial_equivalence_assessment=se_assessment,
            confidence_score=confidence_score
        )
    
    def _assess_difference_impact(self, category: str, user_value: str, pred_value: str) -> str:
        """Assess the impact level of a technological difference"""
        
        # High impact categories
        if category in ['materials', 'implantation', 'sterilization']:
            return "high"
        
        # Medium impact categories
        if category in ['energy_source', 'software', 'measurement']:
            return "medium"
        
        # Check for high-risk keywords
        high_risk_text = f"{user_value} {pred_value}".lower()
        for risk_keyword in self.RISK_FACTORS['high_risk']:
            if risk_keyword in high_risk_text:
                return "high"
        
        return "low"
    
    def _assess_overall_risk(self, differences: List[TechnicalCharacteristic], user_description: str) -> str:
        """Assess overall risk level based on differences"""
        
        high_impact_count = len([d for d in differences if d.impact == "high"])
        medium_impact_count = len([d for d in differences if d.impact == "medium"])
        
        # Check for high-risk device types
        desc_lower = user_description.lower()
        for risk_keyword in self.RISK_FACTORS['high_risk']:
            if risk_keyword in desc_lower:
                if high_impact_count > 0:
                    return "high"
        
        if high_impact_count >= 2:
            return "high"
        elif high_impact_count == 1 or medium_impact_count >= 3:
            return "medium"
        else:
            return "low"
    
    def _generate_testing_recommendations(
        self,
        differences: List[TechnicalCharacteristic],
        user_description: str,
        predicate: FDASearchResult
    ) -> List[str]:
        """Generate testing recommendations based on identified differences"""
        
        recommendations = []
        desc_lower = user_description.lower()
        
        # Material differences
        material_diffs = [d for d in differences if d.category == "materials"]
        if material_diffs:
            recommendations.append("Biocompatibility testing (ISO 10993 series)")
            recommendations.append("Material characterization and comparison")
        
        # Software differences or software device
        software_diffs = [d for d in differences if d.category == "software"]
        is_software_device = any(keyword in desc_lower for keyword in ['software', 'algorithm', 'ai', 'machine learning', 'artificial intelligence'])
        if software_diffs or is_software_device:
            recommendations.append("Software verification and validation (IEC 62304)")
            recommendations.append("Cybersecurity assessment (FDA guidance)")
        
        # Connectivity differences
        connectivity_diffs = [d for d in differences if d.category == "connectivity"]
        if connectivity_diffs:
            recommendations.append("Electromagnetic compatibility testing (IEC 60601-1-2)")
            recommendations.append("Wireless performance testing")
        
        # Sterilization differences
        sterilization_diffs = [d for d in differences if d.category == "sterilization"]
        if sterilization_diffs:
            recommendations.append("Sterilization validation studies")
            recommendations.append("Packaging integrity testing")
        
        # Energy source differences
        energy_diffs = [d for d in differences if d.category == "energy_source"]
        if energy_diffs:
            recommendations.append("Electrical safety testing (IEC 60601-1)")
            recommendations.append("Battery performance and safety testing")
        
        # High-risk device considerations
        for risk_keyword in self.RISK_FACTORS['high_risk']:
            if risk_keyword in desc_lower:
                recommendations.append("Clinical evaluation and/or clinical studies")
                break
        
        # Implantable device considerations
        if any(keyword in desc_lower for keyword in ['implantable', 'implant']):
            recommendations.extend([
                "Long-term biocompatibility studies",
                "Mechanical testing (fatigue, wear)",
                "MRI safety assessment"
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)
        
        return unique_recommendations
    
    def _assess_substantial_equivalence(
        self,
        similarities: List[TechnicalCharacteristic],
        differences: List[TechnicalCharacteristic]
    ) -> str:
        """Assess substantial equivalence likelihood"""
        
        similarity_count = len(similarities)
        difference_count = len(differences)
        high_impact_differences = len([d for d in differences if d.impact == "high"])
        
        if high_impact_differences >= 2:
            return "Substantial equivalence unlikely due to multiple high-impact differences. Consider De Novo pathway."
        elif high_impact_differences == 1:
            return "Substantial equivalence possible but requires strong justification for high-impact difference."
        elif difference_count > similarity_count * 2:
            return "Substantial equivalence questionable due to numerous differences. Additional testing likely required."
        elif similarity_count >= difference_count:
            return "Strong substantial equivalence potential. Differences appear manageable with appropriate testing."
        else:
            return "Moderate substantial equivalence potential. Careful analysis of differences required."
    
    async def _search_and_analyze_predicates(
        self,
        device_description: str,
        intended_use: str,
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        technology_characteristics: Optional[List[str]] = None,
        max_results: int = 10
    ) -> List[PredicateMatch]:
        """
        Search for predicates and perform comprehensive analysis
        
        Returns:
            List of analyzed predicate matches
        """
        openfda_service = await self._get_openfda_service()
        
        # Extract search terms from device description and intended use
        desc_keywords = self._extract_keywords(device_description)
        use_keywords = self._extract_keywords(intended_use)
        
        # Combine and prioritize search terms
        all_keywords = list(desc_keywords.union(use_keywords))
        search_terms = all_keywords[:5]  # Limit to top 5 terms to avoid overly complex queries
        
        logger.info(f"Searching predicates with terms: {search_terms}")
        
        # Search FDA database
        fda_results = await openfda_service.search_predicates(
            search_terms=search_terms,
            product_code=product_code,
            device_class=device_class,
            limit=max_results * 3  # Get more results for better filtering
        )
        
        if not fda_results:
            raise PredicateNotFoundError("No predicate devices found for the specified criteria")
        
        # Extract user device characteristics
        user_characteristics = self._extract_technological_characteristics(
            device_description, intended_use, technology_characteristics
        )
        
        # Analyze each predicate
        analyzed_predicates = []
        
        for predicate in fda_results:
            try:
                # Calculate semantic similarity
                similarity_score, similarity_reasons = self._calculate_semantic_similarity(
                    device_description, intended_use, predicate
                )
                
                # Extract predicate characteristics
                predicate_characteristics = self._extract_technological_characteristics(
                    predicate.device_name or "", predicate.intended_use or ""
                )
                
                # Generate comparison matrix
                comparison_matrix = self._generate_comparison_matrix(
                    user_characteristics, predicate_characteristics,
                    device_description, predicate
                )
                
                # Generate testing recommendations
                testing_recommendations = comparison_matrix.testing_recommendations
                
                # Generate regulatory considerations
                regulatory_considerations = []
                if comparison_matrix.risk_assessment == "high":
                    regulatory_considerations.append("High-risk differences may require clinical data")
                if len(comparison_matrix.differences) > 3:
                    regulatory_considerations.append("Multiple differences require comprehensive justification")
                if comparison_matrix.confidence_score < 0.5:
                    regulatory_considerations.append("Consider alternative predicates or De Novo pathway")
                
                # Create predicate match
                predicate_match = PredicateMatch(
                    k_number=predicate.k_number,
                    device_name=predicate.device_name or "",
                    intended_use=predicate.intended_use or "",
                    product_code=predicate.product_code or "",
                    clearance_date=predicate.clearance_date or "",
                    applicant=predicate.applicant or "",
                    confidence_score=similarity_score,
                    similarity_reasons=similarity_reasons,
                    technological_characteristics=predicate_characteristics,
                    comparison_matrix=comparison_matrix,
                    testing_recommendations=testing_recommendations,
                    regulatory_considerations=regulatory_considerations
                )
                
                analyzed_predicates.append(predicate_match)
                
            except Exception as e:
                logger.warning(f"Error analyzing predicate {predicate.k_number}: {e}")
                continue
        
        # Sort by confidence score (descending)
        analyzed_predicates.sort(key=lambda x: x.confidence_score, reverse=True)
        
        # Return top results
        return analyzed_predicates[:max_results]
    
    def _generate_search_recommendations(
        self,
        predicates: List[PredicateMatch],
        device_description: str,
        intended_use: str
    ) -> List[str]:
        """Generate overall search recommendations"""
        
        recommendations = []
        
        if not predicates:
            recommendations.extend([
                "No suitable predicates found - consider De Novo pathway",
                "Broaden search criteria or consider related device types",
                "Schedule FDA pre-submission meeting to discuss regulatory strategy"
            ])
            return recommendations
        
        best_predicate = predicates[0]
        
        if best_predicate.confidence_score >= 0.7:
            recommendations.append("Strong predicate candidates identified")
        elif best_predicate.confidence_score >= 0.5:
            recommendations.append("Moderate predicate candidates found - additional analysis recommended")
        else:
            recommendations.append("Weak predicate matches - consider alternative search strategies")
        
        # Analyze overall patterns
        high_confidence_count = len([p for p in predicates if p.confidence_score >= 0.6])
        if high_confidence_count >= 3:
            recommendations.append("Multiple strong predicates available - select best match for submission")
        
        # Risk assessment recommendations
        high_risk_count = len([p for p in predicates if p.comparison_matrix.risk_assessment == "high"])
        if high_risk_count == len(predicates):
            recommendations.append("All predicates show high-risk differences - consider clinical studies")
        
        # Testing recommendations
        common_tests = Counter()
        for predicate in predicates:
            for test in predicate.testing_recommendations:
                common_tests[test] += 1
        
        if common_tests:
            most_common_test = common_tests.most_common(1)[0]
            if most_common_test[1] >= len(predicates) * 0.5:
                recommendations.append(f"Consistent testing need identified: {most_common_test[0]}")
        
        return recommendations
    
    def _run(self, **kwargs) -> Dict[str, Any]:
        """Synchronous wrapper for async implementation"""
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        device_description: str,
        intended_use: str,
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        technology_characteristics: Optional[List[str]] = None,
        max_results: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute predicate search with comprehensive analysis
        
        Args:
            device_description: Detailed device description
            intended_use: Intended use statement
            product_code: Optional FDA product code filter
            device_class: Optional device class filter
            technology_characteristics: Optional list of tech characteristics
            max_results: Maximum number of results to return
        
        Returns:
            Comprehensive predicate search result dictionary
        """
        try:
            logger.info(f"Starting predicate search for: {device_description[:100]}...")
            
            # Perform search and analysis
            predicates = await self._search_and_analyze_predicates(
                device_description=device_description,
                intended_use=intended_use,
                product_code=product_code,
                device_class=device_class,
                technology_characteristics=technology_characteristics,
                max_results=max_results
            )
            
            # Generate overall recommendations
            recommendations = self._generate_search_recommendations(
                predicates, device_description, intended_use
            )
            
            # Calculate overall confidence score
            if predicates:
                overall_confidence = sum(p.confidence_score for p in predicates) / len(predicates)
            else:
                overall_confidence = 0.0
            
            # Generate search statistics
            search_statistics = {
                "total_predicates_found": len(predicates),
                "high_confidence_predicates": len([p for p in predicates if p.confidence_score >= 0.7]),
                "medium_confidence_predicates": len([p for p in predicates if 0.5 <= p.confidence_score < 0.7]),
                "low_confidence_predicates": len([p for p in predicates if p.confidence_score < 0.5]),
                "average_confidence_score": overall_confidence,
                "search_terms_used": self._extract_keywords(f"{device_description} {intended_use}"),
                "filters_applied": {
                    "product_code": product_code,
                    "device_class": device_class,
                    "technology_characteristics": technology_characteristics
                }
            }
            
            # Generate search summary
            search_summary = {
                "device_description": device_description,
                "intended_use": intended_use,
                "search_timestamp": datetime.now().isoformat(),
                "predicates_analyzed": len(predicates),
                "best_match_confidence": predicates[0].confidence_score if predicates else 0.0,
                "overall_assessment": recommendations[0] if recommendations else "No assessment available"
            }
            
            # Generate sources
            sources = [
                {
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm",
                    "title": "FDA 510(k) Premarket Notification Database",
                    "effective_date": datetime.now().strftime("%Y-%m-%d"),
                    "document_type": "FDA_DATABASE",
                    "accessed_date": datetime.now().strftime("%Y-%m-%d")
                }
            ]
            
            # Add specific K-number sources for top predicates
            for predicate in predicates[:3]:  # Top 3 predicates
                sources.append({
                    "url": f"https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID={predicate.k_number}",
                    "title": f"FDA 510(k) Summary - {predicate.k_number}",
                    "effective_date": predicate.clearance_date,
                    "document_type": "FDA_510K",
                    "accessed_date": datetime.now().strftime("%Y-%m-%d")
                })
            
            # Create final result
            result = PredicateSearchResult(
                search_summary=search_summary,
                top_predicates=predicates,
                search_statistics=search_statistics,
                recommendations=recommendations,
                confidence_score=overall_confidence,
                sources=sources
            )
            
            logger.info(f"Predicate search complete: {len(predicates)} predicates found, confidence {overall_confidence:.2f}")
            
            return result.to_dict()
        
        except PredicateNotFoundError as e:
            logger.warning(f"No predicates found: {e}")
            # Return empty result with recommendations
            return {
                "search_summary": {
                    "device_description": device_description,
                    "intended_use": intended_use,
                    "search_timestamp": datetime.now().isoformat(),
                    "predicates_analyzed": 0,
                    "best_match_confidence": 0.0,
                    "overall_assessment": "No suitable predicates found"
                },
                "top_predicates": [],
                "search_statistics": {
                    "total_predicates_found": 0,
                    "high_confidence_predicates": 0,
                    "medium_confidence_predicates": 0,
                    "low_confidence_predicates": 0,
                    "average_confidence_score": 0.0
                },
                "recommendations": [
                    "No suitable predicates found - consider De Novo pathway",
                    "Broaden search criteria or consider related device types",
                    "Schedule FDA pre-submission meeting to discuss regulatory strategy"
                ],
                "confidence_score": 0.0,
                "sources": []
            }
        
        except Exception as e:
            logger.error(f"Error in predicate search: {e}")
            raise FDAAPIError(f"Predicate search failed: {str(e)}")
    
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
                    "product_code": {
                        "type": "string",
                        "description": "Optional FDA product code filter"
                    },
                    "device_class": {
                        "type": "string",
                        "description": "Optional device class filter (I, II, III)"
                    },
                    "technology_characteristics": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of technology characteristics"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return"
                    }
                },
                "required": ["device_description", "intended_use"]
            },
            "output_schema": {
                "type": "object",
                "properties": {
                    "search_summary": {"type": "object"},
                    "top_predicates": {"type": "array"},
                    "search_statistics": {"type": "object"},
                    "recommendations": {"type": "array", "items": {"type": "string"}},
                    "confidence_score": {"type": "number"},
                    "sources": {"type": "array"}
                }
            }
        }
    
    async def health_check(self) -> bool:
        """Check if tool is healthy and available"""
        try:
            # Test basic functionality with a simple search
            test_result = await self._arun(
                device_description="Test medical device",
                intended_use="Test diagnostic purpose",
                max_results=1
            )
            return isinstance(test_result, dict) and "search_summary" in test_result
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False