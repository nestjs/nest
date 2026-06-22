---
name: run-integration-tests
description: >-
  Run NestJS integration tests with Docker (Redis, NATS, RabbitMQ, etc.).
  Use when changing microservice transports, HTTP adapters, or routing behavior.
---

# Run Integration Tests

Full details: [docs/DEVELOPER.md](../../../docs/DEVELOPER.md) and [ARCHITECTURE.md](../../../ARCHITECTURE.md) section 5.

**When required**: routing, adapters, microservice transports.

## Full run (recommended)

```bash
sh scripts/run-integration.sh
```

Builds packages, starts Docker services, waits for RabbitMQ, runs tests.

## Manual steps

```bash
npm run build
npm run test:docker:up
npm run test:docker:wait:rmq
npm run test:integration
npm run test:docker:down    # when finished
```

## Notes

- Docker must be running (`integration/docker-compose.yml`).
- `scripts/prepare.sh` only builds + starts Docker; it does **not** run tests or `move:samples`.
