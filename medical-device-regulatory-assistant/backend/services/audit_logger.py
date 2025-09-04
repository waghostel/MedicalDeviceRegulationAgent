"""
Audit Logger Service for regulatory compliance and traceability
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.agent_interaction import AgentInteraction
from database.connection import get_db_session


@dataclass
class AuditLogEntry:
    """Structured audit log entry"""
    project_id: int
    user_id: int
    action: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    confidence_score: float
    sources: List[Dict[str, str]]
    reasoning: str
    execution_time_ms: Optional[int] = None
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()


class AuditLogger:
    """
    Audit logging service for regulatory compliance.
    
    Provides comprehensive logging of all agent actions, decisions,
    and reasoning traces for regulatory audit trails.
    """
    
    def __init__(self, session_factory=None):
        self.session_factory = session_factory or get_db_session
        self.log_buffer: List[AuditLogEntry] = []
        self.buffer_size = 100
        self.auto_flush = True
    
    async def log_agent_action(
        self,
        project_id: int,
        user_id: int,
        action: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        confidence_score: float,
        sources: List[Dict[str, str]],
        reasoning: str,
        execution_time_ms: Optional[int] = None
    ) -> None:
        """
        Log an agent action for audit trail
        
        Args:
            project_id: ID of the project
            user_id: ID of the user
            action: Description of the action performed
            input_data: Input parameters for the action
            output_data: Results/output from the action
            confidence_score: Confidence score (0.0 to 1.0)
            sources: List of source citations
            reasoning: Reasoning trace for the action
            execution_time_ms: Execution time in milliseconds
        """
        
        log_entry = AuditLogEntry(
            project_id=project_id,
            user_id=user_id,
            action=action,
            input_data=input_data,
            output_data=output_data,
            confidence_score=confidence_score,
            sources=sources,
            reasoning=reasoning,
            execution_time_ms=execution_time_ms
        )
        
        if self.auto_flush:
            await self._write_to_database(log_entry)
        else:
            self.log_buffer.append(log_entry)
            
            if len(self.log_buffer) >= self.buffer_size:
                await self.flush_buffer()
    
    async def log_error(
        self,
        project_id: int,
        user_id: int,
        error_type: str,
        error_message: str,
        error_details: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an error for audit trail"""
        
        await self.log_agent_action(
            project_id=project_id,
            user_id=user_id,
            action=f"error_{error_type}",
            input_data=context or {},
            output_data={
                "error_type": error_type,
                "error_message": error_message,
                "error_details": error_details
            },
            confidence_score=0.0,
            sources=[],
            reasoning=f"Error occurred: {error_message}"
        )
    
    async def log_user_interaction(
        self,
        project_id: int,
        user_id: int,
        interaction_type: str,
        user_input: str,
        agent_response: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log user-agent interaction"""
        
        await self.log_agent_action(
            project_id=project_id,
            user_id=user_id,
            action=f"user_interaction_{interaction_type}",
            input_data={
                "user_input": user_input,
                "context": context or {}
            },
            output_data={
                "agent_response": agent_response
            },
            confidence_score=1.0,
            sources=[],
            reasoning="User interaction logged"
        )
    
    async def log_tool_execution(
        self,
        project_id: int,
        user_id: int,
        tool_name: str,
        tool_input: Dict[str, Any],
        tool_output: Dict[str, Any],
        execution_time_ms: int,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """Log tool execution for audit trail"""
        
        output_data = tool_output.copy()
        if not success and error_message:
            output_data["error"] = error_message
        
        await self.log_agent_action(
            project_id=project_id,
            user_id=user_id,
            action=f"tool_execution_{tool_name}",
            input_data=tool_input,
            output_data=output_data,
            confidence_score=1.0 if success else 0.0,
            sources=tool_output.get("sources", []),
            reasoning=f"Tool {tool_name} executed {'successfully' if success else 'with error'}",
            execution_time_ms=execution_time_ms
        )
    
    async def get_audit_trail(
        self,
        project_id: int,
        user_id: Optional[int] = None,
        action_filter: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail entries
        
        Args:
            project_id: Project ID to filter by
            user_id: Optional user ID filter
            action_filter: Optional action type filter
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Maximum number of entries to return
        
        Returns:
            List of audit trail entries
        """
        
        async with self.session_factory() as session:
            query = select(AgentInteraction).where(
                AgentInteraction.project_id == project_id
            )
            
            if user_id:
                query = query.where(AgentInteraction.user_id == user_id)
            
            if action_filter:
                query = query.where(AgentInteraction.agent_action.contains(action_filter))
            
            if start_date:
                query = query.where(AgentInteraction.created_at >= start_date)
            
            if end_date:
                query = query.where(AgentInteraction.created_at <= end_date)
            
            query = query.order_by(AgentInteraction.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            interactions = result.scalars().all()
            
            return [
                {
                    "id": interaction.id,
                    "project_id": interaction.project_id,
                    "user_id": interaction.user_id,
                    "action": interaction.agent_action,
                    "input_data": interaction.input_data,
                    "output_data": interaction.output_data,
                    "confidence_score": interaction.confidence_score,
                    "sources": interaction.sources,
                    "reasoning": interaction.reasoning,
                    "execution_time_ms": interaction.execution_time_ms,
                    "created_at": interaction.created_at.isoformat() if interaction.created_at else None
                }
                for interaction in interactions
            ]
    
    async def get_audit_summary(
        self,
        project_id: int,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get audit trail summary statistics"""
        
        async with self.session_factory() as session:
            query = select(AgentInteraction).where(
                AgentInteraction.project_id == project_id
            )
            
            if user_id:
                query = query.where(AgentInteraction.user_id == user_id)
            
            result = await session.execute(query)
            interactions = result.scalars().all()
            
            if not interactions:
                return {
                    "total_interactions": 0,
                    "action_counts": {},
                    "average_confidence": 0.0,
                    "total_execution_time": 0,
                    "error_count": 0,
                    "date_range": None
                }
            
            # Calculate statistics
            action_counts = {}
            confidence_scores = []
            execution_times = []
            error_count = 0
            
            for interaction in interactions:
                # Count actions
                action = interaction.agent_action
                action_counts[action] = action_counts.get(action, 0) + 1
                
                # Collect confidence scores
                if interaction.confidence_score is not None:
                    confidence_scores.append(interaction.confidence_score)
                
                # Collect execution times
                if interaction.execution_time_ms is not None:
                    execution_times.append(interaction.execution_time_ms)
                
                # Count errors
                if "error" in action.lower():
                    error_count += 1
            
            # Calculate averages
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
            total_execution_time = sum(execution_times)
            
            # Date range
            dates = [i.created_at for i in interactions if i.created_at]
            date_range = None
            if dates:
                date_range = {
                    "start": min(dates).isoformat(),
                    "end": max(dates).isoformat()
                }
            
            return {
                "total_interactions": len(interactions),
                "action_counts": action_counts,
                "average_confidence": round(avg_confidence, 3),
                "total_execution_time": total_execution_time,
                "average_execution_time": round(total_execution_time / len(execution_times), 2) if execution_times else 0,
                "error_count": error_count,
                "error_rate": round(error_count / len(interactions) * 100, 2) if interactions else 0,
                "date_range": date_range
            }
    
    async def export_audit_trail(
        self,
        project_id: int,
        format_type: str = "json",
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """
        Export audit trail in specified format
        
        Args:
            project_id: Project ID
            format_type: Export format ("json", "csv")
            user_id: Optional user filter
            start_date: Optional start date
            end_date: Optional end date
        
        Returns:
            Formatted audit trail data
        """
        
        audit_entries = await self.get_audit_trail(
            project_id=project_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=10000  # Large limit for export
        )
        
        if format_type.lower() == "json":
            return json.dumps(audit_entries, indent=2, default=str)
        
        elif format_type.lower() == "csv":
            import csv
            import io
            
            output = io.StringIO()
            
            if audit_entries:
                fieldnames = audit_entries[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                for entry in audit_entries:
                    # Convert complex fields to strings
                    row = entry.copy()
                    for key, value in row.items():
                        if isinstance(value, (dict, list)):
                            row[key] = json.dumps(value)
                    writer.writerow(row)
            
            return output.getvalue()
        
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    async def flush_buffer(self) -> None:
        """Flush buffered log entries to database"""
        
        if not self.log_buffer:
            return
        
        entries_to_write = self.log_buffer.copy()
        self.log_buffer.clear()
        
        async with self.session_factory() as session:
            try:
                for entry in entries_to_write:
                    await self._write_to_database_session(session, entry)
                
                await session.commit()
                
            except Exception as e:
                await session.rollback()
                # Re-add entries to buffer for retry
                self.log_buffer.extend(entries_to_write)
                raise e
    
    async def _write_to_database(self, log_entry: AuditLogEntry) -> None:
        """Write single log entry to database"""
        
        async with self.session_factory() as session:
            await self._write_to_database_session(session, log_entry)
            await session.commit()
    
    async def _write_to_database_session(
        self,
        session: AsyncSession,
        log_entry: AuditLogEntry
    ) -> None:
        """Write log entry using existing session"""
        
        interaction = AgentInteraction(
            project_id=log_entry.project_id,
            user_id=log_entry.user_id,
            agent_action=log_entry.action,
            input_data=log_entry.input_data,
            output_data=log_entry.output_data,
            confidence_score=log_entry.confidence_score,
            sources=log_entry.sources,
            reasoning=log_entry.reasoning,
            execution_time_ms=log_entry.execution_time_ms
        )
        
        session.add(interaction)
    
    async def cleanup_old_entries(
        self,
        retention_days: int = 365,
        project_id: Optional[int] = None
    ) -> int:
        """
        Clean up old audit entries beyond retention period
        
        Args:
            retention_days: Number of days to retain entries
            project_id: Optional project filter
        
        Returns:
            Number of entries deleted
        """
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        async with self.session_factory() as session:
            query = select(AgentInteraction).where(
                AgentInteraction.created_at < cutoff_date
            )
            
            if project_id:
                query = query.where(AgentInteraction.project_id == project_id)
            
            result = await session.execute(query)
            entries_to_delete = result.scalars().all()
            
            count = len(entries_to_delete)
            
            for entry in entries_to_delete:
                await session.delete(entry)
            
            await session.commit()
            
            return count
    
    def set_buffer_mode(self, enabled: bool, buffer_size: int = 100) -> None:
        """Configure buffer mode for batch logging"""
        
        self.auto_flush = not enabled
        self.buffer_size = buffer_size
        
        if not enabled and self.log_buffer:
            # Flush any remaining entries when disabling buffer
            asyncio.create_task(self.flush_buffer())


# Import timedelta for cleanup function
from datetime import timedelta