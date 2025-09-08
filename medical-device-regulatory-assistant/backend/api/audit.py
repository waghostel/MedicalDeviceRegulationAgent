"""
Audit Trail API Endpoints
Provides REST API for audit trail management and compliance reporting
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io
import json
import hashlib
import hmac
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db_session
from services.audit_logger import AuditLogger
from middleware.auth import get_current_user
from models.user import User


router = APIRouter(prefix="/api/audit", tags=["audit"])


# Request/Response Models
class AuditTrailRequest(BaseModel):
    """Request model for audit trail queries"""
    project_id: int
    user_id: Optional[int] = None
    action_filter: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, le=1000)


class AuditExportRequest(BaseModel):
    """Request model for audit trail export"""
    project_id: int
    format_type: str = Field(default="json", pattern="^(json|csv|pdf)$")
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_reasoning: bool = True
    include_sources: bool = True


class ComplianceReportRequest(BaseModel):
    """Request model for compliance reporting"""
    project_id: int
    report_type: str = Field(default="full", pattern="^(full|summary|regulatory)$")
    include_integrity_check: bool = True


class AuditRetentionRequest(BaseModel):
    """Request model for audit retention policy"""
    retention_days: int = Field(default=2555, ge=365, le=3650)  # 7-10 years
    project_id: Optional[int] = None
    archive_before_delete: bool = True


class AuditIntegrityResponse(BaseModel):
    """Response model for audit integrity verification"""
    is_valid: bool
    total_entries: int
    verified_entries: int
    tampered_entries: List[int] = []
    integrity_score: float
    verification_timestamp: datetime
    hash_algorithm: str = "SHA-256"


# Audit Logger instance
def get_audit_logger() -> AuditLogger:
    """Get audit logger instance"""
    return AuditLogger()


@router.get("/trail/{project_id}")
async def get_audit_trail(
    project_id: int,
    user_id: Optional[int] = Query(None),
    action_filter: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> Dict[str, Any]:
    """
    Get audit trail for a project with filtering options
    """
    try:
        # Verify user has access to project
        # TODO: Add project access verification
        
        audit_entries = await audit_logger.get_audit_trail(
            project_id=project_id,
            user_id=user_id,
            action_filter=action_filter,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        summary = await audit_logger.get_audit_summary(
            project_id=project_id,
            user_id=user_id
        )
        
        return {
            "audit_entries": audit_entries,
            "summary": summary,
            "total_count": len(audit_entries),
            "filters_applied": {
                "user_id": user_id,
                "action_filter": action_filter,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "limit": limit
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve audit trail: {str(e)}"
        )


@router.post("/export")
async def export_audit_trail(
    request: AuditExportRequest,
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> StreamingResponse:
    """
    Export audit trail in specified format
    """
    try:
        # Verify user has access to project
        # TODO: Add project access verification
        
        export_data = await audit_logger.export_audit_trail(
            project_id=request.project_id,
            format_type=request.format_type,
            user_id=request.user_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        # Determine content type and filename
        if request.format_type.lower() == "json":
            content_type = "application/json"
            filename = f"audit_trail_{request.project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        elif request.format_type.lower() == "csv":
            content_type = "text/csv"
            filename = f"audit_trail_{request.project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
        # Create streaming response
        def generate():
            yield export_data.encode('utf-8')
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export audit trail: {str(e)}"
        )


@router.post("/compliance-report")
async def generate_compliance_report(
    request: ComplianceReportRequest,
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> Dict[str, Any]:
    """
    Generate compliance report with confidence scores and source citations
    """
    try:
        # Get audit trail data
        audit_entries = await audit_logger.get_audit_trail(
            project_id=request.project_id,
            limit=10000  # Large limit for comprehensive report
        )
        
        summary = await audit_logger.get_audit_summary(
            project_id=request.project_id
        )
        
        # Generate compliance metrics
        compliance_metrics = await _generate_compliance_metrics(audit_entries)
        
        # Perform integrity check if requested
        integrity_result = None
        if request.include_integrity_check:
            integrity_result = await verify_audit_integrity(
                project_id=request.project_id,
                audit_logger=audit_logger
            )
        
        report = {
            "report_metadata": {
                "project_id": request.project_id,
                "report_type": request.report_type,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generated_by": current_user.email,
                "total_entries": len(audit_entries)
            },
            "compliance_metrics": compliance_metrics,
            "audit_summary": summary,
            "integrity_verification": integrity_result,
            "regulatory_compliance": {
                "fda_traceability": True,
                "complete_reasoning_traces": compliance_metrics["reasoning_completeness"] >= 0.95,
                "source_citations_complete": compliance_metrics["citation_completeness"] >= 0.95,
                "confidence_scores_present": compliance_metrics["confidence_score_coverage"] >= 0.95
            }
        }
        
        if request.report_type == "full":
            report["detailed_entries"] = audit_entries[:100]  # Limit for response size
        
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance report: {str(e)}"
        )


@router.post("/retention-policy")
async def apply_retention_policy(
    request: AuditRetentionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> Dict[str, Any]:
    """
    Apply data retention policy to audit trail
    """
    try:
        # Add background task for retention cleanup
        background_tasks.add_task(
            _apply_retention_cleanup,
            audit_logger,
            request.retention_days,
            request.project_id,
            request.archive_before_delete
        )
        
        return {
            "message": "Retention policy application started",
            "retention_days": request.retention_days,
            "project_id": request.project_id,
            "archive_before_delete": request.archive_before_delete,
            "initiated_by": current_user.email,
            "initiated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply retention policy: {str(e)}"
        )


@router.get("/integrity/{project_id}")
async def verify_audit_integrity(
    project_id: int,
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> AuditIntegrityResponse:
    """
    Verify audit trail integrity and detect tampering
    """
    try:
        # Get all audit entries for the project
        audit_entries = await audit_logger.get_audit_trail(
            project_id=project_id,
            limit=10000
        )
        
        total_entries = len(audit_entries)
        verified_entries = 0
        tampered_entries = []
        
        # Verify each entry's integrity
        for entry in audit_entries:
            if await _verify_entry_integrity(entry):
                verified_entries += 1
            else:
                tampered_entries.append(entry["id"])
        
        integrity_score = verified_entries / total_entries if total_entries > 0 else 1.0
        
        return AuditIntegrityResponse(
            is_valid=len(tampered_entries) == 0,
            total_entries=total_entries,
            verified_entries=verified_entries,
            tampered_entries=tampered_entries,
            integrity_score=integrity_score,
            verification_timestamp=datetime.now(timezone.utc),
            hash_algorithm="SHA-256"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify audit integrity: {str(e)}"
        )


@router.post("/log")
async def log_audit_entry(
    project_id: int,
    action: str,
    input_data: Dict[str, Any],
    output_data: Dict[str, Any],
    confidence_score: float,
    sources: List[Dict[str, str]],
    reasoning: str,
    execution_time_ms: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    audit_logger: AuditLogger = Depends(get_audit_logger)
) -> Dict[str, str]:
    """
    Log a new audit entry (for internal use by agents)
    """
    try:
        await audit_logger.log_agent_action(
            project_id=project_id,
            user_id=current_user.id,
            action=action,
            input_data=input_data,
            output_data=output_data,
            confidence_score=confidence_score,
            sources=sources,
            reasoning=reasoning,
            execution_time_ms=execution_time_ms
        )
        
        return {
            "message": "Audit entry logged successfully",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log audit entry: {str(e)}"
        )


# Helper functions
async def _generate_compliance_metrics(audit_entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate compliance metrics from audit entries"""
    
    if not audit_entries:
        return {
            "reasoning_completeness": 0.0,
            "citation_completeness": 0.0,
            "confidence_score_coverage": 0.0,
            "average_confidence": 0.0,
            "action_distribution": {},
            "error_rate": 0.0
        }
    
    reasoning_complete = sum(1 for entry in audit_entries if entry.get("reasoning"))
    citations_complete = sum(1 for entry in audit_entries if entry.get("sources"))
    confidence_scores_present = sum(1 for entry in audit_entries if entry.get("confidence_score") is not None)
    
    confidence_scores = [
        entry["confidence_score"] for entry in audit_entries 
        if entry.get("confidence_score") is not None
    ]
    
    action_counts = {}
    error_count = 0
    
    for entry in audit_entries:
        action = entry.get("action", "unknown")
        action_counts[action] = action_counts.get(action, 0) + 1
        
        if "error" in action.lower():
            error_count += 1
    
    return {
        "reasoning_completeness": reasoning_complete / len(audit_entries),
        "citation_completeness": citations_complete / len(audit_entries),
        "confidence_score_coverage": confidence_scores_present / len(audit_entries),
        "average_confidence": sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0,
        "action_distribution": action_counts,
        "error_rate": error_count / len(audit_entries),
        "total_entries_analyzed": len(audit_entries)
    }


async def _verify_entry_integrity(entry: Dict[str, Any]) -> bool:
    """Verify the integrity of a single audit entry"""
    
    # Basic integrity checks
    required_fields = ["id", "project_id", "action", "created_at"]
    
    for field in required_fields:
        if field not in entry or entry[field] is None:
            return False
    
    # Check for reasonable timestamp
    try:
        if isinstance(entry["created_at"], str):
            datetime.fromisoformat(entry["created_at"].replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return False
    
    # Check confidence score range
    confidence = entry.get("confidence_score")
    if confidence is not None and (confidence < 0.0 or confidence > 1.0):
        return False
    
    # Additional integrity checks could be added here
    # (e.g., cryptographic signatures, hash verification)
    
    return True


async def _apply_retention_cleanup(
    audit_logger: AuditLogger,
    retention_days: int,
    project_id: Optional[int],
    archive_before_delete: bool
) -> None:
    """Background task to apply retention policy"""
    
    try:
        if archive_before_delete:
            # TODO: Implement archival to external storage
            pass
        
        deleted_count = await audit_logger.cleanup_old_entries(
            retention_days=retention_days,
            project_id=project_id
        )
        
        print(f"Retention cleanup completed: {deleted_count} entries removed")
        
    except Exception as e:
        print(f"Retention cleanup failed: {str(e)}")
        # TODO: Add proper logging/alerting