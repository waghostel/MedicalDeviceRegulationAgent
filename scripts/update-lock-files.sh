#!/bin/bash

# Automated Lock File Update Script
# Updates lock files when package.json or pyproject.toml changes
# Requirements: 3.1, 3.2

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

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update frontend lock file
update_frontend_lock() {
    log_info "Checking frontend lock file..."
    
    if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
        log_error "Frontend package.json not found"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    local needs_update=false
    
    # Check if lock file exists
    if [[ ! -f "pnpm-lock.yaml" ]]; then
        log_warning "pnpm-lock.yaml not found"
        needs_update=true
    elif [[ "package.json" -nt "pnpm-lock.yaml" ]]; then
        log_warning "pnpm-lock.yaml is outdated"
        needs_update=true
    fi
    
    if [[ "$needs_update" == true ]]; then
        if ! command_exists pnpm; then
            log_error "pnpm not found"
            cd - > /dev/null
            return 1
        fi
        
        log_info "Updating pnpm-lock.yaml..."
        pnpm install --frozen-lockfile=false
        log_success "Frontend lock file updated"
    else
        log_success "Frontend lock file is up to date"
    fi
    
    cd - > /dev/null
    return 0
}

# Update backend lock file
update_backend_lock() {
    log_info "Checking backend lock file..."
    
    if [[ ! -f "$BACKEND_DIR/pyproject.toml" ]]; then
        log_error "Backend pyproject.toml not found"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    local needs_update=false
    
    # Check if lock file exists
    if [[ ! -f "poetry.lock" ]]; then
        log_warning "poetry.lock not found"
        needs_update=true
    elif [[ "pyproject.toml" -nt "poetry.lock" ]]; then
        log_warning "poetry.lock is outdated"
        needs_update=true
    fi
    
    if [[ "$needs_update" == true ]]; then
        if ! command_exists poetry; then
            log_error "Poetry not found"
            cd - > /dev/null
            return 1
        fi
        
        log_info "Updating poetry.lock..."
        poetry lock --no-update
        log_success "Backend lock file updated"
    else
        log_success "Backend lock file is up to date"
    fi
    
    cd - > /dev/null
    return 0
}

# Main execution
main() {
    echo "=================================="
    echo "LOCK FILE UPDATE"
    echo "=================================="
    echo ""
    
    local frontend_result=0
    local backend_result=0
    
    # Update frontend lock file
    update_frontend_lock || frontend_result=$?
    
    echo ""
    
    # Update backend lock file
    update_backend_lock || backend_result=$?
    
    echo ""
    echo "=================================="
    echo "UPDATE SUMMARY"
    echo "=================================="
    
    if [[ $frontend_result -eq 0 && $backend_result -eq 0 ]]; then
        log_success "All lock files are up to date! ✅"
        echo ""
        echo "Next steps:"
        echo "  - Run tests to ensure everything works: ./scripts/validate-package-managers.sh"
        echo "  - Commit updated lock files to version control"
    else
        log_error "Some lock file updates failed ❌"
        echo ""
        echo "Please check the errors above and fix any issues."
        exit 1
    fi
}

# Run main function
main "$@"