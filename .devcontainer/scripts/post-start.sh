#!/bin/bash

echo "NestJS Development Environment - Post Start"

cd /workspace

echo "Checking Docker services..."
max_attempts=30

check_service() {
    local host=$1
    local port=$2
    local name=$3
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            echo "$name is ready on $host:$port"
            return 0
        fi
        echo "Waiting for $name on $host:$port... (attempt $((attempt + 1))/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    echo "WARNING: $name not ready after $max_attempts attempts"
    return 1
}

check_service "redis" 6379 "Redis" || true
check_service "nats" 4222 "NATS" || true
check_service "mqtt" 1883 "MQTT" || true
check_service "mysql" 3306 "MySQL" || true
check_service "postgres" 5432 "PostgreSQL" || true

echo ""
echo "Development environment setup complete!"