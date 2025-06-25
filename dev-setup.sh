#!/bin/bash

# Development Setup Script for Homebridge Proxmox Plugin

echo "🏠 Setting up Homebridge development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION'))" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 16+."
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the project
print_status "Building the project..."
npm run build

# Create .homebridge directories if they don't exist
mkdir -p .homebridge/persist
mkdir -p .homebridge/accessories

print_success "Development environment setup complete!"

echo ""
echo "📋 Available commands:"
echo "  npm run dev           - Start development server with auto-reload"
echo "  npm run homebridge:dev - Run Homebridge with the plugin"
echo "  npm run test:config   - Test Homebridge configuration"
echo "  npm run clean         - Clean build and Homebridge cache"
echo ""
echo "⚠️  Before running:"
echo "  1. Update .homebridge/config.json with your Proxmox server details"
echo "  2. Make sure your Proxmox server is accessible"
echo ""
echo "🚀 To start development:"
echo "  npm run dev"
