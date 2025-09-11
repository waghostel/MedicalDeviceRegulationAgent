#!/bin/bash

# Package Manager Validation Script
# Validates pnpm (frontend) and poetry (backend) installations and configurations
# Requirements: 3.1, 7.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="medical-device-regulatory-assistant"
BACKEND_DIR="medical-device-regulatory-assistant/backend"
REQUIRED_NODE_VERSION="18.0.0"
REQUIRED_PYTHON_VERSION="3.11.0"

# Global validation status
VALIDATION_PASSED=true
WARNINGS=()
ERRORS=()
RECOMMENDATIONS=()

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    WARNINGS+=("$1")
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ERRORS+=("$1")
    VALIDATION_PASSED=false
}

log_recommendation() {
    echo -e "${YELLOW}[RECOMMENDATION]${NC} $1"
    RECOMMENDATIONS+=("$1")
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Simple version comparison (returns 0 if version1 >= version2)
version_gte() {
    local version1=$1
    local version2=$2
    
    # Use sort -V for version comparison
    local higher_version=$(printf '%s\n%s\n' "$version1" "$version2" | sort -V | tail -n1)
    
    if [[ "$higher_version" == "$version1" ]]; then
        return 0  # version1 >= version2
    else
        return 1  # version1 < version2
    fi
}

# Validate Node.js version
validate_node_version() {
    log_info "Validating Node.js version..."
    
    if ! command_exists node; then
        log_error "Node.js not installed. Install Node.js ${REQUIRED_NODE_VERSION}+ from https://nodejs.org/"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    
    if version_gte "$node_version" "$REQUIRED_NODE_VERSION"; then
        log_success "Node.js version $node_version meets requirements (>= $REQUIRED_NODE_VERSION)"
        return 0
    else
        log_error "Node.js version $node_version is below required version $REQUIRED_NODE_VERSION"
        log_recommendation "Update Node.js: Visit https://nodejs.org/ or use a version manager like nvm"
        return 1
    fi
}

# Validate Python version
validate_python_version() {
    log_info "Validating Python version..."
    
    if ! command_exists python3; then
        log_error "Python 3 not installed. Install Python ${REQUIRED_PYTHON_VERSION}+ from https://python.org/"
        return 1
    fi
    
    local python_version=$(python3 --version | awk '{print $2}')
    
    if version_gte "$python_version" "$REQUIRED_PYTHON_VERSION"; then
        log_success "Python version $python_version meets requirements (>= $REQUIRED_PYTHON_VERSION)"
        return 0
    else
        log_error "Python version $python_version is below required version $REQUIRED_PYTHON_VERSION"
        log_recommendation "Update Python: Visit https://python.org/ or use pyenv"
        return 1
    fi
}

# Validate pnpm installation and frontend setup
validate_frontend_setup() {
    log_info "Validating frontend package management (pnpm)..."
    
    # Check pnpm installation
    if ! command_exists pnpm; then
        log_error "pnpm not installed. Install with: npm install -g pnpm"
        log_recommendation "Alternative installation methods:"
        log_recommendation "  - Using npm: npm install -g pnpm"
        log_recommendation "  - Using Homebrew (macOS): brew install pnpm"
        log_recommendation "  - Using curl: curl -fsSL https://get.pnpm.io/install.sh | sh -"
        return 1
    fi
    
    local pnpm_version=$(pnpm --version)
    log_success "pnpm version $pnpm_version installed"
    
    # Check if we're in the correct directory or navigate to frontend
    if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
        log_error "Frontend package.json not found at $FRONTEND_DIR/package.json"
        log_recommendation "Ensure you're running this script from the project root directory"
        return 1
    fi
    
    # Validate package.json configuration
    log_info "Validating package.json configuration..."
    
    # Check packageManager field
    if grep -q '"packageManager"' "$FRONTEND_DIR/package.json"; then
        local package_manager=$(grep '"packageManager"' "$FRONTEND_DIR/package.json" | cut -d'"' -f4)
        if [[ "$package_manager" == pnpm* ]]; then
            log_success "packageManager field correctly specifies: $package_manager"
        else
            log_error "packageManager field specifies '$package_manager' instead of pnpm"
            log_recommendation "Update packageManager field to use pnpm"
            return 1
        fi
    else
        log_warning "packageManager field not specified in package.json"
        log_recommendation "Add '\"packageManager\": \"pnpm@9.0.0\"' to package.json"
    fi
    
    # Check for pnpm-lock.yaml
    if [[ ! -f "$FRONTEND_DIR/pnpm-lock.yaml" ]]; then
        log_warning "pnpm-lock.yaml not found"
        log_recommendation "Run 'cd $FRONTEND_DIR && pnpm install' to generate lock file"
    else
        log_success "pnpm-lock.yaml found"
        
        # Check if lock file is up to date
        if [[ "$FRONTEND_DIR/package.json" -nt "$FRONTEND_DIR/pnpm-lock.yaml" ]]; then
            log_warning "pnpm-lock.yaml appears outdated (package.json is newer)"
            log_recommendation "Run 'cd $FRONTEND_DIR && pnpm install' to update lock file"
        fi
    fi
    
    # Check for node_modules
    if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
        log_warning "node_modules directory not found"
        log_recommendation "Run 'cd $FRONTEND_DIR && pnpm install' to install dependencies"
    else
        log_success "node_modules directory found"
    fi
    
    # Validate scripts use pnpm
    log_info "Validating package.json scripts use pnpm..."
    local npm_scripts=0
    local yarn_scripts=0
    
    if grep -q '"npm ' "$FRONTEND_DIR/package.json" 2>/dev/null; then
        npm_scripts=$(grep -c '"npm ' "$FRONTEND_DIR/package.json" 2>/dev/null || echo "0")
    fi
    
    if grep -q '"yarn ' "$FRONTEND_DIR/package.json" 2>/dev/null; then
        yarn_scripts=$(grep -c '"yarn ' "$FRONTEND_DIR/package.json" 2>/dev/null || echo "0")
    fi
    
    if [[ $npm_scripts -gt 0 ]]; then
        log_warning "Found $npm_scripts script(s) using 'npm' instead of 'pnpm'"
        log_recommendation "Update scripts to use 'pnpm' instead of 'npm'"
    fi
    
    if [[ $yarn_scripts -gt 0 ]]; then
        log_warning "Found $yarn_scripts script(s) using 'yarn' instead of 'pnpm'"
        log_recommendation "Update scripts to use 'pnpm' instead of 'yarn'"
    fi
    
    return 0
}

# Validate Poetry installation and backend setup
validate_backend_setup() {
    log_info "Validating backend package management (Poetry)..."
    
    # Check Poetry installation
    if ! command_exists poetry; then
        log_error "Poetry not installed. Install with: pip install poetry"
        log_recommendation "Installation methods:"
        log_recommendation "  - Using pip: pip install poetry"
        log_recommendation "  - Using curl: curl -sSL https://install.python-poetry.org | python3 -"
        log_recommendation "  - Using Homebrew (macOS): brew install poetry"
        return 1
    fi
    
    local poetry_version=$(poetry --version | awk '{print $3}' | sed 's/)//')
    log_success "Poetry version $poetry_version installed"
    
    # Check if we can find pyproject.toml
    if [[ ! -f "$BACKEND_DIR/pyproject.toml" ]]; then
        log_error "Backend pyproject.toml not found at $BACKEND_DIR/pyproject.toml"
        log_recommendation "Ensure you're running this script from the project root directory"
        return 1
    fi
    
    # Validate pyproject.toml configuration
    log_info "Validating pyproject.toml configuration..."
    
    # Check for required sections
    if ! grep -q "\[tool.poetry\]" "$BACKEND_DIR/pyproject.toml"; then
        log_error "pyproject.toml missing [tool.poetry] section"
        return 1
    fi
    
    if ! grep -q "\[tool.poetry.dependencies\]" "$BACKEND_DIR/pyproject.toml"; then
        log_error "pyproject.toml missing [tool.poetry.dependencies] section"
        return 1
    fi
    
    log_success "pyproject.toml has required Poetry sections"
    
    # Check for poetry.lock
    if [[ ! -f "$BACKEND_DIR/poetry.lock" ]]; then
        log_warning "poetry.lock not found"
        log_recommendation "Run 'cd $BACKEND_DIR && poetry install' to generate lock file"
    else
        log_success "poetry.lock found"
        
        # Check if lock file is up to date
        if [[ "$BACKEND_DIR/pyproject.toml" -nt "$BACKEND_DIR/poetry.lock" ]]; then
            log_warning "poetry.lock appears outdated (pyproject.toml is newer)"
            log_recommendation "Run 'cd $BACKEND_DIR && poetry lock' to update lock file"
        fi
    fi
    
    # Check Poetry environment
    local current_dir=$(pwd)
    cd "$BACKEND_DIR"
    local poetry_env_info=$(poetry env info --path 2>/dev/null || echo "")
    cd "$current_dir"
    
    if [[ -z "$poetry_env_info" ]]; then
        log_warning "Poetry virtual environment not initialized"
        log_recommendation "Run 'cd $BACKEND_DIR && poetry install' to create virtual environment"
    else
        log_success "Poetry virtual environment found at: $poetry_env_info"
    fi
    
    return 0
}

# Validate dependency consistency
validate_dependency_consistency() {
    log_info "Validating dependency consistency..."
    
    # Check for conflicting package managers
    if [[ -f "$FRONTEND_DIR/package-lock.json" ]]; then
        log_warning "Found package-lock.json (npm) alongside pnpm-lock.yaml"
        log_recommendation "Remove package-lock.json: rm $FRONTEND_DIR/package-lock.json"
    fi
    
    if [[ -f "$FRONTEND_DIR/yarn.lock" ]]; then
        log_warning "Found yarn.lock alongside pnpm-lock.yaml"
        log_recommendation "Remove yarn.lock: rm $FRONTEND_DIR/yarn.lock"
    fi
    
    # Check for Python requirements.txt (should use Poetry instead)
    if [[ -f "$BACKEND_DIR/requirements.txt" ]]; then
        log_warning "Found requirements.txt in backend (Poetry project should not use requirements.txt)"
        log_recommendation "Remove requirements.txt and ensure all dependencies are in pyproject.toml"
    fi
    
    return 0
}

# Generate setup instructions
generate_setup_instructions() {
    if [[ ${#ERRORS[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
        return 0
    fi
    
    echo ""
    echo "=================================="
    echo "SETUP INSTRUCTIONS"
    echo "=================================="
    echo ""
    
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        echo -e "${RED}CRITICAL ISSUES (must fix):${NC}"
        for error in "${ERRORS[@]}"; do
            echo "  ❌ $error"
        done
        echo ""
    fi
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "${YELLOW}WARNINGS (recommended to fix):${NC}"
        for warning in "${WARNINGS[@]}"; do
            echo "  ⚠️  $warning"
        done
        echo ""
    fi
    
    if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
        echo -e "${BLUE}RECOMMENDATIONS:${NC}"
        for recommendation in "${RECOMMENDATIONS[@]}"; do
            echo "  💡 $recommendation"
        done
        echo ""
    fi
    
    echo "Quick Setup Commands:"
    echo "====================="
    echo ""
    echo "Frontend (pnpm):"
    echo "  cd $FRONTEND_DIR"
    echo "  pnpm install"
    echo "  pnpm dev"
    echo ""
    echo "Backend (Poetry):"
    echo "  cd $BACKEND_DIR"
    echo "  poetry install"
    echo "  poetry run uvicorn main:app --reload"
    echo ""
}

# Main validation function
main() {
    echo "=================================="
    echo "PACKAGE MANAGER VALIDATION"
    echo "=================================="
    echo ""
    
    # Validate system requirements
    validate_node_version
    validate_python_version
    
    echo ""
    
    # Validate package managers and project setup
    validate_frontend_setup
    echo ""
    validate_backend_setup
    echo ""
    validate_dependency_consistency
    
    echo ""
    echo "=================================="
    echo "VALIDATION SUMMARY"
    echo "=================================="
    
    if [[ $VALIDATION_PASSED == true ]]; then
        if [[ ${#WARNINGS[@]} -eq 0 ]]; then
            log_success "All validations passed! ✅"
            echo ""
            echo "Your development environment is properly configured."
            echo "You can start development with:"
            echo "  Frontend: cd $FRONTEND_DIR && pnpm dev"
            echo "  Backend:  cd $BACKEND_DIR && poetry run uvicorn main:app --reload"
        else
            log_success "Core validations passed with ${#WARNINGS[@]} warning(s) ⚠️"
        fi
    else
        log_error "Validation failed with ${#ERRORS[@]} error(s) ❌"
        echo ""
        echo "Please fix the errors above before proceeding with development."
    fi
    
    # Generate setup instructions if needed
    generate_setup_instructions
    
    # Exit with appropriate code
    if [[ $VALIDATION_PASSED == true ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"