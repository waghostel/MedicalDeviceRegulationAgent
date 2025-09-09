# Documentation

This directory contains comprehensive documentation for the Medical Device Regulatory Assistant project, organized by application area.

## Structure

The documentation is organized into three main categories:

### 📱 [Frontend Documentation](frontend/)

- Next.js, React, and UI component documentation
- Frontend testing strategies and guides
- Performance optimization (Turbopack integration)
- Frontend investigation reports and analysis

### 🔧 [Backend Documentation](backend/)

- FastAPI, Python, and database documentation
- Backend testing and authentication guides
- Deployment procedures and operational runbooks
- Health checks and monitoring setup

### 🤖 [Kiro Instructions](kiro-instructions/)

- AI agent instruction templates and workflows
- Steering documents and technical guidelines
- Task creation and management guidance
- System setup and troubleshooting procedures

## Quick Start

1. Review [System Requirements](kiro-instructions/system-requirements.md)
2. Follow the [Cross-Platform Setup Guide](kiro-instructions/cross-platform-setup-guide.md)
3. Check [Setup Complete](kiro-instructions/SETUP_COMPLETE.md) for verification

## Key Documents

### For Developers

- **Frontend**: [Frontend Investigation Report](frontend/frontend_investigation_report.md)
- **Backend**: [Testing Strategy](backend/testing-strategy.md)
- **Deployment**: [Deployment Runbook](backend/deployment-runbook.md)

### For AI Agents

- **Core Guidelines**: [Technical Implementation Guidelines](kiro-instructions/technical-implementation-guidelines.md)
- **MVP Specifications**: [Medical Device Regulatory Assistant MVP](kiro-instructions/medical-device-regulatory-assistant-mvp.md)
- **Agent Templates**: [Agent Instruction Templates](kiro-instructions/agent-instruction-templates.md)

### For System Administration

- **Setup**: [Cross-Platform Setup Guide](kiro-instructions/cross-platform-setup-guide.md)
- **Troubleshooting**: [Troubleshooting Guide](kiro-instructions/troubleshooting-guide.md)
- **Performance**: [Startup Performance Optimization](kiro-instructions/startup-performance-optimization.md)

## Documentation Standards

- All README files remain in their original locations for context
- Documentation is categorized by application area (frontend, backend, kiro-instructions)
- Each category has its own README with detailed contents and navigation
- Cross-references are maintained between related documents

## Technology Stack Reference

### Frontend Technologies

- **Framework**: Next.js 14+ with App Router
- **UI Library**: Shadcn UI components
- **Styling**: Tailwind CSS
- **Build Tool**: Turbopack (development), Webpack (production)
- **Package Manager**: pnpm

### Backend Technologies

- **Framework**: FastAPI (Python)
- **Database**: SQLite (development), PostgreSQL (production)
- **Caching**: Redis
- **Package Manager**: Poetry
- **Testing**: pytest
- **AI Framework**: LangGraph

### Development Tools

- **Authentication**: Google OAuth 2.0
- **Testing**: Jest, React Testing Library, Playwright
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **CI/CD**: GitHub Actions
- **Documentation**: Markdown with cross-references