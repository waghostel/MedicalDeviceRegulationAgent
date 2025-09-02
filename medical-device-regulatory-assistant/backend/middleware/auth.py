"""
Authentication middleware for agent integration
"""

from typing import Optional
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel


class User(BaseModel):
    """User model for authentication"""
    id: str
    email: str
    name: str


# Simple bearer token security (for MVP - replace with proper auth in production)
security = HTTPBearer(auto_error=False)


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
            name="Test User"
        )
    
    token = credentials.credentials
    
    # Simple token validation for MVP
    if token == "test-token":
        return User(
            id="test-user-1",
            email="test@example.com",
            name="Test User"
        )
    elif token.startswith("user-"):
        # Extract user ID from token for testing
        user_id = token.replace("user-", "")
        return User(
            id=user_id,
            email=f"{user_id}@example.com",
            name=f"User {user_id}"
        )
    else:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
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