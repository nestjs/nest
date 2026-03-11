# NestJS tRPC Sample

Comprehensive `@nestjs/trpc` sample showing router composition, lifecycle integration, schema generation, typed clients, and subscriptions.

## Features

| Feature                                | File(s)                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| Aliased sub-routers                    | `cats.router.ts`, `users.router.ts`                       |
| Flat root procedures                   | `health.router.ts`                                        |
| Query/mutation/subscription procedures | `cats.router.ts`, `users.router.ts`, `health.router.ts`   |
| Zod input/output schemas               | `cats.schema.ts`, `users.schema.ts`, `health.schema.ts`   |
| Auto-generated typed `AppRouter`       | `app.module.ts` + `generate-types.ts`                     |
| Type-safe query/mutation client        | `client.ts`                                               |
| Type-safe subscription client          | `subscription-client.ts`                                  |
| Compile-time client typecheck          | `client.typecheck.ts` + `typecheck:client` script         |
| Nest guards/interceptors/pipes         | `auth.guard.ts`, `logging.interceptor.ts`, `trim.pipe.ts` |
| Class-validator DTO validation         | `users.router.ts`, `users/create-user.dto.ts`             |
| Exception filter remapping             | `remap-bad-request.filter.ts`, `users.router.ts`          |
| Decorator param extraction             | `@Input()` and `@TrpcContext()`                           |
| Express and Fastify entrypoints        | `main.ts`, `main-fastify.ts`                              |
| No-symlink local package workflow      | `scripts/prepare-local-trpc.cjs`                          |

## Run

```bash
# Start Express app
npm run start

# Run query/mutation client demo
npm run client

# Run subscription client demo (SSE over HTTP)
npm run client:subscription

# Optional Fastify runtime
npm run start:fastify
```

## Type Safety Checks

```bash
# Compile-time checks for generated AppRouter + client usage
npm run typecheck:client
```

## Notes on Local `@nestjs/trpc`

This sample depends on local monorepo `@nestjs/trpc`.
To avoid symlink/runtime module-identity issues, the sample packs and installs a local tarball via:

- `scripts/prepare-local-trpc.cjs`
- `prepare:local-trpc` script (invoked by `prebuild`/`prestart`)

That keeps sample execution stable before `@nestjs/trpc` is published.
