# Package Manager Guide

This guide explains the standardized package manager usage for the Medical Device Regulatory Assistant project.

## Overview

This project uses **standardized package managers** to ensure consistent development environments across all team members and deployment environments.

## Package Manager Standards

### Frontend: pnpm Only ✅

**Use**: `pnpm` for all frontend package management  
**Don't use**: `npm`, `yarn`, or other package managers  
**Why**: Better performance, disk space efficiency, and strict dependency resolution

### Backend: Poetry Only ✅

**Use**: `poetry` for all Python dependency management  
**Don't use**: `pip`, `conda`, `pipenv`, or other Python package managers  
**Why**: Deterministic builds, better dependency resolution, and integrated virtual environment management

## Installation

### Installing pnpm

Choose one of the following methods:

```bash
# Using npm (if you have Node.js)
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Using PowerShell (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### Installing Poetry

Choose one of the following methods:

```bash
# Using pip
pip install poetry

# Using curl (recommended)
curl -sSL https://install.python-poetry.org | python3 -

# Using Homebrew (macOS)
brew install poetry

# Using PowerShell (Windows)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -
```

## Validation Scripts

### Package Manager Validation

Run this script to validate your environment setup:

```bash
./scripts/validate-package-managers.sh
```

This script checks:
- Node.js and Python versions
- pnpm and Poetry installations
- Project configuration files
- Dependency consistency
- Lock file status

### Dependency Management

Use the comprehensive dependency management script:

```bash
# Validate all dependencies
./scripts/manage-dependencies.sh validate

# Update dependencies
./scripts/manage-dependencies.sh update

# Run security audit
./scripts/manage-dependencies.sh audit

# Clean and reinstall dependencies
./scripts/manage-dependencies.sh clean

# Check for outdated packages
./scripts/manage-dependencies.sh check-outdated

# Fix dependency conflicts
./scripts/manage-dependencies.sh fix-conflicts
```

### Lock File Management

Keep lock files up to date:

```bash
./scripts/update-lock-files.sh
```

## Development Workflow

### Frontend Development

```bash
cd medical-device-regulatory-assistant

# Install dependencies (first time or after package.json changes)
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Update dependencies
pnpm update

# Add new dependency
pnpm add package-name

# Add development dependency
pnpm add -D package-name

# Remove dependency
pnpm remove package-name
```

### Backend Development

```bash
cd medical-device-regulatory-assistant/backend

# Install dependencies (first time or after pyproject.toml changes)
poetry install

# Start development server
poetry run uvicorn main:app --reload

# Run tests
poetry run python -m pytest tests/ -v

# Add new dependency
poetry add package-name

# Add development dependency
poetry add --group dev package-name

# Remove dependency
poetry remove package-name

# Update dependencies
poetry update

# Show dependency tree
poetry show --tree
```

## Lock Files

### Frontend: pnpm-lock.yaml

- **Purpose**: Ensures exact dependency versions across environments
- **When to update**: Automatically updated when running `pnpm install`
- **Version control**: Always commit to git
- **Conflicts**: Remove `package-lock.json` and `yarn.lock` if present

### Backend: poetry.lock

- **Purpose**: Ensures exact dependency versions across environments
- **When to update**: Automatically updated when running `poetry install` or `poetry add`
- **Version control**: Always commit to git
- **Conflicts**: Remove `requirements.txt`, `Pipfile`, and `environment.yml` if present

## Common Issues and Solutions

### Issue: "pnpm not found"

**Solution**:
```bash
# Install pnpm globally
npm install -g pnpm

# Or use the installation script
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Issue: "Poetry not found"

**Solution**:
```bash
# Install Poetry using the official installer
curl -sSL https://install.python-poetry.org | python3 -

# Or use pip
pip install poetry
```

### Issue: "Lock file is outdated"

**Solution**:
```bash
# Frontend
cd medical-device-regulatory-assistant
pnpm install

# Backend
cd medical-device-regulatory-assistant/backend
poetry lock
```

### Issue: "Conflicting lock files found"

**Solution**:
```bash
# Remove conflicting files
rm package-lock.json yarn.lock  # Frontend
rm requirements.txt Pipfile environment.yml  # Backend

# Reinstall with correct package manager
pnpm install  # Frontend
poetry install  # Backend
```

### Issue: "Dependencies not installing"

**Solution**:
```bash
# Clear cache and reinstall
./scripts/manage-dependencies.sh clean
```

## Configuration Files

### Frontend Configuration

**package.json** should include:
```json
{
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Backend Configuration

**pyproject.toml** should include:
```toml
[tool.poetry]
name = "project-name"
version = "0.1.0"

[tool.poetry.dependencies]
python = ">=3.11,<3.14"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

## Best Practices

### Do's ✅

- Always use the designated package manager for each part of the project
- Commit lock files to version control
- Run validation scripts before pushing changes
- Keep dependencies up to date with security patches
- Use exact versions for critical dependencies

### Don'ts ❌

- Don't mix package managers (e.g., using npm in a pnpm project)
- Don't ignore lock files or add them to .gitignore
- Don't manually edit lock files
- Don't use global installations for project dependencies
- Don't skip dependency validation

## Automation

### Pre-commit Hooks

Consider adding these checks to your pre-commit hooks:

```bash
# Validate package managers
./scripts/validate-package-managers.sh

# Update lock files if needed
./scripts/update-lock-files.sh

# Run dependency validation
./scripts/manage-dependencies.sh validate
```

### CI/CD Integration

Include these steps in your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Validate Package Managers
  run: ./scripts/validate-package-managers.sh

- name: Install Frontend Dependencies
  run: |
    cd medical-device-regulatory-assistant
    pnpm install --frozen-lockfile

- name: Install Backend Dependencies
  run: |
    cd medical-device-regulatory-assistant/backend
    poetry install
```

## Troubleshooting

If you encounter issues:

1. **Run the validation script**: `./scripts/validate-package-managers.sh`
2. **Check for conflicting files**: Look for multiple lock files
3. **Clear caches**: Use `./scripts/manage-dependencies.sh clean`
4. **Update package managers**: Ensure you have the latest versions
5. **Check permissions**: Ensure you have write access to project directories

## Support

For additional help:

- Check the main [README.md](../Readme.md) for general setup instructions
- Review the [Environment Setup Guide](medical-device-regulatory-assistant/docs/ENVIRONMENT_SETUP_GUIDE.md)
- Run `./scripts/validate-package-managers.sh` for automated diagnostics
- Run `./scripts/manage-dependencies.sh --help` for dependency management options

## Version Requirements

### Minimum Versions

- **Node.js**: 18.0.0 or higher
- **Python**: 3.11.0 or higher
- **pnpm**: 8.0.0 or higher (9.0.0 recommended)
- **Poetry**: 1.4.0 or higher

### Recommended Versions

- **Node.js**: 20.x LTS
- **Python**: 3.12.x
- **pnpm**: Latest stable
- **Poetry**: Latest stable

This standardization ensures consistent, reliable, and maintainable development environments across the entire team.