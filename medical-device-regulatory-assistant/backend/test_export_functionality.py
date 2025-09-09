#!/usr/bin/env python3
"""
Test script for enhanced project export and backup functionality.
Tests comprehensive data validation, PDF generation, and integrity checks.
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
    from services.projects import ProjectService, ProjectExportData
    from services.export_service import EnhancedExportService
    from database.connection import get_database_manager
    from models.project import Project, ProjectStatus
    from models.user import User
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure you're running this from the backend directory and all dependencies are installed.")
    sys.exit(1)


async def test_enhanced_export_functionality():
    """Test the enhanced export functionality with comprehensive validation."""
    print("🧪 Testing Enhanced Project Export and Backup Functionality")
    print("=" * 60)
    
    # Initialize services
    project_service = ProjectService()
    export_service = EnhancedExportService()
    
    try:
        # Test 1: JSON Export with Validation
        print("\n1. Testing JSON Export with Comprehensive Validation...")
        
        # Get a test project (assuming we have seeded data)
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            # Find a test user and project
            from sqlalchemy import select
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
            
            # Test JSON export with validation
            export_data = await export_service.export_project_enhanced(
                project_id=test_project.id,
                user_id=test_user.google_id,
                format_type="json",
                include_validation=True
            )
            
            print(f"   ✅ JSON export completed with validation")
            print(f"   📊 Export contains: {len(export_data.get('classifications', []))} classifications, "
                  f"{len(export_data.get('predicates', []))} predicates, "
                  f"{len(export_data.get('interactions', []))} interactions")
            
            # Validate export data structure
            validation_result = export_service.validate_export_data(export_data)
            if validation_result['is_valid']:
                print(f"   ✅ Export data validation passed")
            else:
                print(f"   ❌ Export data validation failed: {validation_result['errors']}")
                return False
        
        # Test 2: PDF Export with Enhanced Formatting
        print("\n2. Testing PDF Export with Enhanced Formatting...")
        
        pdf_data = await export_service.export_project_enhanced(
            project_id=test_project.id,
            user_id=test_user.google_id,
            format_type="pdf",
            include_validation=True
        )
        
        # Save PDF to temporary file for validation
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_pdf:
            temp_pdf.write(pdf_data)
            temp_pdf_path = temp_pdf.name
        
        # Validate PDF file
        pdf_size = os.path.getsize(temp_pdf_path)
        print(f"   ✅ PDF export completed, size: {pdf_size} bytes")
        
        # Clean up
        os.unlink(temp_pdf_path)
        
        # Test 3: Export Integrity Checks
        print("\n3. Testing Export Integrity Checks...")
        
        integrity_data = await export_service.create_export_with_integrity(
            project_id=test_project.id,
            user_id=test_user.google_id,
            format_type="json"
        )
        
        # Verify integrity
        is_valid = export_service.verify_export_integrity(integrity_data)
        if is_valid:
            print(f"   ✅ Export integrity verification passed")
            print(f"   🔐 Checksum: {integrity_data['metadata']['checksum'][:16]}...")
        else:
            print(f"   ❌ Export integrity verification failed")
            return False
        
        # Test 4: Large Dataset Performance
        print("\n4. Testing Export Performance with Large Dataset...")
        
        start_time = datetime.now()
        
        # Export with performance monitoring
        performance_data = await export_service.export_with_performance_monitoring(
            project_id=test_project.id,
            user_id=test_user.google_id,
            format_type="json"
        )
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        print(f"   ✅ Performance test completed in {execution_time:.2f} seconds")
        print(f"   📈 Memory usage: {performance_data['performance']['memory_usage_mb']:.2f} MB")
        print(f"   📊 Data size: {performance_data['performance']['export_size_mb']:.2f} MB")
        
        # Test 5: Backup Functionality
        print("\n5. Testing Backup Functionality...")
        
        backup_result = await export_service.create_project_backup(
            project_id=test_project.id,
            user_id=test_user.google_id,
            backup_type="full"
        )
        
        if backup_result['success']:
            print(f"   ✅ Project backup created successfully")
            print(f"   📁 Backup path: {backup_result['backup_path']}")
            print(f"   🔐 Backup checksum: {backup_result['checksum'][:16]}...")
        else:
            print(f"   ❌ Project backup failed: {backup_result['error']}")
            return False
        
        print("\n" + "=" * 60)
        print("🎉 All export and backup functionality tests passed!")
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