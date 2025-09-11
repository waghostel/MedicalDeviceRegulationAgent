"""
Project service for managing medical device regulatory projects.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pathlib import Path

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, and_, or_, func
from fastapi import status

# Import standardized exceptions
from core.exceptions import (
    ProjectNotFoundError,
    ValidationError,
    DatabaseError,
    AuthorizationError,
)
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
    """Enhanced dashboard data aggregation for a project."""
    project: ProjectResponse
    classification: Optional[Dict[str, Any]] = None
    predicate_devices: List[Dict[str, Any]] = []
    progress: Dict[str, Any] = {}
    recent_activity: List[Dict[str, Any]] = []
    statistics: Dict[str, Any] = {}
    
    # Legacy fields for backward compatibility
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
        self._db_manager = None
    
    @property
    def db_manager(self):
        """Lazy initialization of database manager"""
        if self._db_manager is None:
            self._db_manager = get_database_manager()
        return self._db_manager
    
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
            ProjectNotFoundError: If user not found
            ValidationError: If project data is invalid
            DatabaseError: If database operation fails
        """
        try:
            async with self.db_manager.get_session() as session:
                # Verify user exists
                user_stmt = select(User).where(User.google_id == user_id)
                user_result = await session.execute(user_stmt)
                user = user_result.scalar_one_or_none()
                
                if not user:
                    raise ProjectNotFoundError(
                        project_id=0, 
                        user_id=user_id,
                        additional_context={"operation": "create_project", "reason": "user_not_found"}
                    )
            
                # Validate project data
                if not project_data.name or len(project_data.name.strip()) == 0:
                    raise ValidationError(
                        field="name",
                        value=project_data.name,
                        constraint="Project name is required and cannot be empty"
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
                
        except (ProjectNotFoundError, ValidationError):
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="create_project",
                table="projects",
                original_error=e,
                query_info={"user_id": user_id, "project_name": project_data.name}
            )
    
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
            ProjectNotFoundError: If project not found or access denied
            DatabaseError: If database operation fails
        """
        try:
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
                    raise ProjectNotFoundError(
                        project_id=project_id, 
                        user_id=user_id,
                        additional_context={"operation": "get_project"}
                    )
                
                return ProjectResponse.model_validate(project)
                
        except ProjectNotFoundError:
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="get_project",
                table="projects",
                original_error=e,
                query_info={"project_id": project_id, "user_id": user_id}
            )
    
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
            ProjectNotFoundError: If project not found or access denied
            ValidationError: If project data is invalid
            DatabaseError: If database operation fails
        """
        try:
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
                    raise ProjectNotFoundError(
                        project_id=project_id,
                        user_id=user_id,
                        additional_context={"operation": "update_project"}
                    )
            
                # Validate update data
                update_data = project_data.model_dump(exclude_unset=True)
                if "name" in update_data and (not update_data["name"] or len(update_data["name"].strip()) == 0):
                    raise ValidationError(
                        field="name",
                        value=update_data["name"],
                        constraint="Project name cannot be empty"
                    )
                
                # Update project fields
                for field, value in update_data.items():
                    setattr(project, field, value)
                
                project.updated_at = datetime.now(timezone.utc)
                
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
                
        except (ProjectNotFoundError, ValidationError):
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="update_project",
                table="projects",
                original_error=e,
                query_info={"project_id": project_id, "user_id": user_id}
            )
    
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
            ProjectNotFoundError: If project not found or access denied
            DatabaseError: If database operation fails
        """
        try:
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
                    raise ProjectNotFoundError(
                        project_id=project_id,
                        user_id=user_id,
                        additional_context={"operation": "delete_project"}
                    )
                
                project_name = project.name
                await session.delete(project)
                await session.commit()
                
                return {"message": f"Project '{project_name}' deleted successfully"}
                
        except ProjectNotFoundError:
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="delete_project",
                table="projects",
                original_error=e,
                query_info={"project_id": project_id, "user_id": user_id}
            )
    
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
        Get comprehensive dashboard data for a project.
        
        Args:
            project_id: Project ID
            user_id: ID of the authenticated user
            
        Returns:
            ProjectDashboardData: Enhanced dashboard data
            
        Raises:
            ProjectNotFoundError: If project not found or access denied
            DatabaseError: If database operation fails
        """
        try:
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
                    raise ProjectNotFoundError(
                        project_id=project_id,
                        user_id=user_id,
                        additional_context={"operation": "get_dashboard_data"}
                    )
            
            # Build comprehensive classification data
            classification = None
            if project.device_classifications:
                latest_classification = max(
                    project.device_classifications, 
                    key=lambda x: x.created_at
                )
                classification = {
                    "id": str(latest_classification.id),
                    "projectId": str(project.id),
                    "deviceClass": latest_classification.device_class,
                    "productCode": latest_classification.product_code,
                    "regulatoryPathway": latest_classification.regulatory_pathway,
                    "cfrSections": latest_classification.cfr_sections or [],
                    "confidenceScore": latest_classification.confidence_score or 0.0,
                    "reasoning": latest_classification.reasoning or "",
                    "sources": latest_classification.sources or [],
                    "createdAt": latest_classification.created_at.isoformat(),
                    "updatedAt": latest_classification.created_at.isoformat()
                }
            
            # Build predicate devices data
            predicate_devices = []
            for predicate in project.predicate_devices:
                predicate_devices.append({
                    "id": str(predicate.id),
                    "projectId": str(project.id),
                    "kNumber": predicate.k_number,
                    "deviceName": predicate.device_name,
                    "intendedUse": predicate.intended_use or "",
                    "productCode": predicate.product_code or "",
                    "clearanceDate": predicate.clearance_date.isoformat() if predicate.clearance_date else "",
                    "confidenceScore": predicate.confidence_score or 0.0,
                    "comparisonData": predicate.comparison_data or {
                        "similarities": [],
                        "differences": [],
                        "riskAssessment": "low",
                        "testingRecommendations": [],
                        "substantialEquivalenceAssessment": ""
                    },
                    "isSelected": predicate.is_selected,
                    "createdAt": predicate.created_at.isoformat(),
                    "updatedAt": predicate.created_at.isoformat()
                })
            
            # Build progress data
            progress = self._calculate_project_progress(
                project, classification, predicate_devices
            )
            
            # Build recent activity
            recent_activity = []
            for interaction in sorted(project.agent_interactions, key=lambda x: x.created_at, reverse=True)[:10]:
                activity_type = self._map_agent_action_to_activity_type(interaction.agent_action)
                recent_activity.append({
                    "id": str(interaction.id),
                    "type": activity_type,
                    "title": self._generate_activity_title(interaction.agent_action),
                    "description": interaction.reasoning or f"Agent performed {interaction.agent_action}",
                    "timestamp": interaction.created_at.isoformat(),
                    "status": "success" if interaction.confidence_score and interaction.confidence_score > 0.7 else "info",
                    "metadata": {
                        "confidence_score": interaction.confidence_score,
                        "execution_time_ms": interaction.execution_time_ms
                    }
                })
            
            # Build statistics
            predicate_count = len(predicate_devices)
            selected_predicates = len([p for p in predicate_devices if p["isSelected"]])
            average_confidence = (
                sum(p["confidenceScore"] for p in predicate_devices) / predicate_count
                if predicate_count > 0 else 0.0
            )
            
            statistics = {
                "totalPredicates": predicate_count,
                "selectedPredicates": selected_predicates,
                "averageConfidence": average_confidence,
                "completionPercentage": progress["overallProgress"],
                "documentsCount": len(project.documents),
                "agentInteractions": len(project.agent_interactions)
            }
            
            # Legacy fields for backward compatibility
            classification_status = None
            if classification:
                classification_status = {
                    "device_class": classification["deviceClass"],
                    "product_code": classification["productCode"],
                    "regulatory_pathway": classification["regulatoryPathway"],
                    "confidence_score": classification["confidenceScore"],
                    "created_at": classification["createdAt"]
                }
            
            last_activity = None
            if project.agent_interactions:
                last_activity = max(
                    project.agent_interactions, 
                    key=lambda x: x.created_at
                ).created_at
            
                return ProjectDashboardData(
                    project=ProjectResponse.model_validate(project),
                    classification=classification,
                    predicate_devices=predicate_devices,
                    progress=progress,
                    recent_activity=recent_activity,
                    statistics=statistics,
                    # Legacy fields
                    classification_status=classification_status,
                    predicate_count=predicate_count,
                    selected_predicates=selected_predicates,
                    document_count=len(project.documents),
                    interaction_count=len(project.agent_interactions),
                    last_activity=last_activity,
                    completion_percentage=progress["overallProgress"]
                )
                
        except ProjectNotFoundError:
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="get_dashboard_data",
                table="projects",
                original_error=e,
                query_info={"project_id": project_id, "user_id": user_id}
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
            ProjectNotFoundError: If project not found or access denied
            DatabaseError: If database operation fails
        """
        try:
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
                    raise ProjectNotFoundError(
                        project_id=project_id,
                        user_id=user_id,
                        additional_context={"operation": "export_project", "format_type": format_type}
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
                
        except ProjectNotFoundError:
            # Re-raise application exceptions
            raise
        except Exception as e:
            # Wrap database and other errors
            raise DatabaseError(
                operation="export_project",
                table="projects",
                original_error=e,
                query_info={"project_id": project_id, "user_id": user_id, "format_type": format_type}
            )
    
    def _calculate_project_progress(
        self,
        project: Project,
        classification: Optional[Dict[str, Any]],
        predicate_devices: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive project progress data.
        
        Args:
            project: Project instance
            classification: Classification data
            predicate_devices: List of predicate devices
            
        Returns:
            Dict: Progress data with step-by-step completion
        """
        # Classification progress
        classification_step = {
            "status": "completed" if classification else "pending",
            "confidenceScore": classification["confidenceScore"] if classification else None,
            "completedAt": classification["createdAt"] if classification else None
        }
        
        # Predicate search progress
        predicate_search_step = {
            "status": "completed" if predicate_devices else "pending",
            "confidenceScore": (
                sum(p["confidenceScore"] for p in predicate_devices) / len(predicate_devices)
                if predicate_devices else None
            ),
            "completedAt": (
                max(p["createdAt"] for p in predicate_devices)
                if predicate_devices else None
            )
        }
        
        # Comparison analysis progress
        selected_predicates = [p for p in predicate_devices if p["isSelected"]]
        comparison_analysis_step = {
            "status": "completed" if selected_predicates else "pending",
            "confidenceScore": (
                sum(p["confidenceScore"] for p in selected_predicates) / len(selected_predicates)
                if selected_predicates else None
            ),
            "completedAt": (
                max(p["createdAt"] for p in selected_predicates)
                if selected_predicates else None
            )
        }
        
        # Submission readiness progress
        has_classification = classification is not None
        has_selected_predicates = len(selected_predicates) > 0
        has_documents = len(project.documents) > 0
        
        submission_readiness_step = {
            "status": "completed" if (has_classification and has_selected_predicates and has_documents) else "pending",
            "confidenceScore": None,
            "completedAt": None
        }
        
        # Calculate overall progress
        steps = [classification_step, predicate_search_step, comparison_analysis_step, submission_readiness_step]
        completed_steps = len([s for s in steps if s["status"] == "completed"])
        overall_progress = (completed_steps / len(steps)) * 100
        
        # Generate next actions
        next_actions = []
        if not classification:
            next_actions.append("Complete device classification")
        elif not predicate_devices:
            next_actions.append("Search for predicate devices")
        elif not selected_predicates:
            next_actions.append("Select and analyze predicate devices")
        elif not has_documents:
            next_actions.append("Upload supporting documents")
        else:
            next_actions.append("Review submission readiness")
        
        return {
            "projectId": str(project.id),
            "classification": classification_step,
            "predicateSearch": predicate_search_step,
            "comparisonAnalysis": comparison_analysis_step,
            "submissionReadiness": submission_readiness_step,
            "overallProgress": overall_progress,
            "nextActions": next_actions,
            "lastUpdated": datetime.now(timezone.utc).isoformat()
        }
    
    def _map_agent_action_to_activity_type(self, agent_action: str) -> str:
        """Map agent action to activity type."""
        action_mapping = {
            "classify_device": "classification",
            "search_predicates": "predicate_search",
            "compare_predicate": "comparison",
            "process_document": "document_upload",
            "predicate_search": "predicate_search",
            "device_classification": "classification"
        }
        return action_mapping.get(agent_action, "agent_interaction")
    
    def _generate_activity_title(self, agent_action: str) -> str:
        """Generate human-readable activity title."""
        title_mapping = {
            "classify_device": "Device Classification Completed",
            "search_predicates": "Predicate Search Performed",
            "compare_predicate": "Predicate Comparison Analysis",
            "process_document": "Document Processed",
            "predicate_search": "Predicate Search Completed",
            "device_classification": "Device Classification Analysis"
        }
        return title_mapping.get(agent_action, f"Agent Action: {agent_action}")
    
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