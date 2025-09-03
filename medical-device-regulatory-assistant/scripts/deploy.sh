#!/bin/bash

# Medical Device Regulatory Assistant - Production Deployment Script
# This script automates the deployment process with safety checks and rollback capabilities

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups/deployment"
LOG_FILE="./logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
Medical Device Regulatory Assistant - Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy          Deploy the application to production
    rollback        Rollback to previous version
    status          Check deployment status
    logs            Show application logs
    backup          Create manual backup
    restore         Restore from backup
    health          Check application health

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -f, --force     Force deployment without confirmations
    --dry-run       Show what would be done without executing
    --version TAG   Deploy specific version tag

Examples:
    $0 deploy                    # Deploy latest version
    $0 deploy --version v1.2.3   # Deploy specific version
    $0 rollback                  # Rollback to previous version
    $0 status                    # Check current status
    $0 health                    # Run health checks

EOF
}

# Parse command line arguments
VERBOSE=false
FORCE=false
DRY_RUN=false
VERSION=""
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        deploy|rollback|status|logs|backup|restore|health)
            COMMAND="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    error "No command specified"
    show_help
    exit 1
fi

# Setup directories
setup_directories() {
    log "Setting up directories..."
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    if [[ $DRY_RUN == true ]]; then
        log "[DRY RUN] Would create directories"
        return
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    # Check required environment variables
    source "$ENV_FILE"
    required_vars=(
        "NEXTAUTH_SECRET"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "POSTGRES_PASSWORD"
        "JWT_SECRET_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check disk space (require at least 5GB free)
    available_space=$(df . | awk 'NR==2 {print $4}')
    required_space=5242880  # 5GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space. Required: 5GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup before deployment
create_backup() {
    log "Creating backup before deployment..."
    
    if [[ $DRY_RUN == true ]]; then
        log "[DRY RUN] Would create backup"
        return
    fi
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="$BACKUP_DIR/backup_$timestamp.tar.gz"
    
    # Create database backup
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Creating database backup..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres /backups/backup-script.sh
    fi
    
    # Create application backup
    log "Creating application backup..."
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=backups \
        .
    
    success "Backup created: $backup_file"
    echo "$backup_file" > "$BACKUP_DIR/latest_backup.txt"
}

# Deploy application
deploy_application() {
    log "Starting deployment..."
    
    if [[ $DRY_RUN == true ]]; then
        log "[DRY RUN] Would deploy application"
        return
    fi
    
    # Pull latest images if no specific version
    if [[ -z "$VERSION" ]]; then
        log "Pulling latest images..."
        docker-compose -f "$COMPOSE_FILE" pull
    else
        log "Using version: $VERSION"
        # Set version in environment
        export IMAGE_TAG="$VERSION"
    fi
    
    # Build images
    log "Building images..."
    docker-compose -f "$COMPOSE_FILE" build
    
    # Start services with rolling update
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    wait_for_health
    
    success "Deployment completed successfully"
}

# Wait for services to be healthy
wait_for_health() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        if check_application_health; then
            success "All services are healthy"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Services failed to become healthy after $max_attempts attempts"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Check application health
check_application_health() {
    local frontend_health=false
    local backend_health=false
    
    # Check frontend health
    if curl -f -s "http://localhost:3000/api/health" >/dev/null 2>&1; then
        frontend_health=true
    fi
    
    # Check backend health
    if curl -f -s "http://localhost:8000/health" >/dev/null 2>&1; then
        backend_health=true
    fi
    
    if [[ $frontend_health == true && $backend_health == true ]]; then
        return 0
    else
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Starting rollback..."
    
    if [[ $DRY_RUN == true ]]; then
        log "[DRY RUN] Would rollback deployment"
        return
    fi
    
    # Check if backup exists
    if [[ ! -f "$BACKUP_DIR/latest_backup.txt" ]]; then
        error "No backup found for rollback"
        exit 1
    fi
    
    latest_backup=$(cat "$BACKUP_DIR/latest_backup.txt")
    
    if [[ ! -f "$latest_backup" ]]; then
        error "Backup file not found: $latest_backup"
        exit 1
    fi
    
    # Confirm rollback
    if [[ $FORCE != true ]]; then
        read -p "Are you sure you want to rollback? This will restore from backup: $latest_backup (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    # Stop services
    log "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from backup
    log "Restoring from backup: $latest_backup"
    tar -xzf "$latest_backup" -C /tmp/rollback_restore
    
    # Copy restored files (excluding certain directories)
    rsync -av --exclude=logs --exclude=backups /tmp/rollback_restore/ ./
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for health
    wait_for_health
    
    success "Rollback completed successfully"
    
    # Cleanup
    rm -rf /tmp/rollback_restore
}

# Show deployment status
show_status() {
    log "Checking deployment status..."
    
    echo "=== Service Status ==="
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n=== Health Checks ==="
    if check_application_health; then
        success "Application is healthy"
    else
        error "Application health check failed"
    fi
    
    echo -e "\n=== Resource Usage ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Show logs
show_logs() {
    log "Showing application logs..."
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# Manual backup
manual_backup() {
    log "Creating manual backup..."
    create_backup
}

# Restore from backup
restore_from_backup() {
    log "Restoring from backup..."
    
    # List available backups
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || {
        error "No backups found"
        exit 1
    }
    
    if [[ $FORCE != true ]]; then
        read -p "Enter backup filename to restore from: " backup_file
        
        if [[ ! -f "$BACKUP_DIR/$backup_file" ]]; then
            error "Backup file not found: $backup_file"
            exit 1
        fi
        
        read -p "Are you sure you want to restore from $backup_file? This will overwrite current deployment (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Restore cancelled"
            exit 0
        fi
    fi
    
    # Perform restore (similar to rollback)
    rollback_deployment
}

# Run health checks
run_health_checks() {
    log "Running comprehensive health checks..."
    
    echo "=== Frontend Health ==="
    curl -s "http://localhost:3000/api/health" | jq . || echo "Frontend health check failed"
    
    echo -e "\n=== Backend Health ==="
    curl -s "http://localhost:8000/health" | jq . || echo "Backend health check failed"
    
    echo -e "\n=== Database Health ==="
    curl -s "http://localhost:8000/health/database" | jq . || echo "Database health check failed"
    
    echo -e "\n=== FDA API Health ==="
    curl -s "http://localhost:8000/health/fda-api" | jq . || echo "FDA API health check failed"
    
    echo -e "\n=== System Resources ==="
    curl -s "http://localhost:8000/health/system" | jq . || echo "System health check failed"
}

# Main execution
main() {
    cd "$PROJECT_DIR"
    
    setup_directories
    
    case $COMMAND in
        deploy)
            pre_deployment_checks
            create_backup
            deploy_application
            ;;
        rollback)
            rollback_deployment
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        backup)
            manual_backup
            ;;
        restore)
            restore_from_backup
            ;;
        health)
            run_health_checks
            ;;
        *)
            error "Unknown command: $COMMAND"
            exit 1
            ;;
    esac
}

# Trap for cleanup on exit
cleanup() {
    if [[ -d "/tmp/rollback_restore" ]]; then
        rm -rf /tmp/rollback_restore
    fi
}

trap cleanup EXIT

# Run main function
main "$@"