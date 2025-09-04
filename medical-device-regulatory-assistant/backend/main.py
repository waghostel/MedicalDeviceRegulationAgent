"""FastAPI main application entry point."""

import os
import signal
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import middleware
from middleware.logging import RequestLoggingMiddleware
from middleware.compression import CompressionMiddleware
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


# Global shutdown event
shutdown_event = asyncio.Event()

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"🛑 Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Medical Device Regulatory Assistant API starting up...")
    
    # Initialize database connections
    try:
        from database.connection import init_database
        await init_database()
        print("✅ Database connection initialized")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise
    
    # Initialize Redis connection
    try:
        from services.cache import init_redis
        await init_redis()
        print("✅ Redis connection initialized")
    except Exception as e:
        print(f"⚠️ Redis initialization failed: {e}")
        # Redis is optional, continue without it
    
    # Initialize FDA API client
    try:
        from services.openfda import create_openfda_service
        app.state.fda_service = await create_openfda_service()
        print("✅ FDA API client initialized")
    except Exception as e:
        print(f"❌ FDA API client initialization failed: {e}")
        raise
    
    print("🎉 Application startup completed successfully")
    
    yield
    
    # Shutdown
    print("🛑 Medical Device Regulatory Assistant API shutting down...")
    
    # Close database connections
    try:
        from database.connection import close_database
        await close_database()
        print("✅ Database connections closed")
    except Exception as e:
        print(f"⚠️ Error closing database: {e}")
    
    # Close Redis connection
    try:
        from services.cache import close_redis
        await close_redis()
        print("✅ Redis connection closed")
    except Exception as e:
        print(f"⚠️ Error closing Redis: {e}")
    
    # Close FDA API client
    try:
        if hasattr(app.state, 'fda_service') and app.state.fda_service:
            await app.state.fda_service.close()
        print("✅ FDA API client closed")
    except Exception as e:
        print(f"⚠️ Error closing FDA API client: {e}")
    
    print("✅ Graceful shutdown completed")


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

# Add performance middleware
app.add_middleware(CompressionMiddleware, minimum_size=1024, compression_level=6)

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