# 1. Build fresh packages and move them integration dit
npm run build &>/dev/null

# 2. Start docker containers to perform integration tests
npm run test:docker:up

# 3. Wait for RabbitMQ to accept AMQP connections
npm run test:docker:wait:rmq

# 4. Run integration tests
npm run test:integration
