Use Playwright MCP to browse the web and find frontend or backend error. List these errors in `ERROR_FILE`

### Execute Steps
1. **Start frontend/backend**: Start the server by executing the `START_DEV` script
1. **Start PlayWright MCP**: Start the PlayWright

### Requirements\*\*

- Ask user to provide error message if you don't know what to fix
- Analyze the root causes thoroughly before writing the task
- Include at least one sub-task under each major task
- Follow the exact format shown in the task examples
- Focus on actionable solutions
- Ensure the task addresses the underlying problem, not just the symptoms
- Start with the task execution plan before fixing anything
- Read specs and steering document if need more detail about the project
- Create task and subtask

### File Path

- `SPEC_FOLDER` = .kiro/specs/mvp-development-roadmap
- `STEERING_FOLDER` = @.kiro/steering/
- `TASKS.MD` = <SPEC_FOLDER>/tasks.md
- `DESIGN.MD` = <SPEC_FOLDER>/design.md
- `REQUIREMENTS.MD` = <SPEC_FOLDER>/design.md

### Folder/file explanation

- spcs folder - A directory that contains specification documents defining the requirements, design, and implementation details for a software project or system.
- design.md - A markdown file that documents the architectural design, technical approach, and system structure for a project.
- requirements.md - A markdown file that outlines the functional and non-functional requirements, constraints, and acceptance criteria for a project.
- tasks.md - A markdown file that lists specific tasks, work items, or action items that need to be completed for a project.
- steering folder - A directory with high-level document that provides strategic direction, project scope, objectives, and decision-making guidelines to guide a project's overall direction.

### Task creation format

```
- [ ] [Number]. [Task Title]
  - [Sub-task description 1]
  - [Sub-task description 2]
  - [Sub-task description 3]
  - [Additional sub-tasks as needed]
```

### Task format example

```
- [ ] 23. Testing and Quality Assurance
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
  - Add performance regression testing and monitoring
  - Create load testing for concurrent users and agent workflows
  - Implement security testing for authentication and data protection
  - Write user acceptance tests based on success metrics from requirements
```

### Major task example

```
- [ ] 23. Testing and Quality Assurance
```

### Sub-task example

```
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
```
