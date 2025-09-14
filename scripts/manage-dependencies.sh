#!/bin/bash

# Dependency Management Script
# Validates package version consistency, manages lock files, and detects conflicts
# Requirements: 3.1, 3.2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="medical-device-regulatory-assistant"
BACKEND_DIR="medical-device-regulatory-assistant/backend"

# Global status
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
    echo -e "${CYAN}[RECOMMENDATION]${NC} $1"
    RECOMMENDATIONS+=("$1")
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Show usage information
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  validate      Validate dependency consistency and lock files"
    echo "  update        Update dependencies and lock files"
    echo "  audit         Run security audit on dependencies"
    echo "  clean         Clean dependency caches and reinstall"
    echo "  check-outdated Check for outdated dependencies"
    echo "  fix-conflicts  Attempt to fix dependency conflicts"
    echo ""
    echo "Options:"
    echo "  --frontend-only   Only process frontend dependencies"
    echo "  --backend-only    Only process backend dependencies"
    echo "  --dry-run         Show what would be done without making changes"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 validate                    # Validate all dependencies"
    echo "  $0 update --frontend-only      # Update only frontend dependencies"
    echo "  $0 audit                       # Run security audit"
    echo "  $0 clean                       # Clean and reinstall all dependencies"
}

# Parse command line arguments
COMMAND=""
FRONTEND_ONLY=false
BACKEND_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        validate|update|audit|clean|check-outdated|fix-conflicts)
            COMMAND="$1"
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    echo "Error: No command specified"
    echo ""
    show_usage
    exit 1
fi

# Validate frontend dependencies
validate_frontend_dependencies() {
    if [[ "$BACKEND_ONLY" == true ]]; then
        return 0
    fi
    
    log_info "Validating frontend dependencies..."
    
    if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
        log_error "Frontend package.json not found"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Check for lock file
    if [[ ! -f "pnpm-lock.yaml" ]]; then
        log_error "pnpm-lock.yaml not found"
        log_recommendation "Run 'pnpm install' to generate lock file"
        cd - > /dev/null
        return 1
    fi
    
    # Check if lock file is up to date
    if [[ "package.json" -nt "pnpm-lock.yaml" ]]; then
        log_warning "pnpm-lock.yaml is outdated"
        log_recommendation "Run 'pnpm install' to update lock file"
    fi
    
    # Check for conflicting lock files
    if [[ -f "package-lock.json" ]]; then
        log_warning "Found package-lock.json (npm) alongside pnpm-lock.yaml"
        log_recommendation "Remove package-lock.json: rm package-lock.json"
    fi
    
    if [[ -f "yarn.lock" ]]; then
        log_warning "Found yarn.lock alongside pnpm-lock.yaml"
        log_recommendation "Remove yarn.lock: rm yarn.lock"
    fi
    
    # Validate package.json structure
    if ! command_exists jq; then
        log_warning "jq not found - skipping detailed package.json validation"
    else
        # Check for packageManager field
        local package_manager=$(jq -r '.packageManager // empty' package.json)
        if [[ -z "$package_manager" ]]; then
            log_warning "packageManager field not specified in package.json"
            log_recommendation "Add '\"packageManager\": \"pnpm@9.0.0\"' to package.json"
        elif [[ "$package_manager" != pnpm* ]]; then
            log_error "packageManager field specifies '$package_manager' instead of pnpm"
            log_recommendation "Update packageManager field to use pnpm"
        else
            log_success "packageManager field correctly specifies: $package_manager"
        fi
        
        # Check for engines field
        local node_version=$(jq -r '.engines.node // empty' package.json)
        if [[ -z "$node_version" ]]; then
            log_warning "Node.js version not specified in engines field"
            log_recommendation "Add '\"engines\": {\"node\": \">=18.0.0\"}' to package.json"
        else
            log_success "Node.js version requirement: $node_version"
        fi
    fi
    
    cd - > /dev/null
    log_success "Frontend dependency validation completed"
    return 0
}

# Validate backend dependencies
validate_backend_dependencies() {
    if [[ "$FRONTEND_ONLY" == true ]]; then
        return 0
    fi
    
    log_info "Validating backend dependencies..."
    
    if [[ ! -f "$BACKEND_DIR/pyproject.toml" ]]; then
        log_error "Backend pyproject.toml not found"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Check for lock file
    if [[ ! -f "poetry.lock" ]]; then
        log_error "poetry.lock not found"
        log_recommendation "Run 'poetry install' to generate lock file"
        cd - > /dev/null
        return 1
    fi
    
    # Check if lock file is up to date
    if [[ "pyproject.toml" -nt "poetry.lock" ]]; then
        log_warning "poetry.lock is outdated"
        log_recommendation "Run 'poetry lock' to update lock file"
    fi
    
    # Check for conflicting dependency files
    if [[ -f "requirements.txt" ]]; then
        log_warning "Found requirements.txt in Poetry project"
        log_recommendation "Remove requirements.txt and ensure all dependencies are in pyproject.toml"
    fi
    
    if [[ -f "Pipfile" ]]; then
        log_warning "Found Pipfile in Poetry project"
        log_recommendation "Remove Pipfile and use pyproject.toml instead"
    fi
    
    if [[ -f "environment.yml" ]]; then
        log_warning "Found environment.yml (conda) in Poetry project"
        log_recommendation "Remove environment.yml and use pyproject.toml instead"
    fi
    
    # Validate pyproject.toml structure
    if ! command_exists python3; then
        log_warning "Python not found - skipping detailed pyproject.toml validation"
    else
        # Check Python version requirement
        local python_version=$(grep -o 'python = "[^"]*"' pyproject.toml | cut -d'"' -f2 || echo "")
        if [[ -z "$python_version" ]]; then
            log_warning "Python version not specified in pyproject.toml"
            log_recommendation "Add python version requirement to [tool.poetry.dependencies]"
        else
            log_success "Python version requirement: $python_version"
        fi
        
        # Check for required sections
        if ! grep -q "\[tool.poetry\]" pyproject.toml; then
            log_error "Missing [tool.poetry] section in pyproject.toml"
        fi
        
        if ! grep -q "\[tool.poetry.dependencies\]" pyproject.toml; then
            log_error "Missing [tool.poetry.dependencies] section in pyproject.toml"
        fi
        
        if ! grep -q "\[build-system\]" pyproject.toml; then
            log_warning "Missing [build-system] section in pyproject.toml"
            log_recommendation "Add [build-system] section with poetry-core backend"
        fi
    fi
    
    cd - > /dev/null
    log_success "Backend dependency validation completed"
    return 0
}

# Update dependencies
update_dependencies() {
    log_info "Updating dependencies..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN: Would update dependencies"
        return 0
    fi
    
    # Update frontend dependencies
    if [[ "$BACKEND_ONLY" != true ]]; then
        log_info "Updating frontend dependencies..."
        cd "$FRONTEND_DIR"
        
        if command_exists pnpm; then
            pnpm update
            log_success "Frontend dependencies updated"
        else
            log_error "pnpm not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    # Update backend dependencies
    if [[ "$FRONTEND_ONLY" != true ]]; then
        log_info "Updating backend dependencies..."
        cd "$BACKEND_DIR"
        
        if command_exists poetry; then
            poetry update
            log_success "Backend dependencies updated"
        else
            log_error "Poetry not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    log_success "Dependencies updated successfully"
}

# Run security audit
audit_dependencies() {
    log_info "Running security audit..."
    
    # Audit frontend dependencies
    if [[ "$BACKEND_ONLY" != true ]]; then
        log_info "Auditing frontend dependencies..."
        cd "$FRONTEND_DIR"
        
        if command_exists pnpm; then
            if pnpm audit; then
                log_success "Frontend security audit passed"
            else
                log_warning "Frontend security audit found issues"
                log_recommendation "Run 'pnpm audit --fix' to fix automatically fixable issues"
            fi
        else
            log_error "pnpm not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    # Audit backend dependencies
    if [[ "$FRONTEND_ONLY" != true ]]; then
        log_info "Auditing backend dependencies..."
        cd "$BACKEND_DIR"
        
        if command_exists poetry; then
            # Poetry doesn't have built-in audit, but we can check for known vulnerabilities
            if command_exists safety; then
                if poetry run safety check; then
                    log_success "Backend security audit passed"
                else
                    log_warning "Backend security audit found issues"
                    log_recommendation "Review and update vulnerable packages"
                fi
            else
                log_warning "Safety not installed - cannot run backend security audit"
                log_recommendation "Install safety: poetry add --group dev safety"
            fi
        else
            log_error "Poetry not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
}

# Clean dependencies and reinstall
clean_dependencies() {
    log_info "Cleaning dependencies..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN: Would clean and reinstall dependencies"
        return 0
    fi
    
    # Clean frontend dependencies
    if [[ "$BACKEND_ONLY" != true ]]; then
        log_info "Cleaning frontend dependencies..."
        cd "$FRONTEND_DIR"
        
        # Remove node_modules and lock file
        if [[ -d "node_modules" ]]; then
            rm -rf node_modules
            log_success "Removed node_modules"
        fi
        
        # Clean pnpm cache
        if command_exists pnpm; then
            pnpm store prune
            pnpm install
            log_success "Frontend dependencies cleaned and reinstalled"
        else
            log_error "pnpm not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    # Clean backend dependencies
    if [[ "$FRONTEND_ONLY" != true ]]; then
        log_info "Cleaning backend dependencies..."
        cd "$BACKEND_DIR"
        
        if command_exists poetry; then
            # Remove virtual environment
            poetry env remove --all 2>/dev/null || true
            
            # Clear cache
            poetry cache clear --all pypi
            
            # Reinstall
            poetry install
            log_success "Backend dependencies cleaned and reinstalled"
        else
            log_error "Poetry not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    log_success "Dependencies cleaned and reinstalled successfully"
}

# Check for outdated dependencies
check_outdated_dependencies() {
    log_info "Checking for outdated dependencies..."
    
    # Check frontend dependencies
    if [[ "$BACKEND_ONLY" != true ]]; then
        log_info "Checking frontend dependencies..."
        cd "$FRONTEND_DIR"
        
        if command_exists pnpm; then
            echo "Frontend outdated packages:"
            pnpm outdated || true
        else
            log_error "pnpm not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    # Check backend dependencies
    if [[ "$FRONTEND_ONLY" != true ]]; then
        log_info "Checking backend dependencies..."
        cd "$BACKEND_DIR"
        
        if command_exists poetry; then
            echo "Backend outdated packages:"
            poetry show --outdated || true
        else
            log_error "Poetry not found"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
}

# Fix dependency conflicts
fix_conflicts() {
    log_info "Attempting to fix dependency conflicts..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN: Would attempt to fix conflicts"
        return 0
    fi
    
    # Fix frontend conflicts
    if [[ "$BACKEND_ONLY" != true ]]; then
        log_info "Fixing frontend conflicts..."
        cd "$FRONTEND_DIR"
        
        # Remove conflicting lock files
        if [[ -f "package-lock.json" ]]; then
            rm package-lock.json
            log_success "Removed conflicting package-lock.json"
        fi
        
        if [[ -f "yarn.lock" ]]; then
            rm yarn.lock
            log_success "Removed conflicting yarn.lock"
        fi
        
        # Reinstall with pnpm
        if command_exists pnpm; then
            pnpm install
            log_success "Reinstalled frontend dependencies with pnpm"
        fi
        
        cd - > /dev/null
    fi
    
    # Fix backend conflicts
    if [[ "$FRONTEND_ONLY" != true ]]; then
        log_info "Fixing backend conflicts..."
        cd "$BACKEND_DIR"
        
        # Remove conflicting dependency files
        if [[ -f "requirements.txt" ]]; then
            log_warning "Found requirements.txt - manual review recommended before removal"
            log_recommendation "Review requirements.txt and ensure all dependencies are in pyproject.toml"
        fi
        
        if [[ -f "Pipfile" ]]; then
            rm Pipfile
            log_success "Removed conflicting Pipfile"
        fi
        
        if [[ -f "environment.yml" ]]; then
            rm environment.yml
            log_success "Removed conflicting environment.yml"
        fi
        
        cd - > /dev/null
    fi
    
    log_success "Conflict resolution completed"
}

# Generate summary report
generate_summary() {
    echo ""
    echo "=================================="
    echo "DEPENDENCY MANAGEMENT SUMMARY"
    echo "=================================="
    
    if [[ $VALIDATION_PASSED == true ]]; then
        if [[ ${#WARNINGS[@]} -eq 0 ]]; then
            log_success "All dependency validations passed! ✅"
        else
            log_success "Dependency validation completed with ${#WARNINGS[@]} warning(s) ⚠️"
        fi
    else
        log_error "Dependency validation failed with ${#ERRORS[@]} error(s) ❌"
    fi
    
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        echo ""
        echo -e "${RED}ERRORS:${NC}"
        for error in "${ERRORS[@]}"; do
            echo "  ❌ $error"
        done
    fi
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo ""
        echo -e "${YELLOW}WARNINGS:${NC}"
        for warning in "${WARNINGS[@]}"; do
            echo "  ⚠️  $warning"
        done
    fi
    
    if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
        echo ""
        echo -e "${CYAN}RECOMMENDATIONS:${NC}"
        for recommendation in "${RECOMMENDATIONS[@]}"; do
            echo "  💡 $recommendation"
        done
    fi
    
    echo ""
}

# Main execution
main() {
    echo "=================================="
    echo "DEPENDENCY MANAGEMENT"
    echo "=================================="
    echo "Command: $COMMAND"
    if [[ "$FRONTEND_ONLY" == true ]]; then
        echo "Scope: Frontend only"
    elif [[ "$BACKEND_ONLY" == true ]]; then
        echo "Scope: Backend only"
    else
        echo "Scope: Frontend and Backend"
    fi
    if [[ "$DRY_RUN" == true ]]; then
        echo "Mode: Dry run"
    fi
    echo ""
    
    case $COMMAND in
        validate)
            validate_frontend_dependencies
            validate_backend_dependencies
            ;;
        update)
            update_dependencies
            ;;
        audit)
            audit_dependencies
            ;;
        clean)
            clean_dependencies
            ;;
        check-outdated)
            check_outdated_dependencies
            ;;
        fix-conflicts)
            fix_conflicts
            ;;
        *)
            echo "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    generate_summary
    
    # Exit with appropriate code
    if [[ $VALIDATION_PASSED == true ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"