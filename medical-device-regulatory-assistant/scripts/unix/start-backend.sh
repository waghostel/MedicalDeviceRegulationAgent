#!/bin/bash
# Medical Device Regulatory Assistant - Backend Startup Script (Unix/Linux/macOS)
# This script starts the FastAPI backend development server

set -e  # Exit on any error

echo "Starting Medical Device Regulatory Assistant Backend..."
echo

# Check if we're in the correct directory
if [ ! -f "backend/pyproject.toml" ]; then
    echo "Error: backend/pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory."
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "Error: Poetry is not installed or not in PATH."
    echo "Please install Poetry first: https://python-poetry.org/docs/#installation"
    echo "Or use: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if virtual environment exists, if not install dependencies
if ! poetry env info &> /dev/null; then
    echo "Installing backend dependencies..."
    poetry install
fi

# Start the FastAPI development server
echo "Starting FastAPI development server..."
echo "Backend will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"
echo

poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# If we get here, the server was stopped
cd ..
echo "Backend server stopped."