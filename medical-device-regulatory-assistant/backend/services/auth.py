"""Authentication service for JWT token validation."""

import os
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import bcrypt


class TokenData(BaseModel):
    """Token data model."""
    sub: str
    email: str
    name: str
    exp: datetime
    iat: datetime




def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def validate_jwt_token(token: str, secret_key: str = None) -> Dict[str, Any]:
    """Validate JWT token and return payload."""
    if secret_key is None:
        secret_key = os.getenv("NEXTAUTH_SECRET", "your-secret-key")
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.DecodeError, jwt.InvalidSignatureError, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthService:
    """Authentication service for JWT token validation."""
    
    def __init__(self):
        self.secret_key = os.getenv("NEXTAUTH_SECRET", "your-secret-key")
        self.algorithm = "HS256"
        self.security = HTTPBearer()
    
    def verify_token(self, token: str) -> TokenData:
        """Verify JWT token and return user data."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Extract user data from token
            user_id = payload.get("sub")
            email = payload.get("email")
            name = payload.get("name")
            exp = datetime.fromtimestamp(payload.get("exp", 0))
            iat = datetime.fromtimestamp(payload.get("iat", 0))
            
            if not user_id or not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing user data",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if token is expired
            if exp < datetime.now(UTC).replace(tzinfo=None):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(
                sub=user_id,
                email=email,
                name=name,
                exp=exp,
                iat=iat
            )
            
        except HTTPException:
            # Re-raise HTTPExceptions (like missing user data) as-is
            raise
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except (jwt.DecodeError, jwt.InvalidSignatureError, jwt.InvalidTokenError, Exception):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Global auth service instance
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> TokenData:
    """Dependency to get current authenticated user."""
    return auth_service.verify_token(credentials.credentials)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[TokenData]:
    """Dependency to get current user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        return auth_service.verify_token(credentials.credentials)
    except HTTPException:
        return None


async def get_current_user_ws(token: str) -> TokenData:
    """Get current user for WebSocket connections."""
    return auth_service.verify_token(token)