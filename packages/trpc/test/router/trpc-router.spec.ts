import { expect } from 'chai';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, ModulesContainer } from '@nestjs/core';
import { z } from 'zod';
import { TrpcModule } from '../../trpc.module';
import { TrpcRouter } from '../../trpc-router';
import { Router } from '../../decorators/router.decorator';
import { Query, Mutation } from '../../decorators/procedure.decorator';
import { Injectable } from '@nestjs/common';

@Router('greeting')
class GreetingRouter {
  @Query({ input: z.object({ name: z.string() }) })
  hello(input: { name: string }) {
    return `Hello, ${input.name}!`;
  }

  @Mutation({ input: z.object({ name: z.string() }) })
  create(input: { name: string }) {
    return { id: '1', name: input.name };
  }
}

@Router()
class FlatRouter {
  @Query()
  ping() {
    return 'pong';
  }
}

@Router('typed')
class TypedRouter {
  @Query({
    input: z.object({ id: z.string() }),
    output: z.object({ id: z.string(), label: z.string() }),
  })
  getById(input: { id: string }) {
    return { id: input.id, label: `Item ${input.id}` };
  }
}

@Injectable()
class PlainService {
  doWork() {
    return 'done';
  }
}

@Router('math')
class MathRouter {
  @Query({ input: z.object({ a: z.number(), b: z.number() }) })
  add(input: { a: number; b: number }) {
    return input.a + input.b;
  }
}

@Router('mixed')
class MixedRouter {
  @Query()
  decorated() {
    return 'ok';
  }

  // Not decorated with @Query/@Mutation/@Subscription — should be skipped
  helperMethod() {
    return 'helper';
  }
}

describe('TrpcRouter', () => {
  let trpcRouter: TrpcRouter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [GreetingRouter, FlatRouter],
    }).compile();

    await module.init();

    trpcRouter = module.get(TrpcRouter);
  });

  it('should build a router from decorated providers', () => {
    const router = trpcRouter.getRouter();
    expect(router).to.not.be.undefined;
    expect(router._def).to.not.be.undefined;
  });

  it('should register nested procedures under the alias key', () => {
    const router = trpcRouter.getRouter();
    const procedures = router._def.procedures;
    expect(procedures).to.have.property('greeting.hello');
    expect(procedures).to.have.property('greeting.create');
  });

  it('should register flat procedures at the root level', () => {
    const router = trpcRouter.getRouter();
    const procedures = router._def.procedures;
    expect(procedures).to.have.property('ping');
  });

  it('should call aliased query handler and return correct output', async () => {
    const router = trpcRouter.getRouter();
    const caller = router.createCaller({});
    const result = await (caller as any).greeting.hello({ name: 'World' });
    expect(result).to.equal('Hello, World!');
  });

  it('should call aliased mutation handler and return correct output', async () => {
    const router = trpcRouter.getRouter();
    const caller = router.createCaller({});
    const result = await (caller as any).greeting.create({ name: 'Alice' });
    expect(result).to.deep.equal({ id: '1', name: 'Alice' });
  });

  it('should call flat query handler and return correct output', async () => {
    const router = trpcRouter.getRouter();
    const caller = router.createCaller({});
    const result = await (caller as any).ping();
    expect(result).to.equal('pong');
  });
});

describe('TrpcRouter (edge cases)', () => {
  it('should skip providers without @Router metadata', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [FlatRouter, PlainService],
    }).compile();

    await module.init();
    const router = module.get(TrpcRouter).getRouter();
    const procedures = router._def.procedures;

    // PlainService has no @Router decorator, so it should not appear
    expect(procedures).to.have.property('ping');
    expect(procedures).to.not.have.property('doWork');
  });

  it('should still work when resolveModuleKey returns empty string', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot()],
      providers: [MathRouter],
    }).compile();

    const trpcRouter = testingModule.get(TrpcRouter);
    const modules = testingModule.get(ModulesContainer);

    // Stub hasProvider to always return false so resolveModuleKey returns ''
    for (const mod of modules.values()) {
      mod.hasProvider = () => false;
    }

    trpcRouter.onModuleInit();

    const caller = trpcRouter.getRouter().createCaller({});
    const result = await (caller as any).math.add({ a: 1, b: 2 });
    expect(result).to.equal(3);
  });

  it('should register procedures with output schema validation', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [TypedRouter],
    }).compile();

    await module.init();
    const router = module.get(TrpcRouter).getRouter();
    const caller = router.createCaller({});
    const result = await (caller as any).typed.getById({ id: '42' });
    expect(result).to.deep.equal({ id: '42', label: 'Item 42' });
  });

  it('should handle an empty module with no routers gracefully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
    }).compile();

    await module.init();
    const router = module.get(TrpcRouter).getRouter();
    expect(router._def.procedures).to.deep.equal({});
  });

  it('should skip methods without procedure decorators on a @Router class', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [MixedRouter],
    }).compile();

    await module.init();
    const router = module.get(TrpcRouter).getRouter();
    const procedures = router._def.procedures;

    // Only the decorated method should appear
    expect(procedures).to.have.property('mixed.decorated');
    expect(procedures).to.not.have.property('mixed.helperMethod');
  });

  it('should skip providers with null instance or metatype', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [FlatRouter],
    }).compile();

    await module.init();
    const trpcRouter = module.get(TrpcRouter);
    const discoveryService = module.get(DiscoveryService);

    // Inject a provider wrapper with no instance
    const origGetProviders =
      discoveryService.getProviders.bind(discoveryService);
    discoveryService.getProviders = () => {
      const providers = origGetProviders();
      providers.push({ instance: null, metatype: null } as any);
      return providers;
    };

    trpcRouter.onModuleInit();
    const router = trpcRouter.getRouter();
    // The null-instance provider should have been skipped
    expect(router._def.procedures).to.have.property('ping');
  });
});
