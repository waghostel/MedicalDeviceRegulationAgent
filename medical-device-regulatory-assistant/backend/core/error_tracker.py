"""
Error Tracking and Monitoring System

This module provides comprehensive error categorization, tracking, and trend analysis
for the Medical Device Regulatory Assistant application.
"""

import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import sqlite3
import aiosqlite
from pathlib import Path

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels for classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories for systematic classification"""
    FRONTEND_TESTING = "frontend_testing"
    BACKEND_INTEGRATION = "backend_integration"
    CONFIGURATION = "configuration"
    PERFORMANCE = "performance"
    ENVIRONMENT = "environment"
    DATABASE = "database"
    API_INTEGRATION = "api_integration"
    AUTHENTICATION = "authentication"
    VALIDATION = "validation"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"


class ResolutionStatus(Enum):
    """Error resolution status tracking"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    VERIFIED = "verified"
    CLOSED = "closed"


@dataclass
class ErrorReport:
    """Comprehensive error report data structure"""
    error_id: str
    timestamp: datetime
    category: ErrorCategory
    severity: ErrorSeverity
    component: str
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    resolution_status: ResolutionStatus = ResolutionStatus.OPEN
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[int] = None
    request_id: Optional[str] = None
    occurrence_count: int = 1
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    
    def __post_init__(self):
        if self.first_seen is None:
            self.first_seen = self.timestamp
        if self.last_seen is None:
            self.last_seen = self.timestamp


@dataclass
class ErrorTrend:
    """Error trend analysis data"""
    category: ErrorCategory
    time_period: str
    error_count: int
    severity_distribution: Dict[str, int]
    component_distribution: Dict[str, int]
    trend_direction: str  # "increasing", "decreasing", "stable"
    trend_percentage: float
    recommendations: List[str]


@dataclass
class ErrorMetrics:
    """Error metrics for reporting and analysis"""
    total_errors: int
    errors_by_category: Dict[str, int]
    errors_by_severity: Dict[str, int]
    errors_by_component: Dict[str, int]
    resolution_rate: float
    average_resolution_time: float
    top_error_types: List[Tuple[str, int]]
    time_period: str
    generated_at: datetime


class ErrorTracker:
    """
    Comprehensive error tracking and monitoring system
    
    Provides error categorization, storage, trend analysis, and resolution tracking
    for all application errors with focus on systematic error resolution.
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the error tracker
        
        Args:
            db_path: Optional path to SQLite database file
        """
        self.db_path = db_path or "error_tracking.db"
        self.error_cache: Dict[str, ErrorReport] = {}
        self.max_cache_size = 1000
        self.trend_analysis_window = 24  # hours
        
        # Initialize database synchronously in constructor
        # Note: In production, this should be called explicitly during app startup
        
        logger.info(f"ErrorTracker initialized with db_path: {self.db_path}")
    
    async def _init_database(self):
        """Initialize the error tracking database"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS error_reports (
                        error_id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        category TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        component TEXT NOT NULL,
                        error_type TEXT NOT NULL,
                        error_message TEXT NOT NULL,
                        stack_trace TEXT,
                        context TEXT,
                        resolution_status TEXT DEFAULT 'open',
                        resolution_notes TEXT,
                        resolved_at TEXT,
                        resolved_by TEXT,
                        user_id TEXT,
                        project_id INTEGER,
                        request_id TEXT,
                        occurrence_count INTEGER DEFAULT 1,
                        first_seen TEXT,
                        last_seen TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp 
                    ON error_reports(timestamp)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_error_reports_category 
                    ON error_reports(category)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_error_reports_severity 
                    ON error_reports(severity)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_error_reports_component 
                    ON error_reports(component)
                """)
                
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_error_reports_status 
                    ON error_reports(resolution_status)
                """)
                
                await db.commit()
                
            logger.info("Error tracking database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize error tracking database: {e}")
            raise
    
    async def track_error(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        component: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        project_id: Optional[int] = None,
        request_id: Optional[str] = None
    ) -> str:
        """
        Track a new error occurrence
        
        Args:
            error: The exception that occurred
            category: Error category for classification
            severity: Error severity level
            component: Component where error occurred
            context: Additional context information
            user_id: Optional user ID associated with error
            project_id: Optional project ID associated with error
            request_id: Optional request ID for tracing
            
        Returns:
            Error ID for tracking
        """
        import traceback
        
        error_id = str(uuid.uuid4())
        error_type = type(error).__name__
        error_message = str(error)
        stack_trace = traceback.format_exc()
        timestamp = datetime.now()
        
        # Check for duplicate errors (same type, message, component)
        duplicate_id = await self._find_duplicate_error(
            error_type, error_message, component
        )
        
        if duplicate_id:
            # Update existing error occurrence count
            await self._update_error_occurrence(duplicate_id, timestamp)
            return duplicate_id
        
        # Create new error report
        error_report = ErrorReport(
            error_id=error_id,
            timestamp=timestamp,
            category=category,
            severity=severity,
            component=component,
            error_type=error_type,
            error_message=error_message,
            stack_trace=stack_trace,
            context=context or {},
            user_id=user_id,
            project_id=project_id,
            request_id=request_id
        )
        
        # Store in database
        await self._store_error_report(error_report)
        
        # Cache for quick access
        self.error_cache[error_id] = error_report
        await self._manage_cache_size()
        
        logger.info(
            "Error tracked successfully",
            error_id=error_id,
            category=category.value,
            severity=severity.value,
            component=component,
            error_type=error_type
        )
        
        return error_id
    
    async def _find_duplicate_error(
        self, 
        error_type: str, 
        error_message: str, 
        component: str
    ) -> Optional[str]:
        """Find duplicate error within the last 24 hours"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=24)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT error_id FROM error_reports 
                    WHERE error_type = ? AND error_message = ? AND component = ?
                    AND timestamp > ? AND resolution_status IN ('open', 'in_progress')
                    ORDER BY timestamp DESC LIMIT 1
                """, (error_type, error_message, component, cutoff_time.isoformat()))
                
                row = await cursor.fetchone()
                return row[0] if row else None
                
        except Exception as e:
            logger.error(f"Error finding duplicate error: {e}")
            return None
    
    async def _update_error_occurrence(self, error_id: str, timestamp: datetime):
        """Update error occurrence count and last seen timestamp"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE error_reports 
                    SET occurrence_count = occurrence_count + 1,
                        last_seen = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE error_id = ?
                """, (timestamp.isoformat(), error_id))
                
                await db.commit()
                
                # Update cache if present
                if error_id in self.error_cache:
                    self.error_cache[error_id].occurrence_count += 1
                    self.error_cache[error_id].last_seen = timestamp
                
        except Exception as e:
            logger.error(f"Error updating error occurrence: {e}")
    
    async def _store_error_report(self, error_report: ErrorReport):
        """Store error report in database"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO error_reports (
                        error_id, timestamp, category, severity, component,
                        error_type, error_message, stack_trace, context,
                        resolution_status, user_id, project_id, request_id,
                        occurrence_count, first_seen, last_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error_report.error_id,
                    error_report.timestamp.isoformat(),
                    error_report.category.value,
                    error_report.severity.value,
                    error_report.component,
                    error_report.error_type,
                    error_report.error_message,
                    error_report.stack_trace,
                    json.dumps(error_report.context),
                    error_report.resolution_status.value,
                    error_report.user_id,
                    error_report.project_id,
                    error_report.request_id,
                    error_report.occurrence_count,
                    error_report.first_seen.isoformat() if error_report.first_seen else None,
                    error_report.last_seen.isoformat() if error_report.last_seen else None
                ))
                
                await db.commit()
                
        except Exception as e:
            logger.error(f"Error storing error report: {e}")
            raise
    
    async def _manage_cache_size(self):
        """Manage cache size to prevent memory issues"""
        if len(self.error_cache) > self.max_cache_size:
            # Remove oldest entries
            sorted_items = sorted(
                self.error_cache.items(),
                key=lambda x: x[1].timestamp
            )
            
            # Keep only the most recent entries
            items_to_keep = sorted_items[-int(self.max_cache_size * 0.8):]
            self.error_cache = dict(items_to_keep)
    
    async def get_error_report(self, error_id: str) -> Optional[ErrorReport]:
        """
        Get detailed error report by ID
        
        Args:
            error_id: Error ID to retrieve
            
        Returns:
            ErrorReport if found, None otherwise
        """
        # Check cache first
        if error_id in self.error_cache:
            return self.error_cache[error_id]
        
        # Query database
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT * FROM error_reports WHERE error_id = ?
                """, (error_id,))
                
                row = await cursor.fetchone()
                if not row:
                    return None
                
                # Convert row to ErrorReport
                error_report = await self._row_to_error_report(row)
                
                # Cache for future access
                self.error_cache[error_id] = error_report
                
                return error_report
                
        except Exception as e:
            logger.error(f"Error retrieving error report {error_id}: {e}")
            return None
    
    async def _row_to_error_report(self, row) -> ErrorReport:
        """Convert database row to ErrorReport object"""
        return ErrorReport(
            error_id=row[0],
            timestamp=datetime.fromisoformat(row[1]),
            category=ErrorCategory(row[2]),
            severity=ErrorSeverity(row[3]),
            component=row[4],
            error_type=row[5],
            error_message=row[6],
            stack_trace=row[7],
            context=json.loads(row[8]) if row[8] else {},
            resolution_status=ResolutionStatus(row[9]),
            resolution_notes=row[10],
            resolved_at=datetime.fromisoformat(row[11]) if row[11] else None,
            resolved_by=row[12],
            user_id=row[13],
            project_id=row[14],
            request_id=row[15],
            occurrence_count=row[16],
            first_seen=datetime.fromisoformat(row[17]) if row[17] else None,
            last_seen=datetime.fromisoformat(row[18]) if row[18] else None
        )
    
    async def update_resolution_status(
        self,
        error_id: str,
        status: ResolutionStatus,
        resolution_notes: Optional[str] = None,
        resolved_by: Optional[str] = None
    ) -> bool:
        """
        Update error resolution status
        
        Args:
            error_id: Error ID to update
            status: New resolution status
            resolution_notes: Optional resolution notes
            resolved_by: Optional user who resolved the error
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            resolved_at = datetime.now() if status == ResolutionStatus.RESOLVED else None
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE error_reports 
                    SET resolution_status = ?,
                        resolution_notes = ?,
                        resolved_at = ?,
                        resolved_by = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE error_id = ?
                """, (
                    status.value,
                    resolution_notes,
                    resolved_at.isoformat() if resolved_at else None,
                    resolved_by,
                    error_id
                ))
                
                await db.commit()
                
                # Update cache if present
                if error_id in self.error_cache:
                    self.error_cache[error_id].resolution_status = status
                    self.error_cache[error_id].resolution_notes = resolution_notes
                    self.error_cache[error_id].resolved_at = resolved_at
                    self.error_cache[error_id].resolved_by = resolved_by
                
                logger.info(
                    "Error resolution status updated",
                    error_id=error_id,
                    status=status.value,
                    resolved_by=resolved_by
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating resolution status for {error_id}: {e}")
            return False

    async def get_error_metrics(
        self,
        time_period_hours: int = 24,
        category_filter: Optional[ErrorCategory] = None,
        severity_filter: Optional[ErrorSeverity] = None
    ) -> ErrorMetrics:
        """
        Generate comprehensive error metrics for analysis
        
        Args:
            time_period_hours: Time period for analysis in hours
            category_filter: Optional category filter
            severity_filter: Optional severity filter
            
        Returns:
            ErrorMetrics object with comprehensive statistics
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_period_hours)
            
            # Build query with filters
            query = """
                SELECT category, severity, component, error_type, resolution_status,
                       resolved_at, timestamp, occurrence_count
                FROM error_reports 
                WHERE timestamp > ?
            """
            params = [cutoff_time.isoformat()]
            
            if category_filter:
                query += " AND category = ?"
                params.append(category_filter.value)
            
            if severity_filter:
                query += " AND severity = ?"
                params.append(severity_filter.value)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(query, params)
                rows = await cursor.fetchall()
            
            if not rows:
                return ErrorMetrics(
                    total_errors=0,
                    errors_by_category={},
                    errors_by_severity={},
                    errors_by_component={},
                    resolution_rate=0.0,
                    average_resolution_time=0.0,
                    top_error_types=[],
                    time_period=f"{time_period_hours}h",
                    generated_at=datetime.now()
                )
            
            # Calculate metrics
            total_errors = sum(row[7] for row in rows)  # Sum occurrence counts
            
            # Errors by category
            errors_by_category = {}
            for row in rows:
                category = row[0]
                count = row[7]
                errors_by_category[category] = errors_by_category.get(category, 0) + count
            
            # Errors by severity
            errors_by_severity = {}
            for row in rows:
                severity = row[1]
                count = row[7]
                errors_by_severity[severity] = errors_by_severity.get(severity, 0) + count
            
            # Errors by component
            errors_by_component = {}
            for row in rows:
                component = row[2]
                count = row[7]
                errors_by_component[component] = errors_by_component.get(component, 0) + count
            
            # Resolution rate and time
            resolved_errors = [row for row in rows if row[4] == 'resolved']
            resolution_rate = len(resolved_errors) / len(rows) * 100 if rows else 0
            
            # Calculate average resolution time
            resolution_times = []
            for row in resolved_errors:
                if row[5]:  # resolved_at
                    resolved_at = datetime.fromisoformat(row[5])
                    created_at = datetime.fromisoformat(row[6])
                    resolution_time = (resolved_at - created_at).total_seconds() / 3600  # hours
                    resolution_times.append(resolution_time)
            
            average_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
            
            # Top error types
            error_types = {}
            for row in rows:
                error_type = row[3]
                count = row[7]
                error_types[error_type] = error_types.get(error_type, 0) + count
            
            top_error_types = sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:10]
            
            return ErrorMetrics(
                total_errors=total_errors,
                errors_by_category=errors_by_category,
                errors_by_severity=errors_by_severity,
                errors_by_component=errors_by_component,
                resolution_rate=round(resolution_rate, 2),
                average_resolution_time=round(average_resolution_time, 2),
                top_error_types=top_error_types,
                time_period=f"{time_period_hours}h",
                generated_at=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error generating error metrics: {e}")
            raise
    
    async def analyze_error_trends(
        self,
        time_period_hours: int = 168,  # 1 week
        comparison_period_hours: int = 168  # Compare with previous week
    ) -> List[ErrorTrend]:
        """
        Analyze error trends over time periods
        
        Args:
            time_period_hours: Current time period for analysis
            comparison_period_hours: Previous time period for comparison
            
        Returns:
            List of ErrorTrend objects with trend analysis
        """
        try:
            current_cutoff = datetime.now() - timedelta(hours=time_period_hours)
            previous_cutoff = current_cutoff - timedelta(hours=comparison_period_hours)
            
            # Get current period data
            current_data = await self._get_trend_data(current_cutoff, datetime.now())
            
            # Get previous period data
            previous_data = await self._get_trend_data(previous_cutoff, current_cutoff)
            
            trends = []
            
            # Analyze trends by category
            for category in ErrorCategory:
                current_count = current_data.get(category.value, {}).get('count', 0)
                previous_count = previous_data.get(category.value, {}).get('count', 0)
                
                # Calculate trend
                if previous_count == 0:
                    trend_percentage = 100.0 if current_count > 0 else 0.0
                    trend_direction = "increasing" if current_count > 0 else "stable"
                else:
                    trend_percentage = ((current_count - previous_count) / previous_count) * 100
                    if trend_percentage > 10:
                        trend_direction = "increasing"
                    elif trend_percentage < -10:
                        trend_direction = "decreasing"
                    else:
                        trend_direction = "stable"
                
                # Generate recommendations
                recommendations = self._generate_trend_recommendations(
                    category, current_count, trend_direction, trend_percentage
                )
                
                # Get severity and component distributions
                current_category_data = current_data.get(category.value, {})
                severity_distribution = current_category_data.get('severities', {})
                component_distribution = current_category_data.get('components', {})
                
                trend = ErrorTrend(
                    category=category,
                    time_period=f"{time_period_hours}h",
                    error_count=current_count,
                    severity_distribution=severity_distribution,
                    component_distribution=component_distribution,
                    trend_direction=trend_direction,
                    trend_percentage=round(trend_percentage, 2),
                    recommendations=recommendations
                )
                
                trends.append(trend)
            
            return trends
            
        except Exception as e:
            logger.error(f"Error analyzing error trends: {e}")
            raise
    
    async def _get_trend_data(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get error data for trend analysis"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT category, severity, component, occurrence_count
                    FROM error_reports 
                    WHERE timestamp BETWEEN ? AND ?
                """, (start_time.isoformat(), end_time.isoformat()))
                
                rows = await cursor.fetchall()
            
            data = {}
            
            for row in rows:
                category, severity, component, count = row
                
                if category not in data:
                    data[category] = {
                        'count': 0,
                        'severities': {},
                        'components': {}
                    }
                
                data[category]['count'] += count
                data[category]['severities'][severity] = data[category]['severities'].get(severity, 0) + count
                data[category]['components'][component] = data[category]['components'].get(component, 0) + count
            
            return data
            
        except Exception as e:
            logger.error(f"Error getting trend data: {e}")
            return {}
    
    def _generate_trend_recommendations(
        self,
        category: ErrorCategory,
        error_count: int,
        trend_direction: str,
        trend_percentage: float
    ) -> List[str]:
        """Generate recommendations based on error trends"""
        recommendations = []
        
        if error_count == 0:
            recommendations.append(f"No {category.value} errors detected - maintain current practices")
            return recommendations
        
        if trend_direction == "increasing":
            if category == ErrorCategory.FRONTEND_TESTING:
                recommendations.extend([
                    "Review React testing utilities and act() wrapper usage",
                    "Audit component lifecycle management in tests",
                    "Consider implementing additional test isolation measures"
                ])
            elif category == ErrorCategory.BACKEND_INTEGRATION:
                recommendations.extend([
                    "Review database connection pooling and cleanup",
                    "Audit API endpoint error handling",
                    "Consider implementing circuit breaker patterns"
                ])
            elif category == ErrorCategory.CONFIGURATION:
                recommendations.extend([
                    "Validate environment variable configurations",
                    "Review package manager consistency",
                    "Audit configuration file synchronization"
                ])
            elif category == ErrorCategory.PERFORMANCE:
                recommendations.extend([
                    "Profile application performance bottlenecks",
                    "Review database query optimization",
                    "Consider implementing caching strategies"
                ])
            elif category == ErrorCategory.DATABASE:
                recommendations.extend([
                    "Review database connection management",
                    "Audit transaction isolation levels",
                    "Consider database performance tuning"
                ])
            else:
                recommendations.append(f"Investigate increasing {category.value} errors")
        
        elif trend_direction == "decreasing":
            recommendations.append(f"Good progress on {category.value} errors - continue current approach")
        
        else:  # stable
            if error_count > 10:
                recommendations.append(f"Stable but high {category.value} error count - investigate root causes")
            else:
                recommendations.append(f"{category.value} errors stable at acceptable levels")
        
        # Add severity-specific recommendations
        if abs(trend_percentage) > 50:
            recommendations.append("Significant trend change detected - prioritize investigation")
        
        return recommendations
    
    async def get_error_reports_by_criteria(
        self,
        category: Optional[ErrorCategory] = None,
        severity: Optional[ErrorSeverity] = None,
        component: Optional[str] = None,
        resolution_status: Optional[ResolutionStatus] = None,
        time_period_hours: int = 24,
        limit: int = 100
    ) -> List[ErrorReport]:
        """
        Get error reports filtered by various criteria
        
        Args:
            category: Optional category filter
            severity: Optional severity filter
            component: Optional component filter
            resolution_status: Optional resolution status filter
            time_period_hours: Time period for filtering
            limit: Maximum number of results
            
        Returns:
            List of ErrorReport objects matching criteria
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_period_hours)
            
            # Build query
            query = "SELECT * FROM error_reports WHERE timestamp > ?"
            params = [cutoff_time.isoformat()]
            
            if category:
                query += " AND category = ?"
                params.append(category.value)
            
            if severity:
                query += " AND severity = ?"
                params.append(severity.value)
            
            if component:
                query += " AND component = ?"
                params.append(component)
            
            if resolution_status:
                query += " AND resolution_status = ?"
                params.append(resolution_status.value)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(query, params)
                rows = await cursor.fetchall()
            
            error_reports = []
            for row in rows:
                error_report = await self._row_to_error_report(row)
                error_reports.append(error_report)
            
            return error_reports
            
        except Exception as e:
            logger.error(f"Error getting error reports by criteria: {e}")
            return []
    
    async def get_resolution_validation_report(self) -> Dict[str, Any]:
        """
        Generate report for validating error resolutions
        
        Returns:
            Dictionary with resolution validation metrics
        """
        try:
            # Get resolved errors from last 30 days
            cutoff_time = datetime.now() - timedelta(days=30)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT error_id, category, severity, component, error_type,
                           resolved_at, resolution_notes, occurrence_count
                    FROM error_reports 
                    WHERE resolution_status = 'resolved' 
                    AND resolved_at > ?
                    ORDER BY resolved_at DESC
                """, (cutoff_time.isoformat(),))
                
                resolved_errors = await cursor.fetchall()
                
                # Check for recurring errors (same type/component after resolution)
                cursor = await db.execute("""
                    SELECT r1.error_id, r1.error_type, r1.component, r1.resolved_at,
                           r2.error_id as recurring_id, r2.timestamp as recurring_time
                    FROM error_reports r1
                    JOIN error_reports r2 ON (
                        r1.error_type = r2.error_type 
                        AND r1.component = r2.component
                        AND r2.timestamp > r1.resolved_at
                    )
                    WHERE r1.resolution_status = 'resolved'
                    AND r1.resolved_at > ?
                    ORDER BY r1.resolved_at DESC
                """, (cutoff_time.isoformat(),))
                
                recurring_errors = await cursor.fetchall()
            
            # Calculate validation metrics
            total_resolved = len(resolved_errors)
            recurring_count = len(set(row[0] for row in recurring_errors))
            validation_rate = ((total_resolved - recurring_count) / total_resolved * 100) if total_resolved > 0 else 0
            
            # Group recurring errors by type
            recurring_by_type = {}
            for row in recurring_errors:
                error_type = row[1]
                if error_type not in recurring_by_type:
                    recurring_by_type[error_type] = []
                recurring_by_type[error_type].append({
                    'original_id': row[0],
                    'component': row[2],
                    'resolved_at': row[3],
                    'recurring_id': row[4],
                    'recurring_time': row[5]
                })
            
            # Resolution time analysis
            resolution_times = []
            for row in resolved_errors:
                if row[5]:  # resolved_at
                    # Note: We don't have created_at in this query, using timestamp as approximation
                    resolution_times.append(1.0)  # Placeholder - would need actual calculation
            
            avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
            
            return {
                'total_resolved_errors': total_resolved,
                'recurring_errors': recurring_count,
                'validation_rate': round(validation_rate, 2),
                'average_resolution_time_hours': round(avg_resolution_time, 2),
                'recurring_by_type': recurring_by_type,
                'recommendations': self._generate_validation_recommendations(
                    validation_rate, recurring_by_type
                ),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating resolution validation report: {e}")
            return {}
    
    def _generate_validation_recommendations(
        self,
        validation_rate: float,
        recurring_by_type: Dict[str, List[Dict]]
    ) -> List[str]:
        """Generate recommendations for resolution validation"""
        recommendations = []
        
        if validation_rate < 80:
            recommendations.append("Low resolution validation rate - review resolution processes")
        
        if validation_rate > 95:
            recommendations.append("Excellent resolution validation rate - maintain current practices")
        
        # Analyze recurring error patterns
        if recurring_by_type:
            most_recurring = max(recurring_by_type.items(), key=lambda x: len(x[1]))
            recommendations.append(
                f"Most recurring error type: {most_recurring[0]} "
                f"({len(most_recurring[1])} occurrences) - needs deeper investigation"
            )
        
        if len(recurring_by_type) > 5:
            recommendations.append("Multiple error types recurring - review resolution methodology")
        
        return recommendations
    
    async def cleanup_old_errors(self, days_to_keep: int = 90) -> int:
        """
        Clean up old error records to manage database size
        
        Args:
            days_to_keep: Number of days of error records to keep
            
        Returns:
            Number of records deleted
        """
        try:
            cutoff_time = datetime.now() - timedelta(days=days_to_keep)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    DELETE FROM error_reports 
                    WHERE timestamp < ? AND resolution_status = 'closed'
                """, (cutoff_time.isoformat(),))
                
                deleted_count = cursor.rowcount
                await db.commit()
                
                logger.info(
                    "Cleaned up old error records",
                    deleted_count=deleted_count,
                    cutoff_date=cutoff_time.isoformat()
                )
                
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error cleaning up old error records: {e}")
            return 0
    
    async def export_error_data(
        self,
        output_path: str,
        time_period_hours: int = 168,  # 1 week
        format: str = "json"
    ) -> bool:
        """
        Export error data for external analysis
        
        Args:
            output_path: Path to export file
            time_period_hours: Time period for export
            format: Export format ("json" or "csv")
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_period_hours)
            
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute("""
                    SELECT * FROM error_reports WHERE timestamp > ?
                    ORDER BY timestamp DESC
                """, (cutoff_time.isoformat(),))
                
                rows = await cursor.fetchall()
            
            if format.lower() == "json":
                export_data = []
                for row in rows:
                    error_report = await self._row_to_error_report(row)
                    export_data.append({
                        'error_id': error_report.error_id,
                        'timestamp': error_report.timestamp.isoformat(),
                        'category': error_report.category.value,
                        'severity': error_report.severity.value,
                        'component': error_report.component,
                        'error_type': error_report.error_type,
                        'error_message': error_report.error_message,
                        'resolution_status': error_report.resolution_status.value,
                        'occurrence_count': error_report.occurrence_count,
                        'context': error_report.context
                    })
                
                with open(output_path, 'w') as f:
                    json.dump(export_data, f, indent=2)
            
            elif format.lower() == "csv":
                import csv
                
                with open(output_path, 'w', newline='') as f:
                    writer = csv.writer(f)
                    
                    # Write header
                    writer.writerow([
                        'error_id', 'timestamp', 'category', 'severity', 'component',
                        'error_type', 'error_message', 'resolution_status', 'occurrence_count'
                    ])
                    
                    # Write data
                    for row in rows:
                        writer.writerow([
                            row[0], row[1], row[2], row[3], row[4],
                            row[5], row[6], row[9], row[16]
                        ])
            
            logger.info(
                "Error data exported successfully",
                output_path=output_path,
                format=format,
                record_count=len(rows)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error exporting error data: {e}")
            return False


# Global error tracker instance
_error_tracker: Optional[ErrorTracker] = None


def get_error_tracker() -> ErrorTracker:
    """Get the global error tracker instance"""
    global _error_tracker
    if _error_tracker is None:
        _error_tracker = ErrorTracker()
    return _error_tracker


async def init_error_tracker(db_path: Optional[str] = None) -> ErrorTracker:
    """Initialize the global error tracker"""
    global _error_tracker
    _error_tracker = ErrorTracker(db_path)
    return _error_tracker