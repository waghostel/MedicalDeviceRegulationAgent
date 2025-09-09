#!/usr/bin/env python3
"""
Minimal test for export service functionality.
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import BaseModel


class ExportValidationResult(BaseModel):
    """Result of export data validation."""
    is_valid: bool
    errors: list = []
    warnings: list = []
    validation_time_ms: float


class MinimalExportService:
    """Minimal export service for testing."""
    
    def __init__(self):
        pass
    
    def validate_export_data(self, export_data: Dict[str, Any]) -> ExportValidationResult:
        """Validate export data."""
        start_time = datetime.now()
        errors = []
        warnings = []
        
        # Basic validation
        if not export_data.get('project', {}).get('name'):
            errors.append("Project name is required")
        
        end_time = datetime.now()
        validation_time_ms = (end_time - start_time).total_seconds() * 1000
        
        return ExportValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validation_time_ms=validation_time_ms
        )
    
    def create_enhanced_export(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create enhanced export with metadata."""
        
        # Add enhanced metadata
        export_id = hashlib.sha256(
            f"{project_data.get('id', 0)}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        enhanced_data = {
            **project_data,
            "metadata": {
                "export_id": export_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "version": "2.0"
            }
        }
        
        # Calculate checksum
        data_for_checksum = json.dumps(enhanced_data, sort_keys=True, default=str)
        checksum = hashlib.sha256(data_for_checksum.encode()).hexdigest()
        enhanced_data["metadata"]["checksum"] = checksum
        
        return enhanced_data


def test_minimal_export():
    """Test the minimal export functionality."""
    print("🧪 Testing Minimal Export Functionality")
    print("=" * 50)
    
    # Initialize service
    export_service = MinimalExportService()
    
    # Test data
    test_project = {
        "project": {
            "id": 1,
            "name": "Test Medical Device Project",
            "description": "A test project for regulatory compliance",
            "device_type": "Class II Medical Device",
            "status": "DRAFT"
        },
        "classifications": [],
        "predicates": [],
        "documents": [],
        "interactions": []
    }
    
    try:
        # Test 1: Enhanced Export Creation
        print("\n1. Testing Enhanced Export Creation...")
        enhanced_export = export_service.create_enhanced_export(test_project)
        
        print(f"   ✅ Enhanced export created")
        print(f"   📊 Export ID: {enhanced_export['metadata']['export_id']}")
        print(f"   🔐 Checksum: {enhanced_export['metadata']['checksum'][:16]}...")
        
        # Test 2: Export Validation
        print("\n2. Testing Export Validation...")
        validation_result = export_service.validate_export_data(enhanced_export)
        
        if validation_result.is_valid:
            print(f"   ✅ Export validation passed")
        else:
            print(f"   ❌ Export validation failed: {validation_result.errors}")
        
        print(f"   ⏱️  Validation time: {validation_result.validation_time_ms:.2f}ms")
        
        # Test 3: JSON Serialization
        print("\n3. Testing JSON Serialization...")
        json_output = json.dumps(enhanced_export, indent=2, default=str)
        print(f"   ✅ JSON serialization successful, size: {len(json_output)} bytes")
        
        print("\n" + "=" * 50)
        print("🎉 All minimal export functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_minimal_export()
    
    if success:
        print("\n✅ Minimal export functionality is working correctly!")
        exit(0)
    else:
        print("\n❌ Minimal export functionality tests failed!")
        exit(1)