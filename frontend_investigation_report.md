# Frontend Investigation Report

This document provides an analysis of the Next.js frontend components, based on the files in the `src/app` directory.

## 1. Page Relationship Mapping

```mermaid
graph TD
    subgraph "Root Layout (layout.tsx)"
        A[/" (page.tsx)"]
        B["/agent (agent/page.tsx)"]
        C["/audit (audit/page.tsx)"]
        D["/demo/navigation (demo/navigation/page.tsx)"]
        E["/editor (editor/page.tsx)"]
        F["/projects (projects/page.tsx)"]
        G["/projects/[id] (projects/[id]/page.tsx)"]
    end

    A --> F
    F --> G
    G --> F
    F --> B
    F --> E
```

**Description:**

*   The `RootLayout` wraps all pages, providing shared context like `SessionProvider` and `ProjectContextProvider`.
*   The home page (`/`) serves as a dashboard and entry point.
*   The `/projects` page lists all projects and allows creating new ones.
*   From `/projects`, a user can navigate to a specific project's detail page (`/projects/[id]`).
*   The project detail page links back to the main projects list.
*   The `/agent`, `/audit`, and `/editor` pages are likely accessed from within a project context, although direct navigation isn't explicitly shown in the provided page files. The diagram shows a likely flow from a project to these pages.
*   The `/demo/navigation` page is a standalone page for testing navigation components.

## 2. Page Components with Suggestions

### Root Layout (`layout.tsx`)

-   **PROVIDER SessionProvider**: Wraps the application to provide session context from `next-auth`.
    -   Suggestion: No immediate suggestion. This is standard practice.
-   **PROVIDER ProjectContextProvider**: Wraps the application to provide project-related context.
    -   Suggestion: Consider if this context is needed on all pages. If not, it could be moved to a more specific layout (e.g., for project-related pages) to avoid unnecessary context on pages like `/login` or `/about` if they were to be created.

### Home Page (`/`)

-   **LAYOUT AppLayout**: Main layout component for the page.
    -   Suggestion: The `AppLayout` component seems to be a core part of the application. It would be beneficial to analyze its implementation to understand its features (e.g., sidebar, header).
-   **CARD 📊 Project Status**: Displays the current status of the project (MVP).
    -   Suggestion: This could be made dynamic to reflect the actual project status from a backend or a configuration file.
-   **CARD 🚀 Next Steps**: Shows the next phase of development.
    -   Suggestion: This is likely static content for the MVP. In the future, this could be part of a project management or feature flagging system.
-   **CARD 🎯 Focus Area**: Highlights the current focus area (510(k)).
    -   Suggestion: Similar to "Next Steps", this could be made dynamic.
-   **CARD 👋 Welcome**: A welcome card with a description of the application.
    -   Suggestion: The list of "Core Capabilities (Coming Soon)" should be updated as features are implemented. Consider linking to the relevant pages as they are built.

### Agent Page (`/agent`)

-   **PROVIDER ProjectContextProvider**: Provides project context to the page.
    -   Suggestion: This is good, as the agent workflow is likely project-specific.
-   **COMPONENT 🤖 AgentWorkflowPage**: The main component for the agent workflow. It receives a `projectId` and `initialProject` as props.
    -   Suggestion: The `mockProject` data should be replaced with data fetched from an API based on the `projectId`. The page should handle loading and error states while fetching the project data.

### Audit Page (`/audit`)

-   **COMPONENT 📜 AuditLogPage**: Displays the audit log.
    -   Suggestion: The `AuditLogPage` component is likely fetching and displaying data. It should include features like pagination, filtering by date or user, and a search functionality to be more useful.

### Navigation Demo Page (`/demo/navigation`)

-   **LAYOUT AppLayout**: Main layout for the demo page.
    -   Suggestion: This page is a good example of how to use the `AppLayout` component with its various options (`showSidebar`, `showQuickActions`, etc.).
-   **COMPONENT 📁 FileExplorer**: A component for browsing files.
    -   Suggestion: The file explorer is using mock data. It should be connected to a real data source. The component should also handle folder expansion/collapse state more robustly.
-   **CARD ⌨️ Keyboard Shortcuts**: Displays a list of available keyboard shortcuts.
    -   Suggestion: This is a great feature for user experience. Ensure that the shortcuts are implemented globally and do not conflict with browser or OS shortcuts.
-   **CARD 📝 Action Log**: Logs actions performed on the page.
    -   Suggestion: This is a useful debugging tool. It could be enhanced with more detailed information and the ability to export the log.
-   **BUTTON ⚡️ Quick Actions**: Buttons to test quick actions.
    -   Suggestion: These buttons simulate the quick actions. The actual quick actions should be implemented in the `AppLayout` or a global command palette.

### Editor Page (`/editor`)

-   **COMPONENT ✍️ DocumentEditor**: The main component for editing documents.
    -   Suggestion: The `projectId` is hardcoded. It should be retrieved from the URL or context. The `DocumentEditor` should handle real-time collaboration if required, and should have robust saving and versioning capabilities.

### Projects Page (`/projects`)

-   **LAYOUT AppLayout**: Main layout for the projects page.
    -   Suggestion: Standard usage.
-   **COMPONENT 🗂️ ProjectList**: Displays a list of projects.
    -   Suggestion: The `ProjectList` should handle loading and error states from the `useProjects` hook. It should also include pagination for large numbers of projects.
-   **COMPONENT 📝 ProjectForm**: A form for creating and editing projects.
    -   Suggestion: The form should have client-side and server-side validation. It should also provide clear feedback to the user on success or failure of the create/update operations. The `useProjects` hook should handle optimistic updates for a better user experience.

### Project Detail Page (`/projects/[id]`)

-   **LAYOUT div**: The page uses a basic div as the root layout.
    -   Suggestion: Consider using the `AppLayout` component for consistency with other pages.
-   **BUTTON ⬅️ Back to Projects**: Navigates back to the projects list.
    -   Suggestion: This is good for navigation.
-   **BUTTON 🔄 Refresh**: Refreshes the project data.
    -   Suggestion: The refresh button is a good feature. The loading state is handled with `isRefreshing`.
-   **BUTTON ⚙️ Settings**: A button for project settings.
    -   Suggestion: The `onClick` handler for this button is not implemented.
-   **BUTTON 📤 Export**: A button to export project data.
    -   Suggestion: The `onClick` handler for this button is not implemented.
-   **COMPONENT 📈 RegulatoryDashboard**: The main component for the project dashboard.
    -   Suggestion: The dashboard is a complex component that seems to be the core of this page. It has its own loading and error states. The `useDashboard` hook seems to be doing a lot of work, which is good for separation of concerns. The WebSocket integration for real-time updates is noted as "legacy", which might indicate a future refactoring to use a more modern approach like server-sent events or a different real-time library.

## 3. Unimplemented Components

### Home Page (`/`)

-   **LIST Core Capabilities**: The list of core capabilities is marked as "Coming Soon".
    -   `Auto-classification with FDA product codes`
    -   `Predicate search & analysis with comparison tables`
    -   `FDA guidance document mapping`
    -   `Real-time FDA database integration`
    -   `510(k) submission checklist generator`

### Project Detail Page (`/projects/[id]`)

-   **BUTTON ⚙️ Settings**: The settings button has no `onClick` handler. It is expected to open a modal or navigate to a settings page for the project.
-   **BUTTON 📤 Export**: The export button has no `onClick` handler. It is expected to trigger a download of the project data in some format.