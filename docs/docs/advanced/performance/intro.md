---
sidebar_position: 1
---

# Performance Optimization: Making NestJS Blazingly Fast

NestJS applications can handle thousands of requests per second with proper optimization. This guide reveals performance secrets used by production applications.

## Performance Fundamentals

### The Performance Stack

```
┌─────────────────────────────────────┐
│   Application Layer (Your Code)     │  ← Algorithms, caching
├─────────────────────────────────────┤
│   NestJS Framework Layer            │  ← DI scopes, middleware
├─────────────────────────────────────┤
│   HTTP Platform (Express/Fastify)   │  ← Server choice matters!
├─────────────────────────────────────┤
│   Node.js Runtime                   │  ← V8 optimizations
├─────────────────────────────────────┤
│   Operating System                  │  ← Clustering, resources
└─────────────────────────────────────┘
```

## Quick Wins

### 1. Use Fastify Instead of Express

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // Disable logging in production
      ignoreTrailingSlash: true,
      caseSensitive: false,
    })
  );

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```

**Benchmark Results:**
```
Express:  15,000 req/s
Fastify:  45,000 req/s (3x faster!)
```

### 2. Enable Compression

```typescript
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
// For Fastify
import * as fastifyCompress from '@fastify/compress';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Express
  app.use(compression());

  // Fastify
  // app.register(fastifyCompress);

  await app.listen(3000);
}
```

**Impact:**
- Reduces response size by 60-80%
- Faster data transfer
- Lower bandwidth costs

### 3. Optimize Provider Scopes

```typescript
// ❌ BAD: Request-scoped unnecessarily
@Injectable({ scope: Scope.REQUEST })
export class SlowService {
  // No request-specific state, but instantiated per request!
}

// ✅ GOOD: Default singleton scope
@Injectable()
export class FastService {
  // Instantiated once, shared across all requests
}
```

**Performance Impact:**
```
Singleton:        50,000 req/s
Request-scoped:   15,000 req/s (70% slower!)
```

## Advanced Optimization Techniques

### 1. Response Streaming

For large responses, stream data instead of buffering:

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';

@Controller('files')
export class FileController {
  @Get('large-file')
  getLargeFile(@Res() res: Response) {
    const stream = createReadStream('./large-file.json');
    res.setHeader('Content-Type', 'application/json');
    stream.pipe(res);
  }

  @Get('stream-data')
  async *streamData() {
    // Server-Sent Events style streaming
    for (let i = 0; i < 1000; i++) {
      yield { data: `Item ${i}`, timestamp: Date.now() };
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
```

**Benefits:**
- Constant memory usage (no buffering)
- Faster time-to-first-byte
- Better user experience for large responses

### 2. Advanced Caching Strategies

```typescript
import { Injectable, CacheInterceptor, CacheTTL } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private redis: Redis) {}

  // Multi-level caching
  async getWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600,
  ): Promise<T> {
    // L1: Memory cache (fastest)
    const memoryCache = this.memoryCache.get(key);
    if (memoryCache) return memoryCache;

    // L2: Redis cache (fast)
    const redisCache = await this.redis.get(key);
    if (redisCache) {
      const parsed = JSON.parse(redisCache);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    // L3: Database (slow)
    const data = await fetchFn();

    // Cache in both layers
    await this.redis.setex(key, ttl, JSON.stringify(data));
    this.memoryCache.set(key, data);

    return data;
  }

  private memoryCache = new Map<string, any>();
}

// Usage with smart cache invalidation
@Injectable()
export class UserService {
  constructor(private cacheService: CacheService) {}

  async getUser(id: string) {
    return this.cacheService.getWithCache(
      `user:${id}`,
      () => this.db.findUser(id),
      3600, // 1 hour
    );
  }

  async updateUser(id: string, data: any) {
    await this.db.updateUser(id, data);

    // Invalidate cache
    await this.cacheService.invalidate(`user:${id}`);

    // Preload updated data
    return this.getUser(id);
  }
}
```

### 3. Database Query Optimization

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import DataLoader from 'dataloader';

@Injectable()
export class UserService {
  private userLoader: DataLoader<string, User>;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    // DataLoader batches and caches database queries
    this.userLoader = new DataLoader(async (ids: string[]) => {
      const users = await this.userRepo.find({
        where: { id: In(ids) },
      });

      // Return in the same order as requested
      return ids.map(id => users.find(u => u.id === id));
    });
  }

  // ❌ BAD: N+1 query problem
  async getPostsWithAuthors_SLOW(postIds: string[]) {
    const posts = await this.postRepo.find({ where: { id: In(postIds) } });

    for (const post of posts) {
      post.author = await this.userRepo.findOne({ where: { id: post.authorId } });
    }

    return posts;
  }

  // ✅ GOOD: Single query with join
  async getPostsWithAuthors_FAST(postIds: string[]) {
    return this.postRepo.find({
      where: { id: In(postIds) },
      relations: ['author'],
    });
  }

  // ✅ BEST: DataLoader for automatic batching
  async getPostsWithAuthors_DATALOADER(postIds: string[]) {
    const posts = await this.postRepo.find({ where: { id: In(postIds) } });

    // DataLoader batches all these into a single query
    await Promise.all(
      posts.map(async post => {
        post.author = await this.userLoader.load(post.authorId);
      })
    );

    return posts;
  }
}
```

### 4. Async Initialization

Don't block the event loop during startup:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: any;

  async onModuleInit() {
    // Load config asynchronously
    this.config = await this.loadConfigFromRemote();
  }

  // ❌ BAD: Synchronous initialization blocks event loop
  constructor() {
    this.config = this.loadConfigSync(); // Blocks!
  }

  // ✅ GOOD: Async initialization
  async onModuleInit() {
    this.config = await this.loadConfigAsync();
  }
}
```

## Profiling & Monitoring

### Built-in Performance Monitoring

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;

        // Log slow requests
        if (duration > 1000) {
          console.warn(`SLOW REQUEST: ${method} ${url} took ${duration}ms`);
        }

        // Send to monitoring service
        this.metricsService.recordLatency(method, url, duration);
      }),
    );
  }
}
```

### Using Node.js Profiler

```bash
# Generate CPU profile
node --prof dist/main.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect dist/main.js
# Open chrome://inspect in Chrome
```

### Load Testing

```typescript
// load-test.ts
import autocannon from 'autocannon';

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 100,
    duration: 30,
    pipelining: 10,
  });

  console.log(autocannon.printResult(result));
}

runLoadTest();
```

## Real-World Optimization Case Study

### Before: 500 req/s

```typescript
// Slow controller
@Controller('users')
export class UserController {
  @Get(':id')
  @Injectable({ scope: Scope.REQUEST }) // ❌ Unnecessary scope
  async getUser(@Param('id') id: string) {
    // ❌ No caching
    const user = await this.db.findOne({ where: { id } });

    // ❌ N+1 query
    user.posts = await Promise.all(
      user.postIds.map(postId => this.db.findPost(postId))
    );

    // ❌ Synchronous JSON serialization
    return user;
  }
}
```

### After: 15,000 req/s (30x faster!)

```typescript
// Optimized controller
@Controller('users')
@Injectable() // ✅ Singleton scope
@UseInterceptors(CacheInterceptor) // ✅ Response caching
export class UserController {
  private userLoader = new DataLoader(/* ... */);

  @Get(':id')
  @CacheTTL(300) // ✅ 5-minute cache
  async getUser(@Param('id') id: string) {
    // ✅ Single query with join
    const user = await this.db.findOne({
      where: { id },
      relations: ['posts'],
    });

    // ✅ Async JSON serialization
    return user;
  }
}
```

## Performance Checklist

- [ ] Use Fastify instead of Express
- [ ] Enable compression middleware
- [ ] Use singleton scope by default
- [ ] Implement multi-level caching (memory + Redis)
- [ ] Use DataLoader for N+1 query prevention
- [ ] Stream large responses
- [ ] Enable keep-alive connections
- [ ] Use connection pooling for databases
- [ ] Implement circuit breakers for external services
- [ ] Profile and monitor production performance
- [ ] Load test before deployment

## Key Takeaways

1. **Platform matters**: Fastify is 3x faster than Express
2. **Caching is king**: Multi-level caching provides massive gains
3. **Scopes affect performance**: Default to singleton
4. **Async is essential**: Never block the event loop
5. **Measure everything**: Profile, monitor, and optimize

## Next Steps

- [Compression](/docs/advanced/performance/compression) - Deep dive into compression strategies
- [Caching](/docs/advanced/performance/caching) - Advanced caching patterns
- [Clustering](/docs/advanced/performance/clustering) - Multi-core utilization

---

**Optimize relentlessly, measure constantly** 📊
