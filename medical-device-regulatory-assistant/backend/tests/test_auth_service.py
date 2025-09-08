"""Integration tests for authentication service."""

import pytest
import jwt
from datetime import datetime, timezone, timedelta, UTC
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.auth import AuthService, TokenData, get_current_user, get_optional_user


class TestAuthService:
    """Test authentication service."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.auth_service = AuthService()
        self.test_secret = "test-secret-key"
        self.auth_service.secret_key = self.test_secret
    
    def create_test_token(self, user_data: dict, expires_delta: timedelta = None) -> str:
        """Create a test JWT token."""
        if expires_delta is None:
            expires_delta = timedelta(hours=1)
        
        now = datetime.now(UTC).replace(tzinfo=None)
        exp = now + expires_delta
        
        payload = {
            "sub": user_data.get("sub", "test-user-id"),
            "email": user_data.get("email", "test@example.com"),
            "name": user_data.get("name", "Test User"),
            "exp": exp,
            "iat": now,
        }
        
        return jwt.encode(payload, self.test_secret, algorithm="HS256")
    
    def test_verify_valid_token(self):
        """Test verification of valid JWT token."""
        user_data = {
            "sub": "user123",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
        
        token = self.create_test_token(user_data)
        result = self.auth_service.verify_token(token)
        
        assert isinstance(result, TokenData)
        assert result.sub == "user123"
        assert result.email == "john.doe@example.com"
        assert result.name == "John Doe"
        assert result.exp > datetime.now(UTC).replace(tzinfo=None)
    
    def test_verify_expired_token(self):
        """Test verification of expired JWT token."""
        user_data = {
            "sub": "user123",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
        
        # Create token that expires in the past
        expired_token = self.create_test_token(
            user_data, 
            expires_delta=timedelta(hours=-1)
        )
        
        with pytest.raises(HTTPException) as exc_info:
            self.auth_service.verify_token(expired_token)
        
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()
    
    def test_verify_invalid_token_format(self):
        """Test verification of invalid token format."""
        invalid_token = "invalid.token.format"
        
        with pytest.raises(HTTPException) as exc_info:
            self.auth_service.verify_token(invalid_token)
        
        assert exc_info.value.status_code == 401
        assert "validate credentials" in exc_info.value.detail.lower()
    
    def test_verify_token_missing_user_data(self):
        """Test verification of token missing required user data."""
        # Create token without required fields
        payload = {
            "exp": datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
            "iat": datetime.now(UTC).replace(tzinfo=None),
        }
        
        token = jwt.encode(payload, self.test_secret, algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            self.auth_service.verify_token(token)
        
        assert exc_info.value.status_code == 401
        assert "missing user data" in exc_info.value.detail.lower()
    
    def test_verify_token_wrong_secret(self):
        """Test verification of token signed with wrong secret."""
        user_data = {
            "sub": "user123",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
        
        # Create token with different secret
        wrong_secret_token = jwt.encode(
            {
                "sub": user_data["sub"],
                "email": user_data["email"],
                "name": user_data["name"],
                "exp": datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
                "iat": datetime.now(UTC).replace(tzinfo=None),
            },
            "wrong-secret",
            algorithm="HS256"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            self.auth_service.verify_token(wrong_secret_token)
        
        assert exc_info.value.status_code == 401


class TestAuthDependencies:
    """Test authentication dependencies."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.auth_service = AuthService()
        self.test_secret = "test-secret-key"
        self.auth_service.secret_key = self.test_secret
    
    def create_test_token(self, user_data: dict) -> str:
        """Create a test JWT token."""
        payload = {
            "sub": user_data.get("sub", "test-user-id"),
            "email": user_data.get("email", "test@example.com"),
            "name": user_data.get("name", "Test User"),
            "exp": datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
            "iat": datetime.now(UTC).replace(tzinfo=None),
        }
        
        return jwt.encode(payload, self.test_secret, algorithm="HS256")
    
    @pytest.mark.asyncio
    async def test_get_current_user_valid_token(self):
        """Test get_current_user with valid token."""
        user_data = {
            "sub": "user123",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
        
        token = self.create_test_token(user_data)
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )
        
        # Mock the auth service in the dependency
        import services.auth
        original_auth_service = services.auth.auth_service
        services.auth.auth_service = self.auth_service
        
        try:
            result = await get_current_user(credentials)
            
            assert isinstance(result, TokenData)
            assert result.sub == "user123"
            assert result.email == "john.doe@example.com"
            assert result.name == "John Doe"
        finally:
            # Restore original auth service
            services.auth.auth_service = original_auth_service
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self):
        """Test get_current_user with invalid token."""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid.token"
        )
        
        # Mock the auth service in the dependency
        import services.auth
        original_auth_service = services.auth.auth_service
        services.auth.auth_service = self.auth_service
        
        try:
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials)
            
            assert exc_info.value.status_code == 401
        finally:
            # Restore original auth service
            services.auth.auth_service = original_auth_service
    
    @pytest.mark.asyncio
    async def test_get_optional_user_valid_token(self):
        """Test get_optional_user with valid token."""
        user_data = {
            "sub": "user123",
            "email": "john.doe@example.com",
            "name": "John Doe"
        }
        
        token = self.create_test_token(user_data)
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=token
        )
        
        # Mock the auth service in the dependency
        import services.auth
        original_auth_service = services.auth.auth_service
        services.auth.auth_service = self.auth_service
        
        try:
            result = await get_optional_user(credentials)
            
            assert isinstance(result, TokenData)
            assert result.sub == "user123"
        finally:
            # Restore original auth service
            services.auth.auth_service = original_auth_service
    
    @pytest.mark.asyncio
    async def test_get_optional_user_no_credentials(self):
        """Test get_optional_user with no credentials."""
        result = await get_optional_user(None)
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_optional_user_invalid_token(self):
        """Test get_optional_user with invalid token."""
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid.token"
        )
        
        # Mock the auth service in the dependency
        import services.auth
        original_auth_service = services.auth.auth_service
        services.auth.auth_service = self.auth_service
        
        try:
            result = await get_optional_user(credentials)
            assert result is None  # Should return None instead of raising exception
        finally:
            # Restore original auth service
            services.auth.auth_service = original_auth_service


if __name__ == "__main__":
    pytest.main([__file__, "-v"])