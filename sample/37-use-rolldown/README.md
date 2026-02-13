# 37 - Use Rolldown

This sample shows a NestJS application configured to:

- **Build with Rolldown** (as an alternative bundler to webpack/esbuild-based setups).
- **Test with Vitest**, using **`unplugin-swc`** so tests can compile Nest-style TypeScript **decorators** in a way that supports metadata patterns used by Nest.

> Why `unplugin-swc`?
>
> Nest apps commonly rely on TypeScript decorator transforms (and, depending on your setup, metadata used by reflection-based features). Vitest does not natively handle all TypeScript decorator/metadata compilation needs out of the box for Nest projects. This sample uses `unplugin-swc` to ensure the test pipeline compiles code with decorator support in a way that works for Nest.

## What this sample demonstrates

### Rolldown for builds
Rolldown is used to bundle the application for production. The goal is a fast, modern bundling experience while still producing output that can run a Nest server.

Typical outcomes:
- Faster builds and a cleaner bundling pipeline
- A single (or small set of) build output file(s) under `dist/`
- Source maps suitable for debugging

### Vitest for unit tests (with SWC transform)
Vitest runs unit/integration-style tests, and `unplugin-swc` is responsible for transforming TypeScript in tests, including decorator syntax and behavior expected by Nest.

This is especially important for code that uses Nest patterns such as:
- `@Controller()`, `@Injectable()`, `@Module()`
- parameter decorators like `@Body()`, `@Param()`, etc.
- reflection/metadata-dependent behavior

## Prerequisites

- Node.js 24(may work on lower versions, but not tested)
- A package manager supported by this repo (npm/pnpm/yarn — use whatever the repo is configured for)

## Install

From this directory:

```/dev/null/sh#L1-3
npm install
# or: pnpm install
# or: yarn
```

## Development

Run the app in development mode (the exact command depends on this repo’s scripts):

```/dev/null/sh#L1-2
npm run dev
# or the equivalent dev command in package.json
```

## Build (Rolldown)

Create a production build:

```/dev/null/sh#L1-2
npm run build
# produces output under dist/
```

Run the built output:

```/dev/null/sh#L1-2
node dist/main.js
# also do not forget copy node_modules to artifact
```

## Test (Vitest)

Run tests(watch mode is default):

```/dev/null/sh#L1-2
npm test
# or: npm run test
```
