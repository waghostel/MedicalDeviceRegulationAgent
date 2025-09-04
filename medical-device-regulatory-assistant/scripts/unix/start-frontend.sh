#!/bin/bash
# Medical Device Regulatory Assistant - Frontend Startup Script (Unix/Linux/macOS)
# This script starts the Next.js frontend development server

set -e  # Exit on any error

echo "Starting Medical Device Regulatory Assistant Frontend..."
echo

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the medical-device-regulatory-assistant directory."
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed or not in PATH."
    echo "Please install pnpm first: npm install -g pnpm"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Start the development server
echo "Starting Next.js development server..."
echo "Frontend will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo

pnpm dev

# If we get here, the server was stopped
echo "Frontend server stopped."