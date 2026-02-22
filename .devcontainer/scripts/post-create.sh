#!/bin/bash
set -e

echo "NestJS Development Environment - Post Create Setup"

# Ensure we're in the workspace directory
if [ -d "/workspace" ] && [ -f "/workspace/package.json" ]; then
    cd /workspace
elif [ -f "./package.json" ]; then
    echo "Using current directory: $(pwd)"
else
    echo "Error: Could not find package.json in /workspace or current directory"
    exit 1
fi

echo "Setting up permissions..."
# Always fix workspace permissions before npm install
if id -u node &>/dev/null; then
    echo "Fixing permissions for /workspace (may take a moment)..."
    chown -R node:node /workspace 2>/dev/null || sudo chown -R node:node /workspace 2>/dev/null || echo "Warning: Could not fix workspace permissions, trying to continue..."
else
    echo "User 'node' does not exist, skipping chown. Running as $USER."
fi


echo "Installing dependencies..."
# Always run npm install as the current user (root or node)
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo "Installing dependencies (first time setup)..."
    npm install --legacy-peer-deps --unsafe-perm || {
        echo "npm install failed, trying with cleanup..."
        rm -rf node_modules package-lock.json
        npm install --legacy-peer-deps --unsafe-perm
    }
else
    npm install --legacy-peer-deps --unsafe-perm || {
        echo "npm install failed, cleaning up and retrying..."
        rm -rf node_modules package-lock.json
        npm install --legacy-peer-deps --unsafe-perm
    }
fi

# Always fix workspace permissions after npm install
if id -u node &>/dev/null; then
    echo "Fixing permissions for /workspace after npm install (may take a moment)..."
    chown -R node:node /workspace 2>/dev/null || sudo chown -R node:node /workspace 2>/dev/null || echo "Warning: Could not fix workspace permissions, trying to continue..."
else
    echo "User 'node' does not exist, skipping chown. Running as $USER."
fi

echo "Setting up development environment..."
# Run the prepare script to set up packages and samples
if [ -f "scripts/prepare.sh" ]; then
    echo "Running prepare script..."
    # bash scripts/prepare.sh
    echo "Prepare script execution commented out for debugging"
else
    echo "Warning: Prepare script not found, running manual setup..."

    # Build packages
    # npm run build
    echo "Manual build commented out for debugging"
    
    # Integration services are not started automatically to ensure robust devcontainer setup.
    echo ""
    echo "Integration services are NOT started automatically."
    echo "If you need integration services for testing, run:"
    echo "  npm run test:docker:up"
    echo "from the workspace root after the container starts."
fi

echo "Setting up code formatting..."
# Ensure prettier configuration is available
if [ ! -f ".prettierrc" ]; then
    echo "Warning: .prettierrc not found, creating default configuration"
    cat > .prettierrc << EOF
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
EOF
fi

echo "Verifying installation..."
# Verify Node.js and npm
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "TypeScript version: $(npx tsc --version)"

# Verify Docker access
if docker --version &> /dev/null; then
    echo "Docker CLI: Available"
else
    echo "Docker CLI: Not available"
fi

# Check if packages built successfully
if [ -d "packages/core/dist" ]; then
    echo "Package build: Complete"
else
    echo "Package build: May need manual build"
fi

echo "Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  - Run 'npm test' to run unit tests"
echo "  - Run 'npm run test:integration' to run integration tests"  
echo "  - Run 'npm run lint' to check code style"
echo "  - Check sample applications in the 'sample/' directory"
echo ""
echo "Documentation:"
echo "  - See CONTRIBUTING.md for contribution guidelines"
echo "  - See .devcontainer/README.md for development container info"