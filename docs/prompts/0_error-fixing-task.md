# Crete error fixing step 

Analyze the cause the error, propose a fixing solution and create a new task at the bottom of task in `task.md` follow the task format provided below. Do not fix error at this stage.

## Execute Steps

1. **Read Related Files**: First, examine the error file and any related source files to understand the context
2. **Root Cause Analysis**: Identify the underlying cause of the problem by reviewing relevant code, configuration, or documentation files
3. **Run Simple Tests**: If possible, suggest or run basic tests to verify the issue
4. **Use Additional Tools**: If the problem is complex, use the `sequentialthinking` MCP. For additional information, use the `Context7`, `fetch`, `deepwiki`, or `sentry` MCP as needed
5. **Create Task**: Create a task execution plan following this format in  SPEC_FOLDER

### Requirements**

* Ask user to provide error message if you don't know what to fix
* Analyze the root causes thoroughly before writing the task
* Include at least one sub-task under each major task
* Follow the exact format shown in the task examples
* Focus on actionable solutions
* Ensure the task addresses the underlying problem, not just the symptoms
* Read specs and steering document if need more detail about the project
* Try to create only one task, however, create multiple tasks is allowed if the error belong to different root causes
  
## File Path

* `SPEC_FOLDER` = .kiro/specs/[Spec Folder]
* `STEERING_FOLDER` = @.kiro/steering/
* `TASKS.MD` = <SPEC_FOLDER>/tasks.md
* `DESIGN.MD` = <SPEC_FOLDER>/design.md
* `REQUIREMENTS.MD` = <SPEC_FOLDER>/design.md

## Folder/file explanation

* spcs folder - A directory that contains specification documents defining the requirements, design, and implementation details for a software project or system.
* design.md - A markdown file that documents the architectural design, technical approach, and system structure for a project.
* requirements.md - A markdown file that outlines the functional and non-functional requirements, constraints, and acceptance criteria for a project.
* tasks.md - A markdown file that lists specific tasks, work items, or action items that need to be completed for a project.
* steering folder - A directory with high-level document that provides strategic direction, project scope, objectives, and decision-making guidelines to guide a project's overall direction.

### Task creation format

```markdown
- [ ] [Number]. [Task Title]
  - [Sub-task description 1]
  - [Sub-task description 2]
  - [Sub-task description 3]
  - [Additional sub-tasks as needed]
```

### Task format example

```markdown
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

```markdown
- [ ] 23. Testing and Quality Assurance
```

### Sub-task example

```markdown
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
```  

-------------------------------------------------------------------------

## 　Error message

-------------------------------------------------------------------------
