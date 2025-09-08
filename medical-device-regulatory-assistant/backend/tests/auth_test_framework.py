#!/usr/bin/env python3
"""
Authentication Testing Framework for Medical Device Regulatory Assistant

This module provides utilities for testing authentication-protected endpoints
including mock tokens, test users, and authentication helpers.
"""

import os
import sys
import jwt
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi.testclient import TestClient
from fastapi import HTTPException
import pytest
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.auth import AuthService, TokenData


class AuthTestFramework:
    """Framework for testing authentication in the Medical Device Assistant"""
    
    def __init__(self, secret_key: str = None):
        """
        Initialize the authentication test framework
        
        Args:
            secret_key: JWT secret key (defaults to test key)
        """
        self.secret_key = secret_key or "test-secret-key-for-medical-device-assistant"
        self.algorithm = "HS256"
        
        # Test user data
        self.test_users = {
            "valid_user": {
                "sub": "test-user-123",
                "email": "test.user@medicaldevice.com",
                "name": "Test User",
                "role": "regulatory_manager"
            },
            "admin_user": {
                "sub": "admin-user-456",
                "email": "admin@medicaldevice.com", 
                "name": "Admin User",
                "role": "admin"
            },
            "expired_user": {
                "sub": "expired-user-789",
                "email": "expired@medicaldevice.com",
                "name": "Expired User",
                "role": "regulatory_manager"
            },
            "invalid_user": {
                "sub": "invalid-user-000",
                "email": "invalid@medicaldevice.com",
                "name": "Invalid User",
                "role": "guest"
            }
        }
    
    def create_test_token(
        self, 
        user_type: str = "valid_user",
        expires_in_minutes: int = 1440,  # 24 hours default
        custom_claims: Dict[str, Any] = None
    ) -> str:
        """
        Create a test JWT token for authentication testing
        
        Args:
            user_type: Type of test user (valid_user, admin_user, expired_user, invalid_user)
            expires_in_minutes: Token expiration time in minutes
            custom_claims: Additional claims to include in token
            
        Returns:
            str: JWT token string
        """
        if user_type not in self.test_users:
            raise ValueError(f"Unknown user type: {user_type}")
        
        user_data = self.test_users[user_type].copy()
        
        # Add timestamp claims
        now = datetime.now(timezone.utc)
        user_data.update({
            "iat": int((now - timedelta(minutes=5)).timestamp()),  # Issued 5 minutes ago to avoid clock skew
            "exp": int((now + timedelta(minutes=expires_in_minutes)).timestamp())
            # Remove iss and aud claims as they're not expected by the auth service
        })
        
        # Add custom claims if provided
        if custom_claims:
            user_data.update(custom_claims)
        
        # Handle expired user case
        if user_type == "expired_user":
            user_data["exp"] = int((now - timedelta(minutes=30)).timestamp())  # Expired 30 minutes ago
            user_data["iat"] = int((now - timedelta(hours=1)).timestamp())  # Issued 1 hour ago
        
        return jwt.encode(user_data, self.secret_key, algorithm=self.algorithm)
    
    def create_invalid_token(self, invalid_type: str = "malformed") -> str:
        """
        Create various types of invalid tokens for testing
        
        Args:
            invalid_type: Type of invalid token (malformed, wrong_signature, missing_claims)
            
        Returns:
            str: Invalid token string
        """
        if invalid_type == "malformed":
            return "invalid.jwt.token"
        
        elif invalid_type == "wrong_signature":
            # Create token with wrong secret
            user_data = self.test_users["valid_user"].copy()
            now = datetime.now(timezone.utc)
            user_data.update({
                "iat": now,
                "exp": now + timedelta(hours=1)
            })
            return jwt.encode(user_data, "wrong-secret-key", algorithm=self.algorithm)
        
        elif invalid_type == "missing_claims":
            # Create token without required claims
            now = datetime.now(timezone.utc)
            incomplete_data = {
                "iat": int((now - timedelta(minutes=5)).timestamp()),
                "exp": int((now + timedelta(hours=1)).timestamp())
                # Missing sub, email, name
            }
            return jwt.encode(incomplete_data, self.secret_key, algorithm=self.algorithm)
        
        else:
            raise ValueError(f"Unknown invalid token type: {invalid_type}")
    
    def get_auth_headers(self, token: str) -> Dict[str, str]:
        """
        Get authentication headers for API requests
        
        Args:
            token: JWT token
            
        Returns:
            Dict: Headers with Authorization bearer token
        """
        return {"Authorization": f"Bearer {token}"}
    
    def create_mock_auth_service(self) -> AuthService:
        """
        Create a mock authentication service for testing
        
        Returns:
            AuthService: Configured auth service with test secret
        """
        # Set environment variable for testing
        os.environ["NEXTAUTH_SECRET"] = self.secret_key
        
        # Create new auth service instance
        auth_service = AuthService()
        
        return auth_service
    
    def verify_token_data(self, token_data: TokenData, expected_user_type: str) -> bool:
        """
        Verify that token data matches expected user type
        
        Args:
            token_data: Decoded token data
            expected_user_type: Expected user type
            
        Returns:
            bool: True if token data matches expected user
        """
        if expected_user_type not in self.test_users:
            return False
        
        expected_user = self.test_users[expected_user_type]
        
        return (
            token_data.sub == expected_user["sub"] and
            token_data.email == expected_user["email"] and
            token_data.name == expected_user["name"]
        )


class AuthenticatedTestClient:
    """Test client wrapper with authentication support"""
    
    def __init__(self, client: TestClient, auth_framework: AuthTestFramework):
        """
        Initialize authenticated test client
        
        Args:
            client: FastAPI test client
            auth_framework: Authentication test framework
        """
        self.client = client
        self.auth_framework = auth_framework
        self.current_token = None
        self.current_headers = {}
    
    def authenticate_as(self, user_type: str = "valid_user", **token_kwargs) -> str:
        """
        Authenticate as a specific test user
        
        Args:
            user_type: Type of test user
            **token_kwargs: Additional arguments for token creation
            
        Returns:
            str: Generated token
        """
        self.current_token = self.auth_framework.create_test_token(user_type, **token_kwargs)
        self.current_headers = self.auth_framework.get_auth_headers(self.current_token)
        return self.current_token
    
    def clear_authentication(self):
        """Clear current authentication"""
        self.current_token = None
        self.current_headers = {}
    
    def get(self, url: str, **kwargs):
        """GET request with authentication"""
        kwargs.setdefault("headers", {}).update(self.current_headers)
        return self.client.get(url, **kwargs)
    
    def post(self, url: str, **kwargs):
        """POST request with authentication"""
        kwargs.setdefault("headers", {}).update(self.current_headers)
        return self.client.post(url, **kwargs)
    
    def put(self, url: str, **kwargs):
        """PUT request with authentication"""
        kwargs.setdefault("headers", {}).update(self.current_headers)
        return self.client.put(url, **kwargs)
    
    def delete(self, url: str, **kwargs):
        """DELETE request with authentication"""
        kwargs.setdefault("headers", {}).update(self.current_headers)
        return self.client.delete(url, **kwargs)


# Test scenarios and fixtures
class AuthTestScenarios:
    """Common authentication test scenarios"""
    
    @staticmethod
    def test_valid_authentication(auth_client: AuthenticatedTestClient, endpoint: str):
        """Test valid authentication scenario"""
        # Authenticate as valid user
        token = auth_client.authenticate_as("valid_user")
        
        # Make authenticated request
        response = auth_client.get(endpoint)
        
        return {
            "token": token,
            "response": response,
            "status_code": response.status_code,
            "authenticated": response.status_code != 401
        }
    
    @staticmethod
    def test_no_authentication(client: TestClient, endpoint: str):
        """Test request without authentication"""
        response = client.get(endpoint)
        
        return {
            "response": response,
            "status_code": response.status_code,
            "should_be_401": response.status_code == 401
        }
    
    @staticmethod
    def test_invalid_token(client: TestClient, auth_framework: AuthTestFramework, endpoint: str):
        """Test request with invalid token"""
        invalid_token = auth_framework.create_invalid_token("malformed")
        headers = auth_framework.get_auth_headers(invalid_token)
        
        response = client.get(endpoint, headers=headers)
        
        return {
            "token": invalid_token,
            "response": response,
            "status_code": response.status_code,
            "should_be_401": response.status_code == 401
        }
    
    @staticmethod
    def test_expired_token(client: TestClient, auth_framework: AuthTestFramework, endpoint: str):
        """Test request with expired token"""
        expired_token = auth_framework.create_test_token("expired_user")
        headers = auth_framework.get_auth_headers(expired_token)
        
        response = client.get(endpoint, headers=headers)
        
        return {
            "token": expired_token,
            "response": response,
            "status_code": response.status_code,
            "should_be_401": response.status_code == 401
        }


# Pytest fixtures
@pytest.fixture
def auth_framework():
    """Pytest fixture for authentication framework"""
    return AuthTestFramework()


@pytest.fixture
def auth_client(client, auth_framework):
    """Pytest fixture for authenticated test client"""
    return AuthenticatedTestClient(client, auth_framework)


# Test data generators
def generate_test_project_data(user_id: str = "test-user-123") -> Dict[str, Any]:
    """Generate test project data for authenticated endpoints"""
    return {
        "name": "Test Medical Device Project",
        "description": "A test project for regulatory pathway discovery",
        "device_type": "Class II Medical Device",
        "intended_use": "For diagnostic testing in clinical settings",
        "user_id": user_id
    }


def generate_test_agent_request(project_id: str = "1") -> Dict[str, Any]:
    """Generate test agent request data"""
    return {
        "task_type": "device_classification",
        "project_id": project_id,
        "device_description": "Portable diagnostic device for blood glucose monitoring",
        "intended_use": "For self-monitoring of blood glucose levels in diabetic patients",
        "device_type": "Class II Medical Device",
        "parameters": {
            "include_predicate_search": True,
            "confidence_threshold": 0.8
        }
    }


# Environment setup helpers
def setup_test_environment():
    """Setup test environment with proper authentication configuration"""
    # Set test environment variables
    os.environ["NEXTAUTH_SECRET"] = "test-secret-key-for-medical-device-assistant"
    os.environ["TESTING"] = "true"
    
    # Disable external API calls during testing
    os.environ["DISABLE_FDA_API"] = "true"
    os.environ["DISABLE_REDIS"] = "true"


def cleanup_test_environment():
    """Cleanup test environment"""
    test_vars = ["NEXTAUTH_SECRET", "TESTING", "DISABLE_FDA_API", "DISABLE_REDIS"]
    for var in test_vars:
        os.environ.pop(var, None)


if __name__ == "__main__":
    # Example usage
    print("Authentication Testing Framework for Medical Device Regulatory Assistant")
    print("=" * 70)
    
    # Create framework instance
    auth_framework = AuthTestFramework()
    
    # Generate test tokens
    print("\n🔑 Test Tokens:")
    valid_token = auth_framework.create_test_token("valid_user")
    print(f"Valid User Token: {valid_token[:50]}...")
    
    expired_token = auth_framework.create_test_token("expired_user")
    print(f"Expired Token: {expired_token[:50]}...")
    
    invalid_token = auth_framework.create_invalid_token("malformed")
    print(f"Invalid Token: {invalid_token}")
    
    # Test token verification
    print("\n🧪 Token Verification:")
    
    # Set the environment variable to match our test secret
    os.environ["NEXTAUTH_SECRET"] = auth_framework.secret_key
    auth_service = AuthService()
    
    try:
        token_data = auth_service.verify_token(valid_token)
        print(f"✅ Valid token verified: {token_data.email}")
    except HTTPException as e:
        print(f"❌ Valid token failed: {e.detail}")
    
    try:
        token_data = auth_service.verify_token(expired_token)
        print(f"❌ Expired token should have failed: {token_data.email}")
    except HTTPException as e:
        print(f"✅ Expired token correctly rejected: {e.detail}")
    
    try:
        token_data = auth_service.verify_token(invalid_token)
        print(f"❌ Invalid token should have failed: {token_data.email}")
    except HTTPException as e:
        print(f"✅ Invalid token correctly rejected: {e.detail}")
    
    print("\n🎯 Framework ready for testing protected endpoints!")
    print("📖 See test_auth_endpoints.py for usage examples")