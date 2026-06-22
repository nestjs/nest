---
name: build-and-verify
description: >-
  Build NestJS framework packages, link into samples, and run unit tests.
  Use when changing packages/, verifying a fix, or preparing to test in a sample app.
---

# Build and Verify

Full details: [docs/DEVELOPER.md](../../../docs/DEVELOPER.md)

## Standard build

```bash
npm run build          # tsc -b packages/ + postbuild move:node_modules
npm run move:samples   # copy @nestjs/* into sample/*/node_modules
```

## Verify changes

```bash
npm run test           # unit tests (packages/**/*.spec.ts)
npm run lint           # eslint across packages + integration + specs
```

## Watch mode (active development)

```bash
npm run build:dev      # tsc --watch
# Re-run move:samples after changes so samples see updates
```

## Test in a sample

```bash
npm run build && npm run move:samples
cd sample/01-cats-app
npm install --legacy-peer-deps
npm run start:dev      # http://localhost:3000
```

## Production build

```bash
npm run build:prod     # clean + compile
```

## CI-style (slow)

```bash
npm run build:samples  # install all samples, build, test unit + e2e
```
