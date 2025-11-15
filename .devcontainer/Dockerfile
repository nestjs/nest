# Use official VS Code devcontainer Node.js image as base (updated to Node 20 for NestJS requirements)
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:20-bullseye

# Install system dependencies and development tools
RUN apt-get update && apt-get install -y \
  # Build tools for native dependencies
  build-essential \
  python3 \
  python3-pip \
  # Git for version control
  git \
  # Utilities
  curl \
  wget \
  vim \
  nano \
  jq \
  sudo \
  # Docker CLI for integration tests
  ca-certificates \
  gnupg \
  lsb-release \
  # Clean up
  && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
  && apt-get update \
  && apt-get install -y docker-ce-cli docker-compose-plugin \
  && rm -rf /var/lib/apt/lists/*

# Install global npm packages for development
RUN npm install -g \
  # TypeScript tooling
  typescript \
  ts-node \
  nodemon \
  # Testing tools
  mocha \
  nyc \
  # Linting and formatting
  eslint \
  prettier \
  # Development utilities
  concurrently \
  cross-env \
  # Package management
  lerna \
  # Build tools
  gulp-cli

# Set npm configuration for NestJS
RUN npm config set legacy-peer-deps true

# Create non-root user with proper permissions
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure node user has the correct UID/GID
RUN groupmod --gid $USER_GID $USERNAME \
  && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
  && chown -R $USER_UID:$USER_GID /home/$USERNAME

# Add node user to docker group for Docker socket access
RUN groupadd docker || true \
  && usermod -aG docker $USERNAME \
  && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
WORKDIR /workspace

# Create node_modules directory with proper permissions as root
RUN mkdir -p /workspace/node_modules \
  && chown -R $USER_UID:$USER_GID /workspace

# Switch to node user for development
USER $USERNAME

# Create directories for development (will be done by post-create script)
RUN mkdir -p /home/$USERNAME/.vscode-server

# Default command (will be overridden by docker-compose)
CMD ["bash"]