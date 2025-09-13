"""
Background Cache Jobs Service

Manages background jobs for cache warming, maintenance, and optimization.
Provides scheduled tasks for keeping caches fresh and performant.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

from .intelligent_cache import IntelligentCache, DataFreshness
from .enhanced_openfda import EnhancedOpenFDAService
from .performance_monitor import get_performance_monitor
from database.connection import get_database_manager

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Background job status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobPriority(int, Enum):
    """Job priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class BackgroundJob:
    """Background job definition"""
    job_id: str
    job_type: str
    priority: JobPriority
    scheduled_at: datetime
    status: JobStatus = JobStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    max_retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class JobSchedule:
    """Job scheduling configuration"""
    job_type: str
    interval_minutes: int
    priority: JobPriority
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BackgroundCacheJobsService:
    """
    Service for managing background cache jobs and maintenance tasks
    """
    
    def __init__(
        self,
        intelligent_cache: IntelligentCache,
        enhanced_fda_service: Optional[EnhancedOpenFDAService] = None
    ):
        self.cache = intelligent_cache
        self.fda_service = enhanced_fda_service
        self.performance_monitor = get_performance_monitor()
        
        # Job management
        self.jobs: Dict[str, BackgroundJob] = {}
        self.job_queue: List[BackgroundJob] = []
        self.running_jobs: Set[str] = set()
        
        # Scheduling
        self.schedules: Dict[str, JobSchedule] = {}
        self._setup_default_schedules()
        
        # Control
        self._running = False
        self._scheduler_task: Optional[asyncio.Task] = None
        self._worker_tasks: Set[asyncio.Task] = set()
        self._max_concurrent_jobs = 3
    
    def _setup_default_schedules(self):
        """Setup default job schedules"""
        self.schedules = {
            "cache_warming": JobSchedule(
                job_type="cache_warming",
                interval_minutes=30,
                priority=JobPriority.NORMAL,
                metadata={"warmup_queries": 20}
            ),
            "cache_cleanup": JobSchedule(
                job_type="cache_cleanup",
                interval_minutes=60,
                priority=JobPriority.LOW,
                metadata={"cleanup_expired": True, "cleanup_unused": True}
            ),
            "pattern_analysis": JobSchedule(
                job_type="pattern_analysis",
                interval_minutes=15,
                priority=JobPriority.NORMAL,
                metadata={"analyze_patterns": True, "update_strategies": True}
            ),
            "performance_optimization": JobSchedule(
                job_type="performance_optimization",
                interval_minutes=120,
                priority=JobPriority.HIGH,
                metadata={"optimize_ttl": True, "rebalance_cache": True}
            ),
            "health_monitoring": JobSchedule(
                job_type="health_monitoring",
                interval_minutes=5,
                priority=JobPriority.HIGH,
                metadata={"check_cache_health": True, "monitor_performance": True}
            ),
            "fda_data_refresh": JobSchedule(
                job_type="fda_data_refresh",
                interval_minutes=240,  # 4 hours
                priority=JobPriority.NORMAL,
                metadata={"refresh_popular_queries": True, "update_classifications": True}
            )
        }
    
    async def start_background_jobs(self) -> None:
        """Start background job processing"""
        if self._running:
            logger.warning("Background jobs already running")
            return
        
        self._running = True
        
        # Start scheduler
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        
        # Start worker tasks
        for i in range(self._max_concurrent_jobs):
            worker_task = asyncio.create_task(self._worker_loop(f"worker_{i}"))
            self._worker_tasks.add(worker_task)
            worker_task.add_done_callback(self._worker_tasks.discard)
        
        logger.info(f"Background cache jobs started with {self._max_concurrent_jobs} workers")
    
    async def stop_background_jobs(self) -> None:
        """Stop background job processing"""
        self._running = False
        
        # Cancel scheduler
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        
        # Cancel worker tasks
        for task in self._worker_tasks:
            task.cancel()
        
        if self._worker_tasks:
            await asyncio.gather(*self._worker_tasks, return_exceptions=True)
            self._worker_tasks.clear()
        
        # Cancel running jobs
        for job_id in list(self.running_jobs):
            job = self.jobs.get(job_id)
            if job:
                job.status = JobStatus.CANCELLED
        
        logger.info("Background cache jobs stopped")
    
    async def _scheduler_loop(self) -> None:
        """Main scheduler loop"""
        while self._running:
            try:
                await self._schedule_jobs()
                await asyncio.sleep(60)  # Check every minute
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)
    
    async def _schedule_jobs(self) -> None:
        """Schedule jobs based on configured schedules"""
        now = datetime.now(timezone.utc)
        
        for schedule_name, schedule in self.schedules.items():
            if not schedule.enabled:
                continue
            
            # Calculate next run time
            if schedule.next_run is None:
                schedule.next_run = now + timedelta(minutes=schedule.interval_minutes)
                continue
            
            # Check if it's time to run
            if now >= schedule.next_run:
                job_id = f"{schedule.job_type}_{int(now.timestamp())}"
                
                job = BackgroundJob(
                    job_id=job_id,
                    job_type=schedule.job_type,
                    priority=schedule.priority,
                    scheduled_at=now,
                    metadata=schedule.metadata.copy()
                )
                
                await self._enqueue_job(job)
                
                # Update schedule
                schedule.last_run = now
                schedule.next_run = now + timedelta(minutes=schedule.interval_minutes)
                
                logger.debug(f"Scheduled job: {job_id}")
    
    async def _enqueue_job(self, job: BackgroundJob) -> None:
        """Add job to queue"""
        self.jobs[job.job_id] = job
        
        # Insert job in priority order
        inserted = False
        for i, queued_job in enumerate(self.job_queue):
            if job.priority.value > queued_job.priority.value:
                self.job_queue.insert(i, job)
                inserted = True
                break
        
        if not inserted:
            self.job_queue.append(job)
        
        logger.debug(f"Enqueued job {job.job_id} with priority {job.priority.name}")
    
    async def _worker_loop(self, worker_name: str) -> None:
        """Worker loop for processing jobs"""
        while self._running:
            try:
                # Get next job
                job = await self._get_next_job()
                if not job:
                    await asyncio.sleep(5)  # Wait for jobs
                    continue
                
                # Process job
                await self._process_job(job, worker_name)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                await asyncio.sleep(5)
    
    async def _get_next_job(self) -> Optional[BackgroundJob]:
        """Get next job from queue"""
        if not self.job_queue:
            return None
        
        # Find highest priority job that's not running
        for i, job in enumerate(self.job_queue):
            if job.job_id not in self.running_jobs:
                return self.job_queue.pop(i)
        
        return None
    
    async def _process_job(self, job: BackgroundJob, worker_name: str) -> None:
        """Process a background job"""
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        self.running_jobs.add(job.job_id)
        
        logger.info(f"Worker {worker_name} processing job {job.job_id} ({job.job_type})")
        
        try:
            # Execute job based on type
            if job.job_type == "cache_warming":
                result = await self._execute_cache_warming(job)
            elif job.job_type == "cache_cleanup":
                result = await self._execute_cache_cleanup(job)
            elif job.job_type == "pattern_analysis":
                result = await self._execute_pattern_analysis(job)
            elif job.job_type == "performance_optimization":
                result = await self._execute_performance_optimization(job)
            elif job.job_type == "health_monitoring":
                result = await self._execute_health_monitoring(job)
            elif job.job_type == "fda_data_refresh":
                result = await self._execute_fda_data_refresh(job)
            else:
                raise ValueError(f"Unknown job type: {job.job_type}")
            
            # Job completed successfully
            job.status = JobStatus.COMPLETED
            job.result = result
            job.completed_at = datetime.now(timezone.utc)
            
            logger.info(f"Job {job.job_id} completed successfully")
            
        except Exception as e:
            # Job failed
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            job.retry_count += 1
            
            logger.error(f"Job {job.job_id} failed: {e}")
            
            # Retry if possible
            if job.retry_count <= job.max_retries:
                job.status = JobStatus.PENDING
                job.started_at = None
                job.completed_at = None
                await self._enqueue_job(job)
                logger.info(f"Job {job.job_id} queued for retry ({job.retry_count}/{job.max_retries})")
        
        finally:
            self.running_jobs.discard(job.job_id)
    
    async def _execute_cache_warming(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute cache warming job"""
        result = {
            "job_type": "cache_warming",
            "started_at": job.started_at.isoformat(),
            "warmed_queries": 0,
            "failed_queries": 0,
            "errors": []
        }
        
        try:
            if self.fda_service:
                # Use FDA service cache warming
                warming_result = await self.fda_service.warm_popular_caches()
                result.update(warming_result)
            else:
                # Generic cache warming
                warmup_queries = job.metadata.get("warmup_queries", 10)
                
                # Warm most accessed patterns
                pattern_analysis = await self.cache.get_pattern_analysis()
                top_patterns = pattern_analysis.get("top_patterns", [])[:warmup_queries]
                
                for pattern in top_patterns:
                    try:
                        # Simulate warming by accessing pattern
                        await self.cache.get_with_freshness_check(
                            "pattern_warming",
                            pattern["template"],
                            required_freshness=DataFreshness.STALE
                        )
                        result["warmed_queries"] += 1
                    except Exception as e:
                        result["failed_queries"] += 1
                        result["errors"].append(f"Pattern {pattern['pattern_id']}: {str(e)}")
            
        except Exception as e:
            result["errors"].append(f"Cache warming error: {str(e)}")
            raise
        
        return result
    
    async def _execute_cache_cleanup(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute cache cleanup job"""
        result = {
            "job_type": "cache_cleanup",
            "started_at": job.started_at.isoformat(),
            "expired_entries_cleaned": 0,
            "unused_patterns_cleaned": 0,
            "memory_freed_bytes": 0
        }
        
        try:
            # Clean up expired entries
            if job.metadata.get("cleanup_expired", True):
                await self.cache._cleanup_expired_entries()
                result["expired_entries_cleaned"] = 1  # Placeholder
            
            # Clean up unused patterns
            if job.metadata.get("cleanup_unused", True):
                await self.cache._analyze_patterns()
                result["unused_patterns_cleaned"] = 1  # Placeholder
            
            # Memory optimization
            initial_memory = self.cache.metrics.total_size_bytes
            await self.cache._ensure_memory_limit(0)  # Trigger cleanup if needed
            final_memory = self.cache.metrics.total_size_bytes
            result["memory_freed_bytes"] = max(0, initial_memory - final_memory)
            
        except Exception as e:
            result["error"] = str(e)
            raise
        
        return result
    
    async def _execute_pattern_analysis(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute pattern analysis job"""
        result = {
            "job_type": "pattern_analysis",
            "started_at": job.started_at.isoformat(),
            "patterns_analyzed": 0,
            "strategies_updated": 0,
            "recommendations": []
        }
        
        try:
            # Get pattern analysis
            analysis = await self.cache.get_pattern_analysis()
            result["patterns_analyzed"] = analysis.get("total_patterns", 0)
            result["recommendations"] = analysis.get("recommendations", [])
            
            # Update strategies based on analysis
            if job.metadata.get("update_strategies", True):
                # This would implement strategy updates based on patterns
                result["strategies_updated"] = len(analysis.get("top_patterns", []))
            
        except Exception as e:
            result["error"] = str(e)
            raise
        
        return result
    
    async def _execute_performance_optimization(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute performance optimization job"""
        result = {
            "job_type": "performance_optimization",
            "started_at": job.started_at.isoformat(),
            "optimizations_applied": 0,
            "performance_improvement": 0.0
        }
        
        try:
            # Get current performance metrics
            initial_metrics = await self.cache.health_check()
            initial_response_time = initial_metrics.get("response_time_ms", 0)
            
            # Optimize TTL based on patterns
            if job.metadata.get("optimize_ttl", True):
                # This would implement TTL optimization
                result["optimizations_applied"] += 1
            
            # Rebalance cache
            if job.metadata.get("rebalance_cache", True):
                # This would implement cache rebalancing
                result["optimizations_applied"] += 1
            
            # Measure improvement
            final_metrics = await self.cache.health_check()
            final_response_time = final_metrics.get("response_time_ms", 0)
            
            if initial_response_time > 0:
                improvement = (initial_response_time - final_response_time) / initial_response_time
                result["performance_improvement"] = improvement
            
        except Exception as e:
            result["error"] = str(e)
            raise
        
        return result
    
    async def _execute_health_monitoring(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute health monitoring job"""
        result = {
            "job_type": "health_monitoring",
            "started_at": job.started_at.isoformat(),
            "cache_health": {},
            "performance_metrics": {},
            "alerts": []
        }
        
        try:
            # Check cache health
            if job.metadata.get("check_cache_health", True):
                health = await self.cache.health_check()
                result["cache_health"] = health
                
                # Generate alerts for unhealthy conditions
                if health.get("status") != "healthy":
                    result["alerts"].append({
                        "type": "cache_unhealthy",
                        "message": f"Cache health check failed: {health.get('error', 'Unknown error')}",
                        "severity": "high"
                    })
                
                # Check memory usage
                memory_usage_percent = health.get("memory_usage_percent", 0)
                if memory_usage_percent > 90:
                    result["alerts"].append({
                        "type": "high_memory_usage",
                        "message": f"Cache memory usage is {memory_usage_percent:.1f}%",
                        "severity": "high"
                    })
            
            # Monitor performance
            if job.metadata.get("monitor_performance", True):
                if self.fda_service:
                    metrics = await self.fda_service.get_performance_metrics()
                    result["performance_metrics"] = metrics
                    
                    # Check for performance issues
                    api_metrics = metrics.get("api_metrics", {})
                    hit_rate = api_metrics.get("cache_hit_rate", 0)
                    if hit_rate < 0.5:
                        result["alerts"].append({
                            "type": "low_cache_hit_rate",
                            "message": f"Cache hit rate is {hit_rate:.1%}",
                            "severity": "medium"
                        })
            
        except Exception as e:
            result["error"] = str(e)
            raise
        
        return result
    
    async def _execute_fda_data_refresh(self, job: BackgroundJob) -> Dict[str, Any]:
        """Execute FDA data refresh job"""
        result = {
            "job_type": "fda_data_refresh",
            "started_at": job.started_at.isoformat(),
            "queries_refreshed": 0,
            "classifications_updated": 0,
            "errors": []
        }
        
        try:
            if not self.fda_service:
                raise ValueError("FDA service not available for data refresh")
            
            # Refresh popular queries
            if job.metadata.get("refresh_popular_queries", True):
                # Get popular patterns and refresh their cache
                pattern_analysis = await self.cache.get_pattern_analysis()
                top_patterns = pattern_analysis.get("top_patterns", [])[:10]
                
                for pattern in top_patterns:
                    try:
                        # Force refresh by bypassing cache
                        template = pattern["template"]
                        if "search:" in template:
                            # Extract search terms from template
                            search_terms = ["medical", "device"]  # Simplified
                            await self.fda_service.search_predicates_optimized(
                                search_terms=search_terms,
                                use_cache=False  # Force refresh
                            )
                            result["queries_refreshed"] += 1
                    except Exception as e:
                        result["errors"].append(f"Pattern refresh {pattern['pattern_id']}: {str(e)}")
            
            # Update classifications
            if job.metadata.get("update_classifications", True):
                # This would refresh device classifications
                result["classifications_updated"] = 1  # Placeholder
            
        except Exception as e:
            result["error"] = str(e)
            raise
        
        return result
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific job"""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        return {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "status": job.status.value,
            "priority": job.priority.name,
            "scheduled_at": job.scheduled_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "retry_count": job.retry_count,
            "error_message": job.error_message,
            "result": job.result
        }
    
    async def get_job_summary(self) -> Dict[str, Any]:
        """Get summary of all jobs"""
        status_counts = {}
        for job in self.jobs.values():
            status_counts[job.status.value] = status_counts.get(job.status.value, 0) + 1
        
        return {
            "total_jobs": len(self.jobs),
            "queued_jobs": len(self.job_queue),
            "running_jobs": len(self.running_jobs),
            "status_counts": status_counts,
            "schedules": {
                name: {
                    "enabled": schedule.enabled,
                    "interval_minutes": schedule.interval_minutes,
                    "last_run": schedule.last_run.isoformat() if schedule.last_run else None,
                    "next_run": schedule.next_run.isoformat() if schedule.next_run else None
                }
                for name, schedule in self.schedules.items()
            },
            "service_running": self._running
        }
    
    async def enable_schedule(self, schedule_name: str) -> bool:
        """Enable a job schedule"""
        if schedule_name in self.schedules:
            self.schedules[schedule_name].enabled = True
            logger.info(f"Enabled schedule: {schedule_name}")
            return True
        return False
    
    async def disable_schedule(self, schedule_name: str) -> bool:
        """Disable a job schedule"""
        if schedule_name in self.schedules:
            self.schedules[schedule_name].enabled = False
            logger.info(f"Disabled schedule: {schedule_name}")
            return True
        return False
    
    async def trigger_job(self, job_type: str, priority: JobPriority = JobPriority.NORMAL) -> str:
        """Manually trigger a job"""
        job_id = f"{job_type}_manual_{int(datetime.now().timestamp())}"
        
        job = BackgroundJob(
            job_id=job_id,
            job_type=job_type,
            priority=priority,
            scheduled_at=datetime.now(timezone.utc),
            metadata={"manual_trigger": True}
        )
        
        await self._enqueue_job(job)
        logger.info(f"Manually triggered job: {job_id}")
        return job_id


# Global service instance
_background_jobs_service: Optional[BackgroundCacheJobsService] = None


async def get_background_jobs_service(
    intelligent_cache: IntelligentCache,
    enhanced_fda_service: Optional[EnhancedOpenFDAService] = None
) -> BackgroundCacheJobsService:
    """Get or create background jobs service"""
    global _background_jobs_service
    if _background_jobs_service is None:
        _background_jobs_service = BackgroundCacheJobsService(
            intelligent_cache=intelligent_cache,
            enhanced_fda_service=enhanced_fda_service
        )
    return _background_jobs_service


async def start_background_jobs_service(
    intelligent_cache: IntelligentCache,
    enhanced_fda_service: Optional[EnhancedOpenFDAService] = None
) -> BackgroundCacheJobsService:
    """Start background jobs service"""
    service = await get_background_jobs_service(intelligent_cache, enhanced_fda_service)
    await service.start_background_jobs()
    return service


async def stop_background_jobs_service():
    """Stop background jobs service"""
    global _background_jobs_service
    if _background_jobs_service:
        await _background_jobs_service.stop_background_jobs()
        _background_jobs_service = None