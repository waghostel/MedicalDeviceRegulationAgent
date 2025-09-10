Use **Playwright MCP** to browse the web, detect, and collect frontend or backend error messages. Record these errors in `ERROR_FILE` on a per-page basis.

### Execute Steps

1. **Start frontend/backend**: Launch the server in development mode by executing the `START_DEV` script.
2. **Start Playwright MCP**: Run Playwright MCP and open the frontend.
3. **Navigate pages**: Move through the pages and collect error messages (or potential issues) one by one, saving them to `ERROR_FILE` per page.

### Requirements

* Browse pages sequentially by clicking components in the left and top navigation menus.
* Interact as a real user would: click on clickable components, type into input fields, and perform possible user behaviors to surface potential errors or poor UX.
* Capture and record error messages using the specified error record format.

### File Path

* `STEERING_FOLDER` = .kiro/steering/
* `SPEC_FOLDER` = .kiro/specs/mvp-development-roadmap
* `TASKS.MD` = \<SPEC\_FOLDER>/tasks.md
* `DESIGN.MD` = \<SPEC\_FOLDER>/design.md
* `REQUIREMENTS.MD` = \<SPEC\_FOLDER>/requirements.md
* `START_DEV` = ./start-dev.sh
* `ERROR_FILE` = ./identified\_error.md

### Folder/File Explanation

* **specs folder** – Contains specification documents outlining requirements, design, and implementation details.
* **design.md** – Documents the architectural design, technical approach, and system structure.
* **requirements.md** – Outlines functional and non-functional requirements, constraints, and acceptance criteria.
* **tasks.md** – Lists specific tasks, work items, or action items for the project.
* **steering folder** – Provides strategic direction, project scope, objectives, and decision-making guidelines.

### Error Message Record Format

````
- [Page name 1]
  - [Error description 1]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Error description 2]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Error description 3]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Additional errors as needed]

- [Page name 2]
  - [Error description 1]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Error description 2]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Error description 3]
    - Captured error
    ```
    [Captured error messages]
    ```
  - [Additional errors as needed]
````
