"""
Usage analytics service for feature optimization and user behavior tracking
"""

import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, Counter

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from database.connection import get_db_session
from models.project import Project
from models.user import User
from models.agent_interaction import AgentInteraction
from services.audit_logger import AuditLogger

logger = structlog.get_logger(__name__)


class EventType(Enum):
    """Analytics event types"""
    PAGE_VIEW = "page_view"
    FEATURE_USE = "feature_use"
    PROJECT_ACTION = "project_action"
    SEARCH_QUERY = "search_query"
    EXPORT_ACTION = "export_action"
    ERROR_ENCOUNTER = "error_encounter"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


class FeatureCategory(Enum):
    """Feature categories for analytics"""
    PROJECT_MANAGEMENT = "project_management"
    DEVICE_CLASSIFICATION = "device_classification"
    PREDICATE_SEARCH = "predicate_search"
    FDA_GUIDANCE = "fda_guidance"
    EXPORT_REPORTS = "export_reports"
    USER_INTERFACE = "user_interface"
    AUTHENTICATION = "authentication"


@dataclass
class AnalyticsEvent:
    """Analytics event data structure"""
    event_id: str
    event_type: EventType
    feature_category: FeatureCategory
    feature_name: str
    action: str
    user_id: str
    session_id: Optional[str] = None
    project_id: Optional[int] = None
    page_url: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    duration_ms: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class UserSession:
    """User session tracking"""
    session_id: str
    user_id: str
    start_time: datetime
    last_activity: datetime
    page_views: int = 0
    actions_count: int = 0
    projects_accessed: List[int] = field(default_factory=list)
    features_used: List[str] = field(default_factory=list)
    errors_encountered: int = 0
    ended: bool = False
    end_time: Optional[datetime] = None


@dataclass
class FeatureMetrics:
    """Feature usage metrics"""
    feature_name: str
    category: FeatureCategory
    total_uses: int
    unique_users: int
    success_rate: float
    average_duration_ms: float
    peak_usage_hour: int
    trend_direction: str  # "up", "down", "stable"
    last_updated: datetime = field(default_factory=datetime.now)


class AnalyticsService:
    """
    Comprehensive usage analytics service for feature optimization
    """
    
    def __init__(self, session_factory=None):
        self.session_factory = session_factory or get_db_session
        self.audit_logger = AuditLogger()
        
        # Event storage
        self.events: List[AnalyticsEvent] = []
        self.sessions: Dict[str, UserSession] = {}
        
        # Configuration
        self.max_events = 50000
        self.session_timeout = 1800  # 30 minutes
        self.batch_size = 1000
        self.flush_interval = 300  # 5 minutes
        
        # Background tasks
        self._flush_task: Optional[asyncio.Task] = None
        self._session_cleanup_task: Optional[asyncio.Task] = None
        self._monitoring_active = False
        
        # Cached metrics
        self._cached_metrics: Dict[str, Any] = {}
        self._cache_expiry: Dict[str, datetime] = {}
        self._cache_ttl = 300  # 5 minutes
        
        logger.info("Analytics service initialized")
    
    async def start_monitoring(self):
        """Start background analytics tasks"""
        if self._monitoring_active:
            return
        
        self._monitoring_active = True
        self._flush_task = asyncio.create_task(self._flush_loop())
        self._session_cleanup_task = asyncio.create_task(self._session_cleanup_loop())
        logger.info("Analytics monitoring started")
    
    async def stop_monitoring(self):
        """Stop background analytics tasks"""
        self._monitoring_active = False
        
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        
        if self._session_cleanup_task:
            self._session_cleanup_task.cancel()
            try:
                await self._session_cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Flush remaining events
        await self._flush_events()
        logger.info("Analytics monitoring stopped")
    
    async def _flush_loop(self):
        """Background task to flush events"""
        while self._monitoring_active:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush_events()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in analytics flush loop", error=str(e))
    
    async def _session_cleanup_loop(self):
        """Background task to clean up expired sessions"""
        while self._monitoring_active:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                await self._cleanup_expired_sessions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in session cleanup loop", error=str(e))
    
    async def _flush_events(self):
        """Flush events to persistent storage"""
        if not self.events:
            return
        
        events_to_flush = self.events[:self.batch_size]
        self.events = self.events[self.batch_size:]
        
        try:
            # Store events in audit log for persistence
            for event in events_to_flush:
                if event.project_id:
                    await self.audit_logger.log_agent_action(
                        project_id=event.project_id,
                        user_id=int(event.user_id),
                        action=f"analytics_{event.event_type.value}",
                        input_data={
                            "feature_category": event.feature_category.value,
                            "feature_name": event.feature_name,
                            "action": event.action,
                            "page_url": event.page_url,
                            "session_id": event.session_id
                        },
                        output_data={
                            "success": event.success,
                            "duration_ms": event.duration_ms,
                            "error_message": event.error_message,
                            "metadata": event.metadata
                        },
                        confidence_score=1.0,
                        sources=[],
                        reasoning=f"Analytics event: {event.feature_name} {event.action}",
                        execution_time_ms=event.duration_ms
                    )
            
            logger.debug("Flushed analytics events", count=len(events_to_flush))
            
        except Exception as e:
            # Re-add events to queue for retry
            self.events = events_to_flush + self.events
            logger.error("Failed to flush analytics events", error=str(e))
    
    async def _cleanup_expired_sessions(self):
        """Clean up expired user sessions"""
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if (current_time - session.last_activity).seconds > self.session_timeout:
                if not session.ended:
                    session.ended = True
                    session.end_time = current_time
                    
                    # Track session end event
                    await self.track_event(
                        event_type=EventType.SESSION_END,
                        feature_category=FeatureCategory.USER_INTERFACE,
                        feature_name="session",
                        action="end",
                        user_id=session.user_id,
                        session_id=session_id,
                        duration_ms=int((current_time - session.start_time).total_seconds() * 1000),
                        metadata={
                            "page_views": session.page_views,
                            "actions_count": session.actions_count,
                            "projects_accessed": len(session.projects_accessed),
                            "features_used": len(set(session.features_used)),
                            "errors_encountered": session.errors_encountered
                        }
                    )
                
                expired_sessions.append(session_id)
        
        # Remove expired sessions after 1 hour
        cutoff_time = current_time - timedelta(hours=1)
        for session_id in expired_sessions:
            session = self.sessions[session_id]
            if session.end_time and session.end_time < cutoff_time:
                del self.sessions[session_id]
        
        if expired_sessions:
            logger.debug("Cleaned up expired sessions", count=len(expired_sessions))
    
    async def track_event(
        self,
        event_type: EventType,
        feature_category: FeatureCategory,
        feature_name: str,
        action: str,
        user_id: str,
        session_id: Optional[str] = None,
        project_id: Optional[int] = None,
        page_url: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        duration_ms: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Track an analytics event
        
        Args:
            event_type: Type of event
            feature_category: Category of the feature
            feature_name: Name of the feature
            action: Action performed
            user_id: User ID
            session_id: Optional session ID
            project_id: Optional project ID
            page_url: Optional page URL
            user_agent: Optional user agent
            ip_address: Optional IP address (anonymized)
            duration_ms: Optional duration in milliseconds
            success: Whether the action was successful
            error_message: Optional error message
            metadata: Additional metadata
        
        Returns:
            Event ID
        """
        import uuid
        
        event_id = str(uuid.uuid4())
        
        event = AnalyticsEvent(
            event_id=event_id,
            event_type=event_type,
            feature_category=feature_category,
            feature_name=feature_name,
            action=action,
            user_id=user_id,
            session_id=session_id,
            project_id=project_id,
            page_url=page_url,
            user_agent=user_agent,
            ip_address=ip_address,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata or {}
        )
        
        self.events.append(event)
        
        # Update session if provided
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]
            session.last_activity = datetime.now()
            session.actions_count += 1
            
            if event_type == EventType.PAGE_VIEW:
                session.page_views += 1
            
            if project_id and project_id not in session.projects_accessed:
                session.projects_accessed.append(project_id)
            
            if feature_name not in session.features_used:
                session.features_used.append(feature_name)
            
            if not success:
                session.errors_encountered += 1
        
        # Flush if buffer is full
        if len(self.events) >= self.batch_size:
            await self._flush_events()
        
        logger.debug(
            "Analytics event tracked",
            event_id=event_id,
            event_type=event_type.value,
            feature_name=feature_name,
            action=action,
            user_id=user_id
        )
        
        return event_id
    
    async def start_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """
        Start a new user session
        
        Args:
            user_id: User ID
            session_id: Optional session ID (generated if not provided)
            user_agent: Optional user agent
            ip_address: Optional IP address
        
        Returns:
            Session ID
        """
        import uuid
        
        if not session_id:
            session_id = str(uuid.uuid4())
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            start_time=datetime.now(),
            last_activity=datetime.now()
        )
        
        self.sessions[session_id] = session
        
        # Track session start event
        await self.track_event(
            event_type=EventType.SESSION_START,
            feature_category=FeatureCategory.USER_INTERFACE,
            feature_name="session",
            action="start",
            user_id=user_id,
            session_id=session_id,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        logger.info("User session started", user_id=user_id, session_id=session_id)
        return session_id
    
    async def end_session(self, session_id: str):
        """End a user session"""
        if session_id not in self.sessions:
            return
        
        session = self.sessions[session_id]
        if session.ended:
            return
        
        session.ended = True
        session.end_time = datetime.now()
        
        # Track session end event
        await self.track_event(
            event_type=EventType.SESSION_END,
            feature_category=FeatureCategory.USER_INTERFACE,
            feature_name="session",
            action="end",
            user_id=session.user_id,
            session_id=session_id,
            duration_ms=int((session.end_time - session.start_time).total_seconds() * 1000),
            metadata={
                "page_views": session.page_views,
                "actions_count": session.actions_count,
                "projects_accessed": len(session.projects_accessed),
                "features_used": len(set(session.features_used)),
                "errors_encountered": session.errors_encountered
            }
        )
        
        logger.info("User session ended", session_id=session_id, user_id=session.user_id)
    
    async def get_feature_metrics(
        self,
        feature_name: Optional[str] = None,
        category: Optional[FeatureCategory] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get feature usage metrics
        
        Args:
            feature_name: Optional specific feature name
            category: Optional feature category
            hours: Time period in hours
        
        Returns:
            Feature metrics data
        """
        cache_key = f"feature_metrics_{feature_name}_{category}_{hours}"
        
        # Check cache
        if cache_key in self._cached_metrics:
            if datetime.now() < self._cache_expiry.get(cache_key, datetime.min):
                return self._cached_metrics[cache_key]
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter events
        filtered_events = [
            e for e in self.events
            if e.timestamp >= cutoff_time and
            (not feature_name or e.feature_name == feature_name) and
            (not category or e.feature_category == category)
        ]
        
        if not filtered_events:
            return {
                "total_events": 0,
                "unique_users": 0,
                "features": {},
                "time_period_hours": hours
            }
        
        # Calculate metrics
        total_events = len(filtered_events)
        unique_users = len(set(e.user_id for e in filtered_events))
        
        # Group by feature
        feature_stats = defaultdict(lambda: {
            "total_uses": 0,
            "unique_users": set(),
            "success_count": 0,
            "durations": [],
            "hourly_usage": defaultdict(int)
        })
        
        for event in filtered_events:
            stats = feature_stats[event.feature_name]
            stats["total_uses"] += 1
            stats["unique_users"].add(event.user_id)
            
            if event.success:
                stats["success_count"] += 1
            
            if event.duration_ms:
                stats["durations"].append(event.duration_ms)
            
            # Track hourly usage
            hour = event.timestamp.hour
            stats["hourly_usage"][hour] += 1
        
        # Process feature statistics
        features = {}
        for feature, stats in feature_stats.items():
            success_rate = stats["success_count"] / stats["total_uses"] if stats["total_uses"] > 0 else 0.0
            avg_duration = sum(stats["durations"]) / len(stats["durations"]) if stats["durations"] else 0.0
            
            # Find peak usage hour
            peak_hour = max(stats["hourly_usage"].items(), key=lambda x: x[1])[0] if stats["hourly_usage"] else 0
            
            features[feature] = {
                "total_uses": stats["total_uses"],
                "unique_users": len(stats["unique_users"]),
                "success_rate": round(success_rate, 3),
                "average_duration_ms": round(avg_duration, 2),
                "peak_usage_hour": peak_hour,
                "hourly_distribution": dict(stats["hourly_usage"])
            }
        
        result = {
            "total_events": total_events,
            "unique_users": unique_users,
            "features": features,
            "time_period_hours": hours,
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache result
        self._cached_metrics[cache_key] = result
        self._cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self._cache_ttl)
        
        return result
    
    async def get_user_behavior_analysis(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Analyze user behavior patterns
        
        Args:
            user_id: User ID to analyze
            days: Number of days to analyze
        
        Returns:
            User behavior analysis
        """
        cutoff_time = datetime.now() - timedelta(days=days)
        
        # Get user events
        user_events = [
            e for e in self.events
            if e.user_id == user_id and e.timestamp >= cutoff_time
        ]
        
        if not user_events:
            return {
                "user_id": user_id,
                "total_events": 0,
                "analysis_period_days": days,
                "message": "No activity found for this user in the specified period"
            }
        
        # Calculate basic metrics
        total_events = len(user_events)
        unique_features = len(set(e.feature_name for e in user_events))
        unique_projects = len(set(e.project_id for e in user_events if e.project_id))
        
        # Feature usage patterns
        feature_usage = Counter(e.feature_name for e in user_events)
        category_usage = Counter(e.feature_category.value for e in user_events)
        
        # Time patterns
        hourly_activity = defaultdict(int)
        daily_activity = defaultdict(int)
        
        for event in user_events:
            hourly_activity[event.timestamp.hour] += 1
            daily_activity[event.timestamp.date().isoformat()] += 1
        
        # Success rates
        successful_events = [e for e in user_events if e.success]
        success_rate = len(successful_events) / total_events if total_events > 0 else 0.0
        
        # Session analysis
        user_sessions = [s for s in self.sessions.values() if s.user_id == user_id]
        avg_session_duration = 0
        if user_sessions:
            session_durations = []
            for session in user_sessions:
                if session.end_time:
                    duration = (session.end_time - session.start_time).total_seconds()
                    session_durations.append(duration)
            
            if session_durations:
                avg_session_duration = sum(session_durations) / len(session_durations)
        
        # Most active time
        peak_hour = max(hourly_activity.items(), key=lambda x: x[1])[0] if hourly_activity else 0
        
        return {
            "user_id": user_id,
            "analysis_period_days": days,
            "total_events": total_events,
            "unique_features_used": unique_features,
            "unique_projects_accessed": unique_projects,
            "success_rate": round(success_rate, 3),
            "average_session_duration_seconds": round(avg_session_duration, 2),
            "peak_activity_hour": peak_hour,
            "feature_usage": dict(feature_usage.most_common(10)),
            "category_usage": dict(category_usage),
            "hourly_activity": dict(hourly_activity),
            "daily_activity": dict(daily_activity),
            "sessions_count": len(user_sessions),
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_project_analytics(self, project_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Get analytics for a specific project
        
        Args:
            project_id: Project ID
            days: Number of days to analyze
        
        Returns:
            Project analytics data
        """
        cutoff_time = datetime.now() - timedelta(days=days)
        
        # Get project events
        project_events = [
            e for e in self.events
            if e.project_id == project_id and e.timestamp >= cutoff_time
        ]
        
        if not project_events:
            return {
                "project_id": project_id,
                "total_events": 0,
                "analysis_period_days": days,
                "message": "No activity found for this project in the specified period"
            }
        
        # Calculate metrics
        total_events = len(project_events)
        unique_users = len(set(e.user_id for e in project_events))
        
        # Feature usage in project context
        feature_usage = Counter(e.feature_name for e in project_events)
        action_usage = Counter(e.action for e in project_events)
        
        # User activity
        user_activity = defaultdict(int)
        for event in project_events:
            user_activity[event.user_id] += 1
        
        # Time patterns
        daily_activity = defaultdict(int)
        for event in project_events:
            daily_activity[event.timestamp.date().isoformat()] += 1
        
        # Success metrics
        successful_events = [e for e in project_events if e.success]
        success_rate = len(successful_events) / total_events if total_events > 0 else 0.0
        
        return {
            "project_id": project_id,
            "analysis_period_days": days,
            "total_events": total_events,
            "unique_users": unique_users,
            "success_rate": round(success_rate, 3),
            "feature_usage": dict(feature_usage.most_common(10)),
            "action_usage": dict(action_usage.most_common(10)),
            "user_activity": dict(sorted(user_activity.items(), key=lambda x: x[1], reverse=True)[:10]),
            "daily_activity": dict(daily_activity),
            "most_active_user": max(user_activity.items(), key=lambda x: x[1])[0] if user_activity else None,
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_system_usage_overview(self, days: int = 7) -> Dict[str, Any]:
        """
        Get system-wide usage overview
        
        Args:
            days: Number of days to analyze
        
        Returns:
            System usage overview
        """
        cutoff_time = datetime.now() - timedelta(days=days)
        
        recent_events = [e for e in self.events if e.timestamp >= cutoff_time]
        
        if not recent_events:
            return {
                "total_events": 0,
                "analysis_period_days": days,
                "message": "No activity found in the specified period"
            }
        
        # Basic metrics
        total_events = len(recent_events)
        unique_users = len(set(e.user_id for e in recent_events))
        unique_projects = len(set(e.project_id for e in recent_events if e.project_id))
        
        # Feature popularity
        feature_usage = Counter(e.feature_name for e in recent_events)
        category_usage = Counter(e.feature_category.value for e in recent_events)
        
        # Success metrics
        successful_events = [e for e in recent_events if e.success]
        overall_success_rate = len(successful_events) / total_events if total_events > 0 else 0.0
        
        # Time patterns
        hourly_distribution = defaultdict(int)
        daily_distribution = defaultdict(int)
        
        for event in recent_events:
            hourly_distribution[event.timestamp.hour] += 1
            daily_distribution[event.timestamp.date().isoformat()] += 1
        
        # Active sessions
        active_sessions = len([s for s in self.sessions.values() if not s.ended])
        
        # Growth metrics (compare with previous period)
        previous_cutoff = cutoff_time - timedelta(days=days)
        previous_events = [
            e for e in self.events
            if previous_cutoff <= e.timestamp < cutoff_time
        ]
        
        growth_rate = 0.0
        if previous_events:
            growth_rate = (total_events - len(previous_events)) / len(previous_events) * 100
        
        return {
            "analysis_period_days": days,
            "total_events": total_events,
            "unique_users": unique_users,
            "unique_projects": unique_projects,
            "overall_success_rate": round(overall_success_rate, 3),
            "active_sessions": active_sessions,
            "growth_rate_percent": round(growth_rate, 2),
            "top_features": dict(feature_usage.most_common(10)),
            "category_distribution": dict(category_usage),
            "hourly_distribution": dict(hourly_distribution),
            "daily_distribution": dict(daily_distribution),
            "peak_usage_hour": max(hourly_distribution.items(), key=lambda x: x[1])[0] if hourly_distribution else 0,
            "timestamp": datetime.now().isoformat()
        }
    
    def clear_cache(self):
        """Clear analytics cache"""
        self._cached_metrics.clear()
        self._cache_expiry.clear()
        logger.info("Analytics cache cleared")


# Convenience functions for common tracking scenarios
async def track_page_view(
    user_id: str,
    page_url: str,
    session_id: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """Track a page view"""
    analytics = get_analytics_service()
    await analytics.track_event(
        event_type=EventType.PAGE_VIEW,
        feature_category=FeatureCategory.USER_INTERFACE,
        feature_name="page_view",
        action="view",
        user_id=user_id,
        session_id=session_id,
        page_url=page_url,
        user_agent=user_agent
    )


async def track_project_action(
    user_id: str,
    project_id: int,
    action: str,
    feature_name: str = "project_management",
    session_id: Optional[str] = None,
    duration_ms: Optional[int] = None,
    success: bool = True,
    metadata: Optional[Dict[str, Any]] = None
):
    """Track a project-related action"""
    analytics = get_analytics_service()
    await analytics.track_event(
        event_type=EventType.PROJECT_ACTION,
        feature_category=FeatureCategory.PROJECT_MANAGEMENT,
        feature_name=feature_name,
        action=action,
        user_id=user_id,
        session_id=session_id,
        project_id=project_id,
        duration_ms=duration_ms,
        success=success,
        metadata=metadata
    )


async def track_search_query(
    user_id: str,
    query: str,
    results_count: int,
    feature_name: str,
    project_id: Optional[int] = None,
    session_id: Optional[str] = None,
    duration_ms: Optional[int] = None
):
    """Track a search query"""
    analytics = get_analytics_service()
    await analytics.track_event(
        event_type=EventType.SEARCH_QUERY,
        feature_category=FeatureCategory.PREDICATE_SEARCH,
        feature_name=feature_name,
        action="search",
        user_id=user_id,
        session_id=session_id,
        project_id=project_id,
        duration_ms=duration_ms,
        metadata={
            "query": query,
            "results_count": results_count
        }
    )


# Global analytics service instance
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """Get the global analytics service instance"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service


async def init_analytics():
    """Initialize analytics service"""
    analytics_service = get_analytics_service()
    await analytics_service.start_monitoring()
    return analytics_service


async def cleanup_analytics():
    """Cleanup analytics service"""
    if _analytics_service:
        await _analytics_service.stop_monitoring()