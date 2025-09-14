# Task Report Format

## Test-Driven Development (TDD)

- **Pre-Development**: Clearly define expected test outcomes before coding.
- **Post-Development**: Document all test results in the `./.kiro/specs/[your-spec-name]/task-execute-history/` folder to ensure traceability.
- In the devopment process or chat history, if the test script has been modified to skip or simplify some tests, make sure to honestly document these tests in **Undone tests/Skipped test**.

## Task Report Template

Each completed task requires a report:

- **Task**: [Task ID and Title]
- **Summary of Changes**
  - [Brief description of change #1]
  - [Brief description of change #2]
- **Test Plan & Results**
  - **Unit Tests**: [Description]
    - [Test command]
      - Result: [✔ All tests passed / ✘ Failures]
  - **Integration Tests**: [Description]
    - [Test command]
      - Result: [✔ Passed / ✘ Failures]
  - **Manual Verification**: [Steps & findings]
    - Result: [✔ Works as expected]
  - **Undone tests/Skipped test**:
    - [ ][Test name]
      - [Test command]
- **Code Snippets (Optional)**: Show relevant diffs or highlights.
