"""
Agent Integration API for CopilotKit
Provides endpoints for connecting CopilotKit chat interface to LangGraph agents
"""

import asyncio
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sse_starlette import EventSourceResponse

from ..agents.regulatory_agent import RegulatoryAgent
from ..agents.regulatory_agent_state import AgentTaskType, AgentStatus
from ..services.session_manager import SessionManager
from ..services.audit_logger import AuditLogger
from ..middleware.auth import get_current_user


router = APIRouter(prefix="/api/agent", tags=["agent"])


# Request/Response Models
class AgentTaskRequest(BaseModel):
    """Request model for agent task execution"""
    task_type: str = Field(..., description="Type of task to execute")
    project_id: str = Field(..., description="Project ID for context")
    device_description: str = Field(..., description="Device description")
    intended_use: str = Field(..., description="Intended use statement")
    device_type: Optional[str] = Field(None, description="Device type")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Task-specific parameters")
    session_id: Optional[str] = Field(None, description="Existing session ID")


class AgentTaskResponse(BaseModel):
    """Response model for agent task execution"""
    session_id: str
    task_type: str
    status: str
    result: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    reasoning: Optional[str] = None
    execution_time_ms: Optional[int] = None
    error: Optional[str] = None


class SessionStatusResponse(BaseModel):
    """Response model for session status"""
    session_id: str
    status: str
    current_task: Optional[str] = None
    completed_tasks: List[str] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)


class CancellationRequest(BaseModel):
    """Request model for task cancellation"""
    session_id: str
    reason: Optional[str] = Field(None, description="Reason for cancellation")


# Global instances - initialized lazily
_session_manager = None
_audit_logger = None


def get_session_manager() -> SessionManager:
    """Get or create session manager instance"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager


def get_audit_logger() -> AuditLogger:
    """Get or create audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger


@router.post("/execute", response_model=AgentTaskResponse)
async def execute_agent_task(
    request: AgentTaskRequest,
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user)
) -> AgentTaskResponse:
    """
    Execute an agent task through the LangGraph workflow
    """
    
    try:
        # Validate task type
        try:
            task_type = AgentTaskType(request.task_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid task type: {request.task_type}"
            )
        
        # Get or create agent session
        session_manager = get_session_manager()
        audit_logger = get_audit_logger()
        
        if request.session_id:
            agent = await session_manager.get_session(request.session_id)
            if not agent:
                raise HTTPException(
                    status_code=404,
                    detail=f"Session {request.session_id} not found"
                )
        else:
            # Create new session
            agent = RegulatoryAgent(audit_logger=audit_logger)
            session_result = await agent.start_session(
                project_id=request.project_id,
                user_id=user.id,
                device_description=request.device_description,
                intended_use=request.intended_use,
                device_type=request.device_type
            )
            session_id = session_result["session_id"]
            
            # Store session
            await session_manager.store_session(session_id, agent)
        
        # Execute the task
        result = await agent.execute_task(
            session_id=request.session_id or session_id,
            task_type=task_type,
            task_parameters=request.parameters
        )
        
        # Format response
        response = AgentTaskResponse(
            session_id=result["session_id"],
            task_type=result["task_type"],
            status=result["status"],
            result=result.get("result"),
            confidence=result.get("confidence"),
            execution_time_ms=result.get("execution_time_ms")
        )
        
        # Add sources and reasoning if available
        if result.get("result") and isinstance(result["result"], dict):
            task_result = result["result"]
            if hasattr(task_result, 'sources'):
                response.sources = [
                    {
                        "url": source.url,
                        "title": source.title,
                        "effective_date": source.effective_date,
                        "document_type": source.document_type
                    }
                    for source in task_result.sources
                ]
            
            if hasattr(task_result, 'confidence'):
                response.reasoning = task_result.confidence.reasoning
        
        # Log successful execution
        background_tasks.add_task(
            get_audit_logger().log_agent_action,
            project_id=request.project_id,
            user_id=user.id,
            action=f"copilotkit_{request.task_type}",
            input_data=request.dict(),
            output_data=result,
            confidence_score=result.get("confidence", 0.0),
            sources=response.sources,
            reasoning=f"CopilotKit agent task execution: {request.task_type}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error
        background_tasks.add_task(
            get_audit_logger().log_agent_action,
            project_id=request.project_id,
            user_id=user.id,
            action=f"copilotkit_{request.task_type}_error",
            input_data=request.dict(),
            output_data={"error": str(e)},
            confidence_score=0.0,
            sources=[],
            reasoning=f"CopilotKit agent task failed: {str(e)}"
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Agent task execution failed: {str(e)}"
        )


@router.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(
    session_id: str,
    user = Depends(get_current_user)
) -> SessionStatusResponse:
    """
    Get current status of an agent session
    """
    
    try:
        session_manager = get_session_manager()
        agent = await session_manager.get_session(session_id)
        if not agent:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        # Get session state
        state = await agent.get_session_state(session_id)
        
        return SessionStatusResponse(
            session_id=session_id,
            status=state.get("status", "unknown"),
            current_task=state.get("current_task"),
            completed_tasks=state.get("completed_tasks", []),
            context=state
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get session status: {str(e)}"
        )


@router.get("/session/{session_id}/stream")
async def stream_session_updates(
    session_id: str,
    user = Depends(get_current_user)
):
    """
    Stream real-time updates for a session using Server-Sent Events
    """
    
    async def event_generator():
        """Generate SSE events for session updates"""
        
        try:
            session_manager = get_session_manager()
            agent = await session_manager.get_session(session_id)
            if not agent:
                yield {
                    "event": "error",
                    "data": f"Session {session_id} not found"
                }
                return
            
            # Send initial status
            state = await agent.get_session_state(session_id)
            yield {
                "event": "status",
                "data": {
                    "session_id": session_id,
                    "status": state.get("status", "unknown"),
                    "current_task": state.get("current_task"),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # Monitor for updates (simplified implementation)
            # In a production system, you'd use a proper event system
            last_update = datetime.utcnow()
            
            while True:
                await asyncio.sleep(1)  # Check every second
                
                try:
                    current_state = await agent.get_session_state(session_id)
                    
                    # Check if state has changed
                    if current_state.get("updated_at", "") > last_update.isoformat():
                        yield {
                            "event": "update",
                            "data": {
                                "session_id": session_id,
                                "status": current_state.get("status", "unknown"),
                                "current_task": current_state.get("current_task"),
                                "completed_tasks": current_state.get("completed_tasks", []),
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        }
                        last_update = datetime.utcnow()
                    
                    # Stop streaming if session is completed or errored
                    status = current_state.get("status", "")
                    if status in ["completed", "error", "cancelled"]:
                        yield {
                            "event": "complete",
                            "data": {
                                "session_id": session_id,
                                "final_status": status,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        }
                        break
                        
                except Exception as e:
                    yield {
                        "event": "error",
                        "data": f"Error monitoring session: {str(e)}"
                    }
                    break
                    
        except Exception as e:
            yield {
                "event": "error",
                "data": f"Stream initialization failed: {str(e)}"
            }
    
    return EventSourceResponse(event_generator())


@router.post("/session/{session_id}/cancel")
async def cancel_session_task(
    session_id: str,
    request: CancellationRequest,
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel a running agent task
    """
    
    try:
        session_manager = get_session_manager()
        agent = await session_manager.get_session(session_id)
        if not agent:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} not found"
            )
        
        # Get current state
        state = await agent.get_session_state(session_id)
        
        if state.get("status") not in ["processing", "waiting_for_input"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel session in status: {state.get('status')}"
            )
        
        # Implement cancellation logic
        # This would involve stopping the current workflow execution
        # For now, we'll mark the session as cancelled
        
        # Log cancellation
        background_tasks.add_task(
            get_audit_logger().log_agent_action,
            project_id=state.get("project_id", "unknown"),
            user_id=user.id,
            action="session_cancelled",
            input_data={"session_id": session_id, "reason": request.reason},
            output_data={"cancelled_at": datetime.utcnow().isoformat()},
            confidence_score=1.0,
            sources=[],
            reasoning=f"User cancelled session: {request.reason or 'No reason provided'}"
        )
        
        return {
            "session_id": session_id,
            "status": "cancelled",
            "message": "Session cancelled successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel session: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for agent integration
    """
    
    try:
        # Check session manager
        session_manager = get_session_manager()
        session_count = await session_manager.get_active_session_count()
        
        # Check tool registry (if available)
        tool_health = {}
        try:
            from ..tools.tool_registry import ToolRegistry
            registry = ToolRegistry()
            tool_health = await registry.health_check()
        except Exception as e:
            tool_health = {"error": str(e)}
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "active_sessions": session_count,
            "tools": tool_health
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/sessions")
async def list_user_sessions(
    user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    List all sessions for the current user
    """
    
    try:
        session_manager = get_session_manager()
        sessions = await session_manager.get_user_sessions(user.id)
        
        session_list = []
        for session_id, agent in sessions.items():
            try:
                state = await agent.get_session_state(session_id)
                session_list.append({
                    "session_id": session_id,
                    "project_id": state.get("project_id"),
                    "status": state.get("status"),
                    "created_at": state.get("created_at"),
                    "updated_at": state.get("updated_at"),
                    "completed_tasks": state.get("completed_tasks", [])
                })
            except Exception:
                # Skip sessions that can't be accessed
                continue
        
        return session_list
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list sessions: {str(e)}"
        )