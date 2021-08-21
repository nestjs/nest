# 1. Build fresh packages and move them to sample and integration directories
npm run build &>/dev/null

# 2. Start docker containers to perform integration tests
npm run test:docker:up