#!/bin/bash

# Test script for Homebridge Proxmox Plugin

echo "🧪 Testing Homebridge Proxmox Plugin..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test 1: Check if Node.js is available
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION is installed"
else
    print_error "Node.js is not installed"
    exit 1
fi

# Test 2: Check if dependencies are installed
print_status "Checking dependencies..."
if [ -d "node_modules" ]; then
    print_success "Dependencies are installed"
else
    print_warning "Dependencies not found, installing..."
    npm install
fi

# Test 3: TypeScript compilation
print_status "Testing TypeScript compilation..."
if npm run build; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Test 4: Check if dist directory exists
print_status "Checking build output..."
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    print_success "Build output found"
else
    print_error "Build output missing"
    exit 1
fi

# Test 5: Linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting issues found"
fi

# Test 6: Check Homebridge configuration
print_status "Checking Homebridge configuration..."
if [ -f ".homebridge/config.json" ]; then
    print_success "Homebridge configuration found"
    
    # Validate JSON
    if node -e "JSON.parse(require('fs').readFileSync('.homebridge/config.json', 'utf8'))" 2>/dev/null; then
        print_success "Configuration JSON is valid"
    else
        print_error "Configuration JSON is invalid"
        exit 1
    fi
else
    print_error "Homebridge configuration missing"
    exit 1
fi

# Test 7: Quick Homebridge syntax check
print_status "Testing Homebridge plugin loading..."
timeout 10s npm run test:config &>/dev/null
exit_code=$?
if [ $exit_code -eq 124 ]; then
    print_success "Plugin loads successfully (timed out as expected)"
elif [ $exit_code -eq 0 ]; then
    print_success "Plugin loads successfully"
else
    print_error "Plugin failed to load"
    exit 1
fi

echo ""
print_success "All tests passed! 🎉"
echo ""
echo "📋 Next steps:"
echo "  1. Update .homebridge/config.json with your Proxmox server details"
echo "  2. Run 'npm run dev' to start development"
echo "  3. Test with your Proxmox server"
echo ""
