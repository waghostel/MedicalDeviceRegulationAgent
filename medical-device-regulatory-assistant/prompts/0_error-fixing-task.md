# Crete error fixing step 

Analyze the cause the error, propose a fixing solution and create a new task list `new_tasks.md` follow the task format provided below. Do not fix error at this stage.

## Execute Steps

1. **Read Related Files**: First, examine the error file and any related source files to understand the context
2. **Root Cause Analysis**: Identify the underlying cause of the problem by reviewing relevant code, configuration, or documentation files, divided them into several root cause categories if needed.
3. **Run Simple Tests**: If possible, suggest or run basic tests to verify the issue
4. **Use Additional Tools**: If the problem is complex, use the `sequentialthinking` MCP. For additional information, use the `Context7`, `fetch`, `deepwiki`, or `sentry` MCP as needed
5. **Create Task**: Create a task execution plan following named `new-tasks.md`

### Requirements**

* Do not fix error, focusing on the root causese analysis and solution proposing.
* Ask user to provide error message if you don't know what to fix
* Analyze the root causes thoroughly before writing the task
* Include at least one sub-task under each major task
* Follow the exact format shown in the task examples
* Focus on actionable solutions
* Ensure the task addresses the underlying problem, not just the symptoms
* Read specs and steering document if need more detail about the project
* Creating multiple tasks is allowed if the error belong to different root causes
* If there are many error provided, categorize them into several categories when creating the task lists.
* Creaee the task to build spcific feature if the root cause is comming from the missing feature.
* Describe it as a syssmte setup issue if the root cause is because it cannot be test in current system setup environment.

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
  - Potentional root cause: [Potentional root cause]
  - Potentional solution: [Potentional solution]
  - Test command:[Test command]
  - Code snippet: [Code snippet of the error code and propose fixing solution]
```
-------------------------------------------------------------------------

## 　Error message

-------------------------------------------------------------------------
