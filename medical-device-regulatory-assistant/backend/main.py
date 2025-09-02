"""FastAPI main application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import middleware
from middleware.logging import RequestLoggingMiddleware
from middleware.error_handling import (
    RegulatoryAssistantError,
    FDAAPIError,
    AuthenticationError,
    regulatory_assistant_exception_handler,
    fda_api_exception_handler,
    authentication_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler,
)

# Import API routes
from api.health import router as health_router
from api.projects import router as projects_router
from api.websocket import router as websocket_router
from api.agent_integration import router as agent_router
from api.audit import router as audit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Medical Device Regulatory Assistant API starting up...")
    
    # Perform startup tasks here (database connections, etc.)
    
    yield
    
    # Shutdown
    print("🛑 Medical Device Regulatory Assistant API shutting down...")
    
    # Perform cleanup tasks here


# Create FastAPI application
app = FastAPI(
    title="Medical Device Regulatory Assistant API",
    description="""
    Backend services for FDA regulatory pathway discovery and medical device compliance.
    
    This API provides:
    - Device classification and product code identification
    - 510(k) predicate search and analysis
    - FDA guidance document mapping
    - Regulatory workflow automation
    - Audit trail and compliance tracking
    """,
    version="0.1.0",
    contact={
        "name": "Medical Device Regulatory Assistant Team",
        "email": "support@medical-device-assistant.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js frontend (development)
        "https://localhost:3000",  # Next.js frontend (HTTPS development)
        "http://127.0.0.1:3000",  # Alternative localhost
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Register exception handlers
app.add_exception_handler(RegulatoryAssistantError, regulatory_assistant_exception_handler)
app.add_exception_handler(FDAAPIError, fda_api_exception_handler)
app.add_exception_handler(AuthenticationError, authentication_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API routers
app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(websocket_router)
app.include_router(agent_router)
app.include_router(audit_router)

# Root endpoint
@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """
    Root endpoint providing basic API information.
    
    Returns:
        dict: Basic API status and information
    """
    return {
        "message": "Medical Device Regulatory Assistant API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


# Legacy health endpoint for backward compatibility
@app.get("/health", tags=["health"], deprecated=True)
async def legacy_health_check() -> dict[str, str]:
    """
    Legacy health check endpoint.
    
    **Deprecated**: Use `/api/health` for comprehensive health checks.
    
    Returns:
        dict: Basic health status
    """
    return {
        "status": "healthy",
        "service": "medical-device-regulatory-assistant-backend",
        "version": "0.1.0",
        "note": "Use /api/health for detailed health information"
    }


if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )