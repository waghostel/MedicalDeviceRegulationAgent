#!/bin/bash
# Medical Device Regulatory Assistant - Frontend Only Startup
# This script can be run from the project root to start only the frontend

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/medical-device-regulatory-assistant"

echo "========================================"
echo "Medical Device Regulatory Assistant"
echo "Frontend Development Server"
echo "========================================"
echo

# Check if the medical-device-regulatory-assistant directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: medical-device-regulatory-assistant directory not found."
    echo "Expected location: $PROJECT_DIR"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Change to the project directory
cd "$PROJECT_DIR"

echo "Changed to project directory: $(pwd)"
echo

# Execute the frontend script
exec ./scripts/unix/start-frontend.sh