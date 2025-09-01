# Implementation Plan

Convert the Medical Device Regulatory Assistant MVP design into a series of prompts for a code-generation LLM that will implement each step in a test-driven manner. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

Here’s a rinsed and cleaned-up version of your text, keeping the intent but making it more concise and structured:

---

### Development Rules

* Use **`pnpm`** instead of npm for JavaScript/TypeScript.
* Use **`poetry`** for Python commands (e.g. `poetry run python -m pytest tests/test_gemini_tts_service.py -v`).
* Follow **Test-Driven Development (TDD)**.
* Always **clear the terminal** before running a new command.
* After reading this file, say: **"I will use poetry and pnpm"**.

---

### Workflow

1. Create a code-writing plan for the task.
2. Define the testing criteria.
3. Fetch related documentation (context7) if needed.
4. Implement the task/code.
5. Run tests after completing the task.

   * If tests fail, fetch additional documentation (context7).
6. Write a **task report** in `./.kiro/specs/mvp-development-roadmap/task-execute-history/` (e.g. `task-1.md`).

   * Be transparent about test results, especially if some tests require future verification.

---

### Test-Driven Development (TDD)

* **Pre-Development**: Clearly define expected test outcomes before coding.
* **Post-Development**: Document all test results in the `./.kiro/specs/mvp-development-roadmap/task-execute-history/` folder to ensure traceability.

---

### Task Report Format

Each completed task requires a report:

**Task Report**

* **Task**: \[Task ID and Title]
* **Summary of Changes**

  * \[Brief description of change #1]
  * \[Brief description of change #2]
* **Test Plan & Results**

  * **Unit Tests**: \[Description]

    * Result: \[✔ All tests passed / ✘ Failures]
  * **Integration Tests**: \[Description]

    * Result: \[✔ Passed / ✘ Failures]
  * **Manual Verification**: \[Steps & findings]

    * Result: \[✔ Works as expected]
* **Code Snippets (Optional)**: Show relevant diffs or highlights.

---

## Phase 1: Frontend Foundation (Weeks 1-2)

- [x] 1. Project Setup and Core Infrastructure

  - Initialize Next.js 14 project with TypeScript, Tailwind CSS, and Shadcn UI
  - Configure ESLint, Prettier, and TypeScript strict mode
  - Set up project structure following technical guidelines (frontend/, components/, pages/, hooks/, utils/)
  - Install and configure required dependencies: @shadcn/ui, @copilotkit/react-core, @copilotkit/react-ui
  - Create basic layout components (Header, Sidebar, AppLayout) with responsive design
  - Implement Google OAuth 2.0 authentication flow with NextAuth.js
  - Write unit tests for layout components using React Testing Library
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Project Management UI Components

  - Create Project interface and TypeScript types for project data models
  - Build ProjectCard component with Shadcn Card, Badge, and Button components
  - Implement ProjectHub page with grid layout for project cards
  - Create NewProjectDialog component with form validation using react-hook-form
  - Add project status indicators and creation/update timestamps
  - Implement local state management for projects using React Context
  - Write comprehensive unit tests for all project management components
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Regulatory Strategy Dashboard UI

  - Create dashboard widget components (ClassificationWidget, PredicateWidget, ProgressWidget)
  - Implement DeviceClassification and PredicateDevice TypeScript interfaces
  - Build responsive dashboard layout using CSS Grid and Flexbox
  - Add Progress component from Shadcn UI for confidence scores and completion status
  - Create mock data generators for testing dashboard widgets
  - Implement dashboard state management with React Context
  - Write unit tests for all dashboard components with mock data
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [X] 4. Navigation and Quick Actions UI

  - Create QuickActionsToolbar component with icon buttons for common tasks
  - Implement responsive navigation with mobile hamburger menu
  - Build breadcrumb navigation component for project hierarchy
  - Add keyboard shortcuts for quick actions (Ctrl+K for command palette)
  - Create FileExplorer component with folder tree structure
  - Implement drag-and-drop file upload functionality
  - Write integration tests for navigation flows between pages
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 2: Interactive Features (Weeks 3-4)

- [x] 5. CopilotKit Chat Interface Implementation


  - Install and configure CopilotKit with proper TypeScript types
  - Create AgentWorkflowPage with CopilotSidebar integration
  - Implement slash command recognition and autocomplete
  - Build SlashCommandCard components for predicate-search, classify-device, compare-predicate, find-guidance
  - Add typing indicators and loading states for better UX
  - Create context provider for maintaining project state across chat sessions
  - Write integration tests for CopilotKit chat functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Markdown Editor with AI Copilot






  - Implement markdown editor using @uiw/react-md-editor or similar
  - Add @ mention functionality for linking to project resources
  - Create document management system with file tree navigation
  - Implement auto-save functionality with debounced updates
  - Add markdown preview with syntax highlighting
  - Create document templates for common regulatory documents
  - Write unit tests for editor functionality and @ mention parsing
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Citation and Source Management UI






  - Create SourceCitation TypeScript interface and components
  - Build expandable CitationPanel sidebar with source links
  - Implement citation formatting for different document types (FDA_510K, FDA_GUIDANCE, CFR_SECTION)
  - Add source validation and link checking functionality
  - Create citation export functionality (APA, MLA formats)
  - Implement source search and filtering within the citation panel
  - Write unit tests for citation components and formatting functions
  - _Requirements: 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Audit Trail and Compliance UI








  - Create AuditLog page with searchable and filterable interaction history
  - Implement AgentInteraction TypeScript interface and display components
  - Build confidence score visualization with Progress bars and tooltips
  - Add reasoning trace display with expandable sections
  - Create audit trail export functionality (PDF, CSV formats)
  - Implement real-time audit log updates using WebSocket or Server-Sent Events
  - Write unit tests for audit trail components and export functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 3: Backend Infrastructure (Weeks 5-6)

- [x] 9. Database Setup and Models






  - Set up SQLite database with schema from design document
  - Create database migration system using Prisma or raw SQL migrations
  - Implement User, Project, DeviceClassification, PredicateDevice data models
  - Add database connection pooling and error handling
  - Create database seeding scripts with sample data for testing
  - Implement database backup and restore functionality
  - Write unit tests for all database models and CRUD operations
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 10. FastAPI Backend Service Setup

  - Initialize FastAPI application with proper project structure (agents/, tools/, models/, services/)
  - Configure CORS middleware for Next.js frontend integration
  - Implement authentication middleware using JWT tokens from NextAuth
  - Create health check endpoints for database, external APIs, and system status
  - Add request/response logging and error handling middleware
  - Set up API documentation with OpenAPI/Swagger
  - Write integration tests for FastAPI application setup and middleware
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 11. Project Management API Endpoints

  - Create ProjectService class with CRUD operations for projects
  - Implement REST API endpoints: GET/POST/PUT/DELETE /api/projects
  - Add project dashboard data aggregation endpoint
  - Implement user authorization checks for project access
  - Create project search and filtering functionality
  - Add project export functionality (JSON, PDF formats)
  - Write comprehensive API tests using pytest and httpx
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. openFDA API Integration Service

  - Create OpenFDAService class with rate limiting (240 requests/minute)
  - Implement predicate device search with advanced query building
  - Add device classification lookup functionality
  - Create adverse event monitoring for predicate devices
  - Implement caching layer for frequently accessed FDA data
  - Add retry logic and circuit breaker pattern for API resilience
  - Write unit tests with mocked FDA API responses and integration tests with real API
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 4: AI Agent Implementation (Weeks 7-8)

- [ ] 13. LangGraph Agent Architecture Setup

  - Install and configure LangGraph with proper TypeScript/Python bindings
  - Create RegulatoryAgentState class with project context management
  - Implement base agent workflow with state transitions and checkpoints
  - Add agent conversation memory and context persistence
  - Create agent tool registry for FDA API, document processing, and classification tools
  - Implement agent error handling and recovery mechanisms
  - Write unit tests for agent state management and workflow execution
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 14. Device Classification Agent Tool

  - Create DeviceClassificationTool class inheriting from LangChain BaseTool
  - Implement device classification logic using FDA product code database
  - Add confidence scoring based on intended use similarity and technology matching
  - Create CFR section identification and regulatory pathway determination
  - Implement classification reasoning trace generation
  - Add classification result validation and error handling
  - Write unit tests for classification tool with various device types and edge cases
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Predicate Search Agent Tool

  - Create FDAPredicateSearchTool class with openFDA integration
  - Implement semantic similarity scoring for predicate matching
  - Add technological characteristic extraction from 510(k) summaries
  - Create predicate ranking algorithm based on substantial equivalence criteria
  - Implement comparison matrix generation with similarities and differences
  - Add testing recommendation engine based on identified differences
  - Write comprehensive unit tests for predicate search with mock FDA data
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. Document Processing and Analysis Tools

  - Create DocumentProcessingTool for PDF/DOCX to markdown conversion
  - Implement OCR functionality for scanned FDA guidance documents
  - Add NLP-based text extraction and structured data parsing
  - Create guidance document search and relevance scoring
  - Implement document summarization for long FDA guidance documents
  - Add document version tracking and change detection
  - Write unit tests for document processing with sample FDA documents
  - _Requirements: 11.3, 11.4, 11.5_

## Phase 5: Integration and Testing (Weeks 9-10)

- [ ] 17. Frontend-Backend API Integration

  - Connect Project Management UI to FastAPI backend endpoints
  - Implement error handling and loading states for all API calls
  - Add optimistic updates for better user experience
  - Create API client with automatic retry and error recovery
  - Implement real-time updates using WebSocket connections
  - Add offline support with local data caching
  - Write end-to-end tests covering complete user workflows
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 18. CopilotKit Agent Integration

  - Connect CopilotKit chat interface to LangGraph agents
  - Implement slash command routing to appropriate agent tools
  - Add real-time agent execution status and progress indicators
  - Create agent response formatting for chat display
  - Implement agent conversation history and context management
  - Add agent interruption and cancellation functionality
  - Write integration tests for complete agent workflows through chat interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 19. Dashboard Data Integration

  - Connect Regulatory Strategy Dashboard to backend data sources
  - Implement real-time dashboard updates when agent tasks complete
  - Add dashboard widget refresh functionality and loading states
  - Create dashboard data aggregation and caching for performance
  - Implement dashboard export functionality with charts and graphs
  - Add dashboard customization and widget configuration
  - Write integration tests for dashboard data flow and real-time updates
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 20. Audit Trail and Compliance Integration

  - Connect audit trail UI to backend agent interaction logging
  - Implement comprehensive logging for all agent actions and decisions
  - Add audit trail search, filtering, and export functionality
  - Create compliance reporting with confidence scores and source citations
  - Implement audit trail data retention and archival policies
  - Add audit trail integrity verification and tamper detection
  - Write compliance tests ensuring all regulatory requirements are met
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 6: Performance and Polish (Weeks 11-12)

- [ ] 21. Performance Optimization and Caching

  - Implement Redis caching for frequently accessed FDA data
  - Add database query optimization and indexing
  - Create background job processing for long-running agent tasks
  - Implement API response compression and CDN integration
  - Add frontend code splitting and lazy loading for better performance
  - Create performance monitoring and alerting system
  - Write performance tests and benchmarks for critical user workflows
  - _Requirements: Performance targets from design document_

- [ ] 22. Error Handling and User Experience Polish

  - Implement comprehensive error boundaries and fallback UI components
  - Add user-friendly error messages with actionable suggestions
  - Create loading skeletons and progress indicators for all async operations
  - Implement form validation with real-time feedback
  - Add keyboard shortcuts and accessibility improvements
  - Create onboarding flow and user guidance tooltips
  - Write accessibility tests and ensure WCAG 2.1 compliance
  - _Requirements: 1.5, Error handling from design document_

- [ ] 23. Testing and Quality Assurance

  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
  - Add performance regression testing and monitoring
  - Create load testing for concurrent users and agent workflows
  - Implement security testing for authentication and data protection
  - Write user acceptance tests based on success metrics from requirements
  - _Requirements: All requirements validation_

- [ ] 24. Deployment and Production Setup

  - Create Docker containers for frontend and backend services
  - Set up production database with proper backup and monitoring
  - Implement environment configuration management
  - Create CI/CD pipeline for automated testing and deployment
  - Add production monitoring, logging, and alerting
  - Implement health checks and graceful shutdown procedures
  - Write deployment documentation and runbooks for production operations
  - _Requirements: Production deployment and monitoring_
