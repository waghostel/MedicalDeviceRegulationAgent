"""
Authentication middleware for agent integration
"""

import os
import jwt
import bcrypt
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel


class User(BaseModel):
    """User model for authentication"""
    id: str
    email: str
    name: str
    sub: Optional[str] = None  # JWT subject claim


# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"


# Simple bearer token security (for MVP - replace with proper auth in production)
security = HTTPBearer(auto_error=False)


async def auth_middleware(request: Request, call_next):
    """
    Authentication middleware to handle authentication errors properly.
    
    This middleware catches authentication exceptions and converts them
    to proper HTTP responses instead of letting them bubble up as 500 errors.
    """
    try:
        response = await call_next(request)
        return response
    except HTTPException as e:
        # Re-raise HTTPExceptions as-is (they're already proper HTTP responses)
        raise
    except Exception as e:
        # Log unexpected errors but don't expose internal details
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in auth middleware: {e}")
        
        # Check if this looks like an authentication error
        error_str = str(e).lower()
        if any(keyword in error_str for keyword in ['token', 'auth', 'credential', 'jwt']):
            # Convert to proper 401 response
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication failed"}
            )
        
        # Re-raise other exceptions
        raise


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    Get current authenticated user
    
    For MVP, this is a simplified implementation.
    In production, you would validate JWT tokens, check database, etc.
    """
    
    # For development/testing, allow requests without authentication
    # or with a simple test token
    if not credentials:
        # Return a default test user for development
        return User(
            id="test-user-1",
            email="test@example.com",
            name="Test User",
            sub="test-user-1"
        )
    
    token = credentials.credentials
    
    try:
        # Try JWT validation first
        jwt_payload = validate_jwt_token(token)
        if jwt_payload:
            return User(
                id=jwt_payload.get("sub", "unknown"),
                email=jwt_payload.get("email", "unknown@example.com"),
                name=jwt_payload.get("name", "Unknown User"),
                sub=jwt_payload.get("sub")
            )
        
        # Simple token validation for MVP
        if token == "test-token":
            return User(
                id="test-user-1",
                email="test@example.com",
                name="Test User",
                sub="test-user-1"
            )
        elif token.startswith("user-"):
            # Extract user ID from token for testing
            user_id = token.replace("user-", "")
            return User(
                id=user_id,
                email=f"{user_id}@example.com",
                name=f"User {user_id}",
                sub=user_id
            )
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        # Convert any other exceptions to proper 401 responses
        raise HTTPException(
            status_code=401,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None
    """
    
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def validate_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate JWT token and return payload if valid
    
    Args:
        token: JWT token string
        
    Returns:
        Dict containing token payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check if token is expired
        if "exp" in payload:
            if payload["exp"] < time.time():
                return None
        
        # Ensure required claims are present
        if "sub" not in payload:
            return None
            
        return payload
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        password: Plain text password
        hashed_password: Hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False