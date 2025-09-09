"""
Enhanced project service with optimized queries and performance monitoring
"""

import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, text
from fastapi import HTTPException, status

from models.project import Project, ProjectStatus
from models.user import User
from models.device_classification import DeviceClassification
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument
from services.query_optimizer import get_query_optimizer
from services.performance_monitor import get_performance_monitor
from database.connection import get_database_manager

# Import existing models from the original service
from services.projects import (
    ProjectCreateRequest,
    ProjectUpdateRequest, 
    ProjectResponse,
    ProjectDashboardData,
    ProjectSearchFilters,
    ProjectExportData
)

from exceptions.project_exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectStateError,
    ProjectExportError,
)


class EnhancedProjectService:
    """Enhanced project service with optimized queries and performance monitoring"""
    
    def __init__(self):
        self._db_manager = None
        self._query_optimizer = None
        self._performance_monitor = None
    
    @property
    def db_manager(self):
        """Lazy initialization of database manager"""
        if self._db_manager is None:
            self._db_manager = get_database_manager()
        return self._db_manager
    
    @property
    def query_optimizer(self):
        """Lazy initialization of query optimizer"""
        if self._query_optimizer is None:
            self._query_optimizer = get_query_optimizer()
        return self._query_optimizer
    
    @property
    def performance_monitor(self):
        """Lazy initialization of performance monitor"""
        if self._performance_monitor is None:
            self._performance_monitor = get_performance_monitor()
        return self._performance_monitor
    
    async def create_project(
        self, 
        project_data: ProjectCreateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """Create a new project with optimized user lookup"""
        
        async with self.query_optimizer.monitored_query("create_project", f"user:{user_id}"):
            async with self.db_manager.get_session() as session:
                # Optimized user lookup with index
                user_stmt = select(User).where(User.google_id == user_id)
                user_result = await session.execute(user_stmt)
                user = user_result.scalar_one_or_none()
                
                if not user:
                    raise ProjectNotFoundError(project_id=0, user_id=user_id)
                
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
        """Get a specific project with optimized query"""
        
        async with self.query_optimizer.monitored_query("get_project", f"project:{project_id}"):
            async with self.db_manager.get_session() as session:
                # Optimized query with proper join and index usage
                stmt = (
                    select(Project)
                    .join(User, Project.user_id == User.id)
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
                    raise ProjectNotFoundError(project_id=project_id, user_id=user_id)
                
                return ProjectResponse.model_validate(project)
    
    async def update_project(
        self, 
        project_id: int, 
        project_data: ProjectUpdateRequest, 
        user_id: str
    ) -> ProjectResponse:
        """Update a project with optimized query and WebSocket notification"""
        
        async with self.query_optimizer.monitored_query("update_project", f"project:{project_id}"):
            async with self.db_manager.get_session() as session:
                # Optimized project lookup
                stmt = (
                    select(Project)
                    .join(User, Project.user_id == User.id)
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
                    raise ProjectNotFoundError(project_id=project_id, user_id=user_id)
                
                # Update project fields
                update_data = project_data.model_dump(exclude_unset=True)
                for field, value in update_data.items():
                    setattr(project, field, value)
                
                project.updated_at = datetime.now(timezone.utc)
                
                await session.commit()
                await session.refresh(project)
                
                # Send WebSocket notification (if available)
                try:
                    from api.websocket import notify_project_updated
                    project_response = ProjectResponse.model_validate(project)
                    await notify_project_updated(
                        project_id=project.id,
                        user_id=user_id,
                        data=project_response.model_dump()
                    )
                except (ImportError, Exception) as e:
                    # Log but don't fail the update
                    pass
                
                return ProjectResponse.model_validate(project)
    
    async def delete_project(
        self, 
        project_id: int, 
        user_id: str
    ) -> Dict[str, str]:
        """Delete a project with optimized query"""
        
        async with self.query_optimizer.monitored_query("delete_project", f"project:{project_id}"):
            async with self.db_manager.get_session() as session:
                # Optimized project lookup
                stmt = (
                    select(Project)
                    .join(User, Project.user_id == User.id)
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
                    raise ProjectNotFoundError(project_id=project_id, user_id=user_id)
                
                project_name = project.name
                await session.delete(project)
                await session.commit()
                
                return {"message": f"Project '{project_name}' deleted successfully"}
    
    async def list_projects(
        self, 
        user_id: str, 
        filters: ProjectSearchFilters
    ) -> Tuple[List[ProjectResponse], int]:
        """List projects with optimized query and pagination"""
        
        # Use the optimized query from query_optimizer
        projects, total_count = await self.query_optimizer.get_optimized_projects_query(
            user_id=user_id,
            search=filters.search,
            status=filters.status,
            device_type=filters.device_type,
            limit=filters.limit,
            offset=filters.offset,
            include_related=False
        )
        
        project_responses = [ProjectResponse.model_validate(project) for project in projects]
        return project_responses, total_count
    
    async def get_dashboard_data(
        self, 
        project_id: int, 
        user_id: str
    ) -> ProjectDashboardData:
        """Get comprehensive dashboard data with optimized queries"""
        
        # Use the optimized dashboard query
        project = await self.query_optimizer.get_optimized_project_dashboard(
            project_id=project_id,
            user_id=user_id
        )
        
        if not project:
            raise ProjectNotFoundError(project_id=project_id, user_id=user_id)
        
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
                "deviceClass": latest_classification.device_class.value if latest_classification.device_class else None,
                "productCode": latest_classification.product_code,
                "regulatoryPathway": latest_classification.regulatory_pathway.value if latest_classification.regulatory_pathway else None,
                "cfrSections": latest_classification.cfr_sections or [],
                "confidenceScore": latest_classification.confidence_score or 0.0,
                "reasoning": latest_classification.reasoning or "",
                "sources": latest_classification.sources or [],
                "createdAt": latest_classification.created_at.isoformat(),
                "updatedAt": latest_classification.updated_at.isoformat()
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
                "updatedAt": predicate.updated_at.isoformat()
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
    
    async def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics with optimized query"""
        return await self.query_optimizer.get_optimized_user_statistics(user_id)
    
    async def get_recent_activity(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activity with optimized query"""
        interactions = await self.query_optimizer.get_optimized_recent_activity(user_id, limit)
        
        activity = []
        for interaction in interactions:
            activity.append({
                "id": str(interaction.id),
                "type": self._map_agent_action_to_activity_type(interaction.agent_action),
                "title": self._generate_activity_title(interaction.agent_action),
                "description": interaction.reasoning or f"Agent performed {interaction.agent_action}",
                "timestamp": interaction.created_at.isoformat(),
                "project_id": interaction.project_id,
                "project_name": interaction.project.name if interaction.project else "Unknown",
                "confidence_score": interaction.confidence_score,
                "execution_time_ms": interaction.execution_time_ms
            })
        
        return activity
    
    async def export_project(
        self, 
        project_id: int, 
        user_id: str, 
        format_type: str = "json"
    ) -> ProjectExportData:
        """Export complete project data with optimized query"""
        
        # Use optimized dashboard query to get all related data
        project = await self.query_optimizer.get_optimized_project_dashboard(
            project_id=project_id,
            user_id=user_id
        )
        
        if not project:
            raise ProjectNotFoundError(project_id=project_id, user_id=user_id)
        
        # Convert related data to dictionaries
        classifications = []
        for classification in project.device_classifications:
            classifications.append({
                "id": classification.id,
                "device_class": classification.device_class.value if classification.device_class else None,
                "product_code": classification.product_code,
                "regulatory_pathway": classification.regulatory_pathway.value if classification.regulatory_pathway else None,
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
    
    def _calculate_project_progress(
        self,
        project: Project,
        classification: Optional[Dict[str, Any]],
        predicate_devices: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate comprehensive project progress data"""
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
        """Map agent action to activity type"""
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
        """Generate human-readable activity title"""
        title_mapping = {
            "classify_device": "Device Classification Completed",
            "search_predicates": "Predicate Search Performed",
            "compare_predicate": "Predicate Comparison Analysis",
            "process_document": "Document Processed",
            "predicate_search": "Predicate Search Completed",
            "device_classification": "Device Classification Analysis"
        }
        return title_mapping.get(agent_action, f"Agent Action: {agent_action}")


# Global enhanced project service instance
_enhanced_project_service: Optional[EnhancedProjectService] = None


def get_enhanced_project_service() -> EnhancedProjectService:
    """Get the global enhanced project service instance"""
    global _enhanced_project_service
    if _enhanced_project_service is None:
        _enhanced_project_service = EnhancedProjectService()
    return _enhanced_project_service