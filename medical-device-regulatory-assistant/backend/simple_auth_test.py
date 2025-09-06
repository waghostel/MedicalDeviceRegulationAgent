#!/usr/bin/env python3
"""Simple authentication test"""

import os
import sys
import jwt
from datetime import datetime, timedelta
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.auth import AuthService

def test_simple_auth():
    print("Simple Authentication Test")
    print("=" * 40)
    
    # Set up test environment
    secret_key = "test-secret-key-for-medical-device-assistant"
    os.environ["NEXTAUTH_SECRET"] = secret_key
    
    # Create auth service
    auth_service = AuthService()
    
    # Create a simple valid token
    now = datetime.utcnow()
    print(f"Current time: {now}")
    
    payload = {
        "sub": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "iat": int((now - timedelta(minutes=5)).timestamp()),  # Issued 5 minutes ago
        "exp": int((now + timedelta(hours=24)).timestamp())    # Expires in 24 hours
    }
    
    print(f"Token payload: {payload}")
    
    # Create token
    token = jwt.encode(payload, secret_key, algorithm="HS256")
    print(f"Generated token: {token[:50]}...")
    
    # Test verification
    try:
        token_data = auth_service.verify_token(token)
        print(f"✅ Token verification successful!")
        print(f"   User: {token_data.email}")
        print(f"   Name: {token_data.name}")
        print(f"   Expires: {token_data.exp}")
        return True
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        return False

if __name__ == "__main__":
    success = test_simple_auth()
    if success:
        print("\n🎉 Authentication is working correctly!")
    else:
        print("\n❌ Authentication test failed")