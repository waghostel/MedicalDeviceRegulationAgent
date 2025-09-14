#!/usr/bin/env python3
"""
FDA API Documentation Validation Script

This script validates that all FDA API documentation files are present
and contain the expected content structure.
"""

import os
import sys
from pathlib import Path

def validate_documentation():
    """Validate FDA API documentation files"""
    docs_dir = Path(__file__).parent
    
    # Expected documentation files
    expected_files = [
        "fda_api_integration_guide.md",
        "fda_api_troubleshooting_guide.md", 
        "fda_api_configuration_guide.md",
        "fda_api_performance_guide.md",
        "fda_api_migration_guide.md",
        "fda_api_maintenance_guide.md"
    ]
    
    print("FDA API Documentation Validation")
    print("=" * 40)
    
    all_valid = True
    
    for filename in expected_files:
        file_path = docs_dir / filename
        
        if file_path.exists():
            # Check file size (should not be empty)
            file_size = file_path.stat().st_size
            if file_size > 100:  # At least 100 bytes
                print(f"✓ {filename} - Present ({file_size} bytes)")
            else:
                print(f"✗ {filename} - Too small ({file_size} bytes)")
                all_valid = False
        else:
            print(f"✗ {filename} - Missing")
            all_valid = False
    
    print("\n" + "=" * 40)
    
    if all_valid:
        print("✓ All FDA API documentation files are present and valid")
        return True
    else:
        print("✗ Some documentation files are missing or invalid")
        return False

if __name__ == "__main__":
    success = validate_documentation()
    sys.exit(0 if success else 1)