# Task Creation Guidance for Kiro Spec-Driven Development

## Overview

This document provides guidelines for creating properly formatted `tasks.md` files that Kiro can detect and execute as spec-driven tasks. Following these formatting rules ensures that your task files are recognized by Kiro's spec system and can be executed through the IDE.

## Required File Structure

### 1. File Location
Tasks must be located in the correct directory structure:
```
.kiro/specs/[spec-name]/tasks.md
```

### 2. Required Sections (in order)

#### A. Title and Introduction
```markdown
# Implementation Plan

Convert the [Spec Name] requirements into a series of prompts for a code-generation LLM that will implement each step in a test-driven manner. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.
```

#### B. Development Rules Section
```markdown
## Development Rules

- Use **`pnpm`** instead of npm for JavaScript/TypeScript.
- Use **`poetry`** for Python commands (e.g. `poetry run python test_document_tool.py`).
- Create the test script and run it instead of run it directly with `poetry run python -c`
- Follow **Test-Driven Development (TDD)**.
- Always clear the terminal before running a new command. Type the clear command first, press Enter, then type the actual command and press Enter again.

Example 1(Windows):

```bash
cls
<command>
```

Example 2 (Mac and Linux)

```bash
clear
<command>
```

- After reading this file, say: **"I will use poetry and pnpm"**.
```

#### C. Workflow Section
```markdown
## Workflow

1. Create a code-writing plan for the task.
2. Define the testing criteria.
3. Fetch related documentation (context7) if needed.
4. Implement the task/code.
5. Run tests after completing the task.
   - If tests fail, fetch additional documentation (context7).
6. Write a **task report** in `./.kiro/specs/[spec-name]/task-execute-history/` (e.g. `task-1.1.md`).
   - Be transparent about test results, especially if some tests require future verification.
```

#### D. Test-Driven Development Section
```markdown
## Test-Driven Development (TDD)

- **Pre-Development**: Clearly define expected test outcomes before coding.
- **Post-Development**: Document all test results in the `./.kiro/specs/[spec-name]/task-execute-history/` folder to ensure traceability.
```

#### E. Task Report Format Section
```markdown
## Task Report Format

Each completed task requires a report:

**Task Report**

- **Task**: [Task ID and Title]
- **Summary of Changes**
  - [Brief description of change #1]
  - [Brief description of change #2]
- **Test Plan & Results**
  - **Unit Tests**: [Description]
    - Result: [✔ All tests passed / ✘ Failures]
  - **Integration Tests**: [Description]
    - Result: [✔ Passed / ✘ Failures]
  - **Manual Verification**: [Steps & findings]
    - Result: [✔ Works as expected]
- **Code Snippets (Optional)**: Show relevant diffs or highlights.
```

### 3. Task Definitions

#### Task Format Requirements
- Use numbered sections for phases/categories
- Use checkbox format for individual tasks: `- [ ]` for incomplete, `- [x]` for complete
- Include task ID and descriptive title
- Add bullet points for task details
- Reference requirements using `_Requirements: X.X, Y.Y_` format

#### Example Task Structure
```markdown
## 1. Phase Name

- [ ] 1.1 Task Title
  - Detailed description of what needs to be done
  - Specific implementation requirements
  - Technical specifications
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Completed Task Title
  - Description of completed work
  - Implementation details
  - _Requirements: 2.1, 2.2_
```

## Critical Formatting Rules

### 1. File Ending
- **MUST** end with a single trailing newline character
- No extra blank lines at the end
- This is enforced by markdown linters

### 2. Markdown Compliance
- Follow standard markdown formatting
- Use proper heading hierarchy (# ## ###)
- Ensure code blocks have language specifications
- Maintain consistent indentation

### 3. Checkbox Format
- Use `- [ ]` for incomplete tasks (space between brackets)
- Use `- [x]` for completed tasks (x between brackets)
- Maintain consistent indentation for sub-items

### 4. Requirements References
- Always include `_Requirements: X.X, Y.Y_` at the end of task descriptions
- Reference the corresponding requirements.md file sections
- Use italics formatting with underscores

## Common Issues and Solutions

### Issue 1: Tasks Not Detected
**Symptoms**: Kiro doesn't recognize the tasks.md file as spec-driven
**Solutions**:
- Verify all required sections are present in correct order
- Check that Development Rules section includes the exact pnpm/poetry requirements
- Ensure file ends with single trailing newline
- Validate markdown formatting with a linter

### Issue 2: Task Execution Fails
**Symptoms**: Tasks are detected but fail to execute properly
**Solutions**:
- Verify task descriptions are clear and actionable
- Ensure requirements references are valid
- Check that task dependencies are properly ordered
- Validate that all required files exist (requirements.md, etc.)

### Issue 3: Formatting Warnings
**Symptoms**: Markdown linter warnings in IDE
**Solutions**:
- Add blank lines around headings
- Specify language for code blocks
- Fix list formatting and indentation
- Remove multiple consecutive blank lines

## Validation Checklist

Before committing a tasks.md file, verify:

- [ ] File is located in `.kiro/specs/[spec-name]/tasks.md`
- [ ] Contains all required sections in correct order
- [ ] Development Rules section includes pnpm/poetry requirements
- [ ] Workflow section references correct task-execute-history path
- [ ] Task Report Format section is complete
- [ ] All tasks use proper checkbox format
- [ ] Requirements references are included and valid
- [ ] File ends with single trailing newline
- [ ] No markdown linting errors
- [ ] Task descriptions are clear and actionable
- [ ] Task dependencies are properly ordered

## Example Template

```markdown
# Implementation Plan

Convert the [Your Spec Name] requirements into a series of prompts for a code-generation LLM that will implement each step in a test-driven manner. Prioritize best practices, incremental progress, and early testing, ensuring no big jumps in complexity at any stage. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Development Rules

- Use **`pnpm`** instead of npm for JavaScript/TypeScript.
- Use **`poetry`** for Python commands (e.g. `poetry run python test_document_tool.py`).
- Create the test script and run it instead of run it directly with `poetry run python -c`
- Follow **Test-Driven Development (TDD)**.
- Always clear the terminal before running a new command. Type the clear command first, press Enter, then type the actual command and press Enter again.

Example 1(Windows):

```bash
cls
<command>
```

Example 2 (Mac and Linux)

```bash
clear
<command>
```

- After reading this file, say: **"I will use poetry and pnpm"**.

## Workflow

1. Create a code-writing plan for the task.
2. Define the testing criteria.
3. Fetch related documentation (context7) if needed.
4. Implement the task/code.
5. Run tests after completing the task.
   - If tests fail, fetch additional documentation (context7).
6. Write a **task report** in `./.kiro/specs/[your-spec-name]/task-execute-history/` (e.g. `task-1.1.md`).
   - Be transparent about test results, especially if some tests require future verification.

## Test-Driven Development (TDD)

- **Pre-Development**: Clearly define expected test outcomes before coding.
- **Post-Development**: Document all test results in the `./.kiro/specs/[your-spec-name]/task-execute-history/` folder to ensure traceability.

## Task Report Format

Each completed task requires a report:

**Task Report**

- **Task**: [Task ID and Title]
- **Summary of Changes**
  - [Brief description of change #1]
  - [Brief description of change #2]
- **Test Plan & Results**
  - **Unit Tests**: [Description]
    - Result: [✔ All tests passed / ✘ Failures]
  - **Integration Tests**: [Description]
    - Result: [✔ Passed / ✘ Failures]
  - **Manual Verification**: [Steps & findings]
    - Result: [✔ Works as expected]
- **Code Snippets (Optional)**: Show relevant diffs or highlights.

## 1. Your First Phase

- [ ] 1.1 Your First Task
  - Describe what needs to be implemented
  - Include specific technical requirements
  - Add any important constraints or considerations
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 Your Second Task
  - Build on the previous task
  - Ensure integration with existing code
  - Include testing requirements
  - _Requirements: 1.3, 2.1_
```

## Best Practices

1. **Keep Tasks Atomic**: Each task should be completable in a single session
2. **Maintain Dependencies**: Ensure tasks build on each other logically
3. **Include Testing**: Every task should have associated test requirements
4. **Reference Requirements**: Always link back to the requirements.md file
5. **Use Clear Descriptions**: Make task descriptions actionable and specific
6. **Follow TDD**: Emphasize test-first development approach
7. **Document Everything**: Require comprehensive task reports
8. **Version Control**: Keep task files in version control for tracking

This guidance ensures that your tasks.md files will be properly recognized and executed by Kiro's spec-driven development system.