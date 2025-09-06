#!/usr/bin/env python3
"""Debug token creation and verification"""

import os
import sys
import jwt
from datetime import datetime, timedelta
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.auth import AuthService

# Test token creation
secret_key = "test-secret-key-for-medical-device-assistant"
algorithm = "HS256"

# Create token data
now = datetime.utcnow()
user_data = {
    "sub": "test-user-123",
    "email": "test.user@medicaldevice.com",
    "name": "Test User",
    "role": "regulatory_manager",
    "iat": int(now.timestamp()),
    "exp": int((now + timedelta(hours=1)).timestamp()),
    "iss": "medical-device-assistant-test",
    "aud": "medical-device-assistant-api"
}

print("Token payload:", user_data)

# Create token
token = jwt.encode(user_data, secret_key, algorithm=algorithm)
print(f"Generated token: {token}")

# Decode token to verify
try:
    decoded = jwt.decode(token, secret_key, algorithms=[algorithm])
    print("Decoded token:", decoded)
except Exception as e:
    print(f"Token decode error: {e}")

# Test with auth service
os.environ["NEXTAUTH_SECRET"] = secret_key
auth_service = AuthService()

try:
    token_data = auth_service.verify_token(token)
    print(f"Auth service verification successful: {token_data.email}")
except Exception as e:
    print(f"Auth service verification failed: {e}")
    import traceback
    traceback.print_exc()