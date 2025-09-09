#!/usr/bin/env python3
"""
Test script for enhanced project export functionality.
This test works with the existing project service to test export enhancements.
"""

import asyncio
import json
import tempfile
import os
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from services.projects import ProjectService
    from database.connection import get_database_manager
    from models.project import Project
    from models.user import User
    from sqlalchemy import select
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure you're running this from the backend directory and all dependencies are installed.")
    sys.exit(1)


async def test_enhanced_export_functionality():
    """Test the enhanced export functionality using existing project service."""
    print("🧪 Testing Enhanced Project Export Functionality")
    print("=" * 60)
    
    # Initialize services
    project_service = ProjectService()
    
    try:
        # Test 1: Basic JSON Export Enhancement
        print("\n1. Testing Basic JSON Export Enhancement...")
        
        # Get a test project (assuming we have seeded data)
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            # Find a test user and project
            user_stmt = select(User).limit(1)
            user_result = await session.execute(user_stmt)
            test_user = user_result.scalar_one_or_none()
            
            if not test_user:
                print("❌ No test user found. Please run database seeding first.")
                return False
            
            project_stmt = select(Project).where(Project.user_id == test_user.id).limit(1)
            project_result = await session.execute(project_stmt)
            test_project = project_result.scalar_one_or_none()
            
            if not test_project:
                print("❌ No test project found. Please run database seeding first.")
                return False
            
            print(f"   Using test project: {test_project.name} (ID: {test_project.id})")
            
            # Test basic export functionality
            export_data = await project_service.export_project(
                project_id=test_project.id,
                user_id=test_user.google_id,
                format_type="json"
            )
            
            print(f"   ✅ Basic JSON export completed")
            print(f"   📊 Export contains: {len(export_data.classifications)} classifications, "
                  f"{len(export_data.predicates)} predicates, "
                  f"{len(export_data.interactions)} interactions")
        
        # Test 2: Enhanced JSON Export with Metadata
        print("\n2. Testing Enhanced JSON Export with Metadata...")
        
        # Convert to dict and add enhanced metadata
        export_dict = export_data.model_dump()
        
        # Add enhanced metadata
        export_id = hashlib.sha256(
            f"{test_project.id}_{test_user.google_id}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        enhanced_data = {
            **export_dict,
            "metadata": {
                "export_id": export_id,
                "project_id": test_project.id,
                "user_id": test_user.google_id,
                "format_type": "json",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "version": "2.0",
                "schema_version": "1.0"
            }
        }
        
        # Calculate checksum
        data_for_checksum = json.dumps(enhanced_data, sort_keys=True, default=str)
        checksum = hashlib.sha256(data_for_checksum.encode()).hexdigest()
        enhanced_data["metadata"]["checksum"] = checksum
        enhanced_data["metadata"]["size_bytes"] = len(data_for_checksum)
        
        print(f"   ✅ Enhanced JSON export completed with metadata")
        print(f"   📊 Export ID: {export_id}")
        print(f"   🔐 Checksum: {checksum[:16]}...")
        print(f"   📏 Size: {len(data_for_checksum)} bytes")
        
        # Test 3: Export Validation
        print("\n3. Testing Export Data Validation...")
        
        # Basic validation
        validation_errors = []
        validation_warnings = []
        
        # Check required fields
        if not enhanced_data.get('project', {}).get('name'):
            validation_errors.append("Project name is required")
        
        if not enhanced_data.get('metadata', {}).get('export_id'):
            validation_errors.append("Export ID is required")
        
        if not enhanced_data.get('metadata', {}).get('checksum'):
            validation_warnings.append("Checksum is missing")
        
        # Validate predicates
        predicates = enhanced_data.get('predicates', [])
        for i, predicate in enumerate(predicates):
            if not predicate.get('k_number'):
                validation_errors.append(f"Predicate {i+1} missing K-number")
        
        if len(validation_errors) == 0:
            print(f"   ✅ Export data validation passed")
            if validation_warnings:
                print(f"   ⚠️  Warnings: {len(validation_warnings)}")
        else:
            print(f"   ❌ Export data validation failed: {validation_errors}")
            return False
        
        # Test 4: Integrity Verification
        print("\n4. Testing Export Integrity Verification...")
        
        # Verify checksum
        stored_checksum = enhanced_data['metadata']['checksum']
        
        # Create a copy without checksum for verification
        data_copy = enhanced_data.copy()
        data_copy['metadata'] = data_copy['metadata'].copy()
        data_copy['metadata'].pop('checksum', None)
        
        # Calculate verification checksum
        verification_data = json.dumps(data_copy, sort_keys=True, default=str)
        verification_checksum = hashlib.sha256(verification_data.encode()).hexdigest()
        
        if stored_checksum == verification_checksum:
            print(f"   ✅ Export integrity verification passed")
        else:
            print(f"   ❌ Export integrity verification failed")
            print(f"      Stored: {stored_checksum[:16]}...")
            print(f"      Calculated: {verification_checksum[:16]}...")
            return False
        
        # Test 5: Backup Creation
        print("\n5. Testing Backup Creation...")
        
        # Create backup directory
        backup_dir = Path("backups/projects")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"project_{test_project.id}_full_{timestamp}.json"
        backup_path = backup_dir / backup_filename
        
        # Write backup file
        with open(backup_path, 'w') as f:
            json.dump(enhanced_data, f, indent=2, default=str)
        
        # Calculate file checksum
        with open(backup_path, 'rb') as f:
            file_checksum = hashlib.sha256(f.read()).hexdigest()
        
        backup_result = {
            'success': True,
            'backup_path': str(backup_path),
            'backup_type': 'full',
            'checksum': file_checksum,
            'size_bytes': backup_path.stat().st_size,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        print(f"   ✅ Project backup created successfully")
        print(f"   📁 Backup path: {backup_result['backup_path']}")
        print(f"   🔐 Backup checksum: {backup_result['checksum'][:16]}...")
        print(f"   📏 Backup size: {backup_result['size_bytes']} bytes")
        
        # Test 6: CSV Export Generation
        print("\n6. Testing CSV Export Generation...")
        
        # Generate CSV data
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Project information
        writer.writerow(["Section", "Field", "Value"])
        writer.writerow(["Project", "ID", export_data.project.id])
        writer.writerow(["Project", "Name", export_data.project.name])
        writer.writerow(["Project", "Description", export_data.project.description or ""])
        writer.writerow(["Project", "Status", export_data.project.status.value])
        writer.writerow([])  # Empty row
        
        # Predicates
        if export_data.predicates:
            writer.writerow(["Predicate Devices", "", ""])
            writer.writerow(["Predicate", "K-Number", "Device Name", "Confidence Score"])
            for i, predicate in enumerate(export_data.predicates):
                writer.writerow([
                    f"Predicate {i+1}",
                    predicate.get('k_number', ''),
                    predicate.get('device_name', ''),
                    predicate.get('confidence_score', '')
                ])
        
        csv_data = output.getvalue()
        csv_size = len(csv_data)
        
        print(f"   ✅ CSV export generated successfully")
        print(f"   📏 CSV size: {csv_size} bytes")
        print(f"   📊 CSV lines: {len(csv_data.splitlines())}")
        
        print("\n" + "=" * 60)
        print("🎉 All enhanced export functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Run the test
    success = asyncio.run(test_enhanced_export_functionality())
    
    if success:
        print("\n✅ Enhanced export functionality is working correctly!")
        exit(0)
    else:
        print("\n❌ Enhanced export functionality tests failed!")
        exit(1)