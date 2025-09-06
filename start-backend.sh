#!/bin/bash

# Backend startup script for Medical Device Regulatory Assistant
# Linux/macOS version of start-backend.ps1

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
BACKEND_DIR="$PROJECT_DIR/backend"
DEFAULT_PORT=8000
DEFAULT_HOST="0.0.0.0"

# Parse command line arguments
PORT=$DEFAULT_PORT
HOST=$DEFAULT_HOST
RELOAD=true
DEBUG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --no-reload)
            RELOAD=false
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --port PORT      Port to run on (default: $DEFAULT_PORT)"
            echo "  --host HOST      Host to bind to (default: $DEFAULT_HOST)"
            echo "  --no-reload      Disable auto-reload"
            echo "  --debug          Enable debug mode"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

echo -e "${CYAN}========================================"
echo "Medical Device Regulatory Assistant"
echo "Backend Server Startup"
echo -e "========================================${NC}"
echo ""

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory '$PROJECT_DIR' not found!"
    print_info "Please run this script from the project root directory"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory '$BACKEND_DIR' not found!"
    exit 1
fi

cd "$BACKEND_DIR"
print_success "Navigated to backend directory"

# Check prerequisites
print_info "Checking prerequisites..."

# Check for Python
if ! command_exists python3 && ! command_exists python; then
    print_error "Python not found!"
    print_info "Please install Python 3.8 or higher"
    exit 1
fi

PYTHON_CMD="python3"
if ! command_exists python3; then
    PYTHON_CMD="python"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
print_success "Python: $PYTHON_VERSION"

# Check for Poetry
if ! command_exists poetry; then
    print_error "Poetry not found!"
    print_info "Please install Poetry: https://python-poetry.org/docs/#installation"
    print_info "Or use pip: pip install poetry"
    exit 1
fi

POETRY_VERSION=$(poetry --version | cut -d' ' -f3)
print_success "Poetry: $POETRY_VERSION"

# Check if pyproject.toml exists
if [ ! -f "pyproject.toml" ]; then
    print_error "pyproject.toml not found in backend directory!"
    print_info "Please ensure you're in the correct backend directory"
    exit 1
fi

print_success "Backend configuration found"

# Check if port is available
if ! is_port_available $PORT; then
    print_error "Port $PORT is already in use!"
    
    # Try to find what's using the port
    if command_exists lsof; then
        print_info "Process using port $PORT:"
        lsof -i :$PORT || true
    fi
    
    print_info "Please stop the service using port $PORT or use a different port with --port"
    exit 1
fi

print_success "Port $PORT is available"

# Install dependencies
print_info "Checking Python dependencies..."

# Check if virtual environment exists and dependencies are installed
if ! poetry check >/dev/null 2>&1; then
    print_info "Installing/updating dependencies..."
    poetry install
    
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        print_info "Please check your Poetry configuration and try again"
        exit 1
    fi
    
    print_success "Dependencies installed successfully"
else
    print_success "Dependencies are up to date"
fi

# Set environment variables
export PYTHONPATH="$PWD:$PYTHONPATH"

if [ "$DEBUG" = true ]; then
    export DEBUG=true
    export LOG_LEVEL=DEBUG
    print_info "Debug mode enabled"
fi

# Check database
print_info "Checking database..."

if [ -f "medical_device_assistant.db" ]; then
    print_success "Database file found"
else
    print_warning "Database file not found - will be created on first run"
fi

# Test basic imports
print_info "Testing application imports..."

if poetry run python -c "import main; print('✅ Application imports successful')" 2>/dev/null; then
    print_success "Application imports successful"
else
    print_error "Application import test failed"
    print_info "Please check for missing dependencies or syntax errors"
    exit 1
fi

# Build uvicorn command
UVICORN_CMD="poetry run uvicorn main:app --host $HOST --port $PORT"

if [ "$RELOAD" = true ]; then
    UVICORN_CMD="$UVICORN_CMD --reload"
fi

if [ "$DEBUG" = true ]; then
    UVICORN_CMD="$UVICORN_CMD --log-level debug"
fi

# Start the server
echo ""
print_info "========================================"
print_info "Starting Backend Server"
print_info "========================================"
print_info "Host: $HOST"
print_info "Port: $PORT"
print_info "Reload: $RELOAD"
print_info "Debug: $DEBUG"
print_info ""
print_info "API Documentation: http://localhost:$PORT/docs"
print_info "Health Check: http://localhost:$PORT/health"
print_info ""
print_info "Press Ctrl+C to stop the server"
print_info "========================================"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    print_info "Shutting down backend server..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the server
print_success "Starting FastAPI server..."
echo ""

exec $UVICORN_CMD