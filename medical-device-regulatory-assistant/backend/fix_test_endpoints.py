#!/usr/bin/env python3
"""Fix test endpoints to use correct API paths"""

import re

def fix_test_file():
    """Fix the test endpoints file"""
    file_path = "tests/test_auth_endpoints.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix all project endpoints
    replacements = [
        (r'"/projects/"', '"/api/projects/"'),
        (r'"/projects/1"', '"/api/projects/1"'),
        (r'"/projects/1/dashboard"', '"/api/projects/1/dashboard"'),
        (r'"/projects/1/export', '"/api/projects/1/export'),
    ]
    
    for old, new in replacements:
        content = re.sub(old, new, content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ Fixed test endpoints")

if __name__ == "__main__":
    fix_test_file()