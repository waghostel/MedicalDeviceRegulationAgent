# Next.js Frontend Component Analysis Prompt

Analyze this **Next.js project** and create a **page-based component investigation document**.
Follow the steps below:

---

### 1. Page Relationship Mapping

* Generate a **Mermaid diagram** that describes the relationship between each page (routes, navigation flow, shared layouts).

---

### 2. Page Components with Suggestions

For each page, analyze its components and document them in the following structure. Define and add a relevant emoji for each component.

```
## [Page Name]

- [OBJECT_TYPE EMOJI OBJECT_NAME]: [Describe the function and purpose of the component]
  - Suggestion: [Provide a modification or improvement suggestion]
  
- [BUTTON 🚀 submit]: Handles form submission by sending data to the server.
  - Suggestion: Add loading state and validation feedback.
  
- [BUTTON ❌ cancel]: Not implemented yet.
  - Suggestion: Implement navigation back to the index page.
```

---

### 3. Unimplemented Components

List all unimplemented components in a consistent format:

```
# Unimplemented Components

## [Page Name]
- [OBJECT_TYPE EMOJI OBJECT_NAME]: Intended purpose or expected function
- [BUTTON ❌ cancel]: Expected to redirect user to index page
- [NAVBAR 🔍 search]: Expected to filter results by keyword
```