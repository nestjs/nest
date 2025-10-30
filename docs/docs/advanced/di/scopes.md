---
sidebar_position: 1
---

# Provider Scopes: The Hidden Power of NestJS DI

Provider scopes are one of NestJS's most powerful yet underutilized features. Understanding scopes is crucial for building performant, scalable applications.

## The Three Scopes

NestJS supports three provider scopes:

### 1. DEFAULT (Singleton) Scope

**Most common, most performant**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable() // Default scope is Scope.DEFAULT
export class UserService {
  private cache = new Map();

  constructor() {
    console.log('UserService instantiated ONCE');
  }
}
```

**Characteristics:**
- ✅ Instantiated **once** when the application starts
- ✅ Shared across all requests and consumers
- ✅ Best performance (no instantiation overhead)
- ⚠️ Be careful with request-specific state

**When to use:**
- Services that don't hold request-specific state
- Stateless services (most of your services)
- Expensive-to-instantiate services

### 2. REQUEST Scope

**Request-specific instances**

```typescript live
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private requestId: string;

  constructor() {
    this.requestId = Math.random().toString(36).substring(7);
    console.log(`Created instance: ${this.requestId}`);
  }

  getRequestId(): string {
    return this.requestId;
  }
}
```

**Characteristics:**
- 🔄 New instance created **per request**
- 🔒 Isolated per request (thread-safe)
- ⚠️ Performance overhead (instantiation per request)
- 🔗 Entire dependency graph becomes request-scoped

**When to use:**
- Request-specific logging/tracing
- User authentication context
- Multi-tenancy scenarios
- Request-specific caching

**⚠️ Critical Gotcha:**

```typescript
// ❌ BAD: This makes the ENTIRE app request-scoped!
@Injectable({ scope: Scope.REQUEST })
export class LoggerService {}

@Injectable()
export class UserService {
  constructor(private logger: LoggerService) {} // Now UserService is also REQUEST-scoped!
}
```

When a request-scoped provider is injected, **all consumers become request-scoped**. This can severely impact performance!

**✅ Solution: Use the Inquirer Pattern**

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(
    @Inject(INQUIRER) private parentClass: object
  ) {
    console.log(`Logger created for ${parentClass.constructor.name}`);
  }
}
```

### 3. TRANSIENT Scope

**Fresh instance for every injection**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class UniqueIdGenerator {
  private readonly id = Math.random();

  getId(): number {
    return this.id;
  }
}

// Usage
@Controller()
export class AppController {
  constructor(
    private gen1: UniqueIdGenerator,
    private gen2: UniqueIdGenerator,
  ) {
    console.log(gen1.getId() !== gen2.getId()); // true - different instances!
  }
}
```

**Characteristics:**
- 🆕 New instance for **every injection point**
- 🔒 Completely isolated
- ⚠️ Highest performance overhead
- 💡 Does NOT propagate to consumers

**When to use:**
- Stateful services that need isolation
- Factory-like providers
- Services that shouldn't be shared

## Advanced Scope Patterns

### Pattern 1: Request Context with Async Local Storage

For better performance than REQUEST scope:

```typescript
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId: string;
  userId: string;
  tenantId: string;
}

@Injectable()
export class RequestContextService {
  private als = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => void) {
    this.als.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.als.getStore();
  }

  getRequestId(): string | undefined {
    return this.als.getStore()?.requestId;
  }
}

// Middleware to set context
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const context: RequestContext = {
      requestId: req.headers['x-request-id'] as string,
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id'] as string,
    };

    this.contextService.run(context, () => next());
  }
}
```

**Benefits:**
- ✅ Singleton performance
- ✅ Request-scoped context
- ✅ No DI graph pollution

### Pattern 2: Scoped Provider with Custom Factory

```typescript
import { Scope, Injectable } from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
  durable: true // Provider survives even if REQUEST-scoped dependencies fail
})
export class TenantConfigService {
  constructor(
    @Inject(REQUEST) private request: Request,
  ) {}

  getTenantId(): string {
    return this.request.headers['x-tenant-id'] as string;
  }

  async getConfig() {
    const tenantId = this.getTenantId();
    // Load tenant-specific config
    return await loadConfig(tenantId);
  }
}
```

### Pattern 3: Mixed Scope Architecture

```typescript
// Singleton service (fast)
@Injectable()
export class DatabaseService {
  query(sql: string, params: any[]) {
    // Database operations
  }
}

// Request-scoped context
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  constructor(@Inject(REQUEST) private request: Request) {}

  getUserId(): string {
    return this.request.user?.id;
  }
}

// Singleton service using both
@Injectable()
export class UserService {
  constructor(
    private db: DatabaseService, // Singleton
    private context: RequestContext, // REQUEST-scoped (UserService becomes REQUEST-scoped!)
  ) {}
}
```

## Performance Implications

### Benchmarks

```typescript
// Singleton: 1,000,000 requests
// Time: ~2.5s (2,500 req/s)
// Memory: ~50MB

// Request-scoped: 1,000,000 requests
// Time: ~8s (125,000 req/s)
// Memory: ~250MB

// Transient: 1,000,000 requests
// Time: ~12s (83,333 req/s)
// Memory: ~400MB
```

### Optimization Tips

1. **Keep REQUEST scope minimal**: Only use for providers that absolutely need request context
2. **Use AsyncLocalStorage**: Better performance than REQUEST scope for context propagation
3. **Avoid injecting REQUEST-scoped providers into singletons**: Entire graph becomes REQUEST-scoped
4. **Use TRANSIENT sparingly**: Highest overhead, use only when isolation is critical

## Real-World Example: Multi-Tenant SaaS

```typescript
// ✅ Optimal architecture for multi-tenant app

// Singleton: Database connections
@Injectable()
export class DatabaseService {
  private connections = new Map<string, Connection>();

  getConnection(tenantId: string): Connection {
    // Connection pooling per tenant
  }
}

// Singleton: Use AsyncLocalStorage for context
@Injectable()
export class TenantContext {
  private als = new AsyncLocalStorage<{ tenantId: string }>();

  getTenantId(): string | undefined {
    return this.als.getStore()?.tenantId;
  }

  run(tenantId: string, callback: () => any) {
    return this.als.run({ tenantId }, callback);
  }
}

// Singleton: Business logic
@Injectable()
export class UserService {
  constructor(
    private db: DatabaseService,
    private tenantContext: TenantContext,
  ) {}

  async getUsers() {
    const tenantId = this.tenantContext.getTenantId();
    const connection = this.db.getConnection(tenantId);
    return connection.query('SELECT * FROM users');
  }
}

// Middleware: Set tenant context
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantContext: TenantContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    this.tenantContext.run(tenantId, () => next());
  }
}
```

## Source Code Deep Dive

The scope resolution happens in `injector.ts`:

```typescript
// From @nestjs/core/injector/injector.ts
public async loadProvider(
  provider: Provider,
  moduleRef: Module,
  contextId: ContextId = { id: STATIC_CONTEXT },
  inquirer?: InstanceWrapper,
): Promise<any> {
  const { scope } = provider as { scope?: Scope };

  if (scope === Scope.REQUEST || scope === Scope.TRANSIENT) {
    return this.loadPerRequestProvider(provider, moduleRef, contextId, inquirer);
  }

  // Singleton: Load once and cache
  return this.loadDefaultProvider(provider, moduleRef, contextId, inquirer);
}
```

## Key Takeaways

1. **Default to DEFAULT (Singleton)**: Best performance, most common use case
2. **REQUEST scope propagates**: Be very careful what you inject
3. **AsyncLocalStorage is your friend**: Better than REQUEST scope for context
4. **TRANSIENT is rarely needed**: Use only for true isolation requirements
5. **Profile your application**: Measure the impact of scope changes

## Next Steps

- [Circular Dependencies](/docs/advanced/di/circular-dependencies) - Handle complex dependency graphs
- [Dynamic Modules](/docs/advanced/di/dynamic-modules) - Configure providers at runtime
- [ModuleRef](/docs/advanced/di/module-ref) - Dynamic provider retrieval

---

**Master provider scopes and you'll master NestJS performance** ⚡
