# Agentic AI Regulatory Assistant

## 1. Project Overview

This project is an **Agentic AI Regulatory Assistant**, a specialized platform designed to streamline and accelerate the medical device regulatory pathway discovery process. The Minimum Viable Product (MVP) focuses exclusively on the **US FDA market**.

The primary goal is to assist **Regulatory Affairs Managers at medical device startups** (10-50 employees) who have budget authority but limited resources. The system addresses their most critical pain point: the complex, time-consuming, and error-prone **510(k) predicate search and comparison workflow**.

The key success metric for the MVP is to **reduce the time required to identify suitable predicate devices from 2-3 days to under 2 hours**, while improving accuracy and compliance.

## 2. Core MVP Capabilities

The assistant is built on a "human-in-the-loop" philosophy, where the AI suggests and automates, but the human expert decides. All outputs are designed to be auditable, traceable, and include confidence scores.

- **Auto-Classification with FDA Product Codes**: Automatically classifies devices based on their intended use and suggests the appropriate FDA product codes and CFR sections.
- **Predicate Search & Analysis**: Automates the search for predicate devices in the openFDA database, providing a ranked list of candidates and side-by-side technological comparison tables.
- **FDA Guidance Document Mapping**: Identifies relevant FDA guidance documents based on device type and technology (e.g., cybersecurity for connected devices).
- **Real-time FDA Database Integration**: Ensures all regulatory data is current by using live queries to the openFDA API.
- **510(k) Submission Checklist Generator**: Creates tailored checklists for FDA submissions based on the device classification and predicate analysis.

## 3. Technical Architecture

The system is a full-stack application built with a modern, robust technology set.

- **Frontend**: Next.js, React, Shadcn UI, Tailwind CSS
- **Backend**: Next.js API Routes with a FastAPI service for Python-based AI/agentic logic.
- **AI Framework**: LangGraph for agent architecture and CopilotKit for the conversational UI.
- **Database**: SQLite for local development and project-based data storage.
- **Authentication**: Google OAuth 2.0.

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

## 4. Getting Started

### Prerequisites
- Node.js and pnpm
- Python and Poetry
- Google OAuth 2.0 Credentials
- FDA API Key

### Environment Setup
Create a `.env.local` file in the root of the project and add the following variables:
```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FDA_API_KEY=your-fda-api-key
DATABASE_URL=sqlite:./dev.db
REDIS_URL=redis://localhost:6379
```

### Installation & Running

**1. Backend (FastAPI):**
```bash
cd backend
poetry install
poetry run uvicorn main:app --reload
```

**2. Frontend (Next.js):**
```bash
cd frontend
pnpm install
pnpm dev
```
The application will be available at `http://localhost:3000`.

## 5. Project Structure

The repository is organized into distinct frontend and backend services.

```
project-root/
├── .kiro/
│   ├── steering/           # High-level steering documents
│   └── specs/              # Detailed feature specifications
├── frontend/               # Next.js React application
│   ├── components/         # Reusable UI components
│   ├── pages/              # Next.js pages
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Frontend utilities
├── backend/                # FastAPI Python services
│   ├── agents/             # LangGraph agent implementations
│   ├── tools/              # Agent tools (FDA API, document processing)
│   ├── models/             # Data models and schemas
│   └── services/           # Business logic services
├── shared/                 # Shared types and utilities
└── docs/                   # Technical documentation
```

## 6. Testing

The project includes a comprehensive testing strategy:
- **Backend**: Unit and integration tests using `pytest`.
- **Frontend**: Component and integration tests using `React Testing Library` and `Jest`.

To run tests:
```bash
# Backend tests
cd backend
poetry run pytest

# Frontend tests
cd frontend
pnpm test
```

## 7. Compliance and Safety

This tool is designed with regulatory compliance at its core.
- **Human-in-the-Loop**: The AI is an assistant. A qualified human professional must review and approve all critical AI outputs.
- **Auditable Traceability**: Every action taken by the agent is logged in a transparent, human-readable format, providing a full "reasoning trace."
- **Confidence & Citation**: Every piece of information the agent provides is accompanied by a confidence score (0-1) and a direct citation to the source URL or document.
