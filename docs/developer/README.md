# Developer Documentation - Medical Device Regulatory Assistant

## Overview

This documentation provides comprehensive guidance for developers working on the Medical Device Regulatory Assistant project. It covers the enhanced project management system, mock data configuration, testing strategies, and troubleshooting procedures.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Mock Data Configuration](#mock-data-configuration)
4. [Database Schema and Models](#database-schema-and-models)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Testing Framework](#testing-framework)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling](#error-handling)
10. [Deployment and CI/CD](#deployment-and-cicd)
11. [Troubleshooting Guide](#troubleshooting-guide)

## Architecture Overview

### System Architecture

The Medical Device Regulatory Assistant follows a modern full-stack architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Next.js   │ │   React     │ │    Shadcn UI        │   │
│  │   App       │ │ Components  │ │   Components        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   FastAPI   │ │ Middleware  │ │   Authentication    │   │
│  │   Router    │ │   Layer     │ │      (JWT)          │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Project   │ │    Cache    │ │     WebSocket       │   │
│  │   Service   │ │  (Redis)    │ │     Manager         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ SQLAlchemy  │ │   SQLite    │ │    Database         │   │
│  │   Models    │ │  Database   │ │     Seeder          │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- **Next.js 14**: React framework with App Router
- **React 18**: UI library with hooks and context
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Component library
- **Zustand**: State management

**Backend**:
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation and serialization
- **SQLite**: Database for development
- **Redis**: Caching and session management
- **WebSocket**: Real-time communication

**Development Tools**:
- **Poetry**: Python dependency management
- **pnpm**: Node.js package manager
- **Jest**: JavaScript testing framework
- **pytest**: Python testing framework
- **ESLint**: JavaScript linting
- **Black**: Python code formatting

## Development Environment Setup

### Prerequisites

```bash
# Required software
- Python 3.11+
- Node.js 18+
- Git
- Docker (optional)
```

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd medical-device-regulatory-assistant/backend
```

2. **Install Poetry** (if not already installed):
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

3. **Install dependencies**:
```bash
poetry install
```

4. **Set up environment variables**:
```bash
cp .env.example .env.development
# Edit .env.development with your configuration
```

5. **Initialize database**:
```bash
poetry run python -m alembic upgrade head
```

6. **Seed database with mock data**:
```bash
poetry run python database/integrated_seeder.py --config mock_data/comprehensive_mock_data_config.json
```

7. **Start development server**:
```bash
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd medical-device-regulatory-assistant
```

2. **Install dependencies**:
```bash
pnpm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Start development server**:
```bash
pnpm dev
```

### Development Workflow

1. **Start both servers**:
```bash
# Terminal 1 - Backend
cd medical-device-regulatory-assistant/backend
poetry run uvicorn main:app --reload

# Terminal 2 - Frontend
cd medical-device-regulatory-assistant
pnpm dev
```

2. **Access application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Mock Data Configuration

### JSON Configuration System

The system uses JSON configuration files to define mock data for development and testing.

### Configuration File Structure

```json
{
  "users": [
    {
      "google_id": "user_123456789",
      "email": "john.doe@medtech.com",
      "name": "John Doe",
      "avatar_url": "https://example.com/avatar1.jpg"
    }
  ],
  "projects": [
    {
      "name": "Cardiac Monitoring Device",
      "description": "A wearable device for continuous cardiac rhythm monitoring",
      "device_type": "Cardiac Monitor",
      "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
      "status": "in_progress",
      "priority": "high",
      "tags": ["cardiac", "wearable", "monitoring"],
      "user_email": "john.doe@medtech.com"
    }
  ],
  "device_classifications": [
    {
      "project_name": "Cardiac Monitoring Device",
      "device_class": "II",
      "product_code": "DPS",
      "regulatory_pathway": "510k",
      "confidence_score": 0.92,
      "reasoning": "Device is substantially equivalent to existing cardiac monitors"
    }
  ],
  "predicate_devices": [
    {
      "project_name": "Cardiac Monitoring Device",
      "k_number": "K193456",
      "device_name": "CardioWatch Pro",
      "intended_use": "Continuous cardiac rhythm monitoring",
      "product_code": "DPS",
      "clearance_date": "2019-08-15",
      "confidence_score": 0.89,
      "is_selected": true
    }
  ]
}
```

### Available Configuration Files

Located in `medical-device-regulatory-assistant/backend/mock_data/`:

1. **comprehensive_mock_data_config.json**: Full dataset with multiple projects and relationships
2. **minimal_test_config.json**: Minimal dataset for basic testing
3. **performance_test_config.json**: Large dataset for performance testing
4. **edge_cases_mock_data_config.json**: Edge cases and error scenarios
5. **production_seed_config.json**: Production-ready sample data

### Using the Database Seeder

**Basic Usage**:
```bash
# Clear database and seed with comprehensive data
poetry run python database/integrated_seeder.py --config mock_data/comprehensive_mock_data_config.json --clear

# Add incremental data without clearing
poetry run python database/integrated_seeder.py --config mock_data/additional_data.json

# Clear database only
poetry run python database/integrated_seeder.py --clear-only
```

**Advanced Options**:
```bash
# Seed with validation
poetry run python database/integrated_seeder.py \
  --config mock_data/comprehensive_mock_data_config.json \
  --validate \
  --verbose

# Seed specific environment
poetry run python database/integrated_seeder.py \
  --config mock_data/production_seed_config.json \
  --environment production
```

### Creating Custom Mock Data

1. **Create configuration file**:
```bash
cp mock_data/sample_mock_data_config.json mock_data/my_custom_config.json
```

2. **Edit configuration**:
```json
{
  "users": [
    {
      "google_id": "custom_user_001",
      "email": "developer@company.com",
      "name": "Developer User",
      "avatar_url": null
    }
  ],
  "projects": [
    {
      "name": "My Test Project",
      "description": "Custom project for testing",
      "device_type": "Test Device",
      "intended_use": "For testing purposes only",
      "status": "draft",
      "priority": "low",
      "tags": ["test", "development"],
      "user_email": "developer@company.com"
    }
  ]
}
```

3. **Validate configuration**:
```bash
poetry run python mock_data/validate_config.py my_custom_config.json
```

4. **Seed database**:
```bash
poetry run python database/integrated_seeder.py --config mock_data/my_custom_config.json
```

### Configuration Validation

The system includes JSON schema validation:

```bash
# Validate configuration file
poetry run python mock_data/validate_config.py mock_data/my_config.json

# Validate all configuration files
poetry run python mock_data/validate_config.py --all

# Generate schema documentation
poetry run python mock_data/validate_config.py --generate-docs
```

## Database Schema and Models

### Core Models

#### Project Model

```python
class Project(Base):
    __tablename__ = "projects"
    
    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Foreign keys
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    
    # Core fields
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    intended_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    
    # Enhanced fields
    priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON object
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    device_classifications: Mapped[List["DeviceClassification"]] = relationship(
        "DeviceClassification", back_populates="project", cascade="all, delete-orphan"
    )
    predicate_devices: Mapped[List["PredicateDevice"]] = relationship(
        "PredicateDevice", back_populates="project", cascade="all, delete-orphan"
    )
    agent_interactions: Mapped[List["AgentInteraction"]] = relationship(
        "AgentInteraction", back_populates="project", cascade="all, delete-orphan"
    )
    documents: Mapped[List["ProjectDocument"]] = relationship(
        "ProjectDocument", back_populates="project", cascade="all, delete-orphan"
    )
```

#### User Model

```python
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    google_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")
```

### Database Migrations

**Create Migration**:
```bash
poetry run alembic revision --autogenerate -m "Add enhanced project fields"
```

**Apply Migrations**:
```bash
poetry run alembic upgrade head
```

**Rollback Migration**:
```bash
poetry run alembic downgrade -1
```

**Migration History**:
```bash
poetry run alembic history
```

### Database Indexes

Key indexes for performance:

```sql
-- User lookup indexes
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- Project lookup indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_device_type ON projects(device_type);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Search indexes
CREATE INDEX idx_projects_name_search ON projects(name);
CREATE INDEX idx_projects_description_search ON projects(description);

-- Relationship indexes
CREATE INDEX idx_device_classifications_project_id ON device_classifications(project_id);
CREATE INDEX idx_predicate_devices_project_id ON predicate_devices(project_id);
CREATE INDEX idx_agent_interactions_project_id ON agent_interactions(project_id);
```

## API Development

### Service Layer Architecture

```python
class ProjectService:
    """Enhanced service class for project management operations"""
    
    def __init__(self):
        self.db_manager = get_database_manager()
        self.cache = get_cache_manager()
        self.websocket_manager = get_websocket_manager()
    
    async def create_project(self, project_data: ProjectCreateRequest, user_id: str) -> ProjectResponse:
        """Create a new project with validation and caching"""
        async with self.db_manager.get_session() as session:
            # Validate user exists
            user = await self._get_user_by_id(session, user_id)
            if not user:
                raise UserNotFoundError(user_id)
            
            # Create project
            project = Project(
                user_id=user.id,
                name=project_data.name,
                description=project_data.description,
                device_type=project_data.device_type,
                intended_use=project_data.intended_use,
                priority=project_data.priority,
                tags=json.dumps(project_data.tags) if project_data.tags else None
            )
            
            session.add(project)
            await session.commit()
            await session.refresh(project)
            
            # Cache the project
            await self.cache.set_project(project.id, project)
            
            # Notify via WebSocket
            await self.websocket_manager.broadcast_project_created(project)
            
            return ProjectResponse.from_orm(project)
```

### Error Handling

```python
class ProjectError(Exception):
    """Base exception for project-related errors"""
    def __init__(self, message: str, code: str = None, details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

class ProjectNotFoundError(ProjectError):
    """Project not found error"""
    def __init__(self, project_id: int):
        super().__init__(
            f"Project with ID {project_id} not found",
            code="PROJECT_NOT_FOUND",
            details={"project_id": project_id}
        )

# Global exception handlers
@app.exception_handler(ProjectNotFoundError)
async def project_not_found_handler(request: Request, exc: ProjectNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "message": exc.message,
                "code": exc.code,
                "details": exc.details
            }
        }
    )
```

### API Validation

```python
class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=2000, description="Project description")
    device_type: Optional[str] = Field(None, max_length=255, description="Type of medical device")
    intended_use: Optional[str] = Field(None, max_length=5000, description="Clinical indication")
    priority: Optional[str] = Field(None, pattern="^(high|medium|low)$", description="Project priority")
    tags: Optional[List[str]] = Field(None, max_items=10, description="Project tags")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            for tag in v:
                if len(tag) > 50:
                    raise ValueError('Tag length must not exceed 50 characters')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Cardiac Monitoring Device",
                "description": "A wearable device for continuous cardiac rhythm monitoring",
                "device_type": "Cardiac Monitor",
                "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
                "priority": "high",
                "tags": ["cardiac", "wearable", "monitoring"]
            }
        }
```

## Frontend Development

### Component Architecture

```typescript
// Enhanced Project List Component
interface ProjectListProps {
  onCreateProject?: () => void;
  onSelectProject?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  className?: string;
}

export function ProjectList({ onCreateProject, onSelectProject, onEditProject, className }: ProjectListProps) {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ProjectSearchFilters>({});
  
  // Real-time updates via WebSocket
  useWebSocket('/ws/projects', {
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'project_updated') {
        // Handle real-time project updates
        handleProjectUpdate(data.project);
      }
    }
  });
  
  // Optimistic updates
  const handleCreateProject = async (projectData: ProjectCreateRequest) => {
    const tempId = Date.now();
    const optimisticProject = { ...projectData, id: tempId, status: 'draft' };
    
    // Add optimistic project to UI
    addOptimisticProject(optimisticProject);
    
    try {
      const createdProject = await createProject(projectData);
      // Replace optimistic project with real project
      replaceOptimisticProject(tempId, createdProject);
    } catch (error) {
      // Remove optimistic project on error
      removeOptimisticProject(tempId);
      showError('Failed to create project');
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      <ProjectSearchBar 
        value={searchTerm}
        onChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <ProjectGrid 
        projects={projects}
        loading={loading}
        error={error}
        onSelect={onSelectProject}
        onEdit={onEditProject}
        onDelete={deleteProject}
      />
      
      <ProjectPagination 
        currentPage={filters.page || 1}
        totalPages={Math.ceil(totalCount / (filters.limit || 50))}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </div>
  );
}
```

### State Management

```typescript
// Zustand store for project management
interface ProjectStore {
  projects: Project[];
  loading: boolean;
  error: string | null;
  filters: ProjectSearchFilters;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: number, updates: Partial<Project>) => void;
  removeProject: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: ProjectSearchFilters) => void;
  
  // Async actions
  fetchProjects: () => Promise<void>;
  createProject: (data: ProjectCreateRequest) => Promise<Project>;
  updateProjectAsync: (id: number, data: ProjectUpdateRequest) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  filters: {},
  
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project] 
  })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  removeProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set({ filters }),
  
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const projects = await projectApi.listProjects(filters);
      set({ projects, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  createProject: async (data) => {
    try {
      const project = await projectApi.createProject(data);
      get().addProject(project);
      return project;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateProjectAsync: async (id, data) => {
    try {
      const project = await projectApi.updateProject(id, data);
      get().updateProject(id, project);
      return project;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteProject: async (id) => {
    try {
      await projectApi.deleteProject(id);
      get().removeProject(id);
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  }
}));
```

### Custom Hooks

```typescript
// Enhanced useProjects hook with optimistic updates
export function useProjects() {
  const store = useProjectStore();
  const [optimisticProjects, setOptimisticProjects] = useState<Project[]>([]);
  
  // Combine real and optimistic projects
  const allProjects = useMemo(() => {
    return [...store.projects, ...optimisticProjects];
  }, [store.projects, optimisticProjects]);
  
  const addOptimisticProject = useCallback((project: Project) => {
    setOptimisticProjects(prev => [...prev, project]);
  }, []);
  
  const removeOptimisticProject = useCallback((id: number) => {
    setOptimisticProjects(prev => prev.filter(p => p.id !== id));
  }, []);
  
  const replaceOptimisticProject = useCallback((tempId: number, realProject: Project) => {
    setOptimisticProjects(prev => prev.filter(p => p.id !== tempId));
    store.addProject(realProject);
  }, [store]);
  
  return {
    projects: allProjects,
    loading: store.loading,
    error: store.error,
    filters: store.filters,
    
    // Actions
    fetchProjects: store.fetchProjects,
    createProject: store.createProject,
    updateProject: store.updateProjectAsync,
    deleteProject: store.deleteProject,
    setFilters: store.setFilters,
    
    // Optimistic update helpers
    addOptimisticProject,
    removeOptimisticProject,
    replaceOptimisticProject
  };
}
```

## Testing Framework

### Backend Testing

**Unit Tests**:
```python
# test_project_service.py
import pytest
from unittest.mock import AsyncMock, patch
from services.projects import ProjectService, ProjectCreateRequest

@pytest.mark.asyncio
async def test_create_project_success():
    """Test successful project creation"""
    service = ProjectService()
    project_data = ProjectCreateRequest(
        name="Test Project",
        description="Test description",
        device_type="Medical Device",
        intended_use="Test indication"
    )
    
    with patch.object(service, '_get_user_by_id') as mock_get_user:
        mock_user = AsyncMock()
        mock_user.id = 1
        mock_get_user.return_value = mock_user
        
        project = await service.create_project(project_data, "test_user_id")
        
        assert project.name == "Test Project"
        assert project.description == "Test description"
        assert project.status == "draft"

@pytest.mark.asyncio
async def test_create_project_user_not_found():
    """Test project creation with non-existent user"""
    service = ProjectService()
    project_data = ProjectCreateRequest(name="Test Project")
    
    with patch.object(service, '_get_user_by_id') as mock_get_user:
        mock_get_user.return_value = None
        
        with pytest.raises(UserNotFoundError):
            await service.create_project(project_data, "invalid_user_id")
```

**Integration Tests**:
```python
# test_project_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_project_endpoint(auth_headers):
    """Test project creation endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        project_data = {
            "name": "Test Project",
            "description": "Test description",
            "device_type": "Medical Device",
            "intended_use": "Test indication"
        }
        
        response = await client.post(
            "/api/projects",
            json=project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["status"] == "draft"

@pytest.mark.asyncio
async def test_list_projects_with_search(auth_headers):
    """Test project listing with search"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/projects?search=test&limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
```

### Frontend Testing

**Component Tests**:
```typescript
// ProjectList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectList } from './ProjectList';
import { ProjectProvider } from '../contexts/ProjectContext';

const mockProjects = [
  {
    id: 1,
    name: 'Test Project',
    description: 'Test description',
    status: 'draft',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  }
];

describe('ProjectList Component', () => {
  it('should render projects correctly', async () => {
    render(
      <ProjectProvider mockData={mockProjects}>
        <ProjectList />
      </ProjectProvider>
    );
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
  
  it('should handle project creation', async () => {
    const mockCreateProject = jest.fn();
    
    render(
      <ProjectProvider mockCreateProject={mockCreateProject}>
        <ProjectList onCreateProject={mockCreateProject} />
      </ProjectProvider>
    );
    
    fireEvent.click(screen.getByText('New Project'));
    expect(mockCreateProject).toHaveBeenCalled();
  });
  
  it('should handle search functionality', async () => {
    render(
      <ProjectProvider mockData={mockProjects}>
        <ProjectList />
      </ProjectProvider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
});
```

**Hook Tests**:
```typescript
// useProjects.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useProjects } from './useProjects';
import { ProjectProvider } from '../contexts/ProjectContext';

describe('useProjects Hook', () => {
  it('should load projects on mount', async () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: ProjectProvider
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.projects).toHaveLength(1);
  });
  
  it('should handle project creation with optimistic updates', async () => {
    const { result } = renderHook(() => useProjects());
    
    await act(async () => {
      const project = await result.current.createProject({
        name: 'New Project',
        description: 'Test description'
      });
      expect(project).toBeDefined();
    });
    
    expect(result.current.projects).toContainEqual(
      expect.objectContaining({ name: 'New Project' })
    );
  });
});
```

### Test Configuration

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Pytest Configuration** (`pyproject.toml`):
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "--cov=.",
    "--cov-report=html",
    "--cov-report=term-missing",
    "--cov-fail-under=80"
]
markers = [
    "asyncio: mark test as async",
    "integration: mark test as integration test",
    "unit: mark test as unit test"
]
```

### Running Tests

**Backend Tests**:
```bash
# Run all tests
poetry run python -m pytest tests/ -v

# Run specific test file
poetry run python -m pytest tests/test_project_service.py -v

# Run with coverage
poetry run python -m pytest tests/ --cov=. --cov-report=html

# Run integration tests only
poetry run python -m pytest tests/ -m integration

# Run tests in parallel
poetry run python -m pytest tests/ -n auto
```

**Frontend Tests**:
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test ProjectList.test.tsx

# Run tests in CI mode
pnpm test:ci
```

## Performance Optimization

### Backend Optimization

**Database Query Optimization**:
```python
# Efficient project loading with relationships
async def get_projects_with_relationships(user_id: str, filters: ProjectSearchFilters):
    query = (
        select(Project)
        .options(
            selectinload(Project.device_classifications),
            selectinload(Project.predicate_devices),
            selectinload(Project.documents)
        )
        .where(Project.user_id == user_id)
    )
    
    # Apply filters
    if filters.search:
        query = query.where(
            or_(
                Project.name.ilike(f"%{filters.search}%"),
                Project.description.ilike(f"%{filters.search}%"),
                Project.device_type.ilike(f"%{filters.search}%")
            )
        )
    
    if filters.status:
        query = query.where(Project.status == filters.status)
    
    # Apply pagination
    query = query.offset(filters.offset).limit(filters.limit)
    
    return await session.execute(query)
```

**Caching Strategy**:
```python
class ProjectCache:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour
    
    async def get_project(self, project_id: int) -> Optional[Project]:
        """Get cached project"""
        cached = await self.redis.get(f"project:{project_id}")
        if cached:
            return Project.parse_raw(cached)
        return None
    
    async def set_project(self, project_id: int, project: Project):
        """Cache project"""
        await self.redis.setex(
            f"project:{project_id}",
            self.default_ttl,
            project.json()
        )
    
    async def invalidate_project(self, project_id: int):
        """Remove project from cache"""
        await self.redis.delete(f"project:{project_id}")
    
    async def get_user_projects(self, user_id: str) -> Optional[List[Project]]:
        """Get cached user projects"""
        cached = await self.redis.get(f"user_projects:{user_id}")
        if cached:
            return [Project.parse_raw(p) for p in json.loads(cached)]
        return None
```

### Frontend Optimization

**Component Optimization**:
```typescript
// Memoized project card component
const ProjectCard = memo(({ project, onEdit, onDelete }: ProjectCardProps) => {
  const handleEdit = useCallback(() => {
    onEdit(project);
  }, [project, onEdit]);
  
  const handleDelete = useCallback(async () => {
    await onDelete(project.id);
  }, [project.id, onDelete]);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <Badge variant={getStatusVariant(project.status)}>
          {project.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {project.description}
        </p>
        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
```

**Virtual Scrolling**:
```typescript
// Virtual scrolling for large project lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedProjectList = ({ projects, onSelectProject }: VirtualizedProjectListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ProjectCard 
        project={projects[index]} 
        onSelect={onSelectProject}
      />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={projects.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

**Bundle Optimization**:
```typescript
// Dynamic imports for code splitting
const ProjectForm = lazy(() => import('./ProjectForm'));
const ProjectExport = lazy(() => import('./ProjectExport'));

// Usage with Suspense
<Suspense fallback={<ProjectFormSkeleton />}>
  <ProjectForm project={selectedProject} />
</Suspense>
```

## Error Handling

### Comprehensive Error Strategy

**Error Types**:
```typescript
// Frontend error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: Date;
  retryable: boolean;
}
```

**Error Boundary**:
```typescript
class ProjectErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Project error boundary caught an error:', error, errorInfo);
    
    // Send to error reporting service
    errorReportingService.captureException(error, {
      extra: errorInfo,
      tags: { component: 'ProjectErrorBoundary' }
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    
    return this.props.children;
  }
}
```

**Error Recovery**:
```typescript
// Retry mechanism for failed operations
const useRetryableOperation = <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        setIsLoading(false);
        return result;
      } catch (err) {
        if (attempt === maxRetries) {
          setError(err as Error);
          setIsLoading(false);
          return null;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
    
    return null;
  }, [operation, maxRetries, delay]);
  
  return { execute, isLoading, error };
};
```

## Deployment and CI/CD

### Docker Configuration

**Backend Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev

# Copy application code
COPY . .

# Run migrations and start server
CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Install production dependencies
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///app/data/app.db
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
  
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install Poetry
      uses: snok/install-poetry@v1
    
    - name: Install dependencies
      run: |
        cd backend
        poetry install
    
    - name: Run tests
      run: |
        cd backend
        poetry run pytest tests/ --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
  
  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Run tests
      run: pnpm test:ci
    
    - name: Build application
      run: pnpm build
  
  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        # Add deployment steps here
        echo "Deploying to production..."
```

## Troubleshooting Guide

### Common Development Issues

**Database Connection Issues**:
```bash
# Check database file permissions
ls -la medical_device_assistant.db

# Reset database
poetry run alembic downgrade base
poetry run alembic upgrade head

# Reseed database
poetry run python database/integrated_seeder.py --config mock_data/comprehensive_mock_data_config.json --clear
```

**Frontend Build Issues**:
```bash
# Clear Next.js cache
pnpm clean
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript errors
pnpm type-check
```

**API Connection Issues**:
```bash
# Check backend server status
curl http://localhost:8000/health

# Check API endpoints
curl http://localhost:8000/docs

# Verify authentication
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/projects
```

### Performance Issues

**Slow Database Queries**:
```sql
-- Check query performance
EXPLAIN QUERY PLAN SELECT * FROM projects WHERE user_id = 1;

-- Add missing indexes
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
```

**Memory Leaks**:
```bash
# Monitor memory usage
poetry run python -m memory_profiler backend/main.py

# Check for unclosed database connections
poetry run python -c "
from database.connection import get_database_manager
import asyncio
async def check_connections():
    db = get_database_manager()
    print(f'Active connections: {db.pool.size}')
asyncio.run(check_connections())
"
```

### Testing Issues

**Test Database Setup**:
```python
# conftest.py
@pytest.fixture
async def test_db():
    # Create test database
    test_db_url = "sqlite:///test.db"
    engine = create_async_engine(test_db_url)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    os.remove("test.db")
```

**Mock Data Issues**:
```bash
# Validate mock data configuration
poetry run python mock_data/validate_config.py mock_data/test_config.json

# Check seeder logs
poetry run python database/integrated_seeder.py --config mock_data/test_config.json --verbose
```

### Production Issues

**Monitoring and Logging**:
```python
# Add structured logging
import structlog

logger = structlog.get_logger()

@router.post("/projects")
async def create_project(project_data: ProjectCreateRequest):
    logger.info("Creating project", project_name=project_data.name, user_id=current_user.sub)
    try:
        project = await project_service.create_project(project_data, current_user.sub)
        logger.info("Project created successfully", project_id=project.id)
        return project
    except Exception as e:
        logger.error("Project creation failed", error=str(e), project_name=project_data.name)
        raise
```

**Health Checks**:
```python
@router.get("/health")
async def health_check():
    checks = {
        "database": await check_database_connection(),
        "redis": await check_redis_connection(),
        "disk_space": check_disk_space(),
        "memory": check_memory_usage()
    }
    
    healthy = all(checks.values())
    status_code = 200 if healthy else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

### Getting Help

**Documentation Resources**:
- [API Documentation](../api/README.md)
- [User Guide](../user-guide/README.md)
- [Troubleshooting Guide](../troubleshooting/README.md)

**Development Support**:
- GitHub Issues: Report bugs and feature requests
- Development Chat: Join the development Slack channel
- Code Reviews: Submit pull requests for review

**Emergency Contacts**:
- Production Issues: ops@medicaldeviceassistant.com
- Security Issues: security@medicaldeviceassistant.com
- General Support: dev-support@medicaldeviceassistant.com

---

This developer documentation provides comprehensive guidance for working with the Medical Device Regulatory Assistant project management system. For additional technical details, refer to the inline code documentation and API specifications.