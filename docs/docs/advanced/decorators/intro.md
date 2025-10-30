---
sidebar_position: 1
---

# Custom Decorators: The Secret Sauce of NestJS

Decorators are more than syntactic sugar - they're the foundation of NestJS's declarative programming model. Master them to build powerful, reusable abstractions.

## What Are Decorators?

Decorators are functions that add metadata or modify the behavior of classes, methods, properties, or parameters.

```typescript live
// A simple decorator
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };

  return descriptor;
}

class Calculator {
  @Log
  add(a: number, b: number): number {
    return a + b;
  }
}

// Try it!
const calc = new Calculator();
return calc.add(5, 3);
```

## The Four Types of Decorators

### 1. Class Decorators

Modify or annotate a class:

```typescript
import { SetMetadata } from '@nestjs/common';

// Simple metadata decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Usage
@Roles('admin', 'user')
@Controller('users')
export class UserController {}
```

**Advanced: Modify Class Behavior**

```typescript
function Singleton<T extends { new (...args: any[]): {} }>(constructor: T) {
  let instance: T | null = null;

  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) {
        return instance;
      }
      super(...args);
      instance = this as any;
      return instance;
    }
  };
}

@Singleton
class ConfigService {
  constructor(public config: any) {
    console.log('ConfigService instantiated');
  }
}

const s1 = new ConfigService({ key: 'value' });
const s2 = new ConfigService({ key: 'value2' });
console.log(s1 === s2); // true - same instance!
```

### 2. Method Decorators

Intercept or modify method behavior:

```typescript
import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

// Combine multiple decorators
export function CachedEndpoint(ttl: number = 60) {
  return applyDecorators(
    UseInterceptors(CacheInterceptor),
    SetMetadata('cache_ttl', ttl),
  );
}

@Controller('users')
export class UserController {
  @Get()
  @CachedEndpoint(300) // Cache for 5 minutes
  async findAll() {
    return this.userService.findAll();
  }
}
```

**Advanced: Method Retry Decorator**

```typescript
function Retry(maxAttempts: number = 3, delay: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: any;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt < maxAttempts) {
            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class ExternalApiService {
  @Retry(3, 2000) // Retry 3 times with 2s delay
  async fetchData(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
}
```

### 3. Property Decorators

Annotate class properties:

```typescript
import { Inject } from '@nestjs/common';

// Custom injection decorator
function InjectConfig(configKey: string) {
  return function (target: any, propertyKey: string) {
    const getter = function () {
      return this.configService.get(configKey);
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true,
    });
  };
}

@Injectable()
export class AppService {
  @InjectConfig('DATABASE_URL')
  databaseUrl: string;

  @InjectConfig('API_KEY')
  apiKey: string;
}
```

### 4. Parameter Decorators

Extract data from request context:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extract user from request
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(
    @User() user: UserEntity,
    @User('email') email: string,
  ) {
    return { user, email };
  }
}
```

## Advanced Decorator Patterns

### Pattern 1: Decorator Composition

Combine multiple decorators into one:

```typescript
import { applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';

export function Auth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    UseInterceptors(LoggingInterceptor),
    ApiBearerAuth(),
  );
}

// Usage: One decorator instead of four!
@Controller('admin')
export class AdminController {
  @Get('users')
  @Auth('admin') // Applies all decorators at once
  async getUsers() {
    return this.userService.findAll();
  }
}
```

### Pattern 2: Validation Decorator

```typescript
function ValidateDto(schema: any) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Validate first argument (usually DTO)
      const dto = args[0];
      const errors = await validateSchema(schema, dto);

      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Usage
@Controller('users')
export class UserController {
  @Post()
  @ValidateDto(CreateUserSchema)
  async create(data: CreateUserDto) {
    return this.userService.create(data);
  }
}
```

### Pattern 3: Rate Limiting Decorator

```typescript
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (requests: number, windowMs: number) =>
  SetMetadata('rateLimit', { requests, windowMs });

// Guard to enforce rate limit
@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const metadata = this.reflector.get('rateLimit', context.getHandler());

    if (!metadata) return true;

    const key = request.ip;
    const now = Date.now();
    const { requests: maxRequests, windowMs } = metadata;

    // Get request timestamps for this IP
    const timestamps = this.requests.get(key) || [];

    // Filter out old requests
    const recentRequests = timestamps.filter(t => now - t < windowMs);

    // Check limit
    if (recentRequests.length >= maxRequests) {
      throw new HttpException('Too Many Requests', 429);
    }

    // Add new request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }
}

// Usage
@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('data')
  @RateLimit(100, 60000) // 100 requests per minute
  getData() {
    return { data: 'sensitive data' };
  }
}
```

### Pattern 4: Performance Monitoring Decorator

```typescript
function Measure(threshold?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        // Log slow operations
        if (threshold && duration > threshold) {
          console.warn(
            `SLOW: ${target.constructor.name}.${propertyKey} took ${duration}ms`
          );
        }

        // Send to metrics service
        metricsService.recordTiming(
          `${target.constructor.name}.${propertyKey}`,
          duration,
        );

        return result;
      } catch (error) {
        const duration = Date.now() - start;

        // Track errors with timing
        metricsService.recordError(
          `${target.constructor.name}.${propertyKey}`,
          error,
          duration,
        );

        throw error;
      }
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class UserService {
  @Measure(1000) // Warn if > 1 second
  async findUsers() {
    return this.db.query('SELECT * FROM users');
  }
}
```

## Reflection API: Reading Metadata

```typescript
import 'reflect-metadata';

// Store metadata
function Route(path: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('route', path, target, propertyKey);
  };
}

// Read metadata
function getRoute(target: any, propertyKey: string): string {
  return Reflect.getMetadata('route', target, propertyKey);
}

// Usage
class Controller {
  @Route('/users')
  getUsers() {}
}

const route = getRoute(Controller.prototype, 'getUsers');
console.log(route); // '/users'
```

### NestJS's Reflector Service

```typescript
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get metadata from handler
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    // Get metadata from class
    const classRoles = this.reflector.get<string[]>('roles', context.getClass());

    // Get metadata from both (handler takes precedence)
    const allRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    return this.validateRoles(allRoles);
  }
}
```

## Real-World Example: Transaction Decorator

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

// Decorator
export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dataSource: DataSource = this.dataSource;
      const queryRunner: QueryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Execute method within transaction
        const result = await originalMethod.apply(this, args);

        // Commit if successful
        await queryRunner.commitTransaction();

        return result;
      } catch (error) {
        // Rollback on error
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // Release connection
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class OrderService {
  constructor(private dataSource: DataSource) {}

  @Transactional() // Automatically handles transaction
  async createOrder(userId: string, items: OrderItem[]) {
    // All these operations are in a single transaction
    const order = await this.orderRepo.create({ userId });
    await this.orderRepo.save(order);

    for (const item of items) {
      await this.orderItemRepo.create({ orderId: order.id, ...item });
      await this.inventoryService.decrementStock(item.productId, item.quantity);
    }

    return order;
    // Transaction automatically committed or rolled back
  }
}
```

## Key Takeaways

1. **Decorators enable declarative programming**: Less boilerplate, more clarity
2. **Composition is powerful**: Combine decorators for complex behaviors
3. **Metadata is everywhere**: NestJS uses it extensively for routing, validation, etc.
4. **Type safety matters**: Use proper TypeScript types for decorator parameters
5. **Performance aware**: Decorators run at startup, not per-request

## Next Steps

- [Parameter Decorators](/docs/advanced/decorators/parameter-decorators) - Extract request data elegantly
- [Reflection](/docs/advanced/decorators/reflection) - Read and manipulate metadata
- [Composition](/docs/advanced/decorators/composition) - Build complex decorators

---

**Master decorators and unlock NestJS's full potential** 🎨
