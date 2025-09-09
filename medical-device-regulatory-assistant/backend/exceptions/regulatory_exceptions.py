"""
Regulatory-specific exception classes for FDA and medical device operations.

These exceptions handle errors related to FDA API interactions, device classification,
predicate searches, and regulatory compliance operations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class RegulatoryError(Exception):
    """Base exception for regulatory-related errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "REGULATORY_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None,
        user_message: Optional[str] = None,
        confidence_score: Optional[float] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.suggestions = suggestions or []
        self.user_message = user_message or message
        self.confidence_score = confidence_score
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        result = {
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "details": self.details,
            "suggestions": self.suggestions,
            "timestamp": self.timestamp.isoformat()
        }
        
        if self.confidence_score is not None:
            result["confidence_score"] = self.confidence_score
        
        return result


class FDAAPIError(RegulatoryError):
    """Raised when FDA API operations fail."""
    
    def __init__(
        self,
        operation: str,
        status_code: Optional[int] = None,
        api_message: Optional[str] = None,
        rate_limited: bool = False,
        retry_after: Optional[int] = None
    ):
        details = {
            "operation": operation,
            "status_code": status_code,
            "api_message": api_message,
            "rate_limited": rate_limited,
            "retry_after": retry_after
        }
        
        if rate_limited:
            suggestions = [
                f"Wait {retry_after} seconds before retrying" if retry_after else "Wait before retrying",
                "Reduce the frequency of FDA API requests",
                "Consider caching results to minimize API calls",
                "Contact support if rate limiting persists"
            ]
            user_message = "FDA API rate limit exceeded. Please wait a moment and try again."
            error_code = "FDA_API_RATE_LIMITED"
        elif status_code == 503:
            suggestions = [
                "FDA API is temporarily unavailable",
                "Try again in a few minutes",
                "Check FDA API status page",
                "Use cached data if available"
            ]
            user_message = "FDA database is temporarily unavailable. Please try again later."
            error_code = "FDA_API_UNAVAILABLE"
        elif status_code == 404:
            suggestions = [
                "Check if the requested data exists in FDA database",
                "Verify search parameters are correct",
                "Try broader search criteria",
                "Check for typos in device names or K-numbers"
            ]
            user_message = "The requested information was not found in the FDA database."
            error_code = "FDA_DATA_NOT_FOUND"
        else:
            suggestions = [
                "Check internet connectivity",
                "Verify FDA API is accessible",
                "Try again in a few minutes",
                "Contact support if the problem persists"
            ]
            user_message = "Unable to connect to FDA database. Please check your connection and try again."
            error_code = "FDA_API_ERROR"
        
        super().__init__(
            message=f"FDA API {operation} failed: {api_message or 'Unknown error'}",
            error_code=error_code,
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ClassificationError(RegulatoryError):
    """Raised when device classification operations fail."""
    
    def __init__(
        self,
        device_description: str,
        reason: str,
        confidence_score: Optional[float] = None,
        suggested_classes: Optional[List[str]] = None
    ):
        details = {
            "device_description": device_description,
            "reason": reason,
            "suggested_classes": suggested_classes or []
        }
        
        suggestions = [
            "Provide more detailed device description",
            "Include specific intended use information",
            "Specify device technology and materials",
            "Consult FDA device classification database",
            "Consider scheduling FDA pre-submission meeting"
        ]
        
        if confidence_score and confidence_score < 0.5:
            suggestions.extend([
                "Device may be novel or have unclear classification",
                "Consider De Novo pathway for novel devices",
                "Consult with regulatory expert"
            ])
            user_message = "Device classification is uncertain. Additional information may be needed."
        else:
            user_message = f"Unable to classify device: {reason}"
        
        super().__init__(
            message=f"Device classification failed: {reason}",
            error_code="DEVICE_CLASSIFICATION_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message,
            confidence_score=confidence_score
        )


class PredicateSearchError(RegulatoryError):
    """Raised when predicate device search operations fail."""
    
    def __init__(
        self,
        search_criteria: Dict[str, Any],
        reason: str,
        results_count: int = 0,
        confidence_threshold: Optional[float] = None
    ):
        details = {
            "search_criteria": search_criteria,
            "reason": reason,
            "results_count": results_count,
            "confidence_threshold": confidence_threshold
        }
        
        if results_count == 0:
            suggestions = [
                "Broaden search criteria to find more predicates",
                "Try different device type keywords",
                "Search by product code instead of device name",
                "Consider predicates from related device categories",
                "Consult FDA 510(k) database manually"
            ]
            user_message = "No suitable predicate devices found. Try broadening your search criteria."
            error_code = "NO_PREDICATES_FOUND"
        elif confidence_threshold and results_count > 0:
            suggestions = [
                "Review lower-confidence predicates manually",
                "Refine search criteria for better matches",
                "Consider multiple predicates for comparison",
                "Consult with regulatory expert for predicate selection"
            ]
            user_message = f"Found {results_count} predicates but none meet confidence threshold."
            error_code = "LOW_CONFIDENCE_PREDICATES"
        else:
            suggestions = [
                "Check FDA API connectivity",
                "Verify search parameters are valid",
                "Try again with different search terms",
                "Contact support if searches continue to fail"
            ]
            user_message = f"Predicate search failed: {reason}"
            error_code = "PREDICATE_SEARCH_ERROR"
        
        super().__init__(
            message=f"Predicate search failed: {reason}",
            error_code=error_code,
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class ComplianceError(RegulatoryError):
    """Raised when regulatory compliance checks fail."""
    
    def __init__(
        self,
        compliance_type: str,
        violations: List[Dict[str, Any]],
        severity: str = "error"
    ):
        details = {
            "compliance_type": compliance_type,
            "violations": violations,
            "severity": severity,
            "violation_count": len(violations)
        }
        
        suggestions = []
        for violation in violations:
            if violation.get("suggestion"):
                suggestions.append(violation["suggestion"])
        
        if not suggestions:
            suggestions = [
                "Review FDA guidance documents",
                "Consult with regulatory expert",
                "Check CFR requirements for your device class",
                "Consider FDA pre-submission meeting"
            ]
        
        violation_summary = ", ".join([v.get("description", "Unknown violation") for v in violations[:3]])
        if len(violations) > 3:
            violation_summary += f" and {len(violations) - 3} more"
        
        user_message = f"Compliance issues found: {violation_summary}"
        
        super().__init__(
            message=f"{compliance_type} compliance check failed: {len(violations)} violations",
            error_code="COMPLIANCE_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class DocumentProcessingError(RegulatoryError):
    """Raised when document processing operations fail."""
    
    def __init__(
        self,
        filename: str,
        operation: str,
        reason: str,
        document_type: Optional[str] = None,
        processing_stage: Optional[str] = None
    ):
        details = {
            "filename": filename,
            "operation": operation,
            "reason": reason,
            "document_type": document_type,
            "processing_stage": processing_stage
        }
        
        suggestions = []
        
        if "format" in reason.lower():
            suggestions.extend([
                "Ensure document is in supported format (PDF, DOC, DOCX)",
                "Check if document is password protected",
                "Try converting to PDF format",
                "Verify file is not corrupted"
            ])
        elif "size" in reason.lower():
            suggestions.extend([
                "Reduce document file size",
                "Split large documents into smaller files",
                "Compress images in the document",
                "Remove unnecessary content"
            ])
        elif "text" in reason.lower() or "ocr" in reason.lower():
            suggestions.extend([
                "Ensure document contains readable text",
                "Check document image quality",
                "Try uploading a clearer scan",
                "Manually enter key information if OCR fails"
            ])
        else:
            suggestions.extend([
                "Check document file integrity",
                "Try uploading again",
                "Ensure stable internet connection",
                "Contact support if problem persists"
            ])
        
        user_message = f"Failed to process document '{filename}': {reason}"
        
        super().__init__(
            message=f"Document processing failed for {filename} ({operation}): {reason}",
            error_code="DOCUMENT_PROCESSING_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class GuidanceSearchError(RegulatoryError):
    """Raised when FDA guidance document search fails."""
    
    def __init__(
        self,
        search_terms: List[str],
        device_type: Optional[str] = None,
        reason: str = "Search failed"
    ):
        details = {
            "search_terms": search_terms,
            "device_type": device_type,
            "reason": reason
        }
        
        suggestions = [
            "Try different search keywords",
            "Search by device class or product code",
            "Check FDA guidance document database manually",
            "Use broader search terms",
            "Contact FDA for guidance document recommendations"
        ]
        
        user_message = f"Unable to find relevant FDA guidance documents for your search."
        
        super().__init__(
            message=f"Guidance search failed for terms {search_terms}: {reason}",
            error_code="GUIDANCE_SEARCH_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )


class RegulatoryPathwayError(RegulatoryError):
    """Raised when regulatory pathway determination fails."""
    
    def __init__(
        self,
        device_class: Optional[str] = None,
        product_code: Optional[str] = None,
        reason: str = "Pathway determination failed",
        possible_pathways: Optional[List[str]] = None
    ):
        details = {
            "device_class": device_class,
            "product_code": product_code,
            "reason": reason,
            "possible_pathways": possible_pathways or []
        }
        
        suggestions = [
            "Verify device classification is correct",
            "Check product code assignment",
            "Review FDA device classification database",
            "Consider multiple regulatory pathways",
            "Schedule FDA pre-submission meeting for guidance"
        ]
        
        if possible_pathways:
            pathway_list = ", ".join(possible_pathways)
            user_message = f"Multiple regulatory pathways possible: {pathway_list}. Expert consultation recommended."
        else:
            user_message = f"Unable to determine regulatory pathway: {reason}"
        
        super().__init__(
            message=f"Regulatory pathway determination failed: {reason}",
            error_code="REGULATORY_PATHWAY_ERROR",
            details=details,
            suggestions=suggestions,
            user_message=user_message
        )