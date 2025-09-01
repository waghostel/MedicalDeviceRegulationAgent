"""
Agent interaction model for audit trail and compliance tracking
"""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Float, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .project import Project
    from .user import User


class AgentInteraction(Base):
    """Agent interaction logs for audit trail and compliance"""
    
    __tablename__ = "agent_interactions"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    agent_action: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    input_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sources: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="agent_interactions")
    user: Mapped["User"] = relationship("User", back_populates="agent_interactions")
    
    def __repr__(self) -> str:
        return (
            f"<AgentInteraction(id={self.id}, project_id={self.project_id}, "
            f"agent_action='{self.agent_action}', confidence_score={self.confidence_score})>"
        )