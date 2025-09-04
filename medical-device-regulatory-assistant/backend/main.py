"""FastAPI main application entry point."""

import os
import signal
import asyncio
import logging
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


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("medical_device_assistant.log") if os.getenv("LOG_TO_FILE", "false").lower() == "true" else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

# Global shutdown event
shutdown_event = asyncio.Event()

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info(f"🛑 Received signal {signum}, initiating graceful shutdown...")
    print(f"🛑 Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()

# Register signal handlers for graceful shutdown
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown events.
    
    Handles initialization and cleanup of:
    - Database connections
    - Redis cache (optional)
    - FDA API service
    
    Services are initialized in dependency order and cleaned up in reverse order.
    """
    startup_errors = []
    initialized_services = []
    startup_failed = False
    
    try:
        # Startup phase
        print("🚀 Medical Device Regulatory Assistant API starting up...")
        
        # 1. Initialize database connections (required)
        try:
            from database.connection import init_database
            database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
            db_manager = await init_database(database_url)
            app.state.db_manager = db_manager
            initialized_services.append("database")
            print("✅ Database connection initialized")
        except Exception as e:
            error_msg = f"Database initialization failed: {e}"
            print(f"❌ {error_msg}")
            startup_errors.append(("database", error_msg))
            startup_failed = True
            # Database is critical - fail startup
            raise RuntimeError(f"Critical service initialization failed: {error_msg}")
        
        # 2. Initialize Redis connection (optional)
        try:
            from services.cache import init_redis, get_redis_client
            await init_redis()
            redis_client = await get_redis_client()
            app.state.redis_client = redis_client
            if redis_client:
                initialized_services.append("redis")
                print("✅ Redis connection initialized")
            else:
                print("⚠️ Redis not available - continuing without cache")
        except Exception as e:
            error_msg = f"Redis initialization failed: {e}"
            print(f"⚠️ {error_msg}")
            startup_errors.append(("redis", error_msg))
            app.state.redis_client = None
            # Redis is optional, continue without it
        
        # 3. Initialize FDA API client (required)
        try:
            from services.openfda import create_openfda_service
            # Pass Redis client if available for caching
            redis_url = os.getenv("REDIS_URL") if hasattr(app.state, 'redis_client') and app.state.redis_client else None
            fda_api_key = os.getenv("FDA_API_KEY")
            
            fda_service = await create_openfda_service(
                api_key=fda_api_key,
                redis_url=redis_url,
                cache_ttl=3600  # 1 hour cache
            )
            app.state.fda_service = fda_service
            initialized_services.append("fda_service")
            print("✅ FDA API client initialized")
        except Exception as e:
            error_msg = f"FDA API client initialization failed: {e}"
            print(f"❌ {error_msg}")
            startup_errors.append(("fda_service", error_msg))
            startup_failed = True
            # FDA service is critical - fail startup
            raise RuntimeError(f"Critical service initialization failed: {error_msg}")
        
        # Log startup summary
        if startup_errors:
            print(f"⚠️ Startup completed with {len(startup_errors)} non-critical errors")
            for service, error in startup_errors:
                print(f"   - {service}: {error}")
        else:
            print("🎉 Application startup completed successfully - all services initialized")
        
        print(f"📊 Initialized services: {', '.join(initialized_services)}")
        
        yield
        
    finally:
        # Shutdown phase - cleanup in reverse order of initialization
        print("🛑 Medical Device Regulatory Assistant API shutting down...")
        shutdown_errors = []
        
        # Close FDA API client first (depends on Redis)
        if "fda_service" in initialized_services:
            try:
                if hasattr(app.state, 'fda_service') and app.state.fda_service:
                    await app.state.fda_service.close()
                    print("✅ FDA API client closed")
            except Exception as e:
                error_msg = f"Error closing FDA API client: {e}"
                print(f"⚠️ {error_msg}")
                shutdown_errors.append(("fda_service", error_msg))
        
        # Close Redis connection
        if "redis" in initialized_services:
            try:
                from services.cache import close_redis_client
                await close_redis_client()
                print("✅ Redis connection closed")
            except Exception as e:
                error_msg = f"Error closing Redis: {e}"
                print(f"⚠️ {error_msg}")
                shutdown_errors.append(("redis", error_msg))
        
        # Close database connections last
        if "database" in initialized_services:
            try:
                from database.connection import close_database
                await close_database()
                print("✅ Database connections closed")
            except Exception as e:
                error_msg = f"Error closing database: {e}"
                print(f"⚠️ {error_msg}")
                shutdown_errors.append(("database", error_msg))
        
        # Log shutdown summary
        if shutdown_errors:
            print(f"⚠️ Shutdown completed with {len(shutdown_errors)} errors:")
            for service, error in shutdown_errors:
                print(f"   - {service}: {error}")
        else:
            print("✅ Graceful shutdown completed successfully")
        
        print("👋 Medical Device Regulatory Assistant API stopped")


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