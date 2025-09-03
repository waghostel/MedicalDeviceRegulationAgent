   """
Background Job Processing Service

This service handles long-running tasks like predicate searches,
document processing, and agent workflows in the background.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
import traceback

import redis.asyncio as redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    """Job status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobPriority(Enum):
    """Job priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class JobResult:
    """Job execution result"""
    job_id: str
    status: JobStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_time_seconds: Optional[float] = None
    retry_count: int = 0


class Job(BaseModel):
    """Job definition"""
    id: str
    type: str
    data: Dict[str, Any]
    priority: JobPriority = JobPriority.NORMAL
    max_retries: int = 3
    timeout_seconds: int = 300  # 5 minutes default
    created_at: datetime
    scheduled_at: Optional[datetime] = None
    project_id: Optional[int] = None
    user_id: Optional[int] = None


class JobQueue:
    """
    Redis-based job queue for background processing
    """
    
    def __init__(self, redis_client: redis.Redis, queue_name: str = "mdra_jobs"):
        self.redis_client = redis_client
        self.queue_name = queue_name
        self.result_ttl = 3600  # Keep results for 1 hour
    
    async def enqueue(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        delay_seconds: int = 0,
        max_retries: int = 3,
        timeout_seconds: int = 300,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> str:
        """Enqueue a job for background processing"""
        job_id = str(uuid.uuid4())
        
        job = Job(
            id=job_id,
            type=job_type,
            data=job_data,
            priority=priority,
            max_retries=max_retries,
            timeout_seconds=timeout_seconds,
            created_at=datetime.now(),
            scheduled_at=datetime.now() + timedelta(seconds=delay_seconds) if delay_seconds > 0 else None,
            project_id=project_id,
            user_id=user_id
        )
        
        try:
            # Store job data
            await self.redis_client.hset(
                f"job:{job_id}",
                mapping={
                    "data": job.model_dump_json(),
                    "status": JobStatus.PENDING.value,
                    "created_at": job.created_at.isoformat()
                }
            )
            
            # Set TTL for job data
            await self.redis_client.expire(f"job:{job_id}", 86400)  # 24 hours
            
            # Add to appropriate queue based on priority
            queue_key = f"{self.queue_name}:{priority.value}"
            
            if delay_seconds > 0:
                # Schedule for later execution
                score = (datetime.now() + timedelta(seconds=delay_seconds)).timestamp()
                await self.redis_client.zadd(f"{queue_key}:scheduled", {job_id: score})
            else:
                # Add to immediate processing queue
                await self.redis_client.lpush(queue_key, job_id)
            
            logger.info(f"Enqueued job {job_id} of type {job_type} with priority {priority.value}")
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to enqueue job: {e}")
            raise
    
    async def dequeue(self, priority: JobPriority = JobPriority.NORMAL, timeout: int = 10) -> Optional[Job]:
        """Dequeue a job for processing"""
        queue_key = f"{self.queue_name}:{priority.value}"
        
        try:
            # First check for scheduled jobs that are ready
            await self._process_scheduled_jobs(priority)
            
            # Then get next job from queue
            result = await self.redis_client.brpop(queue_key, timeout=timeout)
            
            if result:
                _, job_id = result
                job_id = job_id.decode('utf-8')
                
                # Get job data
                job_data = await self.redis_client.hget(f"job:{job_id}", "data")
                if job_data:
                    job_dict = json.loads(job_data)
                    job = Job(**job_dict)
                    
                    # Update status to running
                    await self.redis_client.hset(f"job:{job_id}", "status", JobStatus.RUNNING.value)
                    
                    logger.debug(f"Dequeued job {job_id} of type {job.type}")
                    return job
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to dequeue job: {e}")
            return None
    
    async def _process_scheduled_jobs(self, priority: JobPriority) -> None:
        """Move scheduled jobs to processing queue if ready"""
        queue_key = f"{self.queue_name}:{priority.value}"
        scheduled_key = f"{queue_key}:scheduled"
        
        try:
            now = datetime.now().timestamp()
            
            # Get jobs ready for processing
            ready_jobs = await self.redis_client.zrangebyscore(scheduled_key, 0, now)
            
            for job_id in ready_jobs:
                job_id = job_id.decode('utf-8')
                
                # Move to processing queue
                await self.redis_client.lpush(queue_key, job_id)
                await self.redis_client.zrem(scheduled_key, job_id)
                
                logger.debug(f"Moved scheduled job {job_id} to processing queue")
                
        except Exception as e:
            logger.error(f"Error processing scheduled jobs: {e}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and details"""
        try:
            job_info = await self.redis_client.hgetall(f"job:{job_id}")
            
            if job_info:
                return {
                    "job_id": job_id,
                    "status": job_info.get(b"status", b"").decode('utf-8'),
                    "created_at": job_info.get(b"created_at", b"").decode('utf-8'),
                    "started_at": job_info.get(b"started_at", b"").decode('utf-8'),
                    "completed_at": job_info.get(b"completed_at", b"").decode('utf-8'),
                    "error": job_info.get(b"error", b"").decode('utf-8'),
                    "retry_count": int(job_info.get(b"retry_count", 0))
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {e}")
            return None
    
    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        result: Optional[Any] = None,
        error: Optional[str] = None
    ) -> bool:
        """Update job status and result"""
        try:
            updates = {
                "status": status.value,
                "updated_at": datetime.now().isoformat()
            }
            
            if status == JobStatus.RUNNING:
                updates["started_at"] = datetime.now().isoformat()
            elif status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                updates["completed_at"] = datetime.now().isoformat()
                
                if result is not None:
                    updates["result"] = json.dumps(result, default=str)
                
                if error is not None:
                    updates["error"] = error
            
            await self.redis_client.hset(f"job:{job_id}", mapping=updates)
            
            # Store result separately for easier retrieval
            if result is not None:
                await self.redis_client.setex(
                    f"job_result:{job_id}",
                    self.result_ttl,
                    json.dumps(result, default=str)
                )
            
            logger.debug(f"Updated job {job_id} status to {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update job status for {job_id}: {e}")
            return False
    
    async def get_job_result(self, job_id: str) -> Optional[Any]:
        """Get job result"""
        try:
            result_data = await self.redis_client.get(f"job_result:{job_id}")
            
            if result_data:
                return json.loads(result_data)
            
            # Fallback to job hash
            job_info = await self.redis_client.hget(f"job:{job_id}", "result")
            if job_info:
                return json.loads(job_info)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get job result for {job_id}: {e}")
            return None
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending job"""
        try:
            # Check if job is still pending
            status = await self.redis_client.hget(f"job:{job_id}", "status")
            
            if status and status.decode('utf-8') == JobStatus.PENDING.value:
                # Remove from all queues
                for priority in JobPriority:
                    queue_key = f"{self.queue_name}:{priority.value}"
                    await self.redis_client.lrem(queue_key, 0, job_id)
                    await self.redis_client.zrem(f"{queue_key}:scheduled", job_id)
                
                # Update status
                await self.update_job_status(job_id, JobStatus.CANCELLED)
                
                logger.info(f"Cancelled job {job_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            return False
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            stats = {
                "queues": {},
                "total_pending": 0,
                "total_scheduled": 0
            }
            
            for priority in JobPriority:
                queue_key = f"{self.queue_name}:{priority.value}"
                scheduled_key = f"{queue_key}:scheduled"
                
                pending_count = await self.redis_client.llen(queue_key)
                scheduled_count = await self.redis_client.zcard(scheduled_key)
                
                stats["queues"][priority.value] = {
                    "pending": pending_count,
                    "scheduled": scheduled_count
                }
                
                stats["total_pending"] += pending_count
                stats["total_scheduled"] += scheduled_count
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {"error": str(e)}


class BackgroundJobProcessor:
    """
    Background job processor that executes jobs from the queue
    """
    
    def __init__(self, redis_client: redis.Redis, max_workers: int = 5):
        self.redis_client = redis_client
        self.job_queue = JobQueue(redis_client)
        self.max_workers = max_workers
        self.job_handlers: Dict[str, Callable] = {}
        self.workers: List[asyncio.Task] = []
        self.running = False
    
    def register_handler(self, job_type: str, handler: Callable) -> None:
        """Register a job handler function"""
        self.job_handlers[job_type] = handler
        logger.info(f"Registered handler for job type: {job_type}")
    
    async def start(self) -> None:
        """Start background job processing"""
        if self.running:
            return
        
        self.running = True
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker_task = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker_task)
        
        logger.info(f"Started {self.max_workers} background job workers")
    
    async def stop(self) -> None:
        """Stop background job processing"""
        if not self.running:
            return
        
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        self.workers.clear()
        logger.info("Stopped background job processing")
    
    async def _worker(self, worker_name: str) -> None:
        """Worker coroutine that processes jobs"""
        logger.info(f"Started worker: {worker_name}")
        
        while self.running:
            try:
                # Try to get jobs from high to low priority
                job = None
                for priority in [JobPriority.URGENT, JobPriority.HIGH, JobPriority.NORMAL, JobPriority.LOW]:
                    job = await self.job_queue.dequeue(priority, timeout=1)
                    if job:
                        break
                
                if job:
                    await self._process_job(job, worker_name)
                else:
                    # No jobs available, short sleep
                    await asyncio.sleep(0.1)
                    
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_name} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                await asyncio.sleep(1)  # Brief pause on error
        
        logger.info(f"Worker {worker_name} stopped")
    
    async def _process_job(self, job: Job, worker_name: str) -> None:
        """Process a single job"""
        logger.info(f"Worker {worker_name} processing job {job.id} of type {job.type}")
        
        start_time = datetime.now()
        
        try:
            # Check if we have a handler for this job type
            if job.type not in self.job_handlers:
                raise ValueError(f"No handler registered for job type: {job.type}")
            
            handler = self.job_handlers[job.type]
            
            # Execute job with timeout
            result = await asyncio.wait_for(
                handler(job.data),
                timeout=job.timeout_seconds
            )
            
            # Update job status with result
            await self.job_queue.update_job_status(
                job.id,
                JobStatus.COMPLETED,
                result=result
            )
            
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Job {job.id} completed successfully in {execution_time:.2f}s")
            
        except asyncio.TimeoutError:
            error_msg = f"Job {job.id} timed out after {job.timeout_seconds} seconds"
            logger.error(error_msg)
            
            await self.job_queue.update_job_status(
                job.id,
                JobStatus.FAILED,
                error=error_msg
            )
            
        except Exception as e:
            error_msg = f"Job {job.id} failed: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            
            # Check if we should retry
            job_status = await self.job_queue.get_job_status(job.id)
            retry_count = job_status.get("retry_count", 0) if job_status else 0
            
            if retry_count < job.max_retries:
                # Retry job with exponential backoff
                delay = min(300, 2 ** retry_count * 10)  # Max 5 minutes delay
                
                await self.job_queue.enqueue(
                    job.type,
                    job.data,
                    priority=job.priority,
                    delay_seconds=delay,
                    max_retries=job.max_retries,
                    timeout_seconds=job.timeout_seconds,
                    project_id=job.project_id,
                    user_id=job.user_id
                )
                
                # Update retry count
                await self.redis_client.hincrby(f"job:{job.id}", "retry_count", 1)
                
                logger.info(f"Retrying job {job.id} in {delay} seconds (attempt {retry_count + 1}/{job.max_retries})")
            else:
                await self.job_queue.update_job_status(
                    job.id,
                    JobStatus.FAILED,
                    error=error_msg
                )
    
    async def enqueue_job(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        **kwargs
    ) -> str:
        """Convenience method to enqueue a job"""
        return await self.job_queue.enqueue(job_type, job_data, priority, **kwargs)
    
    async def wait_for_completion(self, job_id: str, timeout: int = 300) -> Optional[Any]:
        """Wait for job completion and return result"""
        start_time = datetime.now()
        
        while (datetime.now() - start_time).total_seconds() < timeout:
            status_info = await self.job_queue.get_job_status(job_id)
            
            if not status_info:
                return None
            
            status = status_info.get("status")
            
            if status == JobStatus.COMPLETED.value:
                return await self.job_queue.get_job_result(job_id)
            elif status in [JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
                error = status_info.get("error", "Job failed")
                raise Exception(f"Job {job_id} {status}: {error}")
            
            await asyncio.sleep(1)  # Check every second
        
        raise TimeoutError(f"Job {job_id} did not complete within {timeout} seconds")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on job processing system"""
        try:
            # Get queue stats
            queue_stats = await self.job_queue.get_queue_stats()
            
            # Check worker status
            active_workers = sum(1 for worker in self.workers if not worker.done())
            
            return {
                "status": "healthy" if self.running else "stopped",
                "active_workers": active_workers,
                "total_workers": len(self.workers),
                "registered_handlers": list(self.job_handlers.keys()),
                "queue_stats": queue_stats,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Job handler implementations for common tasks
async def predicate_search_handler(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for predicate search jobs"""
    # This would integrate with the actual FDA search service
    logger.info(f"Processing predicate search: {job_data}")
    
    # Simulate processing time
    await asyncio.sleep(2)
    
    return {
        "predicates": [
            {
                "k_number": "K123456",
                "device_name": "Similar Device",
                "confidence_score": 0.85
            }
        ],
        "total_found": 1,
        "search_time_seconds": 2.0
    }


async def device_classification_handler(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for device classification jobs"""
    logger.info(f"Processing device classification: {job_data}")
    
    # Simulate processing time
    await asyncio.sleep(1)
    
    return {
        "device_class": "II",
        "product_code": "ABC",
        "regulatory_pathway": "510k",
        "confidence_score": 0.92
    }


async def document_processing_handler(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for document processing jobs"""
    logger.info(f"Processing document: {job_data}")
    
    # Simulate processing time
    await asyncio.sleep(5)
    
    return {
        "processed": True,
        "pages": 10,
        "text_extracted": True,
        "processing_time_seconds": 5.0
    }


# Factory function
async def create_job_processor(redis_url: str = "redis://localhost:6379") -> BackgroundJobProcessor:
    """Create and configure background job processor"""
    redis_client = redis.from_url(redis_url)
    processor = BackgroundJobProcessor(redis_client)
    
    # Register default handlers
    processor.register_handler("predicate_search", predicate_search_handler)
    processor.register_handler("device_classification", device_classification_handler)
    processor.register_handler("document_processing", document_processing_handler)
    
    return processor