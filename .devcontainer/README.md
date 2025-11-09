# NestJS Development Container

This development container provides a complete, pre-configured environment for NestJS development with all necessary dependencies, services, and VS Code extensions.

## What's Included

### Development Environment
- **Node.js 20 LTS** with npm configured for legacy peer dependencies (meets requirement >= 10.13.0)
- **TypeScript** and related development tools
- **Docker CLI** for containerized services
- **GitHub CLI** for seamless GitHub integration

### VS Code Extensions
- TypeScript and JavaScript language support
- Code formatting with Prettier
- Linting with ESLint  
- Testing integration with Mocha
- Docker support for container management
- Git enhancement with GitLens
- Markdown support for documentation

### Integration Services
- **Redis** (port 16379) - Caching and session storage
- **NATS** (ports 14223, 16222, 18222) - Message broker with monitoring
- **MySQL** (port 13306) - Primary database for testing
- **MQTT/Mosquitto** (ports 11883, 19001) - IoT messaging with WebSocket support

## Getting Started

1. **Open in Dev Container**: VS Code will prompt to reopen in container when opening this repository
2. **Wait for Setup**: The container will automatically install dependencies and build packages
3. **Services will start automatically**: Integration services (Redis, NATS, etc.) start during setup
4. **Start Development**: All services will be available and ready for development

**Note**: Integration services start after the main container is ready, not during container creation. This ensures reliable startup.

## Available Commands

### Build and Test
```bash
npm run build          # Build all packages
npm run build:prod     # Build packages near source files
npm test               # Run unit tests  
npm run test:integration  # Run integration tests
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Development
```bash
npm run prepare        # Setup development environment
sh scripts/prepare.sh  # Alternative: run prepare script directly
npm start              # Start sample application
```

### Services
```bash
npm run test:docker:up    # Start integration services
npm run test:docker:down  # Stop integration services
```

### Integration Testing
```bash
npm run test:integration    # Run integration tests
sh scripts/run-integration.sh  # Alternative: run integration script directly
```

## Port Forwarding

The following ports are automatically forwarded for easy access:
- **3000-3010**: Sample applications
- **8080-8082**: Additional development servers
- **16379**: Redis
- **14223, 16222, 18222**: NATS services
- **11883, 19001**: MQTT services  
- **13306**: MySQL

## Troubleshooting

### Permission Issues
If you encounter permission issues:
```bash
sudo chown -R node:node /workspace
```

### Missing Dependencies
If dependencies are missing:
```bash
npm install --legacy-peer-deps
```

### Services Not Starting
To manually start integration services:
```bash
npm run test:docker:up
```

### Container Creation Issues
If you see errors about mounting files or directories, this usually means:
1. A file/directory referenced in docker-compose.yml doesn't exist
2. VS Code may be trying to mount a non-existent configuration file

To fix:
1. Check that all referenced files exist
2. Rebuild the devcontainer: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

## Container Configuration

- **Base Image**: `mcr.microsoft.com/vscode/devcontainers/typescript-node:20-bullseye`
- **User**: `node` (UID 1000)
- **Workspace**: `/workspace`
- **Docker**: Docker-in-Docker enabled for integration testing

## Contributing

This devcontainer is designed to provide a consistent development environment for all contributors. If you need additional tools or services, please update the configuration files and test thoroughly before submitting changes.

### Testing the DevContainer

To validate that the devcontainer works correctly, you can run:

```bash
# Quick smoke test (2-3 minutes)
./.devcontainer/smoke-test.sh

# Full validation test (5-10 minutes)  
./.devcontainer/validate-devcontainer.sh
```

These tests verify:
- ✅ Node.js, npm, and TypeScript are working
- ✅ Package installation and building
- ✅ Docker services are running
- ✅ Unit tests can execute
- ✅ Code quality tools (ESLint, Prettier) are functional
- ✅ Integration test setup is ready

For more information about contributing to NestJS, see [CONTRIBUTING.md](../CONTRIBUTING.md).
