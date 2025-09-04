#!/bin/bash
# Medical Device Regulatory Assistant - Master Startup Script (Unix/Linux/macOS)
# This script starts both frontend and backend services

set -e  # Exit on any error

echo "========================================"
echo "Medical Device Regulatory Assistant MVP"
echo "========================================"
echo
echo "Starting both Frontend and Backend services..."
echo

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the medical-device-regulatory-assistant directory."
    echo "Current directory: $(pwd)"
    exit 1
fi

if [ ! -f "backend/pyproject.toml" ]; then
    echo "Error: backend/pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory."
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if required tools are installed
echo "Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install pnpm first: npm install -g pnpm"
    exit 1
fi

if ! command -v poetry &> /dev/null; then
    echo "Error: Poetry is not installed. Please install Poetry first: https://python-poetry.org/docs/#installation"
    echo "Or use: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

echo "Prerequisites check passed!"
echo

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install
fi

cd backend
if ! poetry env info &> /dev/null; then
    echo "Installing backend dependencies..."
    poetry install
fi
cd ..

echo
echo "========================================"
echo "Starting Services"
echo "========================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo

# Function to cleanup background processes
cleanup() {
    echo
    echo "Stopping services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "All services stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
cd backend
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "Starting frontend server..."
pnpm dev &
FRONTEND_PID=$!

# Wait for both processes
echo "Both services are running..."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo
echo "To stop all services, press Ctrl+C"

# Wait for either process to exit
wait