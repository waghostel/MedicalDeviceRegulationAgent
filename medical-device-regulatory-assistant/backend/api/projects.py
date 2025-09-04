"""
Project management API endpoints.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import JSONResponse
import json
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from services.auth import get_current_user, TokenData
from services.projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectDashboardData,
    ProjectSearchFilters,
    ProjectExportData,
    ProjectStatus
)

router = APIRouter(prefix="/projects", tags=["projects"])

# Initialize project service
project_service = ProjectService()


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create a new medical device regulatory project for the authenticated user."
)
async def create_project(
    project_data: ProjectCreateRequest,
    current_user: TokenData = Depends(get_current_user)
) -> ProjectResponse:
    """
    Create a new project for the authenticated user.
    
    Args:
        project_data: Project creation data including name, description, device type, and intended use
        current_user: Authenticated user information
        
    Returns:
        ProjectResponse: Created project data with ID and timestamps
        
    Raises:
        HTTPException: 404 if user not found, 400 for validation errors
    """
    return await project_service.create_project(project_data, current_user.sub)


@router.get(
    "/",
    response_model=List[ProjectResponse],
    summary="List projects",
    description="Get a list of projects for the authenticated user with optional search and filtering."
)
async def list_projects(
    search: Optional[str] = Query(None, description="Search in name, description, device_type"),
    status_filter: Optional[ProjectStatus] = Query(None, alias="status", description="Filter by status"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: TokenData = Depends(get_current_user)
) -> List[ProjectResponse]:
    """
    List projects for the authenticated user with search and filtering.
    
    Args:
        search: Search term for name, description, or device type
        status_filter: Filter by project status
        device_type: Filter by device type
        limit: Maximum number of results (1-100)
        offset: Number of results to skip for pagination
        current_user: Authenticated user information
        
    Returns:
        List[ProjectResponse]: List of projects matching the criteria
    """
    filters = ProjectSearchFilters(
        search=search,
        status=status_filter,
        device_type=device_type,
        limit=limit,
        offset=offset
    )
    
    return await project_service.list_projects(current_user.sub, filters)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project details",
    description="Get detailed information about a specific project."
)
async def get_project(
    project_id: int,
    current_user: TokenData = Depends(get_current_user)
) -> ProjectResponse:
    """
    Get a specific project by ID for the authenticated user.
    
    Args:
        project_id: Project ID
        current_user: Authenticated user information
        
    Returns:
        ProjectResponse: Project data
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    return await project_service.get_project(project_id, current_user.sub)


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    description="Update an existing project's information."
)
async def update_project(
    project_id: int,
    project_data: ProjectUpdateRequest,
    current_user: TokenData = Depends(get_current_user)
) -> ProjectResponse:
    """
    Update a project for the authenticated user.
    
    Args:
        project_id: Project ID
        project_data: Project update data (only provided fields will be updated)
        current_user: Authenticated user information
        
    Returns:
        ProjectResponse: Updated project data
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    return await project_service.update_project(project_id, project_data, current_user.sub)


@router.delete(
    "/{project_id}",
    summary="Delete project",
    description="Delete a project and all associated data."
)
async def delete_project(
    project_id: int,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a project for the authenticated user.
    
    Args:
        project_id: Project ID
        current_user: Authenticated user information
        
    Returns:
        Dict: Deletion confirmation message
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    return await project_service.delete_project(project_id, current_user.sub)


@router.get(
    "/{project_id}/dashboard",
    response_model=ProjectDashboardData,
    summary="Get project dashboard data",
    description="Get aggregated dashboard data for a project including classification status, predicate counts, and completion metrics."
)
async def get_project_dashboard(
    project_id: int,
    current_user: TokenData = Depends(get_current_user)
) -> ProjectDashboardData:
    """
    Get aggregated dashboard data for a project.
    
    Args:
        project_id: Project ID
        current_user: Authenticated user information
        
    Returns:
        ProjectDashboardData: Dashboard data including project info, classification status,
                             predicate counts, document counts, and completion percentage
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    return await project_service.get_dashboard_data(project_id, current_user.sub)


@router.get(
    "/{project_id}/export",
    summary="Export project data",
    description="Export complete project data in JSON or PDF format for backup or analysis."
)
async def export_project(
    project_id: int,
    format_type: str = Query("json", pattern="^(json|pdf)$", description="Export format: json or pdf"),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Export complete project data for backup or analysis.
    
    Args:
        project_id: Project ID
        format_type: Export format ("json" or "pdf")
        current_user: Authenticated user information
        
    Returns:
        Response: JSON data or PDF file depending on format_type
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    export_data = await project_service.export_project(project_id, current_user.sub, format_type)
    
    if format_type == "json":
        # Return JSON response
        return JSONResponse(
            content=export_data.model_dump(),
            headers={
                "Content-Disposition": f"attachment; filename=project_{project_id}_export.json"
            }
        )
    
    elif format_type == "pdf":
        # Generate PDF report
        pdf_buffer = _generate_pdf_report(export_data)
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=project_{project_id}_report.pdf"
            }
        )


def _generate_pdf_report(export_data: ProjectExportData) -> io.BytesIO:
    """
    Generate a PDF report from project export data.
    
    Args:
        export_data: Complete project data
        
    Returns:
        io.BytesIO: PDF file buffer
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Project Report: {export_data.project.name}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Project Information
    story.append(Paragraph("Project Information", styles['Heading1']))
    story.append(Paragraph(f"<b>Name:</b> {export_data.project.name}", styles['Normal']))
    if export_data.project.description:
        story.append(Paragraph(f"<b>Description:</b> {export_data.project.description}", styles['Normal']))
    if export_data.project.device_type:
        story.append(Paragraph(f"<b>Device Type:</b> {export_data.project.device_type}", styles['Normal']))
    if export_data.project.intended_use:
        story.append(Paragraph(f"<b>Intended Use:</b> {export_data.project.intended_use}", styles['Normal']))
    story.append(Paragraph(f"<b>Status:</b> {export_data.project.status.value}", styles['Normal']))
    story.append(Paragraph(f"<b>Created:</b> {export_data.project.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 12))
    
    # Classifications
    if export_data.classifications:
        story.append(Paragraph("Device Classifications", styles['Heading1']))
        for classification in export_data.classifications:
            story.append(Paragraph(f"<b>Device Class:</b> {classification.get('device_class', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Product Code:</b> {classification.get('product_code', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Regulatory Pathway:</b> {classification.get('regulatory_pathway', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Confidence Score:</b> {classification.get('confidence_score', 0):.2f}", styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))
    
    # Predicate Devices
    if export_data.predicates:
        story.append(Paragraph("Predicate Devices", styles['Heading1']))
        for predicate in export_data.predicates:
            story.append(Paragraph(f"<b>K-Number:</b> {predicate.get('k_number', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Device Name:</b> {predicate.get('device_name', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Product Code:</b> {predicate.get('product_code', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Confidence Score:</b> {predicate.get('confidence_score', 0):.2f}", styles['Normal']))
            story.append(Paragraph(f"<b>Selected:</b> {'Yes' if predicate.get('is_selected', False) else 'No'}", styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))
    
    # Documents
    if export_data.documents:
        story.append(Paragraph("Project Documents", styles['Heading1']))
        for document in export_data.documents:
            story.append(Paragraph(f"<b>Filename:</b> {document.get('filename', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Type:</b> {document.get('document_type', 'N/A')}", styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))
    
    # Agent Interactions Summary
    if export_data.interactions:
        story.append(Paragraph("Agent Interactions Summary", styles['Heading1']))
        story.append(Paragraph(f"<b>Total Interactions:</b> {len(export_data.interactions)}", styles['Normal']))
        
        # Group by action type
        action_counts = {}
        for interaction in export_data.interactions:
            action = interaction.get('agent_action', 'Unknown')
            action_counts[action] = action_counts.get(action, 0) + 1
        
        for action, count in action_counts.items():
            story.append(Paragraph(f"<b>{action}:</b> {count} times", styles['Normal']))
        
        story.append(Spacer(1, 12))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer