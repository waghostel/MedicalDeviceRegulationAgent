# Error Fixing Report Creation Prompt

## Objective

Create a comprehensive error fixing report that combines detailed root cause analysis with actionable task lists. The report should serve as both a technical analysis document and an implementation guide for resolving system errors.

## Report Structure

The final report should follow this integrated format:

### 1. Executive Summary
- Brief overview of the error scope and impact
- Total number of affected components/tests/features
- High-level categorization of issues
- Priority assessment

### 2. Error Analysis by Category
For each major error category, include:

#### Category Header
- **Category Name** (with priority level)
- **Affected Components**: List of files, tests, or features impacted

#### Analysis Section
- **Error Patterns**: Specific error messages and symptoms
- **Root Cause Investigation**: Deep technical analysis of underlying issues
- **Evidence from Codebase**: References to actual code, configuration, or documentation
- **Impact Assessment**: How this category affects the overall system

#### Resolution Tasks Section
- **Task List**: Following the specified task format
- **Implementation Strategy**: Suggested approach and order
- **Success Criteria**: How to verify the fix works

### 3. Implementation Strategy
- **Phase-based approach**: Organize tasks by priority and dependencies
- **Resource requirements**: Time estimates and skill requirements
- **Risk assessment**: Potential complications and mitigation strategies

### 4. Success Metrics and Validation
- **Quantifiable targets**: Specific metrics to measure success
- **Testing strategy**: How to validate fixes
- **Monitoring approach**: Ongoing verification methods

## Execute Steps

1. **Read Related Files**: First, examine the error file and any related source files to understand the context
2. **Root Cause Analysis**: Identify the underlying cause of the problem by reviewing relevant code, configuration, or documentation files, divided them into several root cause categories if needed.
3. **Run Simple Tests**: If possible, suggest or run basic tests to verify the issue
4. **Use Additional Tools**: If the problem is complex, use the `sequentialthinking` MCP. For additional information, use the `Context7`, `fetch`, `deepwiki`, or `sentry` MCP as needed
5. **Create Comprehensive Report**: Create an integrated analysis and task document following the format below

## Requirements

### Analysis Requirements
- **Do not fix errors** - Focus on root cause analysis and solution proposing only
- Ask user to provide error message if you don't know what to fix
- Analyze the root causes thoroughly before writing tasks
- Categorize errors into logical groups when multiple errors are provided
- Include evidence from actual codebase examination
- Reference relevant documentation, specifications, or architectural decisions
- Distinguish between symptoms and underlying causes

### Task Requirements
- Include at least one sub-task under each major task
- Follow the exact task format specified below
- Focus on actionable solutions that address root causes, not just symptoms
- Ensure tasks are implementable and testable
- Create separate tasks if errors belong to different root causes
- Create feature-building tasks if root cause is missing functionality
- Mark as system setup issue if the root cause is environmental/configuration

### Documentation Requirements
- Read specs and steering documents for project context
- Reference architectural patterns and design decisions
- Include code snippets showing both problematic code and proposed fixes
- Provide test commands for validation
- Include implementation guidance and best practices

## File Path References

- `SPEC_FOLDER` = .kiro/specs/[Spec Folder]
- `STEERING_FOLDER` = .kiro/steering/
- `TASKS.MD` = <SPEC_FOLDER>/tasks.md
- `DESIGN.MD` = <SPEC_FOLDER>/design.md
- `REQUIREMENTS.MD` = <SPEC_FOLDER>/requirements.md

## Folder/File Explanation

- **specs folder**: Contains specification documents defining requirements, design, and implementation details
- **design.md**: Documents architectural design, technical approach, and system structure
- **requirements.md**: Outlines functional and non-functional requirements, constraints, and acceptance criteria
- **tasks.md**: Lists specific tasks, work items, or action items for project completion
- **steering folder**: Contains high-level documents providing strategic direction, project scope, and decision-making guidelines

## Task Creation Format

Each task must follow this exact format:

```markdown
- [ ] [Number]. [Task Title]
  - [Sub-task description 1]
  - [Sub-task description 2]
  - [Sub-task description 3]
  - [Additional sub-tasks as needed]
  - Potential root cause: [Detailed explanation of the underlying cause]
  - Potential solution: [Comprehensive solution approach]
  - Test command: [Specific command to validate the fix]
  - Code snippet: [Example of problematic code and proposed fix]
```

## Integration Guidelines

### Combining Analysis with Tasks
- Each error category should contain both analysis and resolution tasks
- Tasks should directly address the root causes identified in the analysis
- Include cross-references between analysis findings and task solutions
- Maintain traceability from symptoms to root causes to solutions

### Evidence-Based Approach
- Include actual error messages and stack traces
- Reference specific files, line numbers, and code patterns
- Cite relevant documentation or architectural decisions
- Provide before/after code examples

### Actionable Solutions
- Tasks should be specific and implementable
- Include validation steps and success criteria
- Provide implementation guidance and best practices
- Consider dependencies and implementation order

## Quality Checklist

Before finalizing the report, ensure:

- [ ] All error categories are clearly defined and prioritized
- [ ] Root cause analysis is thorough and evidence-based
- [ ] Tasks follow the exact specified format
- [ ] Code snippets show both problems and solutions
- [ ] Test commands are specific and executable
- [ ] Implementation strategy is realistic and phased
- [ ] Success metrics are quantifiable and measurable
- [ ] Cross-references between analysis and tasks are clear
- [ ] Technical depth is appropriate for the audience
- [ ] Report serves as both analysis and implementation guide

## Output Format

Create a single comprehensive markdown file that integrates:
1. Detailed technical analysis of error categories
2. Evidence-based root cause investigation
3. Actionable task lists with proper formatting
4. Implementation strategy and success metrics
5. Code examples and validation approaches

The final document should be self-contained and serve as both a technical reference and an actionable implementation guide for resolving the identified errors.

---

## Error Message Section

*[This section should be populated with the specific error messages, logs, or symptoms that need to be analyzed]*