"""
Project management API endpoints.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import JSONResponse
import json
import io
import csv
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
from services.export_service import EnhancedExportService

router = APIRouter(prefix="/projects", tags=["projects"])

# Initialize services
project_service = ProjectService()
export_service = EnhancedExportService()


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


@router.post(
    "/{project_id}/backup",
    summary="Create project backup",
    description="Create a comprehensive backup of project data with integrity verification."
)
async def create_project_backup(
    project_id: int,
    backup_type: str = Query("full", pattern="^(full|incremental)$", description="Backup type"),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a comprehensive project backup with integrity verification.
    
    Args:
        project_id: Project ID to backup
        backup_type: Type of backup ("full" or "incremental")
        current_user: Authenticated user information
        
    Returns:
        Dict: Backup result with metadata and integrity information
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    try:
        backup_result = await export_service.create_project_backup(
            project_id=project_id,
            user_id=current_user.sub,
            backup_type=backup_type
        )
        
        if backup_result['success']:
            return backup_result
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {backup_result['error']}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup operation failed: {str(e)}"
        )


@router.get(
    "/{project_id}/export/validate",
    summary="Validate export data",
    description="Validate project export data for integrity and completeness."
)
async def validate_export_data(
    project_id: int,
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Validate project export data for integrity and completeness.
    
    Args:
        project_id: Project ID to validate
        current_user: Authenticated user information
        
    Returns:
        Dict: Validation result with errors, warnings, and metrics
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    try:
        # Get export data with validation
        export_data = await export_service.export_project_enhanced(
            project_id=project_id,
            user_id=current_user.sub,
            format_type="json",
            include_validation=True
        )
        
        # Return validation results
        validation_info = export_data.get('validation', {})
        return {
            "project_id": project_id,
            "validation_status": "passed" if validation_info.get('is_valid', False) else "failed",
            "errors": validation_info.get('errors', []),
            "warnings": validation_info.get('warnings', []),
            "validation_time_ms": validation_info.get('validation_time_ms', 0),
            "validated_at": validation_info.get('validated_at'),
            "integrity_verified": export_service.verify_export_integrity(export_data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@router.get(
    "/{project_id}/export",
    summary="Export project data",
    description="Export complete project data in JSON or PDF format with enhanced validation and integrity checks."
)
async def export_project(
    project_id: int,
    format_type: str = Query("json", pattern="^(json|pdf|csv)$", description="Export format: json, pdf, or csv"),
    include_validation: bool = Query(True, description="Include validation metadata"),
    include_performance: bool = Query(False, description="Include performance metrics"),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Export complete project data with enhanced validation and formatting.
    
    Args:
        project_id: Project ID
        format_type: Export format ("json", "pdf", or "csv")
        include_validation: Whether to include validation metadata
        include_performance: Whether to include performance metrics
        current_user: Authenticated user information
        
    Returns:
        Response: Enhanced export data with validation and integrity checks
        
    Raises:
        HTTPException: 404 if project not found or access denied
    """
    try:
        if format_type in ["json", "pdf"]:
            # Use enhanced export service
            export_data = await export_service.export_project_enhanced(
                project_id=project_id,
                user_id=current_user.sub,
                format_type=format_type,
                include_validation=include_validation,
                include_performance_metrics=include_performance
            )
            
            if format_type == "json":
                return JSONResponse(
                    content=export_data,
                    headers={
                        "Content-Disposition": f"attachment; filename=project_{project_id}_enhanced_export.json"
                    }
                )
            else:  # PDF
                return Response(
                    content=export_data,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename=project_{project_id}_enhanced_report.pdf"
                    }
                )
        
        elif format_type == "csv":
            # Generate CSV export
            csv_data = await _generate_csv_export(project_id, current_user.sub)
            return Response(
                content=csv_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=project_{project_id}_export.csv"
                }
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
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


async def _generate_csv_export(project_id: int, user_id: str) -> str:
    """
    Generate CSV export of project data.
    
    Args:
        project_id: Project ID to export
        user_id: User ID for authentication
        
    Returns:
        str: CSV data as string
    """
    # Get export data
    export_data = await project_service.export_project(project_id, user_id, "json")
    
    # Create CSV buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Project information
    writer.writerow(["Section", "Field", "Value"])
    writer.writerow(["Project", "ID", export_data.project.id])
    writer.writerow(["Project", "Name", export_data.project.name])
    writer.writerow(["Project", "Description", export_data.project.description or ""])
    writer.writerow(["Project", "Device Type", export_data.project.device_type or ""])
    writer.writerow(["Project", "Intended Use", export_data.project.intended_use or ""])
    writer.writerow(["Project", "Status", export_data.project.status.value])
    writer.writerow(["Project", "Created", export_data.project.created_at.isoformat()])
    writer.writerow(["Project", "Updated", export_data.project.updated_at.isoformat()])
    writer.writerow([])  # Empty row
    
    # Classifications
    if export_data.classifications:
        writer.writerow(["Classifications", "", ""])
        writer.writerow(["Classification", "Device Class", "Product Code", "Regulatory Pathway", "Confidence Score"])
        for i, classification in enumerate(export_data.classifications):
            writer.writerow([
                f"Classification {i+1}",
                classification.get('device_class', ''),
                classification.get('product_code', ''),
                classification.get('regulatory_pathway', ''),
                classification.get('confidence_score', '')
            ])
        writer.writerow([])  # Empty row
    
    # Predicate devices
    if export_data.predicates:
        writer.writerow(["Predicate Devices", "", ""])
        writer.writerow(["Predicate", "K-Number", "Device Name", "Product Code", "Confidence Score", "Selected"])
        for i, predicate in enumerate(export_data.predicates):
            writer.writerow([
                f"Predicate {i+1}",
                predicate.get('k_number', ''),
                predicate.get('device_name', ''),
                predicate.get('product_code', ''),
                predicate.get('confidence_score', ''),
                'Yes' if predicate.get('is_selected', False) else 'No'
            ])
        writer.writerow([])  # Empty row
    
    # Documents
    if export_data.documents:
        writer.writerow(["Documents", "", ""])
        writer.writerow(["Document", "Filename", "Type", "Created"])
        for i, document in enumerate(export_data.documents):
            writer.writerow([
                f"Document {i+1}",
                document.get('filename', ''),
                document.get('document_type', ''),
                document.get('created_at', '')
            ])
        writer.writerow([])  # Empty row
    
    # Agent interactions summary
    if export_data.interactions:
        writer.writerow(["Agent Interactions", "", ""])
        
        # Group by action type
        action_counts = {}
        for interaction in export_data.interactions:
            action = interaction.get('agent_action', 'Unknown')
            action_counts[action] = action_counts.get(action, 0) + 1
        
        writer.writerow(["Action Type", "Count"])
        for action, count in sorted(action_counts.items()):
            writer.writerow([action.replace('_', ' ').title(), count])
    
    return output.getvalue()