#!/usr/bin/env python3
"""Quick authentication test"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from tests.test_auth_endpoints import test_auth_service_directly

if __name__ == "__main__":
    print("Quick Authentication Test")
    print("=" * 40)
    
    result = test_auth_service_directly()
    
    print(f"\nTest Results: {result}")
    
    if all(result.values()):
        print("✅ All authentication tests passed!")
    else:
        print("❌ Some authentication tests failed")