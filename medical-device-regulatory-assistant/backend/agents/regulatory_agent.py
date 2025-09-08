"""
Main Regulatory Agent implementation using LangGraph
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from .regulatory_agent_state import (
    RegulatoryAgentState,
    RegulatoryAgentStateManager,
    AgentTaskType,
    AgentStatus,
    ConfidenceScore,
    SourceCitation
)
from tools.tool_registry import ToolRegistry
from services.audit_logger import AuditLogger


class RegulatoryAgent:
    """
    Main regulatory agent class that orchestrates FDA regulatory workflows
    using LangGraph for state management and tool coordination.
    """
    
    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
        audit_logger: Optional[AuditLogger] = None,
        memory_saver: Optional[MemorySaver] = None
    ):
        self.state_manager = RegulatoryAgentStateManager()
        self.tool_registry = tool_registry or ToolRegistry()
        self.audit_logger = audit_logger or AuditLogger()
        self.memory_saver = memory_saver or MemorySaver()
        
        # Build the agent workflow graph
        self.workflow = self._build_workflow()
        self.app = self.workflow.compile(checkpointer=self.memory_saver)
        
        # Error handlers
        self.error_handlers: Dict[str, Callable] = {}
        self._register_default_error_handlers()
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow for regulatory tasks"""
        
        workflow = StateGraph(RegulatoryAgentState)
        
        # Add nodes for different regulatory tasks
        workflow.add_node("initialize", self._initialize_session)
        workflow.add_node("route_task", self._route_task)
        workflow.add_node("device_classification", self._handle_device_classification)
        workflow.add_node("predicate_search", self._handle_predicate_search)
        workflow.add_node("predicate_comparison", self._handle_predicate_comparison)
        workflow.add_node("guidance_search", self._handle_guidance_search)
        workflow.add_node("generate_response", self._generate_response)
        workflow.add_node("handle_error", self._handle_error)
        workflow.add_node("create_checkpoint", self._create_checkpoint)
        
        # Define workflow edges
        workflow.add_edge(START, "initialize")
        workflow.add_edge("initialize", "route_task")
        
        # Conditional routing based on task type
        workflow.add_conditional_edges(
            "route_task",
            self._determine_next_step,
            {
                "device_classification": "device_classification",
                "predicate_search": "predicate_search",
                "predicate_comparison": "predicate_comparison",
                "guidance_search": "guidance_search",
                "error": "handle_error",
                "end": END
            }
        )
        
        # Task completion flows
        workflow.add_edge("device_classification", "generate_response")
        workflow.add_edge("predicate_search", "create_checkpoint")
        workflow.add_edge("predicate_comparison", "generate_response")
        workflow.add_edge("guidance_search", "generate_response")
        
        # Checkpoint and response flows
        workflow.add_edge("create_checkpoint", "generate_response")
        workflow.add_edge("generate_response", END)
        workflow.add_edge("handle_error", END)
        
        return workflow
    
    async def start_session(
        self,
        project_id: str,
        user_id: str,
        device_description: str,
        intended_use: str,
        device_type: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Start a new regulatory agent session"""
        
        # Create initial state
        initial_state = self.state_manager.create_initial_state(
            project_id=project_id,
            user_id=user_id,
            device_description=device_description,
            intended_use=intended_use,
            device_type=device_type,
            session_id=session_id
        )
        
        # Configure the session
        config = RunnableConfig(
            configurable={"thread_id": initial_state["session_id"]}
        )
        
        try:
            # Initialize the workflow
            result = await self.app.ainvoke(initial_state, config=config)
            
            # Log session start
            await self.audit_logger.log_agent_action(
                project_id=project_id,
                user_id=user_id,
                action="session_started",
                input_data={
                    "device_description": device_description,
                    "intended_use": intended_use,
                    "device_type": device_type
                },
                output_data={"session_id": initial_state["session_id"]},
                confidence_score=1.0,
                sources=[],
                reasoning="New regulatory agent session initialized"
            )
            
            return {
                "session_id": initial_state["session_id"],
                "status": "initialized",
                "context": self.state_manager.get_context_summary(result)
            }
            
        except Exception as e:
            await self.audit_logger.log_agent_action(
                project_id=project_id,
                user_id=user_id,
                action="session_start_failed",
                input_data={"error": str(e)},
                output_data={},
                confidence_score=0.0,
                sources=[],
                reasoning=f"Failed to start session: {str(e)}"
            )
            raise
    
    async def execute_task(
        self,
        session_id: str,
        task_type: AgentTaskType,
        task_parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a specific regulatory task"""
        
        config = RunnableConfig(
            configurable={"thread_id": session_id}
        )
        
        try:
            # Get current state
            current_state = await self.app.aget_state(config)
            
            if not current_state.values:
                raise ValueError(f"Session {session_id} not found")
            
            # Update state with new task
            updated_state = self.state_manager.update_state(
                current_state.values,
                current_task=task_type,
                task_parameters=task_parameters,
                status=AgentStatus.PROCESSING
            )
            
            # Execute the task
            result = await self.app.ainvoke(updated_state, config=config)
            
            return {
                "session_id": session_id,
                "task_type": task_type.value,
                "status": result["status"].value,
                "result": result["results"].get(task_type.value),
                "confidence": result["confidence_scores"].get(task_type.value),
                "context": self.state_manager.get_context_summary(result)
            }
            
        except Exception as e:
            # Handle error and update state
            error_state = self.state_manager.add_error(
                current_state.values if 'current_state' in locals() else {},
                error_type="task_execution_error",
                error_message=str(e),
                error_details={"task_type": task_type.value, "parameters": task_parameters}
            )
            
            await self.app.aupdate_state(config, error_state)
            raise
    
    async def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Get current session state"""
        
        config = RunnableConfig(
            configurable={"thread_id": session_id}
        )
        
        state = await self.app.aget_state(config)
        
        if not state.values:
            raise ValueError(f"Session {session_id} not found")
        
        return self.state_manager.get_context_summary(state.values)
    
    # Workflow node implementations
    
    async def _initialize_session(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Initialize a new agent session"""
        
        # Add system message with regulatory context
        system_message = SystemMessage(
            content=f"""You are a specialized FDA regulatory assistant for medical device companies. 
            
            Current Project Context:
            - Device: {state['device_description']}
            - Intended Use: {state['intended_use']}
            - Device Type: {state.get('device_type', 'Not specified')}
            
            Your role is to help with:
            1. Device classification and product code identification
            2. 510(k) predicate device searches and analysis
            3. FDA guidance document searches
            4. Regulatory pathway recommendations
            
            Always provide confidence scores, cite sources, and maintain audit trails.
            Focus exclusively on US FDA regulations."""
        )
        
        state["messages"].append(system_message)
        state["status"] = AgentStatus.IDLE
        
        return state
    
    async def _route_task(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Route to appropriate task handler based on current task"""
        
        if not state.get("current_task"):
            state["status"] = AgentStatus.IDLE
            return state
        
        state["status"] = AgentStatus.PROCESSING
        
        # Add task start to action history
        state["action_history"].append({
            "action": f"started_{state['current_task'].value}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "parameters": state.get("task_parameters", {})
        })
        
        return state
    
    def _determine_next_step(self, state: RegulatoryAgentState) -> str:
        """Determine next workflow step based on current task"""
        
        if state["status"] == AgentStatus.ERROR:
            return "error"
        
        current_task = state.get("current_task")
        
        if not current_task:
            return "end"
        
        task_mapping = {
            AgentTaskType.DEVICE_CLASSIFICATION: "device_classification",
            AgentTaskType.PREDICATE_SEARCH: "predicate_search",
            AgentTaskType.PREDICATE_COMPARISON: "predicate_comparison",
            AgentTaskType.GUIDANCE_SEARCH: "guidance_search"
        }
        
        return task_mapping.get(current_task, "error")
    
    async def _handle_device_classification(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Handle device classification task"""
        
        start_time = time.time()
        
        try:
            # Get classification tool
            classification_tool = await self.tool_registry.get_tool("device_classification")
            
            # Execute classification
            result = await classification_tool.arun(
                device_description=state["device_description"],
                intended_use=state["intended_use"],
                device_type=state.get("device_type")
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Create confidence score
            confidence = ConfidenceScore(
                score=result.get("confidence", 0.0),
                reasoning=result.get("reasoning", ""),
                factors=result.get("confidence_factors", [])
            )
            
            # Create source citations
            sources = [
                SourceCitation(
                    url=source.get("url", ""),
                    title=source.get("title", ""),
                    effective_date=source.get("effective_date", ""),
                    document_type=source.get("document_type", "FDA_DATABASE")
                )
                for source in result.get("sources", [])
            ]
            
            # Add result to state
            state = self.state_manager.add_result(
                state=state,
                task_type=AgentTaskType.DEVICE_CLASSIFICATION,
                result_data=result,
                confidence=confidence,
                sources=sources,
                reasoning_trace=result.get("reasoning_trace", []),
                execution_time_ms=execution_time
            )
            
            state["status"] = AgentStatus.COMPLETED
            
        except Exception as e:
            state = self.state_manager.add_error(
                state=state,
                error_type="classification_error",
                error_message=str(e),
                error_details={"task": "device_classification"}
            )
        
        return state
    
    async def _handle_predicate_search(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Handle predicate search task (long-running, requires checkpoints)"""
        
        start_time = time.time()
        
        try:
            # Get predicate search tool
            search_tool = await self.tool_registry.get_tool("fda_predicate_search")
            
            # Create checkpoint before starting search
            state = self.state_manager.create_checkpoint(
                state=state,
                checkpoint_name="predicate_search_start",
                checkpoint_data={
                    "search_parameters": state.get("task_parameters", {}),
                    "start_time": start_time
                }
            )
            
            # Execute search
            result = await search_tool.arun(
                device_description=state["device_description"],
                intended_use=state["intended_use"],
                **state.get("task_parameters", {})
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Create confidence score
            confidence = ConfidenceScore(
                score=result.get("confidence", 0.0),
                reasoning=result.get("reasoning", ""),
                factors=result.get("confidence_factors", [])
            )
            
            # Create source citations
            sources = [
                SourceCitation(
                    url=source.get("url", ""),
                    title=source.get("title", ""),
                    effective_date=source.get("effective_date", ""),
                    document_type=source.get("document_type", "FDA_510K")
                )
                for source in result.get("sources", [])
            ]
            
            # Add result to state
            state = self.state_manager.add_result(
                state=state,
                task_type=AgentTaskType.PREDICATE_SEARCH,
                result_data=result,
                confidence=confidence,
                sources=sources,
                reasoning_trace=result.get("reasoning_trace", []),
                execution_time_ms=execution_time
            )
            
            # Create completion checkpoint
            state = self.state_manager.create_checkpoint(
                state=state,
                checkpoint_name="predicate_search_complete",
                checkpoint_data={
                    "result_count": len(result.get("predicates", [])),
                    "execution_time_ms": execution_time
                }
            )
            
            state["status"] = AgentStatus.COMPLETED
            
        except Exception as e:
            state = self.state_manager.add_error(
                state=state,
                error_type="predicate_search_error",
                error_message=str(e),
                error_details={"task": "predicate_search"}
            )
        
        return state
    
    async def _handle_predicate_comparison(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Handle predicate comparison task"""
        
        start_time = time.time()
        
        try:
            # Get comparison tool
            comparison_tool = await self.tool_registry.get_tool("predicate_comparison")
            
            # Execute comparison
            result = await comparison_tool.arun(
                device_description=state["device_description"],
                intended_use=state["intended_use"],
                **state.get("task_parameters", {})
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Create confidence score
            confidence = ConfidenceScore(
                score=result.get("confidence", 0.0),
                reasoning=result.get("reasoning", ""),
                factors=result.get("confidence_factors", [])
            )
            
            # Create source citations
            sources = [
                SourceCitation(
                    url=source.get("url", ""),
                    title=source.get("title", ""),
                    effective_date=source.get("effective_date", ""),
                    document_type=source.get("document_type", "FDA_510K")
                )
                for source in result.get("sources", [])
            ]
            
            # Add result to state
            state = self.state_manager.add_result(
                state=state,
                task_type=AgentTaskType.PREDICATE_COMPARISON,
                result_data=result,
                confidence=confidence,
                sources=sources,
                reasoning_trace=result.get("reasoning_trace", []),
                execution_time_ms=execution_time
            )
            
            state["status"] = AgentStatus.COMPLETED
            
        except Exception as e:
            state = self.state_manager.add_error(
                state=state,
                error_type="comparison_error",
                error_message=str(e),
                error_details={"task": "predicate_comparison"}
            )
        
        return state
    
    async def _handle_guidance_search(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Handle FDA guidance document search"""
        
        start_time = time.time()
        
        try:
            # Get guidance search tool
            guidance_tool = await self.tool_registry.get_tool("guidance_document_search")
            
            # Execute search
            result = await guidance_tool.arun(
                device_description=state["device_description"],
                intended_use=state["intended_use"],
                **state.get("task_parameters", {})
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Create confidence score
            confidence = ConfidenceScore(
                score=result.get("confidence", 0.0),
                reasoning=result.get("reasoning", ""),
                factors=result.get("confidence_factors", [])
            )
            
            # Create source citations
            sources = [
                SourceCitation(
                    url=source.get("url", ""),
                    title=source.get("title", ""),
                    effective_date=source.get("effective_date", ""),
                    document_type=source.get("document_type", "FDA_GUIDANCE")
                )
                for source in result.get("sources", [])
            ]
            
            # Add result to state
            state = self.state_manager.add_result(
                state=state,
                task_type=AgentTaskType.GUIDANCE_SEARCH,
                result_data=result,
                confidence=confidence,
                sources=sources,
                reasoning_trace=result.get("reasoning_trace", []),
                execution_time_ms=execution_time
            )
            
            state["status"] = AgentStatus.COMPLETED
            
        except Exception as e:
            state = self.state_manager.add_error(
                state=state,
                error_type="guidance_search_error",
                error_message=str(e),
                error_details={"task": "guidance_search"}
            )
        
        return state
    
    async def _create_checkpoint(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Create checkpoint for long-running processes"""
        
        checkpoint_name = f"task_complete_{state.get('current_task', 'unknown').value}_{int(time.time())}"
        
        state = self.state_manager.create_checkpoint(
            state=state,
            checkpoint_name=checkpoint_name,
            checkpoint_data={
                "completed_task": state.get("current_task"),
                "results_count": len(state["results"]),
                "confidence_scores": state["confidence_scores"]
            }
        )
        
        return state
    
    async def _generate_response(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Generate final response for the user"""
        
        current_task = state.get("current_task")
        
        if current_task and current_task.value in state["results"]:
            result = state["results"][current_task.value]
            
            # Create AI response message
            response_content = self._format_task_response(current_task, result)
            
            ai_message = AIMessage(content=response_content)
            state["messages"].append(ai_message)
        
        # Reset current task
        state["current_task"] = None
        state["task_parameters"] = {}
        state["status"] = AgentStatus.IDLE
        
        return state
    
    async def _handle_error(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        """Handle errors in the workflow"""
        
        if state["error_log"]:
            latest_error = state["error_log"][-1]
            
            # Try to recover using error handlers
            error_type = latest_error["error_type"]
            
            if error_type in self.error_handlers:
                try:
                    state = await self.error_handlers[error_type](state, latest_error)
                except Exception as recovery_error:
                    # If recovery fails, log additional error
                    state = self.state_manager.add_error(
                        state=state,
                        error_type="recovery_failed",
                        error_message=str(recovery_error),
                        error_details={"original_error": latest_error}
                    )
        
        return state
    
    def _format_task_response(self, task_type: AgentTaskType, result: Any) -> str:
        """Format task result into user-friendly response"""
        
        confidence = result.confidence.score
        confidence_pct = int(confidence * 100)
        
        response_parts = [
            f"## {task_type.value.replace('_', ' ').title()} Results",
            f"**Confidence Score**: {confidence_pct}%",
            f"**Reasoning**: {result.confidence.reasoning}",
            "",
            "### Analysis Results"
        ]
        
        # Add task-specific formatting
        if task_type == AgentTaskType.DEVICE_CLASSIFICATION:
            data = result.data
            response_parts.extend([
                f"- **Device Class**: {data.get('device_class', 'Unknown')}",
                f"- **Product Code**: {data.get('product_code', 'Unknown')}",
                f"- **Regulatory Pathway**: {data.get('regulatory_pathway', 'Unknown')}",
                f"- **CFR Sections**: {', '.join(data.get('cfr_sections', []))}"
            ])
        
        elif task_type == AgentTaskType.PREDICATE_SEARCH:
            predicates = result.data.get("predicates", [])
            response_parts.append(f"Found {len(predicates)} potential predicate devices:")
            
            for i, predicate in enumerate(predicates[:5], 1):
                response_parts.extend([
                    f"{i}. **{predicate.get('device_name', 'Unknown')}** (K{predicate.get('k_number', 'Unknown')})",
                    f"   - Confidence: {int(predicate.get('confidence_score', 0) * 100)}%",
                    f"   - Product Code: {predicate.get('product_code', 'Unknown')}"
                ])
        
        # Add sources
        if result.sources:
            response_parts.extend([
                "",
                "### Sources",
                ""
            ])
            
            for i, source in enumerate(result.sources, 1):
                response_parts.append(f"{i}. [{source.title}]({source.url}) - {source.effective_date}")
        
        return "\n".join(response_parts)
    
    def _register_default_error_handlers(self):
        """Register default error recovery handlers"""
        
        async def handle_fda_api_error(state: RegulatoryAgentState, error: Dict[str, Any]) -> RegulatoryAgentState:
            """Handle FDA API connection errors"""
            
            # Add retry logic or fallback to cached data
            state["status"] = AgentStatus.WAITING_FOR_INPUT
            
            # Add user message about the error
            error_message = AIMessage(
                content="I encountered an issue connecting to the FDA database. "
                       "This might be temporary. Would you like me to try again or "
                       "use cached data if available?"
            )
            state["messages"].append(error_message)
            
            return state
        
        async def handle_tool_error(state: RegulatoryAgentState, error: Dict[str, Any]) -> RegulatoryAgentState:
            """Handle tool execution errors"""
            
            state["status"] = AgentStatus.ERROR
            
            error_message = AIMessage(
                content=f"I encountered an error while processing your request: "
                       f"{error.get('message', 'Unknown error')}. "
                       f"Please try again or contact support if the issue persists."
            )
            state["messages"].append(error_message)
            
            return state
        
        self.error_handlers.update({
            "fda_api_error": handle_fda_api_error,
            "tool_error": handle_tool_error,
            "classification_error": handle_tool_error,
            "predicate_search_error": handle_tool_error,
            "comparison_error": handle_tool_error,
            "guidance_search_error": handle_tool_error
        })