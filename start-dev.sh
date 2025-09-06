#!/bin/bash

# Cross-platform startup script for Medical Device Regulatory Assistant
# Linux/macOS version of start-dev.ps1

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="medical-device-regulatory-assistant"
BACKEND_PORT=8000
FRONTEND_PORT=3000
MAX_WAIT_TIME=60

echo -e "${CYAN}========================================"
echo "Medical Device Regulatory Assistant MVP"
echo -e "========================================${NC}"
echo ""
echo "Starting both Frontend and Backend services..."

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_error() {
    print_status $RED "❌ $1"
}

print_success() {
    print_status $GREEN "✅ $1"
}

print_warning() {
    print_status $YELLOW "⚠️  $1"
}

print_info() {
    print_status $BLUE "ℹ️  $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
is_port_available() {
    local port=$1
    if command_exists lsof; then
        ! lsof -i :$port >/dev/null 2>&1
    elif command_exists netstat; then
        ! netstat -ln | grep -q ":$port "
    else
        # Fallback: try to bind to the port
        (echo >/dev/tcp/localhost/$port) >/dev/null 2>&1 && return 1 || return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_wait=$3
    local wait_time=0
    
    print_info "Waiting for $service_name to be ready..."
    
    while [ $wait_time -lt $max_wait ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        wait_time=$((wait_time + 2))
    done
    
    echo ""
    print_error "$service_name failed to start within $max_wait seconds"
    return 1
}

# Function to cleanup on exit
cleanup() {
    echo ""
    print_info "Cleaning up processes..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on our ports
    if command_exists lsof; then
        lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    fi
    
    print_info "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory '$PROJECT_DIR' not found!"
    print_info "Please run this script from the project root directory"
    exit 1
fi

cd "$PROJECT_DIR"
print_success "Navigated to $PROJECT_DIR directory"

# Check prerequisites
echo ""
print_info "Checking prerequisites..."

# Check for pnpm
if ! command_exists pnpm; then
    print_error "pnpm not found!"
    print_info "Please install pnpm: npm install -g pnpm"
    exit 1
fi

PNPM_VERSION=$(pnpm --version)
print_success "pnpm: $PNPM_VERSION"

# Check for poetry
if ! command_exists poetry; then
    print_error "Poetry not found!"
    print_info "Please install Poetry: https://python-poetry.org/docs/#installation"
    exit 1
fi

POETRY_VERSION=$(poetry --version | cut -d' ' -f3)
print_success "Poetry: $POETRY_VERSION"

# Check if ports are available
if ! is_port_available $BACKEND_PORT; then
    print_error "Port $BACKEND_PORT is already in use!"
    print_info "Please stop the service using port $BACKEND_PORT or use a different port"
    exit 1
fi

if ! is_port_available $FRONTEND_PORT; then
    print_error "Port $FRONTEND_PORT is already in use!"
    print_info "Please stop the service using port $FRONTEND_PORT or use a different port"
    exit 1
fi

print_success "Ports $BACKEND_PORT and $FRONTEND_PORT are available"

# Check backend environment
print_info "Checking backend environment..."
cd backend

if [ ! -f "pyproject.toml" ]; then
    print_error "Backend pyproject.toml not found!"
    exit 1
fi

# Install backend dependencies if needed
if ! poetry check >/dev/null 2>&1; then
    print_info "Installing backend dependencies..."
    poetry install
fi

print_success "Backend environment ready"
cd ..

# Check frontend environment
print_info "Checking frontend environment..."

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found!"
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    pnpm install
fi

print_success "Frontend environment ready"

print_success "Prerequisites check passed!"

# Start services
echo ""
print_info "========================================"
print_info "Starting Services"
print_info "========================================"
print_info "Frontend: http://localhost:$FRONTEND_PORT"
print_info "Backend:  http://localhost:$BACKEND_PORT"
print_info "API Docs: http://localhost:$BACKEND_PORT/docs"
print_info ""
print_info "Press Ctrl+C to stop all services"
print_info "========================================"

# Start backend
print_info "Starting backend server..."
cd backend
poetry run uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend
print_info "Starting frontend server..."
pnpm dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for services to be ready
if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend" $MAX_WAIT_TIME; then
    print_success "Backend started successfully"
else
    print_error "Backend failed to start"
    print_info "Check backend.log for details"
    cleanup
    exit 1
fi

if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" $MAX_WAIT_TIME; then
    print_success "Frontend started successfully"
else
    print_error "Frontend failed to start"
    print_info "Check frontend.log for details"
    cleanup
    exit 1
fi

echo ""
print_success "🎉 Both services are running successfully!"
echo ""
print_info "Services:"
print_info "  Frontend: http://localhost:$FRONTEND_PORT"
print_info "  Backend:  http://localhost:$BACKEND_PORT"
print_info "  API Docs: http://localhost:$BACKEND_PORT/docs"
echo ""
print_info "Logs:"
print_info "  Backend:  backend.log"
print_info "  Frontend: frontend.log"
echo ""
print_info "Press Ctrl+C to stop all services"

# Keep script running and monitor services
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend process died unexpectedly"
        cleanup
        exit 1
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend process died unexpectedly"
        cleanup
        exit 1
    fi
    
    sleep 5
done