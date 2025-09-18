# Requirements Document

## Introduction

This document outlines the requirements for a cross-platform command line tool that provides an interactive interface for selecting and running tests across both frontend (Next.js/Jest) and backend (Python/pytest) components of the Medical Device Regulatory Assistant project. The tool will dynamically discover available tests and provide organized options for different test categories and execution modes.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to select between frontend and backend test environments, so that I can focus on testing specific parts of the application.

#### Acceptance Criteria

1. WHEN the tool is launched THEN the system SHALL present a main menu with "Frontend Tests" and "Backend Tests" options
2. WHEN a user selects "Frontend Tests" THEN the system SHALL switch to the frontend test environment using pnpm/Jest
3. WHEN a user selects "Backend Tests" THEN the system SHALL switch to the backend test environment using Poetry/pytest
4. WHEN switching environments THEN the system SHALL validate that the required tools (pnpm, poetry) are available
5. IF required tools are missing THEN the system SHALL display helpful installation instructions

### Requirement 2

**User Story:** As a developer, I want the tool to automatically discover available test files, so that I don't need to manually specify test paths.

#### Acceptance Criteria

1. WHEN in frontend mode THEN the system SHALL scan the `src/__tests__/` directory and subdirectories for test files
2. WHEN in backend mode THEN the system SHALL scan the `backend/tests/` directory and subdirectories for test files
3. WHEN scanning directories THEN the system SHALL identify test files by patterns: `*.test.{js,jsx,ts,tsx}`, `*.spec.{js,jsx,ts,tsx}` for frontend and `test_*.py`, `*_test.py` for backend
4. WHEN test files are discovered THEN the system SHALL organize them by directory structure for easy navigation
5. WHEN no test files are found THEN the system SHALL display an appropriate message and return to the main menu

### Requirement 3

**User Story:** As a developer, I want to run all tests at once, so that I can perform comprehensive testing quickly.

#### Acceptance Criteria

1. WHEN viewing test options THEN the system SHALL provide a "Run All Tests" option at the top of the list
2. WHEN "Run All Tests" is selected for frontend THEN the system SHALL execute `pnpm test` with appropriate performance flags
3. WHEN "Run All Tests" is selected for backend THEN the system SHALL execute `poetry run python -m pytest tests/ -v`
4. WHEN running all tests THEN the system SHALL display real-time progress and results
5. WHEN all tests complete THEN the system SHALL provide a summary of passed/failed tests

### Requirement 4

**User Story:** As a developer, I want to select tests by category (unit, integration, accessibility), so that I can run specific types of tests efficiently.

#### Acceptance Criteria

1. WHEN viewing test options THEN the system SHALL provide category filters: "Unit Tests", "Integration Tests", "Accessibility Tests"
2. WHEN "Unit Tests" is selected for frontend THEN the system SHALL run `pnpm test:unit` 
3. WHEN "Integration Tests" is selected for frontend THEN the system SHALL run `pnpm test:integration`
4. WHEN "Accessibility Tests" is selected for frontend THEN the system SHALL run `pnpm test:accessibility`
5. WHEN "Unit Tests" is selected for backend THEN the system SHALL run `poetry run python -m pytest tests/unit/ -v`
6. WHEN "Integration Tests" is selected for backend THEN the system SHALL run `poetry run python -m pytest tests/integration/ -v`
7. WHEN category tests complete THEN the system SHALL display category-specific results and statistics

### Requirement 5

**User Story:** As a developer, I want to select from predefined test modes from the comprehensive test guide, so that I can use optimized test execution strategies.

#### Acceptance Criteria

1. WHEN viewing test options THEN the system SHALL provide a "Test Modes" submenu with predefined execution modes
2. WHEN "Test Modes" is accessed THEN the system SHALL read available modes from `docs/test-guide/comprehensive-test-guide.md`
3. WHEN test modes are loaded THEN the system SHALL present options including:
   - "Ultra-Fast Health Check" (< 5 seconds)
   - "Error-Only Analysis" (< 10 seconds) 
   - "Coverage Summary" (< 15 seconds)
   - "Performance Tests"
   - "E2E Tests"
4. WHEN a test mode is selected THEN the system SHALL execute the corresponding optimized command from the guide
5. WHEN using "Ultra-Fast Health Check" THEN the system SHALL run tests with `--bail --maxWorkers=100% --cache --silent --reporters=summary` flags
6. WHEN using "Error-Only Analysis" THEN the system SHALL run tests with `--silent --onlyFailures --maxWorkers=100% --cache` flags

### Requirement 6

**User Story:** As a developer, I want to select individual test files or directories, so that I can focus on specific components during development.

#### Acceptance Criteria

1. WHEN viewing discovered tests THEN the system SHALL display them in a hierarchical tree structure
2. WHEN a directory is selected THEN the system SHALL show all test files within that directory
3. WHEN an individual test file is selected THEN the system SHALL run only that specific test file
4. WHEN running individual tests THEN the system SHALL use optimized single-file execution commands
5. WHEN individual test execution completes THEN the system SHALL provide detailed results for that specific test

### Requirement 7

**User Story:** As a developer, I want the tool to work consistently across Windows, macOS, and Linux, so that all team members can use the same testing workflow.

#### Acceptance Criteria

1. WHEN the tool is executed on Windows THEN the system SHALL use appropriate Windows command syntax and path separators
2. WHEN the tool is executed on macOS/Linux THEN the system SHALL use appropriate Unix command syntax and path separators
3. WHEN detecting package managers THEN the system SHALL check for availability using cross-platform detection methods
4. WHEN executing commands THEN the system SHALL handle platform-specific shell differences (cmd, PowerShell, bash, zsh)
5. WHEN displaying paths THEN the system SHALL use the correct path separator for the current platform

### Requirement 8

**User Story:** As a developer, I want clear feedback and error handling, so that I can understand what's happening and resolve issues quickly.

#### Acceptance Criteria

1. WHEN commands are executing THEN the system SHALL display real-time progress indicators
2. WHEN tests fail THEN the system SHALL display clear error messages with actionable information
3. WHEN dependencies are missing THEN the system SHALL provide specific installation instructions
4. WHEN invalid selections are made THEN the system SHALL display helpful error messages and return to the previous menu
5. WHEN tests complete THEN the system SHALL provide a clear summary with pass/fail counts and execution time

### Requirement 9

**User Story:** As a developer, I want to easily navigate back and forth between menus, so that I can efficiently explore different testing options.

#### Acceptance Criteria

1. WHEN in any submenu THEN the system SHALL provide a "Back" option to return to the previous menu
2. WHEN in any menu THEN the system SHALL provide a "Main Menu" option to return to the top level
3. WHEN in any menu THEN the system SHALL provide an "Exit" option to quit the tool
4. WHEN navigation options are displayed THEN the system SHALL use consistent numbering and clear labels
5. WHEN invalid menu selections are made THEN the system SHALL prompt for a valid selection without exiting

### Requirement 10

**User Story:** As a developer, I want the tool to remember my preferences during a session, so that I can quickly repeat common testing workflows.

#### Acceptance Criteria

1. WHEN switching between frontend and backend THEN the system SHALL remember the last selected environment
2. WHEN returning to test selection THEN the system SHALL highlight recently used test categories
3. WHEN displaying test modes THEN the system SHALL show the most recently used mode first
4. WHEN the session ends THEN the system SHALL not persist preferences across different tool launches
5. WHEN preferences are applied THEN the system SHALL provide visual indicators of remembered selections