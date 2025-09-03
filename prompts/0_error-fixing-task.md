
Analyze the cause of these error, propose a fixing solution and create a new task at the bottom of task in `task.md` follow the task format provided below. 

### Execute Rule
* Analyze the root cause of problem by first reading related file and run simple tests before write down the task and sub-task
* Use `sequentionalthinking` MCP When the problem is too complex
* Use `Context7`, `fetch`, `deepwiki`, or `sentry` MCP if need further information
* Make sure list at leaast one sub-task below the major task

### File Path
* `SPEC_FOLDER` = .kiro/specs/    
* `STEERING_FOLDER` = @.kiro/steering/ 

* `TASKS.MD` = <SPEC_FOLDER>/tasks.md
* `DESIGN.MD` = <SPEC_FOLDER>/design.md
* `REQUIREMENTS.MD` = <SPEC_FOLDER>/design.md

### Folder/file explanation
* spcs folder - A directory that contains specification documents defining the requirements, design, and implementation details for a software project or system.
* design.md - A markdown file that documents the architectural design, technical approach, and system structure for a project.
* requirements.md - A markdown file that outlines the functional and non-functional requirements, constraints, and acceptance criteria for a project.
* tasks.md - A markdown file that lists specific tasks, work items, or action items that need to be completed for a project.
* steering folder - A directory with high-level document that provides strategic direction, project scope, objectives, and decision-making guidelines to guide a project's overall direction.

## Task format example
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

### Major task example: 

```
- [ ] 23. Testing and Quality Assurance
```

### Sub-task example: 
```
  - Achieve >90% code coverage with unit and integration tests
  - Create end-to-end test suite covering all critical user journeys
  - Implement automated testing pipeline with GitHub Actions or similar
```  



-------------------------------------------------------------------------------------------------------

##　Error message

> medical-device-regulatory-assistant@0.1.0 dev C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant
> next dev --turbopack

   ▲ Next.js 15.5.2 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://192.168.15.14:3000

 ✓ Starting...
 ✓ Ready in 3.7s
 ○ Compiling / ...
 ✓ Compiled / in 8.9s
 ⨯ ./src/app/layout.tsx:3:1
Module not found: Can't resolve 'next-auth'
  1 | import type { Metadata } from 'next';
  2 | import { Geist, Geist_Mono } from 'next/font/google';
> 3 | import { getServerSession } from 'next-auth';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  4 | import { SessionProvider } from '@/components/providers/SessionProvider';
  5 | import { ProjectContextProvider } from '@/components/providers/ProjectContextProvider';
  6 | import { authOptions } from '@/lib/auth';



https://nextjs.org/docs/messages/module-not-found



./src/lib/auth.ts:2:1
Module not found: Can't resolve 'next-auth/providers/google'
  1 | import { NextAuthOptions } from "next-auth"
> 2 | import GoogleProvider from "next-auth/providers/google"
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  3 |
  4 | export const authOptions: NextAuthOptions = {
  5 |   providers: [



Import trace:
  Server Component:
    ./src/lib/auth.ts
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found



./src/components/providers/SessionProvider.tsx:3:1
Module not found: Can't resolve 'next-auth/react'
  1 | 'use client';
  2 |
> 3 | import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  4 | import { Session } from 'next-auth';
  5 |
  6 | interface SessionProviderProps {



Import trace:
  Server Component:
    ./src/components/providers/SessionProvider.tsx
    ./src/app/layout.tsx

https://nextjs.org/docs/messages/module-not-found


 ○ Compiling /_error ...
 ✓ Compiled /_error in 2.7s
 GET / 500 in 12198ms
 ○ Compiling /favicon.ico ...
 ✓ Compiled /favicon.ico in 1020ms
 GET /favicon.ico 500 in 1322ms