# `@nestjs/trpc`

Native tRPC integration for NestJS with decorator-first router definitions and full Nest lifecycle support.

## Design Goals

- Keep the API native to Nest:
  - `@Router()`, `@Query()`, `@Mutation()`, `@Subscription()`
  - explicit argument decorators: `@Input()` and `@TrpcContext()`
  - standard DI via constructor injection
- Preserve the Nest lifecycle:
  - guards, interceptors, pipes, exception filters
  - global and route-scoped enhancers
  - request-scoped providers
- Remain HTTP adapter agnostic:
  - Express and Fastify support through the same module API

## Basic Usage

```ts
import { Module } from '@nestjs/common';
import {
  TrpcModule,
  Router,
  Query,
  Mutation,
  Input,
  TrpcContext,
} from '@nestjs/trpc';

class CreateUserDto {
  name!: string;
}

type AppContext = {
  db: {
    users: {
      findMany: () => any[];
      create: (args: { data: CreateUserDto }) => any;
    };
  };
};

@Router('users')
class UsersRouter {
  @Query()
  list(@TrpcContext() ctx: AppContext) {
    return ctx.db.users.findMany();
  }

  @Mutation()
  create(@Input() input: CreateUserDto, @TrpcContext() ctx: AppContext) {
    return ctx.db.users.create({ data: input });
  }
}

@Module({
  imports: [TrpcModule.forRoot({ path: '/trpc' })],
  providers: [UsersRouter],
})
export class AppModule {}
```

## Lifecycle Compatibility

`@nestjs/trpc` procedures support:

- `@UseGuards(...)`
- `@UseInterceptors(...)`
- `@UsePipes(...)` (including `ValidationPipe` + class-validator DTOs)
- `@UseFilters(...)` and global filters

Errors from `HttpException` are mapped to corresponding tRPC error codes/statuses.

## Input Validation

`@nestjs/trpc` supports both common validation styles:

- **Nest style (`class-validator` + `ValidationPipe`)**  
  Use `@Input()` with DTO classes and standard pipes (`@UsePipes(new ValidationPipe())`) globally, per-router, or per-procedure.
- **tRPC style (Zod schemas)**  
  Provide Zod schemas directly in procedure options (`@Query({ input: z.object(...) })`, `@Mutation({ input, output })`).

```ts
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Mutation, Input } from '@nestjs/trpc';
import { z } from 'zod';

const CreateUserSchema = z.object({ name: z.string().min(1) });

@Mutation({ input: CreateUserSchema })
createWithZod(@Input() input: { name: string }) {
  return input;
}

@Mutation({ input: z.any() })
@UsePipes(new ValidationPipe({ transform: true }))
createWithClassValidator(@Input() input: CreateUserDto) {
  return input;
}
```

## Request Scope

Request-scoped providers are supported for router dependency trees and per-request context values. This includes scenarios where routers depend on request-scoped services (for example, reading request headers via the `REQUEST` token).

## Typed Client Generation

Set `autoSchemaFile` to generate an `AppRouter` type file:

```ts
TrpcModule.forRoot({
  path: '/trpc',
  autoSchemaFile: join(process.cwd(), 'src/@generated/server.ts'),
});
```

You can then import `AppRouter` in clients to get typed query/mutation/subscription calls.

## Adapter Support

The module works with:

- `@nestjs/platform-express`
- `@nestjs/platform-fastify`

Both adapters share the same tRPC procedure surface and error semantics.

## Migration Notes

For users moving from community integrations (for example `nestjs-trpc` or NestRPC):

- Move router definitions to Nest decorators (`@Router/@Query/@Mutation/@Subscription`).
- Replace external router composition with Nest providers/modules.
- Reuse existing Nest guards/pipes/interceptors/filters directly on procedures.
- If you used generated client types before, switch to `autoSchemaFile` and import `AppRouter`.
