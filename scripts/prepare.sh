# 1. Install all dependencies
for D in integration/*; do [ -d "${D}" ] && npm i; done

# 2. Build fresh packages and move them to sample and integration directories
npm run build:dev &>/dev/null

# 3. Start docker containers to perform integration tests
cd integration && docker-compose up -d