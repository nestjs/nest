#!/usr/bin/env bash
set -eu

# 1. Build fresh packages and move them to the integration directory
npm run build

# 2. Start docker containers to perform integration tests
npm run test:docker:up

# 3. Wait for RabbitMQ to accept AMQP connections
npm run test:docker:wait:rmq

# 4. Run integration tests
npm run test:integration
