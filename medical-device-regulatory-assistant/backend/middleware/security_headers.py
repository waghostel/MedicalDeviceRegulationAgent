"""
Security headers middleware for API protection
"""

import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.config = {
            "x_content_type_options": "nosniff",
            "x_frame_options": "DENY",
            "x_xss_protection": "1; mode=block",
            "referrer_policy": "strict-origin-when-cross-origin",
            "content_security_policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "strict_transport_security": "max-age=31536000; includeSubDomains",
            **kwargs
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response"""
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = self.config["x_content_type_options"]
        response.headers["X-Frame-Options"] = self.config["x_frame_options"]
        response.headers["X-XSS-Protection"] = self.config["x_xss_protection"]
        response.headers["Referrer-Policy"] = self.config["referrer_policy"]
        response.headers["Content-Security-Policy"] = self.config["content_security_policy"]
        
        # Only add HSTS for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = self.config["strict_transport_security"]
        
        return response