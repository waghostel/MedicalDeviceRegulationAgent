# MVP Development Roadmap - Design Document

## Overview

This design document outlines the technical architecture and implementation strategy for the Medical Device Regulatory Assistant MVP, following a frontend-first development approach. The system is designed to provide regulatory affairs managers with an AI-powered platform for efficient 510(k) predicate search and device classification workflows.

## Architecture

### Frontend-First Development Strategy

The development follows a progressive enhancement approach:

1. **Static UI Layer**: Build all core pages with mock data and static components
2. **Interactive Layer**: Add state management, routing, and user interactions
3. **Integration Layer**: Connect to backend APIs and real data sources
4. **AI Enhancement Layer**: Integrate LangGraph agents and CopilotKit functionality

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Project   │  │ Regulatory  │  │   Agent     │         │
│  │     Hub     │  │ Dashboard   │  │  Workflow   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Markdown   │  │ Quick       │  │  Citation   │         │
│  │   Editor    │  │ Actions     │  │   Panel     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 API Layer (Next.js API Routes)              │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services (FastAPI)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  LangGraph  │  │   openFDA   │  │  Document   │         │
│  │   Agents    │  │ Integration │  │ Processing  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   SQLite    │  │  Markdown   │  │    JSON     │         │
│  │  Database   │  │    Files    │  │ Structured  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Component Architecture

#### 1. Core Layout Components

```typescript
// Layout structure
interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showQuickActions?: boolean;
}

// Main application shell
const AppLayout: React.FC<LayoutProps> = ({ children, showSidebar, showQuickActions }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 p-6">
          {children}
        </main>
        {showQuickActions && <QuickActionsPanel />}
      </div>
    </div>
  );
};
```

#### 2. Project Management Components

```typescript
// Project Hub interface
interface Project {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  intendedUse: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Project card component
const ProjectCard: React.FC<{ project: Project; onSelect: (id: string) => void }> = ({
  project,
  onSelect
}) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{project.description}</p>
        <p className="text-xs mt-2">Device Type: {project.deviceType}</p>
      </CardContent>
    </Card>
  );
};
```

#### 3. Regulatory Dashboard Components

```typescript
// Dashboard widget interface
interface DashboardWidget {
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  data?: any;
  confidence?: number;
}

// Classification status widget
const ClassificationWidget: React.FC<{ classification?: DeviceClassification }> = ({
  classification
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Device Classification
          {classification && <Badge variant="default">Class {classification.deviceClass}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {classification ? (
          <div className="space-y-2">
            <p><strong>Product Code:</strong> {classification.productCode}</p>
            <p><strong>Regulatory Pathway:</strong> {classification.pathway}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Confidence:</span>
              <Progress value={classification.confidence * 100} className="flex-1" />
              <span className="text-sm">{Math.round(classification.confidence * 100)}%</span>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full">
            Start Classification
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 4. Agent Workflow Components

```typescript
// CopilotKit integration
import { CopilotKit, CopilotChat } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

const AgentWorkflowPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <div className="flex h-screen">
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-4">Regulatory Assistant</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SlashCommandCard command="/predicate-search" description="Find similar predicate devices" />
            <SlashCommandCard command="/classify-device" description="Determine device classification" />
            <SlashCommandCard command="/compare-predicate" description="Compare with predicate device" />
            <SlashCommandCard command="/find-guidance" description="Search FDA guidance documents" />
          </div>
        </div>
        <CopilotSidebar
          instructions="You are a specialized FDA regulatory assistant. Help users with 510(k) predicate searches, device classification, and regulatory guidance."
          defaultOpen={true}
        />
      </div>
    </CopilotKit>
  );
};
```

### Backend Service Architecture

#### 1. FastAPI Service Structure

```python
# Main FastAPI application
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.services.auth import get_current_user
from backend.services.projects import ProjectService
from backend.agents.regulatory_agent import RegulatoryAgent

app = FastAPI(title="Medical Device Regulatory Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project management endpoints
@app.post("/api/projects")
async def create_project(
    project_data: ProjectCreateRequest,
    user = Depends(get_current_user)
):
    service = ProjectService()
    return await service.create_project(project_data, user.id)

@app.get("/api/projects/{project_id}/dashboard")
async def get_project_dashboard(
    project_id: str,
    user = Depends(get_current_user)
):
    service = ProjectService()
    return await service.get_dashboard_data(project_id, user.id)
```

#### 2. LangGraph Agent Implementation

```python
from langgraph import StateGraph, END
from langchain.tools import BaseTool
from typing import Dict, Any, List

class RegulatoryAgentState:
    project_id: str
    device_description: str
    intended_use: str
    current_task: str
    results: Dict[str, Any]
    confidence_scores: Dict[str, float]
    sources: List[Dict[str, str]]

class PredicateSearchAgent:
    def __init__(self):
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(RegulatoryAgentState)
        
        # Add nodes
        workflow.add_node("classify_device", self._classify_device)
        workflow.add_node("search_predicates", self._search_predicates)
        workflow.add_node("analyze_predicates", self._analyze_predicates)
        workflow.add_node("generate_report", self._generate_report)
        
        # Add edges
        workflow.add_edge("classify_device", "search_predicates")
        workflow.add_edge("search_predicates", "analyze_predicates")
        workflow.add_edge("analyze_predicates", "generate_report")
        workflow.add_edge("generate_report", END)
        
        workflow.set_entry_point("classify_device")
        
        return workflow.compile()
    
    async def _classify_device(self, state: RegulatoryAgentState) -> RegulatoryAgentState:
        # Device classification logic
        classification_tool = DeviceClassificationTool()
        result = await classification_tool.arun(
            device_description=state.device_description,
            intended_use=state.intended_use
        )
        
        state.results["classification"] = result
        state.confidence_scores["classification"] = result["confidence"]
        state.sources.extend(result["sources"])
        
        return state
```

#### 3. openFDA Integration Service

```python
import aiohttp
import asyncio
from typing import List, Dict, Optional
from dataclasses import dataclass
from backend.models.fda_models import FDASearchResult

class OpenFDAService:
    def __init__(self):
        self.base_url = "https://api.fda.gov/device/510k.json"
        self.rate_limiter = AsyncRateLimiter(240, 60)  # 240 requests per minute
    
    async def search_predicates(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        device_class: Optional[str] = None,
        limit: int = 100
    ) -> List[FDASearchResult]:
        """
        Search for predicate devices with advanced filtering
        """
        await self.rate_limiter.acquire()
        
        # Build search query
        query_parts = []
        for term in search_terms:
            query_parts.append(f'device_name:"{term}" OR statement_or_summary:"{term}"')
        
        if product_code:
            query_parts.append(f'product_code:"{product_code}"')
        
        if device_class:
            query_parts.append(f'device_class:"{device_class}"')
        
        query = " AND ".join(f"({part})" for part in query_parts)
        
        params = {
            "search": query,
            "limit": limit,
            "sort": "date_received:desc"
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_search_results(data)
                    else:
                        raise FDAAPIError(f"API request failed: {response.status}")
            except aiohttp.ClientError as e:
                raise FDAAPIError(f"Network error: {str(e)}")
    
    def _parse_search_results(self, data: Dict) -> List[FDASearchResult]:
        """
        Parse FDA API response into structured results
        """
        results = []
        for item in data.get("results", []):
            result = FDASearchResult(
                k_number=item.get("k_number", ""),
                device_name=item.get("device_name", ""),
                intended_use=item.get("statement_or_summary", ""),
                product_code=item.get("product_code", ""),
                clearance_date=item.get("date_received", ""),
                confidence_score=0.0  # Will be calculated by similarity analysis
            )
            results.append(result)
        
        return results
```

## Data Models

### Database Schema (SQLite)

```sql
-- Enhanced schema with additional tables for MVP
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    device_type TEXT,
    intended_use TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    device_class TEXT,
    product_code TEXT,
    regulatory_pathway TEXT,
    cfr_sections JSON,
    confidence_score REAL,
    reasoning TEXT,
    sources JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predicate_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    k_number TEXT NOT NULL,
    device_name TEXT,
    intended_use TEXT,
    product_code TEXT,
    clearance_date DATE,
    confidence_score REAL,
    comparison_data JSON,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    agent_action TEXT NOT NULL,
    input_data JSON,
    output_data JSON,
    confidence_score REAL,
    sources JSON,
    reasoning TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    document_type TEXT,
    content_markdown TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Interfaces

```typescript
// Core data models
export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  deviceType: string;
  intendedUse: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceClassification {
  id: string;
  projectId: string;
  deviceClass: 'I' | 'II' | 'III';
  productCode: string;
  regulatoryPathway: '510k' | 'PMA' | 'De Novo';
  cfrSections: string[];
  confidenceScore: number;
  reasoning: string;
  sources: SourceCitation[];
  createdAt: Date;
}

export interface PredicateDevice {
  id: string;
  projectId: string;
  kNumber: string;
  deviceName: string;
  intendedUse: string;
  productCode: string;
  clearanceDate: string;
  confidenceScore: number;
  comparisonData: ComparisonMatrix;
  isSelected: boolean;
  createdAt: Date;
}

export interface ComparisonMatrix {
  similarities: TechnicalCharacteristic[];
  differences: TechnicalCharacteristic[];
  riskAssessment: 'low' | 'medium' | 'high';
  testingRecommendations: string[];
  substantialEquivalenceAssessment: string;
}

export interface TechnicalCharacteristic {
  category: string;
  userDevice: string;
  predicateDevice: string;
  similarity: 'identical' | 'similar' | 'different';
  impact: 'none' | 'low' | 'medium' | 'high';
  justification: string;
}

export interface SourceCitation {
  url: string;
  title: string;
  effectiveDate: string;
  documentType: 'FDA_510K' | 'FDA_GUIDANCE' | 'CFR_SECTION' | 'FDA_DATABASE';
  accessedDate: string;
}
```

## Error Handling

### Frontend Error Boundaries

```typescript
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class RegulatoryErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Regulatory Assistant Error:', error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Something went wrong with the regulatory assistant. Please refresh the page or contact support.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Error Handling

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from backend.exceptions import RegulatoryAssistantError, FDAAPIError

@app.exception_handler(FDAAPIError)
async def fda_api_exception_handler(request: Request, exc: FDAAPIError):
    return JSONResponse(
        status_code=503,
        content={
            "error": "FDA API Unavailable",
            "message": "Unable to access FDA database. Please try again later.",
            "details": str(exc) if app.debug else None,
            "suggestions": [
                "Check your internet connection",
                "Try again in a few minutes",
                "Contact support if the problem persists"
            ]
        }
    )

@app.exception_handler(PredicateNotFoundError)
async def predicate_not_found_handler(request: Request, exc: PredicateNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": "No Predicates Found",
            "message": "No suitable predicate devices found for your search criteria.",
            "suggestions": [
                "Try broader search terms",
                "Consider related device types",
                "Consult FDA guidance for novel devices",
                "Schedule a pre-submission meeting with FDA"
            ]
        }
    )
```

## Testing Strategy

### Frontend Testing Approach

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectCard } from '@/components/ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: '1',
    name: 'Test Device',
    description: 'A test medical device',
    deviceType: 'Class II',
    status: 'in-progress' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should display project information correctly', () => {
    const onSelect = jest.fn();
    render(<ProjectCard project={mockProject} onSelect={onSelect} />);
    
    expect(screen.getByText('Test Device')).toBeInTheDocument();
    expect(screen.getByText('A test medical device')).toBeInTheDocument();
    expect(screen.getByText('in-progress')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ProjectCard project={mockProject} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### Backend Testing Approach

```python
import pytest
from httpx import AsyncClient
from backend.main import app
from backend.services.projects import ProjectService

@pytest.mark.asyncio
async def test_create_project():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        project_data = {
            "name": "Test Device",
            "description": "A test medical device",
            "deviceType": "Class II",
            "intendedUse": "For testing purposes"
        }
        
        response = await ac.post("/api/projects", json=project_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Device"
        assert data["status"] == "draft"

@pytest.mark.asyncio
async def test_predicate_search_integration():
    # Test with mock FDA API
    with patch('backend.services.fda.OpenFDAService.search_predicates') as mock_search:
        mock_search.return_value = [
            FDASearchResult(
                k_number="K123456",
                device_name="Similar Device",
                intended_use="Similar indication",
                product_code="ABC",
                clearance_date="2023-01-01",
                confidence_score=0.85
            )
        ]
        
        service = ProjectService()
        results = await service.search_predicates(
            project_id="test-project",
            device_description="Test device",
            intended_use="Test indication"
        )
        
        assert len(results) > 0
        assert results[0].confidence_score >= 0.8
```

This design provides a comprehensive foundation for the MVP development, emphasizing the frontend-first approach while ensuring robust backend architecture for AI agent integration and FDA data processing.