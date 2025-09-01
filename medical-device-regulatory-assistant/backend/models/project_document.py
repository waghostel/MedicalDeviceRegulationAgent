"""
Project document model for managing regulatory documents
"""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .project import Project


class ProjectDocument(Base):
    """Project documents for regulatory submissions and analysis"""
    
    __tablename__ = "project_documents"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="documents")
    
    def __repr__(self) -> str:
        return (
            f"<ProjectDocument(id={self.id}, project_id={self.project_id}, "
            f"filename='{self.filename}', document_type='{self.document_type}')>"
        )