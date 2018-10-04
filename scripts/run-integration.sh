# 1. Build fresh packages and move them integration dit
npm run build &>/dev/null

# 2. Start docker containers to perform integration tests
cd integration && docker-compose up -d

# 3. Run integration tests
npm run integration-test