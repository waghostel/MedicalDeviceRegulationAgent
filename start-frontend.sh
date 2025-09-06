#!/bin/bash

# Frontend startup script for Medical Device Regulatory Assistant
# Linux/macOS version of start-frontend.ps1

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
DEFAULT_PORT=3000
DEFAULT_HOST="localhost"

# Parse command line arguments
PORT=$DEFAULT_PORT
HOST=$DEFAULT_HOST
BUILD=false
TURBO=false

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
        --build)
            BUILD=true
            shift
            ;;
        --turbo)
            TURBO=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --port PORT      Port to run on (default: $DEFAULT_PORT)"
            echo "  --host HOST      Host to bind to (default: $DEFAULT_HOST)"
            echo "  --build          Build for production"
            echo "  --turbo          Use turbo mode (if available)"
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
echo "Frontend Server Startup"
echo -e "========================================${NC}"
echo ""

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory '$PROJECT_DIR' not found!"
    print_info "Please run this script from the project root directory"
    exit 1
fi

cd "$PROJECT_DIR"
print_success "Navigated to frontend directory"

# Check prerequisites
print_info "Checking prerequisites..."

# Check for Node.js
if ! command_exists node; then
    print_error "Node.js not found!"
    print_info "Please install Node.js 18 or higher: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js: $NODE_VERSION"

# Check Node.js version (require 18+)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required"
    print_info "Current version: $NODE_VERSION"
    print_info "Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

# Check for pnpm
if ! command_exists pnpm; then
    print_error "pnpm not found!"
    print_info "Installing pnpm..."
    
    if command_exists npm; then
        npm install -g pnpm
        if [ $? -ne 0 ]; then
            print_error "Failed to install pnpm"
            print_info "Please install pnpm manually: https://pnpm.io/installation"
            exit 1
        fi
    else
        print_error "npm not found, cannot install pnpm"
        print_info "Please install pnpm manually: https://pnpm.io/installation"
        exit 1
    fi
fi

PNPM_VERSION=$(pnpm --version)
print_success "pnpm: $PNPM_VERSION"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found in frontend directory!"
    print_info "Please ensure you're in the correct frontend directory"
    exit 1
fi

print_success "Frontend configuration found"

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
print_info "Checking dependencies..."

if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
    print_info "Installing dependencies..."
    pnpm install
    
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        print_info "Please check your pnpm configuration and try again"
        exit 1
    fi
    
    print_success "Dependencies installed successfully"
else
    print_success "Dependencies are up to date"
fi

# Check for Next.js
if [ ! -f "next.config.js" ] && [ ! -f "next.config.mjs" ] && [ ! -f "next.config.ts" ]; then
    print_warning "Next.js configuration not found"
    print_info "This may be normal for some Next.js projects"
fi

# Set environment variables
export NODE_ENV=${NODE_ENV:-development}
export PORT=$PORT
export HOSTNAME=$HOST

# Check environment file
if [ -f ".env.local" ]; then
    print_success "Environment file (.env.local) found"
else
    print_warning "Environment file (.env.local) not found"
    print_info "Some features may not work without proper environment configuration"
fi

# Build command selection
if [ "$BUILD" = true ]; then
    COMMAND="pnpm build"
    print_info "Building for production..."
elif [ "$TURBO" = true ] && command_exists turbo; then
    COMMAND="pnpm turbo dev"
    print_info "Using Turbo mode..."
else
    COMMAND="pnpm dev"
fi

# Start the server
echo ""
print_info "========================================"
print_info "Starting Frontend Server"
print_info "========================================"
print_info "Host: $HOST"
print_info "Port: $PORT"
print_info "Mode: $([ "$BUILD" = true ] && echo "Production Build" || echo "Development")"
print_info "Command: $COMMAND"
print_info ""
print_info "Frontend URL: http://$HOST:$PORT"
print_info ""
print_info "Press Ctrl+C to stop the server"
print_info "========================================"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    print_info "Shutting down frontend server..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the server
print_success "Starting Next.js development server..."
echo ""

# Set the port for Next.js
export PORT=$PORT

exec $COMMAND