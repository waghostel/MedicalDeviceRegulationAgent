"""
Predicate device model for 510(k) predicate search results
"""

from typing import Optional, TYPE_CHECKING
from datetime import date

from sqlalchemy import String, Text, ForeignKey, Float, JSON, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .project import Project


class PredicateDevice(Base):
    """Predicate device results from FDA 510(k) database searches"""
    
    __tablename__ = "predicate_devices"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    k_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    device_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    intended_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    clearance_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    comparison_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="predicate_devices")
    
    def __repr__(self) -> str:
        return (
            f"<PredicateDevice(id={self.id}, k_number='{self.k_number}', "
            f"device_name='{self.device_name}', confidence_score={self.confidence_score})>"
        )