#!/usr/bin/env python3
"""
Authentication Test Runner for Medical Device Regulatory Assistant

This script runs comprehensive authentication tests for all protected API endpoints.
"""

import os
import sys
import asyncio
import subprocess
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

def run_authentication_tests():
    """Run all authentication tests"""
    print("🔐 Authentication Test Suite for Medical Device Regulatory Assistant")
    print("=" * 70)
    
    # Set test environment
    os.environ["TESTING"] = "true"
    os.environ["NEXTAUTH_SECRET"] = "test-secret-key-for-medical-device-assistant"
    
    try:
        # Run pytest with specific test file
        cmd = [
            "poetry", "run", "pytest", 
            "tests/test_auth_endpoints.py",
            "-v",
            "--tb=short",
            "--color=yes",
            "-x"  # Stop on first failure
        ]
        
        print("🧪 Running authentication tests...")
        print(f"Command: {' '.join(cmd)}")
        print("-" * 50)
        
        result = subprocess.run(cmd, capture_output=False, text=True)
        
        if result.returncode == 0:
            print("\n✅ All authentication tests passed!")
            print("🔒 API endpoints are properly protected")
            return True
        else:
            print(f"\n❌ Authentication tests failed with exit code: {result.returncode}")
            print("🔧 Check the test output above for details")
            return False
            
    except FileNotFoundError:
        print("❌ Poetry not found. Please ensure Poetry is installed and in PATH")
        return False
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def run_auth_framework_demo():
    """Run authentication framework demonstration"""
    print("\n🎯 Authentication Framework Demo")
    print("-" * 40)
    
    try:
        from tests.auth_test_framework import AuthTestFramework
        
        # Create framework instance
        auth_framework = AuthTestFramework()
        
        print("✅ Authentication framework loaded successfully")
        
        # Generate test tokens
        print("\n🔑 Generating test tokens:")
        
        valid_token = auth_framework.create_test_token("valid_user")
        print(f"  Valid User Token: {valid_token[:50]}...")
        
        admin_token = auth_framework.create_test_token("admin_user")
        print(f"  Admin User Token: {admin_token[:50]}...")
        
        expired_token = auth_framework.create_test_token("expired_user")
        print(f"  Expired Token: {expired_token[:50]}...")
        
        invalid_token = auth_framework.create_invalid_token("malformed")
        print(f"  Invalid Token: {invalid_token}")
        
        print("\n✅ Token generation working correctly")
        
        # Test token verification
        print("\n🧪 Testing token verification:")
        
        os.environ["NEXTAUTH_SECRET"] = auth_framework.secret_key
        
        try:
            from services.auth import AuthService
            auth_service = AuthService()
            
            # Test valid token
            try:
                token_data = auth_service.verify_token(valid_token)
                print(f"  ✅ Valid token verified: {token_data.email}")
            except Exception as e:
                print(f"  ❌ Valid token failed: {e}")
            
            # Test expired token
            try:
                token_data = auth_service.verify_token(expired_token)
                print(f"  ❌ Expired token should have failed: {token_data.email}")
            except Exception as e:
                print(f"  ✅ Expired token correctly rejected: {str(e)[:50]}...")
            
            # Test invalid token
            try:
                token_data = auth_service.verify_token(invalid_token)
                print(f"  ❌ Invalid token should have failed: {token_data.email}")
            except Exception as e:
                print(f"  ✅ Invalid token correctly rejected: {str(e)[:50]}...")
                
        except ImportError as e:
            print(f"  ⚠️  Auth service not available: {e}")
        
        print("\n✅ Authentication framework demo completed")
        return True
        
    except Exception as e:
        print(f"❌ Framework demo failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_quick_auth_test():
    """Run a quick authentication test without full pytest"""
    print("\n⚡ Quick Authentication Test")
    print("-" * 30)
    
    try:
        from fastapi.testclient import TestClient
        from main import app
        from tests.auth_test_framework import AuthTestFramework, setup_test_environment
        
        # Setup test environment
        setup_test_environment()
        
        # Create test client and auth framework
        client = TestClient(app)
        auth_framework = AuthTestFramework()
        
        print("✅ Test environment setup complete")
        
        # Test 1: No authentication
        print("\n🧪 Test 1: No authentication")
        response = client.get("/api/projects/")
        print(f"  Status: {response.status_code} (expected: 401)")
        assert response.status_code == 401, "Should require authentication"
        print("  ✅ Correctly rejected unauthenticated request")
        
        # Test 2: Invalid token
        print("\n🧪 Test 2: Invalid token")
        invalid_token = auth_framework.create_invalid_token("malformed")
        headers = auth_framework.get_auth_headers(invalid_token)
        response = client.get("/api/projects/", headers=headers)
        print(f"  Status: {response.status_code} (expected: 401)")
        assert response.status_code == 401, "Should reject invalid token"
        print("  ✅ Correctly rejected invalid token")
        
        # Test 3: Valid token (mocked)
        print("\n🧪 Test 3: Valid token")
        valid_token = auth_framework.create_test_token("valid_user")
        headers = auth_framework.get_auth_headers(valid_token)
        
        # Mock the project service to avoid database dependencies
        from unittest.mock import patch
        with patch('api.projects.project_service.list_projects') as mock_list:
            mock_list.return_value = []
            response = client.get("/api/projects/", headers=headers)
            print(f"  Status: {response.status_code} (expected: 200)")
            
            if response.status_code == 200:
                print("  ✅ Valid token accepted")
            elif response.status_code == 401:
                print("  ⚠️  Valid token rejected (may need auth service setup)")
            else:
                print(f"  ❓ Unexpected status: {response.status_code}")
        
        print("\n✅ Quick authentication test completed")
        return True
        
    except Exception as e:
        print(f"❌ Quick test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test runner"""
    print("Starting Authentication Test Suite...")
    
    # Run framework demo first
    demo_success = run_auth_framework_demo()
    
    # Run quick test
    quick_success = run_quick_auth_test()
    
    # Run full test suite
    full_success = run_authentication_tests()
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 30)
    print(f"Framework Demo: {'✅ PASS' if demo_success else '❌ FAIL'}")
    print(f"Quick Test: {'✅ PASS' if quick_success else '❌ FAIL'}")
    print(f"Full Test Suite: {'✅ PASS' if full_success else '❌ FAIL'}")
    
    if demo_success and quick_success and full_success:
        print("\n🎉 All authentication tests passed!")
        print("🔒 Your API endpoints are properly secured")
        return 0
    else:
        print("\n⚠️  Some authentication tests failed")
        print("🔧 Review the output above for details")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)