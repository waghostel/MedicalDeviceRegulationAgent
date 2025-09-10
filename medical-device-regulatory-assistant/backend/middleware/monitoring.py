"""
Monitoring middleware for automatic request tracking and performance monitoring
"""

import time
import uuid
from typing import Callable, Optional
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog

from services.monitoring import get_monitoring_service
from services.error_tracking import get_error_tracking_service, ErrorCategory, AlertSeverity
from services.analytics import get_analytics_service, EventType, FeatureCategory

logger = structlog.get_logger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware for automatic monitoring of HTTP requests and responses
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.monitoring_service = get_monitoring_service()
        self.error_service = get_error_tracking_service()
        self.analytics_service = get_analytics_service()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and response with monitoring
        
        Args:
            request: HTTP request
            call_next: Next middleware/handler
        
        Returns:
            HTTP response
        """
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Extract request information
        method = request.method
        url_path = request.url.path
        user_agent = request.headers.get("user-agent", "")
        ip_address = self._get_client_ip(request)
        
        # Get user information if available
        user_id = None
        session_id = None
        
        # Try to extract user info from request state (set by auth middleware)
        if hasattr(request.state, 'user'):
            user_id = getattr(request.state.user, 'user_id', None)
        
        # Try to extract session info from headers or cookies
        session_id = request.headers.get("x-session-id") or request.cookies.get("session_id")
        
        # Start timing
        start_time = time.time()
        
        # Track request start
        await self._track_request_start(
            request_id=request_id,
            method=method,
            url_path=url_path,
            user_id=user_id,
            session_id=session_id,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Process request
        response = None
        error = None
        
        try:
            response = await call_next(request)
            
        except Exception as e:
            error = e
            # Track error
            await self._track_request_error(
                request_id=request_id,
                method=method,
                url_path=url_path,
                user_id=user_id,
                error=e,
                start_time=start_time
            )
            raise
        
        finally:
            # Calculate duration
            duration = time.time() - start_time
            
            # Track request completion
            await self._track_request_completion(
                request_id=request_id,
                method=method,
                url_path=url_path,
                user_id=user_id,
                session_id=session_id,
                status_code=response.status_code if response else 500,
                duration=duration,
                success=error is None
            )
        
        # Add monitoring headers to response
        if response:
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{duration:.3f}"
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers (behind proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    async def _track_request_start(
        self,
        request_id: str,
        method: str,
        url_path: str,
        user_id: Optional[str],
        session_id: Optional[str],
        user_agent: str,
        ip_address: str
    ):
        """Track request start for analytics"""
        try:
            # Determine feature category based on URL path
            feature_category = self._categorize_endpoint(url_path)
            
            # Track page view for GET requests to main pages
            if method == "GET" and not url_path.startswith("/api/"):
                await self.analytics_service.track_event(
                    event_type=EventType.PAGE_VIEW,
                    feature_category=feature_category,
                    feature_name="page_view",
                    action="view",
                    user_id=user_id or "anonymous",
                    session_id=session_id,
                    page_url=url_path,
                    user_agent=user_agent,
                    ip_address=ip_address,
                    metadata={
                        "request_id": request_id,
                        "method": method
                    }
                )
            
        except Exception as e:
            logger.error("Error tracking request start", error=str(e), request_id=request_id)
    
    async def _track_request_completion(
        self,
        request_id: str,
        method: str,
        url_path: str,
        user_id: Optional[str],
        session_id: Optional[str],
        status_code: int,
        duration: float,
        success: bool
    ):
        """Track request completion"""
        try:
            # Track Prometheus metrics
            self.monitoring_service.track_request(
                method=method,
                endpoint=self._normalize_endpoint(url_path),
                status_code=status_code,
                duration=duration
            )
            
            # Track feature usage for API endpoints
            if url_path.startswith("/api/"):
                feature_category = self._categorize_endpoint(url_path)
                feature_name = self._extract_feature_name(url_path)
                action = self._extract_action(method, url_path)
                
                await self.analytics_service.track_event(
                    event_type=EventType.FEATURE_USE,
                    feature_category=feature_category,
                    feature_name=feature_name,
                    action=action,
                    user_id=user_id or "anonymous",
                    session_id=session_id,
                    duration_ms=int(duration * 1000),
                    success=success,
                    metadata={
                        "request_id": request_id,
                        "method": method,
                        "status_code": status_code,
                        "endpoint": url_path
                    }
                )
            
            # Log structured request info
            logger.info(
                "Request completed",
                request_id=request_id,
                method=method,
                endpoint=url_path,
                status_code=status_code,
                duration_ms=int(duration * 1000),
                user_id=user_id,
                success=success
            )
            
        except Exception as e:
            logger.error("Error tracking request completion", error=str(e), request_id=request_id)
    
    async def _track_request_error(
        self,
        request_id: str,
        method: str,
        url_path: str,
        user_id: Optional[str],
        error: Exception,
        start_time: float
    ):
        """Track request error"""
        try:
            duration = time.time() - start_time
            
            # Determine error category and severity
            error_category = self._categorize_error(error, url_path)
            error_severity = self._determine_error_severity(error)
            
            # Track error
            await self.error_service.track_error(
                error=error,
                category=error_category,
                severity=error_severity,
                component=f"api_{self._extract_feature_name(url_path)}",
                user_id=user_id,
                request_id=request_id,
                context={
                    "method": method,
                    "endpoint": url_path,
                    "duration_ms": int(duration * 1000)
                }
            )
            
        except Exception as e:
            logger.error("Error tracking request error", error=str(e), request_id=request_id)
    
    def _normalize_endpoint(self, url_path: str) -> str:
        """Normalize endpoint path for metrics (remove IDs)"""
        import re
        
        # Replace numeric IDs with placeholder
        normalized = re.sub(r'/\d+', '/{id}', url_path)
        
        # Replace UUIDs with placeholder
        normalized = re.sub(
            r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            '/{uuid}',
            normalized
        )
        
        return normalized
    
    def _categorize_endpoint(self, url_path: str) -> FeatureCategory:
        """Categorize endpoint based on URL path"""
        if "/projects" in url_path:
            return FeatureCategory.PROJECT_MANAGEMENT
        elif "/classification" in url_path or "/device" in url_path:
            return FeatureCategory.DEVICE_CLASSIFICATION
        elif "/predicate" in url_path or "/search" in url_path:
            return FeatureCategory.PREDICATE_SEARCH
        elif "/guidance" in url_path or "/fda" in url_path:
            return FeatureCategory.FDA_GUIDANCE
        elif "/export" in url_path or "/report" in url_path:
            return FeatureCategory.EXPORT_REPORTS
        elif "/auth" in url_path or "/login" in url_path:
            return FeatureCategory.AUTHENTICATION
        else:
            return FeatureCategory.USER_INTERFACE
    
    def _extract_feature_name(self, url_path: str) -> str:
        """Extract feature name from URL path"""
        # Remove /api prefix and extract main resource
        path_parts = [part for part in url_path.split("/") if part]
        
        if len(path_parts) >= 2 and path_parts[0] == "api":
            return path_parts[1]
        elif len(path_parts) >= 1:
            return path_parts[0]
        else:
            return "unknown"
    
    def _extract_action(self, method: str, url_path: str) -> str:
        """Extract action from HTTP method and URL path"""
        method_actions = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete"
        }
        
        base_action = method_actions.get(method, "unknown")
        
        # Add more specific actions based on path
        if "/search" in url_path:
            return "search"
        elif "/export" in url_path:
            return "export"
        elif "/import" in url_path:
            return "import"
        elif "/analyze" in url_path:
            return "analyze"
        
        return base_action
    
    def _categorize_error(self, error: Exception, url_path: str) -> ErrorCategory:
        """Categorize error based on exception type and context"""
        error_type = type(error).__name__
        
        # Authentication/Authorization errors
        if "auth" in error_type.lower() or "permission" in error_type.lower():
            return ErrorCategory.AUTHENTICATION
        
        # Validation errors
        if "validation" in error_type.lower() or "pydantic" in error_type.lower():
            return ErrorCategory.VALIDATION
        
        # Database errors
        if "database" in error_type.lower() or "sql" in error_type.lower():
            return ErrorCategory.DATABASE
        
        # Network/External API errors
        if "http" in error_type.lower() or "connection" in error_type.lower():
            return ErrorCategory.EXTERNAL_API
        
        # Business logic errors based on endpoint
        if "/projects" in url_path:
            return ErrorCategory.BUSINESS_LOGIC
        elif "/fda" in url_path or "/predicate" in url_path:
            return ErrorCategory.EXTERNAL_API
        
        return ErrorCategory.SYSTEM
    
    def _determine_error_severity(self, error: Exception) -> AlertSeverity:
        """Determine error severity based on exception type"""
        error_type = type(error).__name__
        
        # Critical errors
        if any(keyword in error_type.lower() for keyword in ["database", "connection", "timeout"]):
            return AlertSeverity.CRITICAL
        
        # High severity errors
        if any(keyword in error_type.lower() for keyword in ["auth", "permission", "security"]):
            return AlertSeverity.HIGH
        
        # Medium severity errors
        if any(keyword in error_type.lower() for keyword in ["validation", "business", "logic"]):
            return AlertSeverity.MEDIUM
        
        # Default to low severity
        return AlertSeverity.LOW


class PerformanceTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware specifically for performance tracking of project operations
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.monitoring_service = get_monitoring_service()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Track performance for project-related operations"""
        
        # Only track project-related endpoints
        if not self._is_project_operation(request.url.path):
            return await call_next(request)
        
        # Extract operation details
        operation = self._extract_operation(request.method, request.url.path)
        user_id = getattr(request.state, 'user_id', None) if hasattr(request.state, 'user_id') else None
        project_id = self._extract_project_id(request.url.path)
        
        # Track operation performance
        async with self.monitoring_service.track_operation(
            operation=operation,
            user_id=user_id,
            project_id=project_id,
            metadata={
                "method": request.method,
                "endpoint": request.url.path,
                "user_agent": request.headers.get("user-agent", "")
            }
        ):
            response = await call_next(request)
        
        return response
    
    def _is_project_operation(self, url_path: str) -> bool:
        """Check if URL path represents a project operation"""
        project_endpoints = [
            "/api/projects",
            "/api/classification",
            "/api/predicate",
            "/api/export",
            "/api/agent"
        ]
        
        return any(endpoint in url_path for endpoint in project_endpoints)
    
    def _extract_operation(self, method: str, url_path: str) -> str:
        """Extract operation name from method and URL"""
        if "/projects" in url_path:
            if method == "POST":
                return "project_create"
            elif method == "PUT" or method == "PATCH":
                return "project_update"
            elif method == "DELETE":
                return "project_delete"
            elif method == "GET":
                return "project_read"
        
        elif "/classification" in url_path:
            return "device_classification"
        
        elif "/predicate" in url_path:
            return "predicate_search"
        
        elif "/export" in url_path:
            return "project_export"
        
        elif "/agent" in url_path:
            return "agent_interaction"
        
        return f"{method.lower()}_operation"
    
    def _extract_project_id(self, url_path: str) -> Optional[int]:
        """Extract project ID from URL path"""
        import re
        
        # Look for numeric ID in path
        match = re.search(r'/projects/(\d+)', url_path)
        if match:
            return int(match.group(1))
        
        return None