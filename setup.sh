#!/bin/bash

echo "============================================"
echo "   Applicant Connect - Auto Setup Script"
echo "============================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Minimum required version: Node 18+"
    exit 1
fi

# Display Node version
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not available"
    exit 1
fi

echo
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "Downloading images..."
npm run download-images
if [ $? -ne 0 ]; then
    echo "WARNING: Image download failed, but continuing..."
fi

echo
echo "Setup complete!"
echo
echo "Available commands:"
echo "  npm run dev        - Start development server"
echo "  npm run build      - Build for production"
echo "  npm run preview    - Preview production build"
echo "  npm run download-images - Download/refresh images"
echo
echo "Starting development server..."
echo "Server will be available at: http://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo

npm run dev