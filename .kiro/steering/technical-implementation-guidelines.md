# Technical Implementation Guidelines - Medical Device Regulatory Assistant MVP

## Development Standards and Best Practices

### Code Quality Requirements

- Follow TypeScript strict mode for all frontend code
- Use Python type hints for all backend functions
- Implement comprehensive error handling with user-friendly messages
- Write unit tests for all core regulatory logic
- Document all API endpoints and data models
- Use ESLint and Prettier for consistent code formatting

### Project Structure Standards

```
project-root/
├── .kiro/
│   ├── steering/           # Steering documents (this file)
│   └── specs/             # Feature specifications
├── frontend/              # Next.js React application
│   ├── components/        # Reusable UI components
│   ├── pages/            # Next.js pages
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Frontend utilities
├── backend/              # FastAPI Python services
│   ├── agents/           # LangGraph agent implementations
│   ├── tools/            # Agent tools (FDA API, document processing)
│   ├── models/           # Data models and schemas
│   └── services/         # Business logic services
├── shared/               # Shared types and utilities
└── docs/                # Technical documentation
```

## Agent Architecture Guidelines

### LangGraph Implementation

- Use state-based agent workflows for complex regulatory tasks
- Implement checkpoints for long-running processes (predicate searches)
- Design agents to be interruptible and resumable
- Maintain conversation context across multiple interactions
- Log all agent decisions and reasoning for audit trails

### Agent Tool Development

```python
# Example tool structure for FDA API integration
from langchain.tools import BaseTool
from typing import Dict, Any, Optional

class FDAPredicateSearchTool(BaseTool):
    name = "fda_predicate_search"
    description = "Search FDA 510(k) database for predicate devices"

    def _run(
        self,
        device_description: str,
        intended_use: str,
        product_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute predicate search with confidence scoring

        Returns:
        {
            "predicates": [...],
            "confidence_scores": [...],
            "reasoning": "...",
            "sources": [...]
        }
        """
        # Implementation details
        pass
```

### CopilotKit Integration

- Implement context-aware chat interface using CopilotKit
- Maintain project state across chat sessions
- Enable file uploads and document processing through chat
- Support slash commands for quick actions
- Provide real-time typing indicators and loading states

## Database Design Principles

### SQLite Schema for MVP

```sql
-- Projects table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    device_type TEXT,
    intended_use TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predicate devices table
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent interactions table (for audit trail)
CREATE TABLE agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    agent_action TEXT NOT NULL,
    input_data JSON,
    output_data JSON,
    confidence_score REAL,
    sources JSON,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Data Models (TypeScript/Python)

```typescript
// Shared TypeScript interfaces
interface PredicateDevice {
  kNumber: string;
  deviceName: string;
  intendedUse: string;
  productCode: string;
  clearanceDate: string;
  confidenceScore: number;
  comparisonData: ComparisonMatrix;
  sources: SourceCitation[];
}

interface ComparisonMatrix {
  similarities: TechnicalCharacteristic[];
  differences: TechnicalCharacteristic[];
  riskAssessment: RiskLevel;
  testingRecommendations: string[];
}

interface SourceCitation {
  url: string;
  title: string;
  effectiveDate: string;
  documentType: "FDA_510K" | "FDA_GUIDANCE" | "CFR_SECTION";
}
```

## API Integration Standards

### openFDA API Wrapper

```python
import asyncio
import aiohttp
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class FDASearchResult:
    k_number: str
    device_name: str
    intended_use: str
    product_code: str
    clearance_date: str
    confidence_score: float

class OpenFDAClient:
    def __init__(self, rate_limit: int = 240):  # FDA limit: 240 requests/minute
        self.base_url = "https://api.fda.gov/device/510k.json"
        self.rate_limit = rate_limit
        self.session = None

    async def search_predicates(
        self,
        search_terms: List[str],
        product_code: Optional[str] = None,
        limit: int = 100
    ) -> List[FDASearchResult]:
        """
        Search for predicate devices with rate limiting and error handling
        """
        # Implementation with proper error handling and retry logic
        pass

    async def get_device_details(self, k_number: str) -> Dict:
        """
        Get detailed information for a specific K-number
        """
        pass
```

### Error Handling Standards

```python
class RegulatoryAssistantError(Exception):
    """Base exception for regulatory assistant errors"""
    pass

class FDAAPIError(RegulatoryAssistantError):
    """FDA API related errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message)

class PredicateNotFoundError(RegulatoryAssistantError):
    """No suitable predicates found"""
    pass

class ClassificationUncertainError(RegulatoryAssistantError):
    """Device classification uncertain"""
    def __init__(self, message: str, confidence_score: float):
        self.confidence_score = confidence_score
        super().__init__(message)
```

## UI Component Standards

### Shadcn UI Component Usage

```typescript
// Example: Predicate Search Results Component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PredicateResultCardProps {
  predicate: PredicateDevice;
  onSelect: (predicate: PredicateDevice) => void;
}

export function PredicateResultCard({
  predicate,
  onSelect,
}: PredicateResultCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(predicate)}
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {predicate.deviceName}
          <Badge variant="secondary">{predicate.kNumber}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {predicate.intendedUse}
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Confidence:</span>
            <Progress
              value={predicate.confidenceScore * 100}
              className="flex-1"
            />
            <span className="text-sm">
              {Math.round(predicate.confidenceScore * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Responsive Design Requirements

- Mobile-first design approach
- Support for tablet and desktop layouts
- Accessible keyboard navigation
- Screen reader compatibility
- High contrast mode support

## Security and Compliance Implementation

### Authentication Flow (Google OAuth 2.0)

```typescript
// Next.js API route for OAuth callback
import { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Implement OAuth flow with proper error handling
    // Store user session securely
    // Redirect to dashboard
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}
```

### Audit Trail Implementation

```python
from datetime import datetime
from typing import Dict, Any, List

class AuditLogger:
    def __init__(self, db_connection):
        self.db = db_connection

    async def log_agent_action(
        self,
        project_id: int,
        action: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        confidence_score: float,
        sources: List[Dict[str, str]],
        reasoning: str
    ):
        """
        Log all agent actions for compliance and audit purposes
        """
        await self.db.execute(
            """
            INSERT INTO agent_interactions
            (project_id, agent_action, input_data, output_data,
             confidence_score, sources, reasoning, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (project_id, action, json.dumps(input_data),
             json.dumps(output_data), confidence_score,
             json.dumps(sources), reasoning, datetime.utcnow())
        )
```

## Testing Requirements

### Unit Testing Standards

```python
# Example test for predicate search functionality
import pytest
from unittest.mock import AsyncMock, patch
from backend.tools.fda_predicate_search import FDAPredicateSearchTool

@pytest.mark.asyncio
async def test_predicate_search_success():
    tool = FDAPredicateSearchTool()

    with patch('backend.tools.fda_predicate_search.OpenFDAClient') as mock_client:
        mock_client.return_value.search_predicates.return_value = [
            FDASearchResult(
                k_number="K123456",
                device_name="Test Device",
                intended_use="Test indication",
                product_code="ABC",
                clearance_date="2023-01-01",
                confidence_score=0.85
            )
        ]

        result = await tool._arun(
            device_description="Test device description",
            intended_use="Test indication"
        )

        assert result["confidence_score"] >= 0.8
        assert len(result["predicates"]) > 0
        assert "reasoning" in result
```

### Integration Testing

- Test complete workflows from UI to database
- Validate FDA API integration with real data
- Test agent conversation flows
- Verify audit trail completeness
- Test error handling and recovery

## Performance Requirements

### Response Time Targets

- Device classification: < 2 seconds
- Predicate search: < 10 seconds
- Comparison analysis: < 5 seconds
- Document processing: < 30 seconds
- Chat responses: < 3 seconds

### Caching Strategy

```python
import redis
from typing import Optional, Dict, Any

class RegulatoryCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour

    async def get_predicate_search(self, search_key: str) -> Optional[Dict[str, Any]]:
        """Get cached predicate search results"""
        cached = await self.redis.get(f"predicate_search:{search_key}")
        return json.loads(cached) if cached else None

    async def set_predicate_search(self, search_key: str, results: Dict[str, Any]):
        """Cache predicate search results"""
        await self.redis.setex(
            f"predicate_search:{search_key}",
            self.default_ttl,
            json.dumps(results)
        )
```

## Deployment and Monitoring

### Environment Configuration

```bash
# .env.local (development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FDA_API_KEY=your-fda-api-key
DATABASE_URL=sqlite:./dev.db
REDIS_URL=redis://localhost:6379
```

### Health Check Endpoints

```python
from fastapi import FastAPI, HTTPException
from backend.services.health import HealthChecker

app = FastAPI()

@app.get("/health")
async def health_check():
    checker = HealthChecker()

    health_status = await checker.check_all([
        "database",
        "fda_api",
        "redis_cache"
    ])

    if not health_status["healthy"]:
        raise HTTPException(status_code=503, detail=health_status)

    return health_status
```

These technical guidelines ensure consistent, maintainable, and compliant implementation of the Medical Device Regulatory Assistant MVP while focusing on the core FDA predicate search functionality.
