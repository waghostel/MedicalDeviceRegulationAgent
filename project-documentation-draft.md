# MedevAI: An Agentic Medical Device Regulatory Pathway Planner

## Elevator Pitch

**Streamline FDA regulatory pathway planning with AI-powered predicate search and compliance automation—reducing 510(k) preparation time from weeks to hours.**

## About the Project

* Inspiration
* What it does
* How we built it
* Challenges we ran into
* Accomplishments that we're proud of
* What we learned
* What's next for

### Inspiration

Bringing a medical device to market is fraught with regulatory hurdles, where even a single misstep contributes to a 15% submission failure rate. We developed MedevAI after witnessing startups lose precious time and resources on the manual, error-prone search for predicate devices, reference guidance, and the setup of practical device tests and clinical trials. These bottlenecks aren’t caused by a lack of data, but by the lack of accessible tools to integrate it; the FDA’s open data is a treasure trove that remains locked for most. MedevAI is the key. It was created from the conviction that intelligent automation can transform this high-risk, multi-day ordeal into a streamlined, reliable process, empowering innovators to focus on what they do best: building the future of medical devices—while agentic AI clears the path.

### What it does

MedevAI is an intelligent regulatory assistant that transforms the complex FDA medical device approval process into a streamlined, AI-powered workflow. The platform serves as a comprehensive regulatory pathway planner that helps medical device companies navigate the intricate 510(k) submission process with unprecedented speed and accuracy.

**Core Capabilities:**

- **Intelligent Device Classification**: Automatically determines FDA device class (I, II, III) and identifies appropriate product codes based on device description and intended use
- **AI-Powered Predicate Search**: Performs semantic analysis to find the most suitable predicate devices from the FDA database, ranking them by substantial equivalence potential
- **Comparative Analysis Engine**: Generates detailed side-by-side comparisons between user devices and potential predicates, highlighting similarities and differences that impact regulatory strategy
- **Regulatory Guidance Mapping**: Automatically identifies and retrieves relevant FDA guidance documents, special controls, and testing requirements specific to each device type
- **Compliance Checklist Generation**: Creates customized 510(k) submission checklists based on device classification and predicate analysis
- **Audit Trail Management**: Maintains comprehensive, exportable audit logs of all AI decisions and reasoning for regulatory compliance

The system operates through an intuitive conversational interface powered by advanced AI agents, allowing regulatory professionals to interact naturally while maintaining the rigor and documentation standards required for FDA submissions.


### How We Built it

The system's architecture is centered around a powerful AI agent designed to act as a specialized regulatory assistant. This agent is the core of the platform, automating and augmenting the complex work of regulatory professionals.

The **frontend** is a modern web application built with `Next.js`, `React`, and `TypeScript`, leveraging the `App Router` for a seamless user experience. The interface is designed with `Shadcn UI` for consistency and accessibility, styled with `Tailwind CSS` for responsive layouts, and enhanced with `CopilotKit` to deliver an intuitive, AI-powered conversational interface. Authentication is securely managed by `NextAuth.js` using `Google OAuth 2.0`.  

The **backend** services are built on the high-performance `FastAPI` framework in Python. The system adopts an agent-based architecture using `LangGraph` to create state-managed, auditable workflows for regulatory tasks. Data is temporarily stored in a `SQLite` database via the `SQLAlchemy ORM`, with `Redis` integrated for intelligent caching and session management to maintain high performance.

### Challenges we ran into

- **FDA API Complexity and Rate Limiting**: The openFDA API has strict rate limits and inconsistent data formats. We implemented intelligent caching with Redis, circuit breaker patterns for resilience, and exponential backoff logic to manage these constraints effectively.
- **Regulatory Compliance Requirements**: To meet the need for auditability and human oversight, We designed the system to produce complete reasoning traces for all AI decisions, confidence scores with detailed justifications, and exportable audit logs.
- **Complex State Management**: Regulatory processes are long-running and can be interrupted. We used the LangGraph framework to build a state-based agent architecture with checkpoints, allowing workflows to be paused and resumed seamlessly.
- **Testing Reliability**: Achieving consistent test results required creating mock FDA API responses, isolating database transactions for each test, and implementing performance monitoring with automated alerts.
- **User Experience for Domain Experts**: We designed a dual interface that provides both a conversational AI for quick analysis and structured data tables with PDF export for formal submission work.

### Accomplishments that we're proud of

**Revolutionary Time Reduction**: Successfully reduced predicate device identification from 2-3 days of manual research to under 2 hours of AI-assisted analysis, representing a 90%+ time savings for regulatory teams.

**Regulatory-Grade AI Architecture**: Built the first LangGraph-based agent system specifically designed for FDA compliance, featuring complete audit trails, confidence scoring, and human-in-the-loop validation that meets regulatory inspection standards.

**Intelligent Semantic Search**: Developed sophisticated predicate matching algorithms that go beyond keyword searches to perform semantic analysis of device descriptions and intended use statements, dramatically improving match quality and relevance.

**Real-Time FDA Integration**: Successfully integrated with the openFDA API to provide live, up-to-date regulatory data while implementing robust rate limiting, caching, and error handling to ensure system reliability.

**Domain-Specific Expertise**: Created an AI system that demonstrates deep understanding of FDA regulatory concepts like substantial equivalence, product codes, and CFR sections - essentially encoding regulatory expertise into software.

**Comprehensive Testing Framework**: Achieved high test coverage across frontend, backend, and integration layers, with specialized testing for regulatory workflows and FDA API interactions.

**User-Centric Design**: Delivered a dual-interface system that provides both conversational AI for quick analysis and structured data exports for formal regulatory submissions, perfectly balancing ease of use with professional requirements.

### What we learned

Building MedevAI taught us several key lessons about developing AI-powered regulatory tools. On the technical side, we learned that an agent-based design using LangGraph can effectively manage complex, multi-step regulatory workflows in collaboration with humans. Integrating with the real-time openFDA API underscored the importance of robust engineering practices, including rate limiting, circuit breaker patterns, and comprehensive error handling. Most importantly, working in a regulated field requires a compliance-first mindset, which means embedding extensive audit trails, confidence scoring, and human-in-the-loop validation at every step.

From a domain perspective, we gained a deep appreciation for the nuances of regulatory work—designing and maintaining medical devices is hard work. From understanding FDA product codes and substantial equivalence criteria to handling the variable quality of public data, the challenges are significant. This often required creating sophisticated paperwork involving patients. We also learned that the user experience for regulatory professionals must blend conversational AI for ease of use with structured data exports for formal submissions. Such an approach can significantly reduce the workload of regulatory affairs teams and enable device companies to make faster, more informed decisions.


## What's next for MedevAI

**Enhanced AI Capabilities**: Expanding the agent system to handle more complex regulatory scenarios, including De Novo pathway analysis, PMA submissions, and post-market surveillance requirements.

**Global Regulatory Expansion**: Extending beyond FDA to support EU MDR, Health Canada, and other international regulatory frameworks, creating a truly global regulatory intelligence platform.

**Advanced Analytics Dashboard**: Developing predictive analytics to forecast submission success rates, identify potential regulatory risks, and provide strategic recommendations based on historical FDA decision patterns.

**Integration Ecosystem**: Building APIs and integrations with popular QMS systems, PLM platforms, and regulatory databases to create a seamless regulatory workflow ecosystem.

**Collaborative Features**: Adding multi-user support, team collaboration tools, and version control for regulatory documents to support larger regulatory teams and cross-functional projects.

**Machine Learning Enhancement**: Implementing continuous learning capabilities that improve predicate matching accuracy and regulatory insights based on user feedback and FDA decision outcomes.

**Mobile and Offline Capabilities**: Developing mobile applications and offline functionality to support regulatory professionals working in various environments and connectivity conditions.


#### The Role of the AI Agent

The **AI agent** is the core of MedevAI, built on a "human-in-the-loop" philosophy. It functions as an intelligent assistant rather than a final decision-maker. Its primary role is to execute complex, multi-step regulatory workflows—such as determining device classification, identifying predicate devices, and mapping relevant FDA guidance documents.

The agent’s workflows are stateful, meaning they can be paused, resumed, and audited at any point. When a user initiates a task, like a **predicate search**, the agent leverages specialized tools to query the openFDA API, analyze results, and rank potential candidates.

Crucially, every piece of information the agent provides is accompanied by a **confidence score**, detailed reasoning for its conclusions, and complete source citations with URLs and effective dates. This transparency is essential for regulatory compliance and allows human experts to validate the AI’s findings before making final decisions. All interactions are recorded in an immutable audit trail, ensuring full traceability for regulatory inspections.

#### Key Technical Innovations

One of the key innovations is the **Intelligent Predicate Matching Algorithm**. Instead of simple keyword searches, the system performs semantic analysis on the device's description and intended use. It constructs advanced queries for the FDA API, filtering by regulatory criteria like product codes to identify the most relevant predicate devices.

This is presented to the user through a **Real-time Regulatory Dashboard**, which serves as a project-based workspace. For each medical device project, the system maintains its classification status, a list of potential predicate devices, a dynamic compliance checklist, and a complete, transparent audit trail of every interaction with the AI agent.


### Technical Architecture Highlights

The system is designed with a clear separation of concerns. The **Frontend**, built with Next.js, contains all UI components, including the project hub, regulatory dashboards, and the agent workflow interface. This layer communicates with the backend via a dedicated **API Layer** built into Next.js.

The **Backend Services**, powered by FastAPI, house the core business logic and AI capabilities. This includes the LangGraph agents for executing regulatory tasks, the openFDA integration for real-time data, and document processing modules. This entire system rests on a **Data Layer** that uses a SQLite database for structured data and audit trails, while also managing Markdown files and JSON for storing project-specific information. Performance is enhanced across the stack with Turbopack for faster frontend builds, Redis caching for the backend, and database indexing for rapid queries.

## Built With

### Core Technologies

The **frontend stack** is built on Next.js 15 and React 19, using TypeScript for type safety. The user interface is crafted with Tailwind CSS for utility-first styling and Shadcn UI for a high-quality, accessible component library. The conversational AI experience is powered by CopilotKit.

The **backend stack** uses FastAPI, a high-performance Python web framework, running on Python 3.11+. It leverages SQLAlchemy as its ORM for database interactions with a SQLite database, and uses Redis for in-memory caching to boost performance.

The **AI and Agent Framework** is what makes the system intelligent. It uses LangGraph to orchestrate state-based agent workflows, allowing for complex and auditable task execution. LangChain is used for the broader integration of Large Language Models (LLMs) and tool orchestration, all powered by the OpenAI API for advanced natural language processing.

### Development Tools & Infrastructure

For package management, the project uses **pnpm** for the frontend and **Poetry** for the backend, ensuring fast and deterministic dependency management. The testing and quality assurance suite is comprehensive, utilizing **Jest** and **React Testing Library** for the frontend, **pytest** for the backend, and **Playwright** for end-to-end testing. Code quality is maintained with ESLint and Prettier. Performance is continuously monitored using Lighthouse CI and Sentry for error tracking.

### Database & Storage

The data architecture is designed for compliance and auditability. The database schema consists of three core tables. A `projects` table manages the high-level details of each regulatory project. A `predicate_devices` table stores the results of the AI's analysis, including K-numbers, confidence scores, and comparison data. Most importantly, an `agent_interactions` table provides a-comprehensive audit trail, logging every action the agent takes, its inputs, outputs, confidence scores, and reasoning. This ensures full traceability for every decision made within the system.

### Development Environment

The project is built to be cross-platform, with setup and startup scripts provided for macOS, Linux, and Windows (both PowerShell and Command Prompt). It also includes Docker configuration for containerized deployments, ensuring a consistent environment for development and production.

## How was Kiro used in your project?

Kiro was instrumental in building the entire Medical Device Regulatory Assistant MVP from the ground up. The development process leveraged Kiro's advanced capabilities across multiple dimensions:

**Full-Stack Development**: Kiro generated the complete frontend built with React, TypeScript, and Next.js 15, including the conversational AI interface powered by CopilotKit. It also created the FastAPI backend with Python, implementing the LangGraph agent architecture for complex regulatory workflows.

**Intelligent Architecture Design**: Rather than just writing code, Kiro helped us design the entire system architecture, including the agent-based workflow system, database schema for audit trails, and the integration patterns between frontend and backend services.

**Regulatory Domain Expertise**: Kiro demonstrated deep understanding of FDA regulatory requirements, helping us implement features like predicate device search algorithms, substantial equivalence analysis, and compliance audit trails that meet regulatory standards.

**Testing and Quality Assurance**: Kiro created comprehensive test suites using Jest, React Testing Library, and pytest, ensuring the system meets the high reliability standards required for regulatory applications.


## For building and vibe coding from scratch: How did you structure your conversations with Kiro to build your project?

The development process with Kiro followed a structured, iterative approach:

**1. Requirements Discovery**: We started by defining user personas (regulatory affairs managers at medical device startups) and their specific jobs-to-be-done (finding predicate devices, navigating FDA regulations). This provided clear context for all subsequent development.

**2. Technical Foundation**: We outlined the preferred tech stack (Next.js, FastAPI, LangGraph) and core features (predicate search, device classification, compliance tracking) through collaborative discussions with Kiro in vibe mode.

**3. Architecture Refinement**: We conducted multiple iterative conversations to clarify technical specifications, user interface designs, and system integrations. Kiro's ability to understand regulatory domain requirements was crucial here.

**4. Steering Document Creation**: We consolidated all insights into comprehensive steering documents and MVP specifications, which became the foundation for all subsequent development tasks.

**5. Parallel Development**: We split work between frontend and backend development, leveraging Kiro's ability to maintain context across different technology stacks and run tests in parallel for maximum efficiency.

**6. Integration and Refinement**: We transitioned to unified development to resolve integration issues and replace mock data with real FDA API integrations.



## For agent hooks: What specific workflows did you automate with Kiro hooks? How did these hooks improve your development process?

Agent hooks transformed our routine development tasks into automated, consistent workflows. The hooks were primarily triggered manually via `Execute hook: [hook_name]` commands, functioning like intelligent slash commands.

**Key Automated Workflows:**

- **create-test**: Automatically creates new tasks in spec folders and appends them to task.md files with proper formatting
- **fix_error**: Analyzes error logs, performs root cause analysis, creates detailed fix plans, and generates task execution reports
- **fetch_content**: Creates learning materials from provided content or files, with comprehensive analysis and documentation
- **find_redundant**: Identifies duplicate or unused files in the codebase with detailed analysis of their purpose and usage
- **refactor_code**: Systematically analyzes code for refactoring opportunities and redundancies
- **security_analysis**: Performs security analysis on error logs and system components with detailed reporting
- **task_report**: Generates comprehensive task execution reports with test results, changes, and code snippets
- **verify_test**: Validates test completion and documents results in standardized formats
- **learning_material**: Creates educational content based on project context and user-provided materials



## For spec-to-code: How did you structure your spec for Kiro to implement? How did the spec-driven approach improve your development process?

**Spec Structure and Evolution:**

We built the specification architecture in layers, starting with foundational steering documents that emerged from extensive collaborative sessions with multiple AI systems (Kiro, ChatGPT, Gemini, Claude). This multi-AI approach ensured comprehensive coverage of technical requirements and regulatory domain expertise.

**Key Specification Components:**

- **Steering Documents**: Core architectural guidelines, technical implementation standards, and regulatory compliance requirements
- **MVP Specifications**: Detailed feature definitions, user workflows, and acceptance criteria
- **Agent Instruction Templates**: Standardized patterns for regulatory workflows like predicate search and device classification
- **Technical Implementation Guidelines**: Package management standards, testing requirements, and development workflows

**Iterative Refinement Process:**

The early stages required multiple rounds of discussion and modification to establish solid foundations. However, once we established the core steering documents, new specifications could organically grow from these foundations, creating a self-reinforcing development ecosystem.

**Process Transformation:**

The spec-driven approach fundamentally transformed our development from reactive "vibe coding" to proactive, autonomous execution. Key improvements included:

- **Reduced Human Intervention**: Our focus shifted from implementation details to high-level strategy and spec design
- **Autonomous Development**: Well-defined specs enabled Kiro to execute complex tasks independently
- **Consistent Quality**: Standardized patterns ensured regulatory compliance and technical excellence
- **Scalable Growth**: New features could be specified and implemented without disrupting existing systems

This approach proved especially valuable for regulatory software, where consistency, auditability, and compliance are paramount. 


#### Spec-driven development

* Use special prompts in `task.md` or `design.md` to guide LLM in applying test-driven development (TDD).

1. Generate a `task execution report` for each completed task, highlighting finished work and failed tests.
2. Leverage reports to quickly identify issues and missing features during iterative development.


#### Steering documents

1. Keep steering documents lightweight but updated, linking to supporting references for specific jobs.
2. For example, when creating error-fix tasks, follow a chain: error analysis → cause identification → error-fix task creation. Documents serve as references for error handling, not feature development.

#### MCP servers

1. Use `context7`, `fetch`, and `playwright` MCPs to retrieve relevant documents.
2. Instruct LLM to consult these MCPs for solutions before attempting complex problem fixes.




## What was the most impressive code generation Kiro helped you with?

The most impressive aspect of Kiro was its ability to create sophisticated, domain-specific solutions from minimal and ambiguous requirements. Three standout achievements:

**1. Intelligent Agent Architecture**: Kiro designed and implemented the entire LangGraph-based agent system that handles complex regulatory workflows. This included state management, checkpointing for long-running processes, and sophisticated error handling - all while maintaining audit trails required for regulatory compliance.

**2. FDA API Integration with Intelligence**: Rather than simple API calls, Kiro created an intelligent predicate search system that performs semantic analysis on device descriptions, constructs advanced FDA database queries, and ranks results by substantial equivalence potential - essentially building regulatory expertise into the code.

**3. Spec-Driven Development Transformation**: The transition from vibe coding to spec-driven development was revolutionary. With well-defined specifications, our development became like "driving on a highway with precise destinations" - each task became a waypoint that could be executed autonomously. This allowed for parallel development streams and enabled us to focus on high-level strategy while Kiro handled implementation details.

The system's ability to self-evolve through iterative spec refinement meant that complex features could grow and refactor themselves with minimal human intervention, dramatically accelerating our development velocity.



**Process Improvements:**

These hooks dramatically improved our development velocity by standardizing error analysis, task creation, and documentation processes. Instead of manually writing task reports or analyzing errors, the hooks ensured consistent, thorough analysis with proper audit trails - essential for a regulatory compliance system.



---
