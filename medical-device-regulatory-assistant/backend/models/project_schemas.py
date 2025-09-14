"""
Pydantic models for Project API validation and serialization
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator
from .project import ProjectStatus


class ProjectPriority(str, Enum):
    """Project priority enumeration"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ProjectCreateRequest(BaseModel):
    """Request model for creating a new project"""
    
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=255,
        description="Project name (required, 1-255 characters)"
    )
    description: Optional[str] = Field(
        None, 
        max_length=2000,
        description="Project description (optional, max 2000 characters)"
    )
    device_type: Optional[str] = Field(
        None, 
        max_length=255,
        description="Type of medical device (optional, max 255 characters)"
    )
    intended_use: Optional[str] = Field(
        None, 
        max_length=5000,
        description="Intended use statement (optional, max 5000 characters)"
    )
    priority: Optional[ProjectPriority] = Field(
        None,
        description="Project priority (high, medium, low)"
    )
    tags: Optional[List[str]] = Field(
        None, 
        max_items=10,
        description="Project tags (optional, max 10 tags)"
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate project name"""
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty or whitespace only')
        return v.strip()
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Validate tags list"""
        if v is not None:
            # Remove duplicates and empty tags
            cleaned_tags = list(set(tag.strip() for tag in v if tag and tag.strip()))
            if len(cleaned_tags) > 10:
                raise ValueError('Maximum 10 tags allowed')
            return cleaned_tags
        return v
    
    @field_validator('device_type', 'intended_use', 'description')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields by trimming whitespace"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ProjectUpdateRequest(BaseModel):
    """Request model for updating an existing project"""
    
    name: Optional[str] = Field(
        None, 
        min_length=1, 
        max_length=255,
        description="Project name (1-255 characters)"
    )
    description: Optional[str] = Field(
        None, 
        max_length=2000,
        description="Project description (max 2000 characters)"
    )
    device_type: Optional[str] = Field(
        None, 
        max_length=255,
        description="Type of medical device (max 255 characters)"
    )
    intended_use: Optional[str] = Field(
        None, 
        max_length=5000,
        description="Intended use statement (max 5000 characters)"
    )
    status: Optional[ProjectStatus] = Field(
        None,
        description="Project status (draft, active, in_progress, completed)"
    )
    priority: Optional[ProjectPriority] = Field(
        None,
        description="Project priority (high, medium, low)"
    )
    tags: Optional[List[str]] = Field(
        None, 
        max_items=10,
        description="Project tags (max 10 tags)"
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate project name"""
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Project name cannot be empty or whitespace only')
            return v.strip()
        return v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Validate tags list"""
        if v is not None:
            # Remove duplicates and empty tags
            cleaned_tags = list(set(tag.strip() for tag in v if tag and tag.strip()))
            if len(cleaned_tags) > 10:
                raise ValueError('Maximum 10 tags allowed')
            return cleaned_tags
        return v
    
    @field_validator('device_type', 'intended_use', 'description')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields by trimming whitespace"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @model_validator(mode='after')
    def validate_at_least_one_field(self):
        """Ensure at least one field is provided for update"""
        values = self.model_dump(exclude_unset=True)
        if not values:
            raise ValueError('At least one field must be provided for update')
        return self


class ProjectResponse(BaseModel):
    """Response model for project data"""
    
    id: int = Field(..., description="Project ID")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    device_type: Optional[str] = Field(None, description="Type of medical device")
    intended_use: Optional[str] = Field(None, description="Intended use statement")
    status: ProjectStatus = Field(..., description="Project status")
    priority: Optional[str] = Field(None, description="Project priority")
    tags: Optional[List[str]] = Field(None, description="Project tags")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Computed fields
    progress_percentage: Optional[float] = Field(
        None, 
        ge=0, 
        le=100,
        description="Project completion percentage (0-100)"
    )
    last_activity: Optional[datetime] = Field(
        None,
        description="Timestamp of last activity on the project"
    )
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProjectSearchFilters(BaseModel):
    """Model for project search and filtering parameters"""
    
    search: Optional[str] = Field(
        None,
        max_length=255,
        description="Search term for project name, description, or device type"
    )
    status: Optional[ProjectStatus] = Field(
        None,
        description="Filter by project status"
    )
    priority: Optional[ProjectPriority] = Field(
        None,
        description="Filter by project priority"
    )
    device_type: Optional[str] = Field(
        None,
        max_length=255,
        description="Filter by device type"
    )
    tags: Optional[List[str]] = Field(
        None,
        max_items=5,
        description="Filter by tags (max 5 tags)"
    )
    created_after: Optional[datetime] = Field(
        None,
        description="Filter projects created after this date"
    )
    created_before: Optional[datetime] = Field(
        None,
        description="Filter projects created before this date"
    )
    updated_after: Optional[datetime] = Field(
        None,
        description="Filter projects updated after this date"
    )
    updated_before: Optional[datetime] = Field(
        None,
        description="Filter projects updated before this date"
    )
    limit: int = Field(
        20,
        ge=1,
        le=100,
        description="Maximum number of results to return (1-100)"
    )
    offset: int = Field(
        0,
        ge=0,
        description="Number of results to skip for pagination"
    )
    sort_by: Optional[str] = Field(
        "updated_at",
        pattern="^(name|created_at|updated_at|status|priority)$",
        description="Field to sort by (name, created_at, updated_at, status, priority)"
    )
    sort_order: Optional[str] = Field(
        "desc",
        pattern="^(asc|desc)$",
        description="Sort order (asc or desc)"
    )
    
    @field_validator('search')
    @classmethod
    def validate_search(cls, v):
        """Validate search term"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Validate tags filter"""
        if v is not None:
            # Remove duplicates and empty tags
            cleaned_tags = list(set(tag.strip() for tag in v if tag and tag.strip()))
            if len(cleaned_tags) > 5:
                raise ValueError('Maximum 5 tags allowed for filtering')
            return cleaned_tags
        return v
    
    @model_validator(mode='after')
    def validate_date_ranges(self):
        """Validate date range filters"""
        if (self.created_after and self.created_before and 
            self.created_after >= self.created_before):
            raise ValueError('created_after must be before created_before')
        
        if (self.updated_after and self.updated_before and 
            self.updated_after >= self.updated_before):
            raise ValueError('updated_after must be before updated_before')
        
        return self


class ProjectDashboardData(BaseModel):
    """Model for project dashboard data with statistics and related information"""
    
    project: ProjectResponse = Field(..., description="Project details")
    
    # Statistics
    total_classifications: int = Field(
        0,
        ge=0,
        description="Number of device classifications"
    )
    total_predicates: int = Field(
        0,
        ge=0,
        description="Number of predicate devices found"
    )
    selected_predicates: int = Field(
        0,
        ge=0,
        description="Number of selected predicate devices"
    )
    total_interactions: int = Field(
        0,
        ge=0,
        description="Number of agent interactions"
    )
    total_documents: int = Field(
        0,
        ge=0,
        description="Number of uploaded documents"
    )
    
    # Recent activity
    recent_interactions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Recent agent interactions"
    )
    
    # Progress indicators
    classification_completed: bool = Field(
        False,
        description="Whether device classification is completed"
    )
    predicate_search_completed: bool = Field(
        False,
        description="Whether predicate search is completed"
    )
    predicate_analysis_completed: bool = Field(
        False,
        description="Whether predicate analysis is completed"
    )
    
    # Computed progress
    overall_progress: float = Field(
        0.0,
        ge=0.0,
        le=100.0,
        description="Overall project completion percentage"
    )
    
    class Config:
        from_attributes = True


class ProjectExportData(BaseModel):
    """Model for project export data"""
    
    project: ProjectResponse = Field(..., description="Project details")
    device_classifications: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Device classification data"
    )
    predicate_devices: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Predicate device data"
    )
    agent_interactions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Agent interaction history"
    )
    documents: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Project document metadata"
    )
    export_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Export metadata (timestamp, version, etc.)"
    )
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Response model for paginated project lists"""
    
    projects: List[ProjectResponse] = Field(
        default_factory=list,
        description="List of projects"
    )
    total_count: int = Field(
        0,
        ge=0,
        description="Total number of projects matching filters"
    )
    has_more: bool = Field(
        False,
        description="Whether there are more results available"
    )
    next_offset: Optional[int] = Field(
        None,
        description="Offset for next page of results"
    )
    
    class Config:
        from_attributes = True


class ProjectStatsResponse(BaseModel):
    """Response model for project statistics"""
    
    total_projects: int = Field(0, ge=0, description="Total number of projects")
    projects_by_status: Dict[str, int] = Field(
        default_factory=dict,
        description="Project count by status"
    )
    projects_by_priority: Dict[str, int] = Field(
        default_factory=dict,
        description="Project count by priority"
    )
    projects_by_device_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Project count by device type"
    )
    recent_activity_count: int = Field(
        0,
        ge=0,
        description="Number of recent activities"
    )
    completion_rate: float = Field(
        0.0,
        ge=0.0,
        le=100.0,
        description="Overall project completion rate percentage"
    )
    
    class Config:
        from_attributes = True