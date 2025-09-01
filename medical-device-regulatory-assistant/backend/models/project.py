"""
Project model for managing medical device regulatory projects
"""

from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .device_classification import DeviceClassification
    from .predicate_device import PredicateDevice
    from .agent_interaction import AgentInteraction
    from .project_document import ProjectDocument


class ProjectStatus(enum.Enum):
    """Project status enumeration"""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Project(Base):
    """Project model for medical device regulatory projects"""
    
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    intended_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), 
        default=ProjectStatus.DRAFT,
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    device_classifications: Mapped[List["DeviceClassification"]] = relationship(
        "DeviceClassification",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    predicate_devices: Mapped[List["PredicateDevice"]] = relationship(
        "PredicateDevice",
        back_populates="project", 
        cascade="all, delete-orphan"
    )
    agent_interactions: Mapped[List["AgentInteraction"]] = relationship(
        "AgentInteraction",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    documents: Mapped[List["ProjectDocument"]] = relationship(
        "ProjectDocument",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"