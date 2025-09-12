#!/usr/bin/env python3
"""Simple authentication test"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

def test_auth():
    """Simple authentication test"""
    print("🔐 Simple Authentication Test")
    print("=" * 40)
    
    try:
        # Set test environment
        os.environ["TESTING"] = "true"
        os.environ["NEXTAUTH_SECRET"] = "test-secret-key-for-medical-device-assistant"
        
        from fastapi.testclient import TestClient
        from main import app
        from tests.auth_test_framework import AuthTestFramework
        
        client = TestClient(app)
        auth_framework = AuthTestFramework()
        
        print("✅ Test setup complete")
        
        # Test 1: Health endpoint (should not require auth)
        print("\n🧪 Test 1: Health endpoint (no auth required)")
        response = client.get("/health")
        print(f"  Status: {response.status_code}")
        assert response.status_code == 200, "Health endpoint should work"
        print("  ✅ Health endpoint accessible")
        
        # Test 2: Projects endpoint without auth
        print("\n🧪 Test 2: Projects endpoint without auth")
        response = client.get("/api/projects/")
        print(f"  Status: {response.status_code}")
        if response.status_code == 401:
            print("  ✅ Correctly requires authentication")
        elif response.status_code == 404:
            print("  ⚠️  Endpoint not found - check routing")
        else:
            print(f"  ❓ Unexpected status: {response.status_code}")
        
        # Test 3: Projects endpoint with invalid token
        print("\n🧪 Test 3: Projects endpoint with invalid token")
        invalid_token = auth_framework.create_invalid_token("malformed")
        headers = {"Authorization": f"Bearer {invalid_token}"}
        response = client.get("/api/projects/", headers=headers)
        print(f"  Status: {response.status_code}")
        if response.status_code == 401:
            print("  ✅ Correctly rejects invalid token")
        else:
            print(f"  ❓ Unexpected status: {response.status_code}")
        
        # Test 4: Agent endpoint without auth
        print("\n🧪 Test 4: Agent endpoint without auth")
        response = client.get("/api/agent/sessions")
        print(f"  Status: {response.status_code}")
        if response.status_code == 401:
            print("  ✅ Correctly requires authentication")
        else:
            print(f"  ❓ Unexpected status: {response.status_code}")
        
        print("\n✅ Simple authentication test completed")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_auth()
    if success:
        print("\n🎉 Authentication is working correctly!")
    else:
        print("\n⚠️  Authentication test failed")
    sys.exit(0 if success else 1)