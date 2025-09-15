# Medical Device Regulatory Assistant - System Architecture Flowcharts

Based on the project documentation and codebase analysis, here are comprehensive flowcharts describing how the Medical Device Regulatory Assistant system works.

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js React UI]
        CK[CopilotKit Chat Interface]
        COMP[Shadcn UI Components]
    end
    
    subgraph "API Layer"
        NEXTAPI[Next.js API Routes]
        FASTAPI[FastAPI Backend]
        WS[WebSocket Connections]
    end
    
    subgraph "Agent Layer"
        LG[LangGraph Agent]
        TR[Tool Registry]
        SM[State Manager]
    end
    
    subgraph "Tools & Services"
        FDA[FDA Predicate Search Tool]
        CLASS[Device Classification Tool]
        DOC[Document Processing Tool]
        OPENFDA[OpenFDA API Service]
    end
    
    subgraph "Data Layer"
        SQLITE[SQLite Database]
        REDIS[Redis Cache]
        FILES[File Storage]
    end
    
    subgraph "External APIs"
        FDAAPI[FDA OpenAPI]
        GOOGLE[Google OAuth]
    end
    
    UI --> NEXTAPI
    CK --> NEXTAPI
    COMP --> UI
    
    NEXTAPI --> FASTAPI
    FASTAPI --> WS
    
    FASTAPI --> LG
    LG --> TR
    LG --> SM
    
    TR --> FDA
    TR --> CLASS
    TR --> DOC
    
    FDA --> OPENFDA
    CLASS --> OPENFDA
    OPENFDA --> FDAAPI
    
    FASTAPI --> SQLITE
    FASTAPI --> REDIS
    FASTAPI --> FILES
    
    NEXTAPI --> GOOGLE
    
    style LG fill:#e1f5fe
    style OPENFDA fill:#f3e5f5
    style FDAAPI fill:#fff3e0
```

**Explanation**: This diagram shows the overall system architecture with clear separation of concerns. The frontend uses Next.js with CopilotKit for conversational AI, the backend uses FastAPI with LangGraph agents, and the system integrates with external FDA APIs for regulatory data.

## 2. Agent Workflow Execution

```mermaid
graph TD
    START([User Starts Session]) --> INIT[Initialize Agent Session]
    INIT --> ROUTE{Route Task Type}
    
    ROUTE -->|Device Classification| CLASS_TASK[Device Classification Task]
    ROUTE -->|Predicate Search| PRED_TASK[Predicate Search Task]
    ROUTE -->|Predicate Comparison| COMP_TASK[Predicate Comparison Task]
    ROUTE -->|Guidance Search| GUIDE_TASK[Guidance Search Task]
    
    CLASS_TASK --> CLASS_TOOL[Execute Classification Tool]
    CLASS_TOOL --> CLASS_RESULT[Generate Classification Result]
    
    PRED_TASK --> CHECKPOINT1[Create Search Checkpoint]
    CHECKPOINT1 --> PRED_TOOL[Execute Predicate Search Tool]
    PRED_TOOL --> PRED_ANALYSIS[Analyze Predicate Matches]
    PRED_ANALYSIS --> CHECKPOINT2[Create Completion Checkpoint]
    
    COMP_TASK --> COMP_TOOL[Execute Comparison Tool]
    COMP_TOOL --> COMP_MATRIX[Generate Comparison Matrix]
    
    GUIDE_TASK --> GUIDE_TOOL[Execute Guidance Search Tool]
    GUIDE_TOOL --> GUIDE_RESULT[Generate Guidance Results]
    
    CLASS_RESULT --> RESPONSE[Generate Response]
    CHECKPOINT2 --> RESPONSE
    COMP_MATRIX --> RESPONSE
    GUIDE_RESULT --> RESPONSE
    
    RESPONSE --> AUDIT[Log Audit Trail]
    AUDIT --> END([Return Results to User])
    
    CLASS_TOOL -.->|Error| ERROR[Handle Error]
    PRED_TOOL -.->|Error| ERROR
    COMP_TOOL -.->|Error| ERROR
    GUIDE_TOOL -.->|Error| ERROR
    
    ERROR --> RECOVERY{Recovery Possible?}
    RECOVERY -->|Yes| RETRY[Retry with Fallback]
    RECOVERY -->|No| ERROR_RESPONSE[Generate Error Response]
    
    RETRY --> RESPONSE
    ERROR_RESPONSE --> END
    
    style CHECKPOINT1 fill:#e8f5e8
    style CHECKPOINT2 fill:#e8f5e8
    style ERROR fill:#ffebee
    style AUDIT fill:#f3e5f5
```

**Explanation**: This flowchart shows how the LangGraph agent executes different regulatory tasks. The system uses checkpoints for long-running processes (like predicate searches), maintains state throughout execution, and includes comprehensive error handling with recovery mechanisms.

## 3. FDA Predicate Search Workflow

```mermaid
graph TD
    INPUT[User Device Description + Intended Use] --> EXTRACT[Extract Keywords & Characteristics]
    EXTRACT --> SEARCH_TERMS[Generate Search Terms]
    SEARCH_TERMS --> FDA_QUERY[Query OpenFDA API]
    
    FDA_QUERY --> RATE_LIMIT{Check Rate Limits}
    RATE_LIMIT -->|OK| API_CALL[Execute FDA API Call]
    RATE_LIMIT -->|Limited| CACHE_CHECK[Check Redis Cache]
    
    CACHE_CHECK -->|Hit| CACHED_RESULTS[Use Cached Results]
    CACHE_CHECK -->|Miss| WAIT[Wait for Rate Limit Reset]
    WAIT --> API_CALL
    
    API_CALL --> RESULTS[Raw FDA Results]
    CACHED_RESULTS --> RESULTS
    
    RESULTS --> SEMANTIC[Calculate Semantic Similarity]
    SEMANTIC --> TECH_EXTRACT[Extract Technical Characteristics]
    TECH_EXTRACT --> COMPARE[Generate Comparison Matrix]
    
    COMPARE --> SIMILARITIES[Identify Similarities]
    COMPARE --> DIFFERENCES[Identify Differences]
    
    SIMILARITIES --> CONFIDENCE[Calculate Confidence Score]
    DIFFERENCES --> RISK_ASSESS[Assess Risk Level]
    
    RISK_ASSESS --> TEST_RECS[Generate Testing Recommendations]
    CONFIDENCE --> RANK[Rank Predicate Candidates]
    TEST_RECS --> RANK
    
    RANK --> TOP_RESULTS[Select Top Predicates]
    TOP_RESULTS --> CACHE_STORE[Store in Cache]
    CACHE_STORE --> AUDIT_LOG[Log Search Activity]
    AUDIT_LOG --> RETURN[Return Analyzed Results]
    
    style FDA_QUERY fill:#fff3e0
    style CACHE_CHECK fill:#e8f5e8
    style SEMANTIC fill:#e1f5fe
    style RISK_ASSESS fill:#ffebee
```

**Explanation**: This detailed workflow shows how the FDA predicate search tool works, including rate limiting, caching, semantic analysis, and the generation of comprehensive comparison matrices with testing recommendations.

## 4. User Interface Flow

```mermaid
graph TD
    LANDING[Landing Page] --> AUTH{User Authenticated?}
    AUTH -->|No| LOGIN[Google OAuth Login]
    AUTH -->|Yes| DASHBOARD[Project Dashboard]
    
    LOGIN --> GOOGLE_AUTH[Google Authentication]
    GOOGLE_AUTH --> SESSION[Create User Session]
    SESSION --> DASHBOARD
    
    DASHBOARD --> PROJECT_SELECT{Select Action}
    PROJECT_SELECT -->|New Project| CREATE_PROJECT[Create New Project]
    PROJECT_SELECT -->|Existing Project| OPEN_PROJECT[Open Existing Project]
    
    CREATE_PROJECT --> PROJECT_FORM[Project Creation Form]
    PROJECT_FORM --> DEVICE_INFO[Enter Device Information]
    DEVICE_INFO --> SAVE_PROJECT[Save Project to Database]
    
    OPEN_PROJECT --> PROJECT_WORKSPACE[Project Workspace]
    SAVE_PROJECT --> PROJECT_WORKSPACE
    
    PROJECT_WORKSPACE --> AGENT_INTERFACE[Agent Chat Interface]
    AGENT_INTERFACE --> TASK_SELECT{Select Task}
    
    TASK_SELECT -->|Classification| CLASS_FORM[Device Classification Form]
    TASK_SELECT -->|Predicate Search| PRED_FORM[Predicate Search Form]
    TASK_SELECT -->|Comparison| COMP_FORM[Predicate Comparison Form]
    TASK_SELECT -->|Guidance| GUIDE_FORM[Guidance Search Form]
    
    CLASS_FORM --> SUBMIT_CLASS[Submit Classification Request]
    PRED_FORM --> SUBMIT_PRED[Submit Predicate Search]
    COMP_FORM --> SUBMIT_COMP[Submit Comparison Request]
    GUIDE_FORM --> SUBMIT_GUIDE[Submit Guidance Search]
    
    SUBMIT_CLASS --> LOADING[Show Loading State]
    SUBMIT_PRED --> LOADING
    SUBMIT_COMP --> LOADING
    SUBMIT_GUIDE --> LOADING
    
    LOADING --> WS_UPDATE[WebSocket Updates]
    WS_UPDATE --> PROGRESS[Show Progress Indicators]
    PROGRESS --> RESULTS[Display Results]
    
    RESULTS --> EXPORT{Export Options}
    EXPORT -->|PDF| PDF_EXPORT[Generate PDF Report]
    EXPORT -->|JSON| JSON_EXPORT[Export JSON Data]
    EXPORT -->|Continue| AGENT_INTERFACE
    
    PDF_EXPORT --> DOWNLOAD[Download File]
    JSON_EXPORT --> DOWNLOAD
    DOWNLOAD --> AGENT_INTERFACE
    
    style AUTH fill:#e8f5e8
    style LOADING fill:#fff3e0
    style RESULTS fill:#e1f5fe
```

**Explanation**: This flowchart shows the complete user journey from authentication through project creation to task execution and results export. The interface uses real-time WebSocket updates to show progress during long-running operations.

## 5. Data Flow and State Management

```mermaid
graph LR
    subgraph "Frontend State"
        REACT[React State]
        FORM[Form State]
        CACHE[Client Cache]
    end
    
    subgraph "Agent State"
        SESSION[Session State]
        TASK[Task State]
        HISTORY[Action History]
        CHECKPOINTS[Checkpoints]
    end
    
    subgraph "Database State"
        PROJECTS[Projects Table]
        PREDICATES[Predicate Devices Table]
        INTERACTIONS[Agent Interactions Table]
        AUDIT[Audit Trail Table]
    end
    
    subgraph "External State"
        FDA_CACHE[FDA API Cache]
        REDIS_SESSION[Redis Sessions]
        FILE_STORAGE[File Storage]
    end
    
    REACT <--> API_LAYER[API Layer]
    FORM --> API_LAYER
    CACHE <--> API_LAYER
    
    API_LAYER <--> SESSION
    API_LAYER <--> TASK
    
    SESSION --> HISTORY
    TASK --> CHECKPOINTS
    
    HISTORY --> INTERACTIONS
    CHECKPOINTS --> INTERACTIONS
    
    SESSION <--> PROJECTS
    TASK --> PREDICATES
    
    API_LAYER <--> FDA_CACHE
    SESSION <--> REDIS_SESSION
    
    INTERACTIONS --> AUDIT
    PREDICATES --> FILE_STORAGE
    
    style SESSION fill:#e1f5fe
    style AUDIT fill:#f3e5f5
    style FDA_CACHE fill:#fff3e0
```

**Explanation**: This diagram illustrates how data flows through the system and how different types of state are managed. The system maintains state at multiple levels: frontend React state, agent session state, database persistence, and external caches for performance.

## 6. Error Handling and Recovery

```mermaid
graph TD
    ERROR[Error Occurs] --> CLASSIFY{Classify Error Type}
    
    CLASSIFY -->|FDA API Error| FDA_ERROR[FDA API Error Handler]
    CLASSIFY -->|Tool Error| TOOL_ERROR[Tool Error Handler]
    CLASSIFY -->|Database Error| DB_ERROR[Database Error Handler]
    CLASSIFY -->|Network Error| NET_ERROR[Network Error Handler]
    
    FDA_ERROR --> FDA_RETRY{Retry Possible?}
    FDA_RETRY -->|Yes| FDA_BACKOFF[Exponential Backoff]
    FDA_RETRY -->|No| FDA_FALLBACK[Use Cached Data]
    
    TOOL_ERROR --> TOOL_RECOVERY[Tool Recovery Logic]
    TOOL_RECOVERY --> ALT_TOOL{Alternative Tool Available?}
    ALT_TOOL -->|Yes| USE_ALT[Use Alternative Tool]
    ALT_TOOL -->|No| GRACEFUL_FAIL[Graceful Failure]
    
    DB_ERROR --> DB_RETRY[Database Retry]
    DB_RETRY --> DB_SUCCESS{Success?}
    DB_SUCCESS -->|Yes| CONTINUE[Continue Operation]
    DB_SUCCESS -->|No| DB_FALLBACK[Use In-Memory State]
    
    NET_ERROR --> NET_RETRY[Network Retry]
    NET_RETRY --> OFFLINE_MODE[Enable Offline Mode]
    
    FDA_BACKOFF --> FDA_SUCCESS{Success?}
    FDA_SUCCESS -->|Yes| CONTINUE
    FDA_SUCCESS -->|No| FDA_FALLBACK
    
    FDA_FALLBACK --> USER_NOTIFY[Notify User of Limitation]
    USE_ALT --> CONTINUE
    GRACEFUL_FAIL --> USER_NOTIFY
    DB_FALLBACK --> USER_NOTIFY
    OFFLINE_MODE --> USER_NOTIFY
    
    USER_NOTIFY --> LOG_ERROR[Log Error Details]
    CONTINUE --> LOG_SUCCESS[Log Recovery Success]
    
    LOG_ERROR --> AUDIT_TRAIL[Update Audit Trail]
    LOG_SUCCESS --> AUDIT_TRAIL
    
    AUDIT_TRAIL --> MONITOR[Update Monitoring Metrics]
    MONITOR --> END[Continue or Terminate]
    
    style ERROR fill:#ffebee
    style USER_NOTIFY fill:#fff3e0
    style AUDIT_TRAIL fill:#f3e5f5
```

**Explanation**: This flowchart shows the comprehensive error handling and recovery system. The system classifies errors by type and applies appropriate recovery strategies, including retries, fallbacks, and graceful degradation while maintaining full audit trails.

## 7. Compliance and Audit Trail

```mermaid
graph TD
    ACTION[User/Agent Action] --> CAPTURE[Capture Action Details]
    CAPTURE --> METADATA[Collect Metadata]
    
    METADATA --> INPUT_DATA[Record Input Data]
    METADATA --> OUTPUT_DATA[Record Output Data]
    METADATA --> CONFIDENCE[Record Confidence Score]
    METADATA --> SOURCES[Record Source Citations]
    METADATA --> REASONING[Record Reasoning Trace]
    
    INPUT_DATA --> VALIDATE[Validate Data Integrity]
    OUTPUT_DATA --> VALIDATE
    CONFIDENCE --> VALIDATE
    SOURCES --> VALIDATE
    REASONING --> VALIDATE
    
    VALIDATE --> TIMESTAMP[Add Timestamp]
    TIMESTAMP --> USER_ID[Add User Identification]
    USER_ID --> SESSION_ID[Add Session Identification]
    
    SESSION_ID --> ENCRYPT[Encrypt Sensitive Data]
    ENCRYPT --> STORE_DB[Store in Database]
    
    STORE_DB --> INDEX[Create Search Indexes]
    INDEX --> BACKUP[Backup to Storage]
    
    BACKUP --> COMPLIANCE_CHECK[Compliance Validation]
    COMPLIANCE_CHECK --> RETENTION[Apply Retention Policy]
    
    RETENTION --> EXPORT_READY[Mark for Export]
    EXPORT_READY --> MONITOR[Monitor Access]
    
    MONITOR --> ALERT{Unusual Access?}
    ALERT -->|Yes| SECURITY_LOG[Security Alert]
    ALERT -->|No| CONTINUE_MONITOR[Continue Monitoring]
    
    SECURITY_LOG --> INVESTIGATE[Trigger Investigation]
    CONTINUE_MONITOR --> PERIODIC_REVIEW[Periodic Review]
    
    INVESTIGATE --> REPORT[Generate Security Report]
    PERIODIC_REVIEW --> COMPLIANCE_REPORT[Generate Compliance Report]
    
    REPORT --> ARCHIVE[Archive Records]
    COMPLIANCE_REPORT --> ARCHIVE
    
    style CAPTURE fill:#e8f5e8
    style ENCRYPT fill:#ffebee
    style COMPLIANCE_CHECK fill:#f3e5f5
    style SECURITY_LOG fill:#fff3e0
```

**Explanation**: This flowchart details the comprehensive audit trail and compliance system. Every action is captured with full metadata, encrypted for security, and monitored for compliance with regulatory requirements. The system maintains immutable audit logs suitable for FDA inspections.

## Summary

These flowcharts illustrate the sophisticated architecture of the Medical Device Regulatory Assistant:

1. **Modular Architecture**: Clear separation between frontend, API, agent, and data layers
2. **Intelligent Agents**: LangGraph-based agents with state management and checkpointing
3. **Comprehensive Analysis**: Advanced FDA predicate search with semantic analysis and risk assessment
4. **User-Centric Design**: Intuitive interface with real-time updates and multiple export options
5. **Robust Error Handling**: Multi-level error recovery with graceful degradation
6. **Regulatory Compliance**: Complete audit trails and compliance monitoring suitable for FDA requirements

The system successfully transforms the complex, manual process of FDA regulatory pathway discovery into an automated, AI-powered workflow that reduces time from days to hours while maintaining the rigor required for regulatory submissions.