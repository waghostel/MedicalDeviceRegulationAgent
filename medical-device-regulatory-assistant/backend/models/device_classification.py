"""
Device classification model for FDA device classification results
"""

from typing import List, Optional, TYPE_CHECKING
import enum

from sqlalchemy import String, Text, ForeignKey, Float, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .project import Project


class DeviceClass(enum.Enum):
    """FDA Device Class enumeration"""
    CLASS_I = "I"
    CLASS_II = "II" 
    CLASS_III = "III"


class RegulatoryPathway(enum.Enum):
    """FDA Regulatory Pathway enumeration"""
    FIVE_TEN_K = "510k"
    PMA = "PMA"
    DE_NOVO = "De Novo"


class DeviceClassification(Base):
    """Device classification results from FDA classification analysis"""
    
    __tablename__ = "device_classifications"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    device_class: Mapped[Optional[DeviceClass]] = mapped_column(Enum(DeviceClass), nullable=True)
    product_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    regulatory_pathway: Mapped[Optional[RegulatoryPathway]] = mapped_column(
        Enum(RegulatoryPathway), 
        nullable=True
    )
    cfr_sections: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sources: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="device_classifications")
    
    def __repr__(self) -> str:
        return (
            f"<DeviceClassification(id={self.id}, project_id={self.project_id}, "
            f"device_class='{self.device_class.value if self.device_class else None}', "
            f"product_code='{self.product_code}')>"
        )