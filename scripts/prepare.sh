# 1. Install all dependencies
for D in integration/*/; do sh -c "cd ${D} && npm i"; done

# 2. Build fresh packages and move them to sample and integration directories
npm run build &>/dev/null

# 3. Start docker containers to perform integration tests
cd integration && docker-compose up -d