"""FastAPI main application entry point."""

import os
import signal
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import middleware
from middleware.logging import RequestLoggingMiddleware
from middleware.compression import CompressionMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware

# Import enhanced exception handling system
from exceptions import register_exception_handlers
from core.error_handler import setup_error_handlers
from core.error_tracker import init_error_tracker

# Import API routes
from api.health import router as health_router
from api.projects import router as projects_router
from api.websocket import router as websocket_router
from api.agent_integration import router as agent_router
from api.audit import router as audit_router
from api.error_tracking import router as error_tracking_router


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
    logger.info(f"[STOPPING] Received signal {signum}, initiating graceful shutdown...")
    print(f"[STOPPING] Received signal {signum}, initiating graceful shutdown...")
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
        print("Starting Medical Device Regulatory Assistant API...")
        
        # 1. Initialize error tracking system (required)
        try:
            error_tracker = await init_error_tracker()
            app.state.error_tracker = error_tracker
            initialized_services.append("error_tracker")
            print("[OK] Error tracking system initialized")
        except Exception as e:
            error_msg = f"Error tracking initialization failed: {e}"
            print(f"[ERROR] {error_msg}")
            startup_errors.append(("error_tracker", error_msg))
            # Continue without error tracking for now
        
        # 2. Initialize database connections (required)
        try:
            from database.connection import init_database
            from database.integrated_seeder import auto_seed_on_startup, get_seeder_config
            
            database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
            db_manager = await init_database(database_url)
            app.state.db_manager = db_manager
            initialized_services.append("database")
            print("[OK] Database connection initialized")
            
            # Auto-seed database if configured
            try:
                seeder_config = get_seeder_config()
                print(f"[INFO] Seeder configuration: environment={seeder_config.environment.value}, auto_seed={seeder_config.auto_seed_on_startup}")
                
                seeding_results = await auto_seed_on_startup()
                if seeding_results:
                    if seeding_results["success"]:
                        print("[OK] Database auto-seeding completed successfully")
                        if seeding_results.get("warnings"):
                            for warning in seeding_results["warnings"]:
                                print(f"[WARNING] Seeding: {warning}")
                    else:
                        print("[WARNING] Database auto-seeding failed:")
                        for error in seeding_results.get("errors", []):
                            print(f"   - {error}")
                        # Don't fail startup for seeding errors in development
                        if seeder_config.environment.value == "production":
                            startup_errors.append(("seeding", "Auto-seeding failed in production"))
                else:
                    print("[INFO] Database auto-seeding skipped (disabled in configuration)")
                    
            except Exception as e:
                error_msg = f"Database seeding error: {e}"
                print(f"[WARNING] {error_msg}")
                startup_errors.append(("seeding", error_msg))
                # Don't fail startup for seeding errors unless in production
                seeder_config = get_seeder_config()
                if seeder_config.environment.value == "production":
                    startup_failed = True
                    raise RuntimeError(f"Critical seeding failure in production: {error_msg}")
                    
        except Exception as e:
            error_msg = f"Database initialization failed: {e}"
            print(f"[ERROR] {error_msg}")
            startup_errors.append(("database", error_msg))
            startup_failed = True
            # Database is critical - fail startup
            raise RuntimeError(f"Critical service initialization failed: {error_msg}")
        
        # 3. Initialize Redis connection (optional)
        try:
            from services.cache import init_redis, get_redis_client
            await init_redis()
            redis_client = await get_redis_client()
            app.state.redis_client = redis_client
            if redis_client:
                initialized_services.append("redis")
                print("[OK] Redis connection initialized")
            else:
                print("[WARNING] Redis not available - continuing without cache")
        except Exception as e:
            error_msg = f"Redis initialization failed: {e}"
            print(f"[WARNING] {error_msg}")
            startup_errors.append(("redis", error_msg))
            app.state.redis_client = None
            # Redis is optional, continue without it
        
        # 4. Initialize FDA API client (required)
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
            print("[OK] FDA API client initialized")
        except Exception as e:
            error_msg = f"FDA API client initialization failed: {e}"
            print(f"[ERROR] {error_msg}")
            startup_errors.append(("fda_service", error_msg))
            startup_failed = True
            # FDA service is critical - fail startup
            raise RuntimeError(f"Critical service initialization failed: {error_msg}")
        
        # Log startup summary
        if startup_errors:
            print(f"[WARNING] Startup completed with {len(startup_errors)} non-critical errors")
            for service, error in startup_errors:
                print(f"   - {service}: {error}")
        else:
            print("[SUCCESS] Application startup completed successfully - all services initialized")
        
        print(f"[INFO] Initialized services: {', '.join(initialized_services)}")
        
        yield
        
    finally:
        # Shutdown phase - cleanup in reverse order of initialization
        print("[STOPPING] Medical Device Regulatory Assistant API shutting down...")
        shutdown_errors = []
        
        # Close FDA API client first (depends on Redis)
        if "fda_service" in initialized_services:
            try:
                if hasattr(app.state, 'fda_service') and app.state.fda_service:
                    await app.state.fda_service.close()
                    print("[OK] FDA API client closed")
            except Exception as e:
                error_msg = f"Error closing FDA API client: {e}"
                print(f"[WARNING] {error_msg}")
                shutdown_errors.append(("fda_service", error_msg))
        
        # Close Redis connection
        if "redis" in initialized_services:
            try:
                from services.cache import close_redis_client
                await close_redis_client()
                print("[OK] Redis connection closed")
            except Exception as e:
                error_msg = f"Error closing Redis: {e}"
                print(f"[WARNING] {error_msg}")
                shutdown_errors.append(("redis", error_msg))
        
        # Close database connections
        if "database" in initialized_services:
            try:
                from database.connection import close_database
                await close_database()
                print("[OK] Database connections closed")
            except Exception as e:
                error_msg = f"Error closing database: {e}"
                print(f"[WARNING] {error_msg}")
                shutdown_errors.append(("database", error_msg))
        
        # Close error tracker last
        if "error_tracker" in initialized_services:
            try:
                from core.error_tracker import cleanup_error_tracking
                await cleanup_error_tracking()
                print("[OK] Error tracking system closed")
            except Exception as e:
                error_msg = f"Error closing error tracker: {e}"
                print(f"[WARNING] {error_msg}")
                shutdown_errors.append(("error_tracker", error_msg))
        
        # Log shutdown summary
        if shutdown_errors:
            print(f"[WARNING] Shutdown completed with {len(shutdown_errors)} errors:")
            for service, error in shutdown_errors:
                print(f"   - {service}: {error}")
        else:
            print("[OK] Graceful shutdown completed successfully")
        
        print("[GOODBYE] Medical Device Regulatory Assistant API stopped")


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

# Add middleware in order (last added = first executed)
# Request logging middleware (first to execute)
app.add_middleware(RequestLoggingMiddleware)

# Performance middleware
app.add_middleware(CompressionMiddleware, minimum_size=1024, compression_level=6)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Security headers middleware (last to execute, closest to response)
app.add_middleware(SecurityHeadersMiddleware)

# Register enhanced exception handlers
register_exception_handlers(app)

# Set up comprehensive error handling system
setup_error_handlers(app)

# Include API routers
app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(websocket_router)
app.include_router(agent_router)
app.include_router(audit_router)
app.include_router(error_tracking_router)

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


# Health check endpoints using the new health check service
@app.get("/health", tags=["health"])
async def health_check():
    """
    Comprehensive health check endpoint using the new health check service.
    
    Returns:
        HealthCheckResponse: Complete system health status
        
    Raises:
        HTTPException: 503 if any health check fails
    """
    from fastapi import HTTPException
    from services.health_check import health_service
    
    try:
        health_status = await health_service.check_all()
        
        if not health_status.healthy:
            # Return 503 Service Unavailable for unhealthy status
            raise HTTPException(
                status_code=503, 
                detail={
                    "error": "System is unhealthy",
                    "health_status": health_status.model_dump(),
                    "suggestions": _get_health_suggestions(health_status)
                }
            )
        
        return health_status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health check failed with unexpected error: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Health check system failure",
                "message": str(e),
                "suggestions": [
                    "Check application logs for detailed error information",
                    "Verify all required services are running",
                    "Contact system administrator if problem persists"
                ]
            }
        )


@app.get("/health/{check_name}", tags=["health"])
async def specific_health_check(check_name: str):
    """
    Check specific health component.
    
    Args:
        check_name: Name of the health check component
                   (database, redis, fda_api, disk_space, memory)
    
    Returns:
        HealthCheckResponse: Specific component health status
        
    Raises:
        HTTPException: 400 for invalid check name, 503 if check fails
    """
    from fastapi import HTTPException
    from services.health_check import health_service
    
    valid_checks = ['database', 'redis', 'fda_api', 'disk_space', 'memory']
    if check_name not in valid_checks:
        raise HTTPException(
            status_code=400, 
            detail={
                "error": f"Invalid check name: {check_name}",
                "valid_checks": valid_checks,
                "suggestions": [
                    f"Use one of the valid check names: {', '.join(valid_checks)}",
                    "Check the API documentation for available health checks",
                    "Use /health for all checks at once"
                ]
            }
        )
    
    try:
        health_status = await health_service.check_specific([check_name])
        
        if not health_status.healthy:
            # Return 503 Service Unavailable for unhealthy status
            raise HTTPException(
                status_code=503, 
                detail={
                    "error": f"{check_name} health check failed",
                    "health_status": health_status.model_dump(),
                    "suggestions": _get_component_suggestions(check_name, health_status.checks[check_name])
                }
            )
        
        return health_status
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid health check configuration",
                "message": str(e),
                "suggestions": [
                    "Verify the health check name is correct",
                    "Check system configuration",
                    "Contact system administrator"
                ]
            }
        )
    except Exception as e:
        logger.error(f"Health check {check_name} failed with unexpected error: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": f"{check_name} health check system failure",
                "message": str(e),
                "suggestions": _get_component_suggestions(check_name, None, str(e))
            }
        )


def _get_health_suggestions(health_status) -> List[str]:
    """Generate actionable suggestions based on failed health checks."""
    suggestions = []
    
    for check_name, check_result in health_status.checks.items():
        if not check_result.healthy:
            suggestions.extend(_get_component_suggestions(check_name, check_result))
    
    if not suggestions:
        suggestions = [
            "Check application logs for detailed error information",
            "Verify all required services are running",
            "Contact system administrator if problem persists"
        ]
    
    return suggestions


def _get_component_suggestions(check_name: str, check_result=None, error_msg: str = None) -> List[str]:
    """Generate component-specific actionable suggestions."""
    suggestions = []
    
    if check_name == "database":
        suggestions.extend([
            "Verify database file exists and is accessible",
            "Check database file permissions",
            "Ensure SQLite is properly installed",
            "Verify DATABASE_URL environment variable is correct"
        ])
        if check_result and check_result.error:
            if "permission" in check_result.error.lower():
                suggestions.append("Fix database file permissions (chmod 644)")
            elif "not found" in check_result.error.lower():
                suggestions.append("Create database file or check path configuration")
    
    elif check_name == "redis":
        suggestions.extend([
            "Verify Redis server is running",
            "Check Redis connection configuration",
            "Verify REDIS_URL environment variable",
            "Test Redis connectivity manually"
        ])
        if check_result and check_result.status == "not_configured":
            suggestions.append("Redis is optional - system can run without it")
    
    elif check_name == "fda_api":
        suggestions.extend([
            "Check internet connectivity",
            "Verify FDA API is accessible (https://api.fda.gov)",
            "Check for API rate limiting",
            "Verify FDA_API_KEY if required"
        ])
        if check_result and "rate limit" in str(check_result.error or "").lower():
            suggestions.append("Wait for rate limit reset or reduce API request frequency")
    
    elif check_name == "disk_space":
        suggestions.extend([
            "Free up disk space by removing unnecessary files",
            "Check for large log files that can be rotated",
            "Monitor disk usage regularly",
            "Consider increasing disk capacity"
        ])
        if check_result and check_result.status == "low_space":
            suggestions.append("Immediate action required - disk space critically low")
    
    elif check_name == "memory":
        suggestions.extend([
            "Monitor memory usage patterns",
            "Restart application if memory leak suspected",
            "Consider increasing available memory",
            "Check for memory-intensive processes"
        ])
        if check_result and check_result.status == "high_usage":
            suggestions.append("Consider restarting the application to free memory")
    
    return suggestions


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