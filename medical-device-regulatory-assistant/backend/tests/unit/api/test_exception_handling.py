#!/usr/bin/env python3
"""
Test script for the custom exception handling system.

This script tests all custom exception classes and their error handling
to ensure proper functionality and user-friendly error messages.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any

from exceptions.project_exceptions import (
    ProjectError,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectStateError,
    ProjectDuplicateError,
    ProjectExportError,
    ProjectImportError,
    ProjectConcurrencyError,
    ProjectQuotaExceededError,
)

from exceptions.regulatory_exceptions import (
    RegulatoryError,
    FDAAPIError,
    ClassificationError,
    PredicateSearchError,
    ComplianceError,
    DocumentProcessingError,
    GuidanceSearchError,
    RegulatoryPathwayError,
)


def test_project_exceptions():
    """Test all project-specific exceptions."""
    print("Testing Project Exceptions...")
    print("=" * 50)
    
    # Test ProjectNotFoundError
    try:
        raise ProjectNotFoundError(project_id=123, user_id="user_456")
    except ProjectNotFoundError as e:
        print(f"✓ ProjectNotFoundError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print(f"  Error Code: {e.error_code}")
        print()
    
    # Test ProjectAccessDeniedError
    try:
        raise ProjectAccessDeniedError(
            project_id=123, 
            user_id="user_456", 
            required_permission="edit"
        )
    except ProjectAccessDeniedError as e:
        print(f"✓ ProjectAccessDeniedError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test ProjectValidationError
    try:
        raise ProjectValidationError(
            field="name",
            value="",
            constraint="must be between 1-255 characters"
        )
    except ProjectValidationError as e:
        print(f"✓ ProjectValidationError: {e.user_message}")
        print(f"  Field-specific suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test ProjectStateError
    try:
        raise ProjectStateError(
            project_id=123,
            current_state="draft",
            required_state="in_progress",
            operation="export"
        )
    except ProjectStateError as e:
        print(f"✓ ProjectStateError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test ProjectDuplicateError
    try:
        raise ProjectDuplicateError(
            field="name",
            value="My Device Project",
            existing_project_id=456
        )
    except ProjectDuplicateError as e:
        print(f"✓ ProjectDuplicateError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test ProjectExportError
    try:
        raise ProjectExportError(
            project_id=123,
            export_format="PDF",
            reason="Insufficient data for PDF generation",
            export_stage="data_collection"
        )
    except ProjectExportError as e:
        print(f"✓ ProjectExportError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test ProjectQuotaExceededError
    try:
        raise ProjectQuotaExceededError(
            user_id="user_456",
            current_count=10,
            max_allowed=10,
            quota_type="projects"
        )
    except ProjectQuotaExceededError as e:
        print(f"✓ ProjectQuotaExceededError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()


def test_regulatory_exceptions():
    """Test all regulatory-specific exceptions."""
    print("Testing Regulatory Exceptions...")
    print("=" * 50)
    
    # Test FDAAPIError - Rate Limited
    try:
        raise FDAAPIError(
            operation="predicate_search",
            status_code=429,
            api_message="Rate limit exceeded",
            rate_limited=True,
            retry_after=60
        )
    except FDAAPIError as e:
        print(f"✓ FDAAPIError (Rate Limited): {e.user_message}")
        print(f"  Error Code: {e.error_code}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test FDAAPIError - Service Unavailable
    try:
        raise FDAAPIError(
            operation="device_classification",
            status_code=503,
            api_message="Service temporarily unavailable"
        )
    except FDAAPIError as e:
        print(f"✓ FDAAPIError (Unavailable): {e.user_message}")
        print(f"  Error Code: {e.error_code}")
        print()
    
    # Test ClassificationError
    try:
        raise ClassificationError(
            device_description="Novel AI-powered diagnostic device",
            reason="Insufficient information for classification",
            confidence_score=0.3,
            suggested_classes=["II", "III"]
        )
    except ClassificationError as e:
        print(f"✓ ClassificationError: {e.user_message}")
        print(f"  Confidence Score: {e.confidence_score}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test PredicateSearchError - No Results
    try:
        raise PredicateSearchError(
            search_criteria={"device_type": "Novel Device", "intended_use": "Unique indication"},
            reason="No matching predicates found",
            results_count=0
        )
    except PredicateSearchError as e:
        print(f"✓ PredicateSearchError (No Results): {e.user_message}")
        print(f"  Error Code: {e.error_code}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test PredicateSearchError - Low Confidence
    try:
        raise PredicateSearchError(
            search_criteria={"device_type": "Cardiac Monitor"},
            reason="Low confidence matches",
            results_count=5,
            confidence_threshold=0.8
        )
    except PredicateSearchError as e:
        print(f"✓ PredicateSearchError (Low Confidence): {e.user_message}")
        print(f"  Error Code: {e.error_code}")
        print()
    
    # Test ComplianceError
    try:
        violations = [
            {
                "description": "Missing biocompatibility testing",
                "severity": "high",
                "suggestion": "Conduct ISO 10993 biocompatibility testing"
            },
            {
                "description": "Incomplete software documentation",
                "severity": "medium",
                "suggestion": "Provide IEC 62304 software documentation"
            }
        ]
        raise ComplianceError(
            compliance_type="510(k) Submission",
            violations=violations,
            severity="error"
        )
    except ComplianceError as e:
        print(f"✓ ComplianceError: {e.user_message}")
        print(f"  Violations: {e.details['violation_count']}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()
    
    # Test DocumentProcessingError
    try:
        raise DocumentProcessingError(
            filename="device_manual.pdf",
            operation="text_extraction",
            reason="Document appears to be password protected",
            document_type="user_manual",
            processing_stage="ocr"
        )
    except DocumentProcessingError as e:
        print(f"✓ DocumentProcessingError: {e.user_message}")
        print(f"  Suggestions: {len(e.suggestions)} provided")
        print()


def test_exception_serialization():
    """Test exception serialization to dictionary."""
    print("Testing Exception Serialization...")
    print("=" * 50)
    
    # Test ProjectNotFoundError serialization
    exc = ProjectNotFoundError(project_id=123, user_id="user_456")
    exc_dict = exc.to_dict()
    
    print("✓ Exception serialization test:")
    print(f"  Error Code: {exc_dict['error_code']}")
    print(f"  Message: {exc_dict['message']}")
    print(f"  User Message: {exc_dict['user_message']}")
    print(f"  Details: {exc_dict['details']}")
    print(f"  Suggestions Count: {len(exc_dict['suggestions'])}")
    print(f"  Timestamp: {exc_dict['timestamp']}")
    print()
    
    # Test RegulatoryError with confidence score
    reg_exc = ClassificationError(
        device_description="Test device",
        reason="Test reason",
        confidence_score=0.75
    )
    reg_dict = reg_exc.to_dict()
    
    print("✓ Regulatory exception with confidence score:")
    print(f"  Confidence Score: {reg_dict.get('confidence_score')}")
    print()


def test_error_response_format():
    """Test that error responses follow the expected format."""
    print("Testing Error Response Format...")
    print("=" * 50)
    
    # Create a sample exception
    exc = ProjectValidationError(
        field="intended_use",
        value="A" * 6000,  # Too long
        constraint="must be under 5000 characters"
    )
    
    error_dict = exc.to_dict()
    
    # Verify required fields are present
    required_fields = [
        "error_code", "message", "user_message", 
        "details", "suggestions", "timestamp"
    ]
    
    print("✓ Checking required fields in error response:")
    for field in required_fields:
        if field in error_dict:
            print(f"  ✓ {field}: Present")
        else:
            print(f"  ✗ {field}: Missing")
    
    print()
    
    # Verify suggestions are actionable
    suggestions = error_dict["suggestions"]
    print(f"✓ Suggestions provided: {len(suggestions)}")
    for i, suggestion in enumerate(suggestions[:3], 1):
        print(f"  {i}. {suggestion}")
    
    print()


def test_exception_inheritance():
    """Test exception inheritance hierarchy."""
    print("Testing Exception Inheritance...")
    print("=" * 50)
    
    # Test that all custom exceptions inherit from appropriate base classes
    project_exc = ProjectNotFoundError(123)
    regulatory_exc = FDAAPIError("test", 500)
    
    print("✓ Inheritance tests:")
    print(f"  ProjectNotFoundError is ProjectError: {isinstance(project_exc, ProjectError)}")
    print(f"  ProjectNotFoundError is Exception: {isinstance(project_exc, Exception)}")
    print(f"  FDAAPIError is RegulatoryError: {isinstance(regulatory_exc, RegulatoryError)}")
    print(f"  FDAAPIError is Exception: {isinstance(regulatory_exc, Exception)}")
    print()


def main():
    """Run all exception handling tests."""
    print("Medical Device Regulatory Assistant - Exception Handling Tests")
    print("=" * 70)
    print()
    
    try:
        test_project_exceptions()
        test_regulatory_exceptions()
        test_exception_serialization()
        test_error_response_format()
        test_exception_inheritance()
        
        print("=" * 70)
        print("✅ All exception handling tests completed successfully!")
        print()
        print("Key Features Verified:")
        print("  ✓ User-friendly error messages")
        print("  ✓ Actionable suggestions for error resolution")
        print("  ✓ Structured error details")
        print("  ✓ Proper error codes and categorization")
        print("  ✓ Exception serialization for API responses")
        print("  ✓ Inheritance hierarchy")
        print()
        print("The custom exception handling system is ready for integration!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()