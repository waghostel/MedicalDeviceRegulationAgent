# API Documentation - Medical Device Regulatory Assistant

## Overview

This document provides comprehensive API documentation for the Medical Device Regulatory Assistant project management system. The API enables full CRUD operations for medical device regulatory projects with enhanced features including real-time updates, comprehensive export capabilities, and robust error handling.

## Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints require JWT authentication via Google OAuth 2.0.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow

1. User authenticates via Google OAuth 2.0
2. Backend validates Google token and issues JWT
3. JWT must be included in all API requests
4. JWT expires after 24 hours and must be refreshed

## API Endpoints

### Projects API (`/api/projects`)

#### Create Project

**POST** `/api/projects`

Creates a new medical device regulatory project.

**Request Body:**
```json
{
  "name": "Cardiac Monitoring Device",
  "description": "A wearable device for continuous cardiac rhythm monitoring",
  "device_type": "Cardiac Monitor",
  "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
  "priority": "high",
  "tags": ["cardiac", "wearable", "monitoring"]
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Cardiac Monitoring Device",
  "description": "A wearable device for continuous cardiac rhythm monitoring",
  "device_type": "Cardiac Monitor",
  "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
  "status": "draft",
  "priority": "high",
  "tags": ["cardiac", "wearable", "monitoring"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "progress_percentage": 0.0,
  "last_activity": null
}
```

**Validation Rules:**
- `name`: Required, 1-255 characters
- `description`: Optional, max 2000 characters
- `device_type`: Optional, max 255 characters
- `intended_use`: Optional, max 5000 characters
- `priority`: Optional, must be "high", "medium", or "low"
- `tags`: Optional array, max 10 items

#### List Projects

**GET** `/api/projects`

Retrieves a paginated list of projects with optional search and filtering.

**Query Parameters:**
- `search` (string, optional): Search in name, description, device_type
- `status` (string, optional): Filter by status (draft, in_progress, completed)
- `device_type` (string, optional): Filter by device type
- `limit` (integer, optional): Max results (1-100, default: 50)
- `offset` (integer, optional): Skip results (default: 0)

**Example Request:**
```http
GET /api/projects?search=cardiac&status=draft&limit=10&offset=0
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Cardiac Monitoring Device",
    "description": "A wearable device for continuous cardiac rhythm monitoring",
    "device_type": "Cardiac Monitor",
    "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
    "status": "draft",
    "priority": "high",
    "tags": ["cardiac", "wearable", "monitoring"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "progress_percentage": 15.5,
    "last_activity": "2024-01-15T14:22:00Z"
  }
]
```

#### Get Project Details

**GET** `/api/projects/{project_id}`

Retrieves detailed information about a specific project.

**Path Parameters:**
- `project_id` (integer): Project ID

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Cardiac Monitoring Device",
  "description": "A wearable device for continuous cardiac rhythm monitoring",
  "device_type": "Cardiac Monitor",
  "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
  "status": "in_progress",
  "priority": "high",
  "tags": ["cardiac", "wearable", "monitoring"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T09:15:00Z",
  "progress_percentage": 45.2,
  "last_activity": "2024-01-16T09:15:00Z"
}
```

#### Update Project

**PUT** `/api/projects/{project_id}`

Updates an existing project. Only provided fields will be updated.

**Path Parameters:**
- `project_id` (integer): Project ID

**Request Body:**
```json
{
  "name": "Advanced Cardiac Monitoring Device",
  "status": "in_progress",
  "priority": "high",
  "tags": ["cardiac", "wearable", "monitoring", "ai-powered"]
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Advanced Cardiac Monitoring Device",
  "description": "A wearable device for continuous cardiac rhythm monitoring",
  "device_type": "Cardiac Monitor",
  "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
  "status": "in_progress",
  "priority": "high",
  "tags": ["cardiac", "wearable", "monitoring", "ai-powered"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T11:45:00Z",
  "progress_percentage": 45.2,
  "last_activity": "2024-01-16T11:45:00Z"
}
```

#### Delete Project

**DELETE** `/api/projects/{project_id}`

Deletes a project and all associated data (classifications, predicates, documents, interactions).

**Path Parameters:**
- `project_id` (integer): Project ID

**Response (200 OK):**
```json
{
  "message": "Project deleted successfully"
}
```

#### Get Project Dashboard Data

**GET** `/api/projects/{project_id}/dashboard`

Retrieves aggregated dashboard data for a project.

**Path Parameters:**
- `project_id` (integer): Project ID

**Response (200 OK):**
```json
{
  "project": {
    "id": 1,
    "name": "Cardiac Monitoring Device",
    "status": "in_progress",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "classification_status": {
    "has_classification": true,
    "device_class": "II",
    "product_code": "DPS",
    "regulatory_pathway": "510k",
    "confidence_score": 0.92
  },
  "predicate_counts": {
    "total_predicates": 5,
    "selected_predicates": 2,
    "high_confidence_predicates": 3
  },
  "document_counts": {
    "total_documents": 8,
    "by_type": {
      "technical_specification": 3,
      "clinical_data": 2,
      "regulatory_submission": 3
    }
  },
  "completion_percentage": 67.5,
  "last_activity": "2024-01-16T14:30:00Z",
  "recent_interactions": [
    {
      "action": "predicate_search",
      "timestamp": "2024-01-16T14:30:00Z",
      "confidence_score": 0.89
    }
  ]
}
```

#### Export Project Data

**GET** `/api/projects/{project_id}/export`

Exports complete project data in various formats with validation and integrity checks.

**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `format_type` (string): Export format - "json", "pdf", or "csv" (default: "json")
- `include_validation` (boolean): Include validation metadata (default: true)
- `include_performance` (boolean): Include performance metrics (default: false)

**Example Requests:**
```http
GET /api/projects/1/export?format_type=json&include_validation=true
GET /api/projects/1/export?format_type=pdf
GET /api/projects/1/export?format_type=csv
```

**JSON Export Response (200 OK):**
```json
{
  "export_metadata": {
    "project_id": 1,
    "export_format": "json",
    "export_timestamp": "2024-01-16T15:00:00Z",
    "export_version": "1.0",
    "integrity_hash": "sha256:abc123...",
    "validation_status": "passed"
  },
  "project": {
    "id": 1,
    "name": "Cardiac Monitoring Device",
    "description": "A wearable device for continuous cardiac rhythm monitoring",
    "device_type": "Cardiac Monitor",
    "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
    "status": "in_progress",
    "priority": "high",
    "tags": ["cardiac", "wearable", "monitoring"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T09:15:00Z"
  },
  "classifications": [
    {
      "device_class": "II",
      "product_code": "DPS",
      "regulatory_pathway": "510k",
      "confidence_score": 0.92,
      "reasoning": "Device is substantially equivalent to existing cardiac monitors",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "predicates": [
    {
      "k_number": "K193456",
      "device_name": "CardioWatch Pro",
      "intended_use": "Continuous cardiac rhythm monitoring",
      "product_code": "DPS",
      "clearance_date": "2019-08-15",
      "confidence_score": 0.89,
      "is_selected": true,
      "comparison_data": {
        "similarities": ["Similar intended use", "Same product code"],
        "differences": ["Different materials", "Enhanced features"],
        "risk_assessment": "low",
        "testing_recommendations": ["Biocompatibility testing", "Software validation"]
      }
    }
  ],
  "documents": [
    {
      "filename": "technical_specifications.pdf",
      "document_type": "technical_specification",
      "file_size": 2048576,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ],
  "interactions": [
    {
      "agent_action": "device_classification",
      "input_data": {
        "device_description": "A wearable device for continuous cardiac rhythm monitoring"
      },
      "output_data": {
        "device_class": "II",
        "product_code": "DPS"
      },
      "confidence_score": 0.92,
      "reasoning": "Device classified based on intended use and risk profile",
      "execution_time_ms": 1500,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "validation": {
    "is_valid": true,
    "errors": [],
    "warnings": [],
    "validation_time_ms": 250,
    "validated_at": "2024-01-16T15:00:00Z"
  }
}
```

**PDF Export Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename=project_1_enhanced_report.pdf`
- Binary PDF data with formatted project report

**CSV Export Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename=project_1_export.csv`
- Structured CSV data with project information

#### Create Project Backup

**POST** `/api/projects/{project_id}/backup`

Creates a comprehensive backup of project data with integrity verification.

**Path Parameters:**
- `project_id` (integer): Project ID

**Query Parameters:**
- `backup_type` (string): "full" or "incremental" (default: "full")

**Response (200 OK):**
```json
{
  "success": true,
  "backup_id": "backup_20240116_150000_project_1",
  "backup_type": "full",
  "backup_timestamp": "2024-01-16T15:00:00Z",
  "backup_size_bytes": 1048576,
  "integrity_hash": "sha256:def456...",
  "backup_location": "/backups/projects/project_1_20240116_150000.json",
  "validation_status": "passed",
  "backup_metadata": {
    "project_id": 1,
    "project_name": "Cardiac Monitoring Device",
    "records_backed_up": {
      "project": 1,
      "classifications": 1,
      "predicates": 5,
      "documents": 8,
      "interactions": 12
    }
  }
}
```

#### Validate Export Data

**GET** `/api/projects/{project_id}/export/validate`

Validates project export data for integrity and completeness.

**Path Parameters:**
- `project_id` (integer): Project ID

**Response (200 OK):**
```json
{
  "project_id": 1,
  "validation_status": "passed",
  "errors": [],
  "warnings": [
    "Some predicate devices missing comparison data"
  ],
  "validation_time_ms": 150,
  "validated_at": "2024-01-16T15:30:00Z",
  "integrity_verified": true
}
```

## Error Responses

### Standard Error Format

All API errors follow a consistent format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data or validation errors
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Access denied to resource
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors in request data
- **500 Internal Server Error**: Server error

### Error Examples

**400 Bad Request - Validation Error:**
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "name": "Name is required and must be between 1 and 255 characters",
      "priority": "Priority must be one of: high, medium, low"
    }
  }
}
```

**404 Not Found - Project Not Found:**
```json
{
  "error": {
    "message": "Project with ID 999 not found",
    "code": "PROJECT_NOT_FOUND",
    "details": {
      "project_id": 999
    }
  }
}
```

**403 Forbidden - Access Denied:**
```json
{
  "error": {
    "message": "Access denied to project 1",
    "code": "PROJECT_ACCESS_DENIED",
    "details": {
      "project_id": 1,
      "user_id": "user_123"
    }
  }
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when rate limit resets

**429 Too Many Requests:**
```json
{
  "error": {
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retry_after": 3600
    }
  }
}
```

## WebSocket API

### Real-time Project Updates

**Connection**: `ws://localhost:8000/ws/projects/{project_id}`

**Authentication**: Include JWT token in connection headers or query parameter

**Message Format:**
```json
{
  "type": "project_updated",
  "data": {
    "project_id": 1,
    "changes": {
      "status": "in_progress",
      "updated_at": "2024-01-16T16:00:00Z"
    },
    "user_id": "user_123"
  }
}
```

**Event Types:**
- `project_updated`: Project data changed
- `project_deleted`: Project was deleted
- `classification_added`: New device classification
- `predicate_added`: New predicate device
- `document_uploaded`: New document added

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  }
});

// Create project
const createProject = async (projectData) => {
  try {
    const response = await api.post('/projects', projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', error.response.data);
    throw error;
  }
};

// List projects with search
const listProjects = async (search = '', limit = 50) => {
  try {
    const response = await api.get('/projects', {
      params: { search, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error listing projects:', error.response.data);
    throw error;
  }
};

// Export project
const exportProject = async (projectId, format = 'json') => {
  try {
    const response = await api.get(`/projects/${projectId}/export`, {
      params: { format_type: format },
      responseType: format === 'pdf' ? 'blob' : 'json'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting project:', error.response.data);
    throw error;
  }
};
```

### Python

```python
import requests
import json

class ProjectAPI:
    def __init__(self, base_url: str, jwt_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
    
    def create_project(self, project_data: dict):
        """Create a new project"""
        response = requests.post(
            f'{self.base_url}/projects',
            headers=self.headers,
            json=project_data
        )
        response.raise_for_status()
        return response.json()
    
    def list_projects(self, search: str = None, limit: int = 50):
        """List projects with optional search"""
        params = {'limit': limit}
        if search:
            params['search'] = search
        
        response = requests.get(
            f'{self.base_url}/projects',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def export_project(self, project_id: int, format_type: str = 'json'):
        """Export project data"""
        response = requests.get(
            f'{self.base_url}/projects/{project_id}/export',
            headers=self.headers,
            params={'format_type': format_type}
        )
        response.raise_for_status()
        
        if format_type == 'json':
            return response.json()
        else:
            return response.content

# Usage
api = ProjectAPI('http://localhost:8000/api', jwt_token)

# Create project
project = api.create_project({
    'name': 'Blood Glucose Meter',
    'device_type': 'Glucose Meter',
    'priority': 'medium'
})

# List projects
projects = api.list_projects(search='glucose')

# Export project
export_data = api.export_project(project['id'], 'json')
```

## Testing

### API Testing with curl

```bash
# Set JWT token
JWT_TOKEN="your_jwt_token_here"

# Create project
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device",
    "description": "Test description",
    "device_type": "Medical Device",
    "intended_use": "Test indication"
  }'

# List projects
curl -X GET "http://localhost:8000/api/projects?search=test&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get project details
curl -X GET http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $JWT_TOKEN"

# Update project
curl -X PUT http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }'

# Export project as JSON
curl -X GET "http://localhost:8000/api/projects/1/export?format_type=json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -o project_export.json

# Delete project
curl -X DELETE http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Changelog

### Version 1.0.0 (2024-01-16)
- Initial API release
- Complete CRUD operations for projects
- Enhanced export functionality with validation
- Real-time WebSocket updates
- Comprehensive error handling
- Rate limiting implementation
- Backup and restore capabilities

---

For additional support or questions, please refer to the [User Guide](../user-guide/README.md) or [Developer Documentation](../developer/README.md).