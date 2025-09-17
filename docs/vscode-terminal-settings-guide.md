# VSCode Terminal Settings Guide

This comprehensive guide explains how to configure VSCode terminal settings and other important configuration options for the Medical Device Regulatory Assistant project.

## Table of Contents

1. [Terminal Configuration](#terminal-configuration)
2. [Kiro Agent Settings](#kiro-agent-settings)
3. [TypeScript Configuration](#typescript-configuration)
4. [Additional VSCode Settings](#additional-vscode-settings)
5. [Kiro-Specific Configuration](#kiro-specific-configuration)
6. [Best Practices](#best-practices)

## Terminal Configuration

### How .vscode/settings.json Works

The `.vscode/settings.json` file contains workspace-specific settings that override user settings for this project. These settings are applied automatically when you open the workspace in VSCode.

### Current Terminal Settings

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell 7+",
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.defaultProfile.linux": "bash",

  "terminal.integrated.profiles.windows": {
    "PowerShell 7+": {
      "path": [
        "${env:ProgramFiles}\\PowerShell\\7\\pwsh.exe",
        "${env:ProgramFiles(x86)}\\PowerShell\\7\\pwsh.exe",
        "${env:USERPROFILE}\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe",
        "pwsh.exe"
      ],
      "args": ["-NoLogo"],
      "icon": "terminal-powershell"
    }
  },

  "terminal.integrated.profiles.osx": {
    "zsh": {
      "path": "zsh",
      "args": ["-l"]
    }
  },

  "terminal.integrated.profiles.linux": {
    "bash": {
      "path": "bash",
      "args": ["-l"]
    }
  },

  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.showWelcome": false
}
```

### Terminal Setting Explanations

#### Default Profiles
- **Windows**: Uses PowerShell 7+ as the default terminal
- **macOS**: Uses zsh (Z shell) as the default terminal
- **Linux**: Uses bash as the default terminal

#### PowerShell 7+ Configuration
- **Path Array**: VSCode tries multiple locations to find PowerShell 7+
  - Program Files (64-bit)
  - Program Files (x86) (32-bit)
  - User profile Windows Apps
  - System PATH
- **Args**: `["-NoLogo"]` removes the PowerShell startup banner
- **Icon**: Uses the PowerShell icon in the terminal tab

#### Shell Integration
- **Enabled**: Provides enhanced terminal features like command detection
- **Show Welcome**: Disabled to reduce terminal clutter

## Kiro Agent Settings

### Trusted Commands Configuration

The `kiroAgent.trustedCommands` setting defines which commands Kiro can execute without user approval:

```json
{
  "kiroAgent.trustedCommands": [
    // Safe, Read-Only Commands
    "cls", "clear", "ls", "ls -F", "ls -l",
    "cat *", "head *", "tail *", "grep *",
    "pwd", "whoami", "id",

    // Version Control Commands
    "git status", "git diff", "git log", "git branch",
    "git pull", "git add .", "git stash",
    "git checkout", "git commit -m",

    // Project Build & Test Commands
    "pnpm install", "pnpm test", "pnpm dev", "pnpm build",
    "poetry install", "npm install", "npm test",
    "yarn install", "yarn test"
  ]
}
```

### Command Categories

#### Safe Read-Only Commands
- **File System**: `ls`, `cat`, `head`, `tail` - View files and directories
- **System Info**: `pwd`, `whoami`, `id` - Get current location and user info
- **Terminal**: `cls`, `clear` - Clear terminal output

#### Version Control Commands
- **Status**: `git status`, `git diff`, `git log` - View repository state
- **Branch Management**: `git branch`, `git checkout` - Switch branches
- **Changes**: `git add .`, `git commit -m`, `git pull`, `git stash` - Manage changes

#### Package Management Commands
- **pnpm**: Frontend package management for Next.js/React
- **poetry**: Python package management for FastAPI backend
- **npm/yarn**: Alternative package managers (fallback options)

## TypeScript Configuration

### Current TypeScript Settings

```json
{
  "typescript.autoClosingTags": false
}
```

This disables automatic closing of JSX/TSX tags, giving developers more control over tag completion.

## Additional VSCode Settings

### Recommended Editor Settings

These settings can enhance your development experience (add to `.vscode/settings.json`):

```json
{
  // Editor Configuration
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,

  // File Explorer
  "explorer.confirmDelete": false,
  "explorer.confirmDragAndDrop": false,
  "files.autoSave": "onFocusChange",

  // Search Configuration
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true,
    "**/.pytest_cache": true
  },

  // Language-Specific Settings
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.wordWrap": "on"
  }
}
```

### Extension-Specific Settings

```json
{
  // ESLint Configuration
  "eslint.workingDirectories": ["medical-device-regulatory-assistant"],
  "eslint.validate": ["javascript", "typescript", "typescriptreact"],

  // Python Configuration
  "python.defaultInterpreterPath": "./medical-device-regulatory-assistant/backend/.venv/bin/python",
  "python.terminal.activateEnvironment": true,

  // Prettier Configuration
  "prettier.configPath": "./medical-device-regulatory-assistant/.prettierrc",
  "prettier.ignorePath": "./medical-device-regulatory-assistant/.prettierignore",

  // Git Configuration
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true
}
```

## Kiro-Specific Configuration

### Kiro Settings Overview

Kiro uses several configuration files and settings:

#### 1. Steering Documents (`.kiro/steering/`)
- **Purpose**: Provide context and guidelines for AI interactions
- **Files**: `*.md` files with instructions and best practices
- **Usage**: Automatically included in AI context

#### 2. Specifications (`.kiro/specs/`)
- **Purpose**: Define feature requirements and implementation plans
- **Structure**: Organized by feature/task with execution history
- **Usage**: Track development progress and decisions

#### 3. MCP Configuration (`.kiro/settings/mcp.json`)
- **Purpose**: Configure Model Context Protocol servers
- **Usage**: Enable external tool integrations

### Kiro Workspace Settings

These settings can be configured in Kiro's interface:

#### Autopilot Mode Settings
- **Enabled**: Allow Kiro to make file changes automatically
- **Scope**: Define which files/folders Kiro can modify
- **Approval**: Set approval requirements for different actions

#### Chat Context Settings
- **File Context**: Enable `#File` and `#Folder` references
- **Problem Context**: Include `#Problems` from current file
- **Terminal Context**: Include `#Terminal` output
- **Git Context**: Include `#Git Diff` information
- **Codebase Context**: Enable `#Codebase` scanning

#### Agent Hook Settings
- **Triggers**: Define when hooks should execute
- **Actions**: Specify what actions hooks should perform
- **Scope**: Set which files/events trigger hooks

### MCP Server Configuration

Example MCP configuration for external tools:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "uvx",
      "args": ["sentry-mcp-server@latest"],
      "env": {
        "SENTRY_AUTH_TOKEN": "your-token-here"
      },
      "disabled": false,
      "autoApprove": ["sentry_whoami", "sentry_find_organizations"]
    },
    "playwright": {
      "command": "uvx",
      "args": ["playwright-mcp-server@latest"],
      "disabled": false,
      "autoApprove": ["browser_navigate", "browser_snapshot"]
    }
  }
}
```

## Best Practices

### Terminal Configuration
1. **Use PowerShell 7+** on Windows for better cross-platform compatibility
2. **Enable shell integration** for enhanced terminal features
3. **Disable welcome messages** to reduce clutter
4. **Configure trusted commands** carefully for security

### VSCode Settings
1. **Format on save** to maintain code consistency
2. **Enable ESLint auto-fix** for code quality
3. **Configure language-specific formatters** for different file types
4. **Exclude build directories** from search to improve performance

### Kiro Configuration
1. **Use steering documents** to provide consistent AI guidance
2. **Configure MCP servers** for external tool integrations
3. **Set appropriate autopilot permissions** for your workflow
4. **Use agent hooks** for automated tasks like testing and formatting

### Security Considerations
1. **Review trusted commands** regularly
2. **Limit autopilot scope** to prevent unintended changes
3. **Use environment variables** for sensitive configuration
4. **Keep MCP server configurations** secure and up-to-date

### Performance Optimization
1. **Exclude unnecessary directories** from file watching
2. **Configure appropriate search exclusions**
3. **Use workspace-specific settings** to avoid conflicts
4. **Enable auto-save** for better workflow efficiency

## Troubleshooting

### Common Terminal Issues
- **PowerShell not found**: Install PowerShell 7+ from Microsoft
- **Shell integration not working**: Restart VSCode after configuration changes
- **Commands not recognized**: Check PATH environment variable

### Kiro-Specific Issues
- **Trusted commands not working**: Verify command syntax matches exactly
- **MCP servers not connecting**: Check server installation and configuration
- **Steering documents not loading**: Verify file paths and markdown syntax

### Performance Issues
- **Slow file operations**: Add exclusions for large directories
- **High CPU usage**: Disable unnecessary extensions or features
- **Memory issues**: Increase VSCode memory limits if needed

This guide provides a comprehensive overview of VSCode and Kiro configuration options. Adjust settings based on your specific development needs and preferences.