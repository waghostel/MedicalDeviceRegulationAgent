"""
Regulatory Agent State Management for LangGraph workflows
"""

from typing import Dict, Any, List, Optional, TypedDict, Annotated
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum

from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage


class AgentTaskType(Enum):
    """Types of regulatory tasks the agent can perform"""
    DEVICE_CLASSIFICATION = "device_classification"
    PREDICATE_SEARCH = "predicate_search"
    PREDICATE_COMPARISON = "predicate_comparison"
    GUIDANCE_SEARCH = "guidance_search"
    SUBMISSION_CHECKLIST = "submission_checklist"


class AgentStatus(Enum):
    """Current status of agent execution"""
    IDLE = "idle"
    PROCESSING = "processing"
    WAITING_FOR_INPUT = "waiting_for_input"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class SourceCitation:
    """Source citation for regulatory information"""
    url: str
    title: str
    effective_date: str
    document_type: str
    accessed_date: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ConfidenceScore:
    """Confidence score with reasoning"""
    score: float  # 0.0 to 1.0
    reasoning: str
    factors: List[str] = field(default_factory=list)


@dataclass
class AgentResult:
    """Result from an agent action"""
    task_type: AgentTaskType
    data: Dict[str, Any]
    confidence: ConfidenceScore
    sources: List[SourceCitation]
    reasoning_trace: List[str]
    execution_time_ms: int
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RegulatoryAgentState(TypedDict):
    """
    State management for regulatory agent workflows
    
    This class manages the complete state of a regulatory agent session,
    including project context, conversation history, and task results.
    """
    
    # Project context
    project_id: str
    user_id: str
    device_description: str
    intended_use: str
    device_type: Optional[str]
    
    # Current task information
    current_task: Optional[AgentTaskType]
    task_parameters: Dict[str, Any]
    status: AgentStatus
    
    # Conversation and memory
    messages: Annotated[List[BaseMessage], add_messages]
    conversation_context: Dict[str, Any]
    
    # Results and analysis
    results: Dict[str, AgentResult]
    confidence_scores: Dict[str, float]
    
    # Audit trail
    action_history: List[Dict[str, Any]]
    error_log: List[Dict[str, Any]]
    
    # Checkpoints for long-running processes
    checkpoint_data: Dict[str, Any]
    last_checkpoint: Optional[str]
    
    # Tool registry and configuration
    available_tools: List[str]
    tool_configurations: Dict[str, Dict[str, Any]]
    
    # Session metadata
    session_id: str
    created_at: str
    updated_at: str


class RegulatoryAgentStateManager:
    """
    Manager class for regulatory agent state operations
    """
    
    def __init__(self):
        self.default_tools = [
            "fda_predicate_search",
            "device_classification",
            "predicate_comparison",
            "guidance_document_search",
            "document_processor"
        ]
    
    def create_initial_state(
        self,
        project_id: str,
        user_id: str,
        device_description: str,
        intended_use: str,
        device_type: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> RegulatoryAgentState:
        """Create initial agent state for a new session"""
        
        if session_id is None:
            session_id = f"session_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{project_id}"
        
        current_time = datetime.now(timezone.utc).isoformat()
        
        return RegulatoryAgentState(
            # Project context
            project_id=project_id,
            user_id=user_id,
            device_description=device_description,
            intended_use=intended_use,
            device_type=device_type,
            
            # Current task information
            current_task=None,
            task_parameters={},
            status=AgentStatus.IDLE,
            
            # Conversation and memory
            messages=[],
            conversation_context={
                "project_context": {
                    "device_description": device_description,
                    "intended_use": intended_use,
                    "device_type": device_type
                }
            },
            
            # Results and analysis
            results={},
            confidence_scores={},
            
            # Audit trail
            action_history=[],
            error_log=[],
            
            # Checkpoints
            checkpoint_data={},
            last_checkpoint=None,
            
            # Tool registry
            available_tools=self.default_tools.copy(),
            tool_configurations={},
            
            # Session metadata
            session_id=session_id,
            created_at=current_time,
            updated_at=current_time
        )
    
    def update_state(
        self,
        state: RegulatoryAgentState,
        **updates: Any
    ) -> RegulatoryAgentState:
        """Update agent state with new information"""
        
        # Update timestamp
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Apply updates
        for key, value in updates.items():
            if key in state:
                state[key] = value
        
        return state
    
    def add_result(
        self,
        state: RegulatoryAgentState,
        task_type: AgentTaskType,
        result_data: Dict[str, Any],
        confidence: ConfidenceScore,
        sources: List[SourceCitation],
        reasoning_trace: List[str],
        execution_time_ms: int
    ) -> RegulatoryAgentState:
        """Add a new result to the agent state"""
        
        result = AgentResult(
            task_type=task_type,
            data=result_data,
            confidence=confidence,
            sources=sources,
            reasoning_trace=reasoning_trace,
            execution_time_ms=execution_time_ms
        )
        
        # Store result
        state["results"][task_type.value] = result
        state["confidence_scores"][task_type.value] = confidence.score
        
        # Update conversation context
        state["conversation_context"][f"last_{task_type.value}"] = {
            "result": result_data,
            "confidence": confidence.score,
            "timestamp": result.created_at
        }
        
        # Add to action history
        state["action_history"].append({
            "action": f"completed_{task_type.value}",
            "timestamp": result.created_at,
            "confidence": confidence.score,
            "execution_time_ms": execution_time_ms
        })
        
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return state
    
    def add_error(
        self,
        state: Optional[RegulatoryAgentState],
        error_type: str,
        error_message: str,
        error_details: Optional[Dict[str, Any]] = None
    ) -> RegulatoryAgentState:
        """Add an error to the agent state"""
        
        # Handle case where state is None
        if state is None:
            state = {
                "error_log": [],
                "status": AgentStatus.ERROR,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        
        error_entry = {
            "error_type": error_type,
            "message": error_message,
            "details": error_details or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task": state.get("current_task") if state else None
        }
        
        if "error_log" not in state:
            state["error_log"] = []
        
        state["error_log"].append(error_entry)
        state["status"] = AgentStatus.ERROR
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return state
    
    def create_checkpoint(
        self,
        state: RegulatoryAgentState,
        checkpoint_name: str,
        checkpoint_data: Dict[str, Any]
    ) -> RegulatoryAgentState:
        """Create a checkpoint for long-running processes"""
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        state["checkpoint_data"][checkpoint_name] = {
            "data": checkpoint_data,
            "timestamp": timestamp,
            "task": state.get("current_task")
        }
        
        state["last_checkpoint"] = checkpoint_name
        state["updated_at"] = timestamp
        
        return state
    
    def restore_from_checkpoint(
        self,
        state: RegulatoryAgentState,
        checkpoint_name: str
    ) -> RegulatoryAgentState:
        """Restore state from a checkpoint"""
        
        if checkpoint_name not in state["checkpoint_data"]:
            raise ValueError(f"Checkpoint '{checkpoint_name}' not found")
        
        checkpoint = state["checkpoint_data"][checkpoint_name]
        
        # Restore checkpoint data
        for key, value in checkpoint["data"].items():
            if key in state:
                state[key] = value
        
        state["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return state
    
    def get_context_summary(self, state: RegulatoryAgentState) -> Dict[str, Any]:
        """Get a summary of the current agent context"""
        
        return {
            "project_id": state.get("project_id"),
            "device_description": state.get("device_description"),
            "intended_use": state.get("intended_use"),
            "current_task": state.get("current_task").value if state.get("current_task") else None,
            "status": state.get("status").value if state.get("status") else "unknown",
            "completed_tasks": list(state.get("results", {}).keys()),
            "confidence_scores": state.get("confidence_scores", {}),
            "session_duration": self._calculate_session_duration(state),
            "error_count": len(state.get("error_log", [])),
            "checkpoint_count": len(state.get("checkpoint_data", {}))
        }
    
    def _calculate_session_duration(self, state: RegulatoryAgentState) -> str:
        """Calculate session duration in human-readable format"""
        
        try:
            created = datetime.fromisoformat(state["created_at"])
            updated = datetime.fromisoformat(state["updated_at"])
            duration = updated - created
            
            hours, remainder = divmod(duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            
            if hours > 0:
                return f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
            elif minutes > 0:
                return f"{int(minutes)}m {int(seconds)}s"
            else:
                return f"{int(seconds)}s"
        except Exception:
            return "unknown"