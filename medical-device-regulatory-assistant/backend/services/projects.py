"""
Project service for managing medical device regulatory projects.
"""

import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, and_, or_, func
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from models.project import Project, ProjectStatus
from models.user import User
from models.device_classification import DeviceClassification
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument
from database.connection import get_database_manager


class ProjectCreateRequest(BaseModel):
    """Request model for creating a new project."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    device_type: Optional[str] = Field(None, max_length=255, description="Device type")
    intended_use: Optional[str] = Field(None, max_length=2000, description="Intended use statement")


class ProjectUpdateRequest(BaseModel):
    """Request model for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    device_type: Optional[str] = Field(None, max_length=255, description="Device type")
    intended_use: Optional[str] = Field(None, max_length=2000, description="Intended use statement")
    status: Optional[ProjectStatus] = Field(None, description="Project status")


class ProjectResponse(BaseModel):
    """Response model for project data."""
    id: int
    name: str
    description: Optional[str]
    device_type: Optional[str]
    intended_use: Optional[str]
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectDashboardData(BaseModel):
    """Dashboard data aggregation for a project."""
    project: ProjectResponse
    classification_status: Optional[Dict[str, Any]] = None
    predicate_count: int = 0
    selected_predicates: int = 0
    document_count: int = 0
    interaction_count: int = 0
    last_activity: Optional[datetime] = None
    completion_percentage: float = 0.0


class ProjectSearchFilters(BaseModel):
    """Search and filter parameters for projects."""
    search: Optional[str] = Field(None, description="Search in name, description, device_type")
    status: Optional[ProjectStatus] = Field(None, description="Filter by status")
    device_type: Optional[str] = Field(None, description="Filter by device type")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")


class ProjectExportData(BaseModel):
    """Complete project data for export."""
    project: ProjectResponse
    classifications: List[Dict[str, Any]] = []
    predicates: List[Dict[str, Any]] = []
    documents: List[Dict[str, Any]] = []
    interactions: List[Dict[str, Any]] = []


class ProjectService:
    """Service class for project management operations."""
    
    def __init__(self):
        self.db_manager = get_database_manager()
    
    async def create_project(
        self, 
        project_data: ProjectCreateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """
        Create a new project for the authenticated user.
        
        Args:
            project_data: Project creation data
            user_id: ID of the authenticated user
            
        Returns:
            ProjectResponse: Created project data
            
        Raises:
            HTTPException: If user not found or creation fails
        """
        async with self.db_manager.get_session() as session:
            # Verify user exists
            user_stmt = select(User).where(User.google_id == user_id)
            user_result = await session.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Create new project
            project = Project(
                user_id=user.id,
                name=project_data.name,
                description=project_data.description,
                device_type=project_data.device_type,
                intended_use=project_data.intended_use,
                status=ProjectStatus.DRAFT
            )
            
            session.add(project)
            await session.commit()
            await session.refresh(project)
            
            return ProjectResponse.model_validate(project)
    
    async def get_project(
        self, 
        project_id: int, 
        user_id: str
    ) -> ProjectResponse:
        """
        Get a specific project by ID for the authenticated user.
        
        Args:
            project_id: Project ID
            user_id: ID of the authenticated user
            
        Returns:
            ProjectResponse: Project data
            
        Raises:
            HTTPException: If project not found or access denied
        """
        async with self.db_manager.get_session() as session:
            # Get project with user verification
            stmt = (
                select(Project)
                .join(User)
                .where(
                    and_(
                        Project.id == project_id,
                        User.google_id == user_id
                    )
                )
            )
            
            result = await session.execute(stmt)
            project = result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or access denied"
                )
            
            return ProjectResponse.model_validate(project)
    
    async def update_project(
        self, 
        project_id: int, 
        project_data: ProjectUpdateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """
        Update a project for the authenticated user.
        
        Args:
            project_id: Project ID
            project_data: Project update data
            user_id: ID of the authenticated user
            
        Returns:
            ProjectResponse: Updated project data
            
        Raises:
            HTTPException: If project not found or access denied
        """
        async with self.db_manager.get_session() as session:
            # Get project with user verification
            stmt = (
                select(Project)
                .join(User)
                .where(
                    and_(
                        Project.id == project_id,
                        User.google_id == user_id
                    )
                )
            )
            
            result = await session.execute(stmt)
            project = result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or access denied"
                )
            
            # Update project fields
            update_data = project_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(project, field, value)
            
            project.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(project)
            
            # Send WebSocket notification
            try:
                from api.websocket import notify_project_updated
                project_response = ProjectResponse.model_validate(project)
                await notify_project_updated(
                    project_id=project.id,
                    user_id=user_id,
                    data=project_response.model_dump()
                )
            except ImportError:
                # WebSocket module not available, skip notification
                pass
            except Exception as e:
                # Log error but don't fail the update
                print(f"Failed to send WebSocket notification: {e}")
            
            return ProjectResponse.model_validate(project)
    
    async def delete_project(
        self, 
        project_id: int, 
        user_id: str
    ) -> Dict[str, str]:
        """
        Delete a project for the authenticated user.
        
        Args:
            project_id: Project ID
            user_id: ID of the authenticated user
            
        Returns:
            Dict: Deletion confirmation message
            
        Raises:
            HTTPException: If project not found or access denied
        """
        async with self.db_manager.get_session() as session:
            # Get project with user verification
            stmt = (
                select(Project)
                .join(User)
                .where(
                    and_(
                        Project.id == project_id,
                        User.google_id == user_id
                    )
                )
            )
            
            result = await session.execute(stmt)
            project = result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or access denied"
                )
            
            await session.delete(project)
            await session.commit()
            
            return {"message": f"Project '{project.name}' deleted successfully"}
    
    async def list_projects(
        self, 
        user_id: str, 
        filters: ProjectSearchFilters
    ) -> List[ProjectResponse]:
        """
        List projects for the authenticated user with search and filtering.
        
        Args:
            user_id: ID of the authenticated user
            filters: Search and filter parameters
            
        Returns:
            List[ProjectResponse]: List of projects
        """
        async with self.db_manager.get_session() as session:
            # Base query with user verification
            stmt = (
                select(Project)
                .join(User)
                .where(User.google_id == user_id)
            )
            
            # Apply search filter
            if filters.search:
                search_term = f"%{filters.search}%"
                stmt = stmt.where(
                    or_(
                        Project.name.ilike(search_term),
                        Project.description.ilike(search_term),
                        Project.device_type.ilike(search_term)
                    )
                )
            
            # Apply status filter
            if filters.status:
                stmt = stmt.where(Project.status == filters.status)
            
            # Apply device type filter
            if filters.device_type:
                stmt = stmt.where(Project.device_type.ilike(f"%{filters.device_type}%"))
            
            # Apply ordering, limit, and offset
            stmt = (
                stmt
                .order_by(Project.updated_at.desc())
                .limit(filters.limit)
                .offset(filters.offset)
            )
            
            result = await session.execute(stmt)
            projects = result.scalars().all()
            
            return [ProjectResponse.model_validate(project) for project in projects]
    
    async def get_dashboard_data(
        self, 
        project_id: int, 
        user_id: str
    ) -> ProjectDashboardData:
        """
        Get aggregated dashboard data for a project.
        
        Args:
            project_id: Project ID
            user_id: ID of the authenticated user
            
        Returns:
            ProjectDashboardData: Dashboard data
            
        Raises:
            HTTPException: If project not found or access denied
        """
        async with self.db_manager.get_session() as session:
            # Get project with all related data
            stmt = (
                select(Project)
                .options(
                    selectinload(Project.device_classifications),
                    selectinload(Project.predicate_devices),
                    selectinload(Project.documents),
                    selectinload(Project.agent_interactions)
                )
                .join(User)
                .where(
                    and_(
                        Project.id == project_id,
                        User.google_id == user_id
                    )
                )
            )
            
            result = await session.execute(stmt)
            project = result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or access denied"
                )
            
            # Get classification status
            classification_status = None
            if project.device_classifications:
                latest_classification = max(
                    project.device_classifications, 
                    key=lambda x: x.created_at
                )
                classification_status = {
                    "device_class": latest_classification.device_class,
                    "product_code": latest_classification.product_code,
                    "regulatory_pathway": latest_classification.regulatory_pathway,
                    "confidence_score": latest_classification.confidence_score,
                    "created_at": latest_classification.created_at
                }
            
            # Count predicates
            predicate_count = len(project.predicate_devices)
            selected_predicates = len([p for p in project.predicate_devices if p.is_selected])
            
            # Count documents and interactions
            document_count = len(project.documents)
            interaction_count = len(project.agent_interactions)
            
            # Get last activity
            last_activity = None
            if project.agent_interactions:
                last_activity = max(
                    project.agent_interactions, 
                    key=lambda x: x.created_at
                ).created_at
            
            # Calculate completion percentage
            completion_percentage = self._calculate_completion_percentage(
                project, classification_status, selected_predicates, document_count
            )
            
            return ProjectDashboardData(
                project=ProjectResponse.model_validate(project),
                classification_status=classification_status,
                predicate_count=predicate_count,
                selected_predicates=selected_predicates,
                document_count=document_count,
                interaction_count=interaction_count,
                last_activity=last_activity,
                completion_percentage=completion_percentage
            )
    
    async def export_project(
        self, 
        project_id: int, 
        user_id: str, 
        format_type: str = "json"
    ) -> ProjectExportData:
        """
        Export complete project data for backup or analysis.
        
        Args:
            project_id: Project ID
            user_id: ID of the authenticated user
            format_type: Export format ("json" or "pdf")
            
        Returns:
            ProjectExportData: Complete project data
            
        Raises:
            HTTPException: If project not found or access denied
        """
        async with self.db_manager.get_session() as session:
            # Get project with all related data
            stmt = (
                select(Project)
                .options(
                    selectinload(Project.device_classifications),
                    selectinload(Project.predicate_devices),
                    selectinload(Project.documents),
                    selectinload(Project.agent_interactions)
                )
                .join(User)
                .where(
                    and_(
                        Project.id == project_id,
                        User.google_id == user_id
                    )
                )
            )
            
            result = await session.execute(stmt)
            project = result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or access denied"
                )
            
            # Convert related data to dictionaries
            classifications = []
            for classification in project.device_classifications:
                classifications.append({
                    "id": classification.id,
                    "device_class": classification.device_class,
                    "product_code": classification.product_code,
                    "regulatory_pathway": classification.regulatory_pathway,
                    "cfr_sections": classification.cfr_sections,
                    "confidence_score": classification.confidence_score,
                    "reasoning": classification.reasoning,
                    "sources": classification.sources,
                    "created_at": classification.created_at.isoformat()
                })
            
            predicates = []
            for predicate in project.predicate_devices:
                predicates.append({
                    "id": predicate.id,
                    "k_number": predicate.k_number,
                    "device_name": predicate.device_name,
                    "intended_use": predicate.intended_use,
                    "product_code": predicate.product_code,
                    "clearance_date": predicate.clearance_date.isoformat() if predicate.clearance_date else None,
                    "confidence_score": predicate.confidence_score,
                    "comparison_data": predicate.comparison_data,
                    "is_selected": predicate.is_selected,
                    "created_at": predicate.created_at.isoformat()
                })
            
            documents = []
            for document in project.documents:
                documents.append({
                    "id": document.id,
                    "filename": document.filename,
                    "file_path": document.file_path,
                    "document_type": document.document_type,
                    "metadata": document.metadata,
                    "created_at": document.created_at.isoformat(),
                    "updated_at": document.updated_at.isoformat()
                })
            
            interactions = []
            for interaction in project.agent_interactions:
                interactions.append({
                    "id": interaction.id,
                    "agent_action": interaction.agent_action,
                    "input_data": interaction.input_data,
                    "output_data": interaction.output_data,
                    "confidence_score": interaction.confidence_score,
                    "sources": interaction.sources,
                    "reasoning": interaction.reasoning,
                    "execution_time_ms": interaction.execution_time_ms,
                    "created_at": interaction.created_at.isoformat()
                })
            
            return ProjectExportData(
                project=ProjectResponse.model_validate(project),
                classifications=classifications,
                predicates=predicates,
                documents=documents,
                interactions=interactions
            )
    
    def _calculate_completion_percentage(
        self, 
        project: Project, 
        classification_status: Optional[Dict[str, Any]], 
        selected_predicates: int, 
        document_count: int
    ) -> float:
        """
        Calculate project completion percentage based on key milestones.
        
        Args:
            project: Project instance
            classification_status: Classification data
            selected_predicates: Number of selected predicates
            document_count: Number of documents
            
        Returns:
            float: Completion percentage (0.0 to 100.0)
        """
        total_weight = 100.0
        completed_weight = 0.0
        
        # Basic project setup (20%)
        if project.name and project.description and project.intended_use:
            completed_weight += 20.0
        
        # Device classification (30%)
        if classification_status and classification_status.get("confidence_score", 0) >= 0.7:
            completed_weight += 30.0
        
        # Predicate selection (30%)
        if selected_predicates > 0:
            completed_weight += 30.0
        
        # Documentation (20%)
        if document_count > 0:
            completed_weight += 20.0
        
        return min(completed_weight, total_weight)