import {
  Controller,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Provider,
  Scope,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
  HostComponentInfo,
  ModuleRef,
  REQUEST,
} from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

type Request = { headers: Record<string, string | undefined> };

const assertAuthorized = (request: Request) => {
  if (request.headers['x-api-key'] !== 'secret') {
    throw new UnauthorizedException();
  }
};

const authorized: Request = { headers: { 'x-api-key': 'secret' } };
const anonymous: Request = { headers: {} };

describe('Request-scoped providers with a forward reference', () => {
  describe('when there is no circular dependency', () => {
    @Injectable()
    class AuditLog {}

    // Request-scoped only because it injects REQUEST
    @Injectable()
    class TenantContext {
      public readonly tenant: string;

      constructor(
        @Inject(REQUEST) request: Request,
        @Inject(forwardRef(() => AuditLog)) public readonly log: AuditLog,
      ) {
        assertAuthorized(request);
        this.tenant = 'acme';
      }
    }

    @Controller('invoices')
    class InvoicesController {
      constructor(private readonly tenantContext: TenantContext) {}

      @Get()
      list() {
        return { tenant: `${this.tenantContext.tenant}` };
      }
    }

    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [InvoicesController],
        providers: [AuditLog, TenantContext],
      }).compile();
      app = await listenOnLoopback(
        moduleRef.createNestApplication({ logger: false }),
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it('should not run the handler when its constructor throws', async () => {
      await request(app.getHttpServer()).get('/invoices').expect(401);
    });

    it('should run the handler with the constructed provider', async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .set('x-api-key', 'secret')
        .expect(200, { tenant: 'acme' });
    });
  });

  describe.each([
    ['one side', false],
    ['both sides', true],
  ])('when %s of a circular dependency use "forwardRef()"', (_, bothSides) => {
    @Injectable()
    class TenantContext {
      public readonly isConstructed = true;

      constructor(
        @Inject(REQUEST) request: Request,
        @Inject(forwardRef(() => TenantService))
        public readonly service: { tenant: TenantContext },
      ) {
        assertAuthorized(request);
      }
    }

    @Injectable()
    class TenantService {
      constructor(
        @Inject(bothSides ? forwardRef(() => TenantContext) : TenantContext)
        public readonly tenant: TenantContext,
      ) {}
    }

    @Injectable()
    class Consumer {
      constructor(public readonly service: TenantService) {}
    }

    let moduleRef: TestingModule;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [TenantContext, TenantService, Consumer],
      }).compile();
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    const resolve = <T>(type: Type<T>, request: Request) => {
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId(request, contextId);
      return moduleRef.resolve(type, contextId);
    };

    it('should reject when its constructor throws', async () => {
      await expect(resolve(Consumer, anonymous)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should keep rejecting for the same context', async () => {
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId(anonymous, contextId);

      for (let attempt = 0; attempt < 2; attempt++) {
        await expect(
          moduleRef.resolve(Consumer, contextId),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should reject "ModuleRef#create()" when its constructor throws', async () => {
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId(anonymous, contextId);

      await expect(
        moduleRef.get(ModuleRef).create(Consumer, contextId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should construct both sides', async () => {
      const { service } = await resolve(Consumer, authorized);

      expect(service.tenant.isConstructed).toBe(true);
      expect(service.tenant.service).toBe(service);
    });
  });

  describe.each([
    ['class', false],
    ['async factory', true],
  ])('when it depends on a durable %s provider', (_, isAsync) => {
    const knownTenants = ['acme'];
    const tenantSubTrees = new Map<string, ContextId>();

    class TenantContextIdStrategy implements ContextIdStrategy<Request> {
      attach(contextId: ContextId, request: Request) {
        const tenantId = request.headers['x-tenant-id']!;
        if (!tenantSubTrees.has(tenantId)) {
          tenantSubTrees.set(tenantId, ContextIdFactory.create());
        }
        const tenantSubTree = tenantSubTrees.get(tenantId)!;
        return (info: HostComponentInfo) =>
          info.isTreeDurable ? tenantSubTree : contextId;
      }
    }

    @Injectable({ scope: Scope.REQUEST, durable: true })
    class TenantDatabase {
      constructor(@Inject(REQUEST) public readonly request: Request) {}
    }

    // Keeps the load of TenantContext running while other requests come in
    const asyncTenantDatabase: Provider = {
      provide: TenantDatabase,
      scope: Scope.REQUEST,
      durable: true,
      inject: [REQUEST],
      useFactory: async (request: Request) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return new TenantDatabase(request);
      },
    };

    @Injectable()
    class AuditLog {}

    // Durable, as it depends on TenantDatabase
    @Injectable()
    class TenantContext {
      public readonly tenantId: string;

      constructor(
        database: TenantDatabase,
        @Inject(forwardRef(() => AuditLog)) public readonly log: AuditLog,
      ) {
        const tenantId = database.request.headers['x-tenant-id']!;
        if (!knownTenants.includes(tenantId)) {
          throw new UnauthorizedException();
        }
        this.tenantId = tenantId;
      }
    }

    @Injectable()
    class Consumer {
      constructor(public readonly context: TenantContext) {}
    }

    // Not durable, as it injects REQUEST
    @Injectable()
    class RequestConsumer {
      constructor(
        @Inject(REQUEST) public readonly request: Request,
        public readonly consumer: Consumer,
      ) {}
    }

    let moduleRef: TestingModule;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [
          isAsync ? asyncTenantDatabase : TenantDatabase,
          AuditLog,
          TenantContext,
          Consumer,
          RequestConsumer,
        ],
      }).compile();
      ContextIdFactory.apply(new TenantContextIdStrategy());
    });

    afterAll(async () => {
      ContextIdFactory.apply({ attach: () => undefined });
      await moduleRef.close();
    });

    const resolve = <T>(type: Type<T>, tenantId: string) => {
      const request: Request = { headers: { 'x-tenant-id': tenantId } };
      const contextId = ContextIdFactory.getByRequest(request);
      moduleRef.registerRequestByContextId(request, contextId);
      return moduleRef.resolve(type, contextId);
    };

    it('should reject every request of the tenant when its constructor throws', async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await expect(resolve(Consumer, 'initech')).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
    });

    it('should reject every request of the tenant for a consumer that is not durable', async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await expect(
          resolve(RequestConsumer, 'umbrella'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should reject the overlapping requests of the tenant when its constructor throws', async () => {
      const results = await Promise.allSettled(
        [Consumer, Consumer, RequestConsumer].map(type =>
          resolve<object>(type, 'hooli'),
        ),
      );

      for (const result of results) {
        expect(result).toEqual({
          status: 'rejected',
          reason: expect.any(UnauthorizedException),
        });
      }
    });

    it('should construct it for the next request of the tenant once its constructor succeeds', async () => {
      await expect(resolve(Consumer, 'globex')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      knownTenants.push('globex');
      const { context } = await resolve(Consumer, 'globex');
      expect(context.tenantId).toBe('globex');
    });

    it('should construct it before the overlapping requests of the tenant use it', async () => {
      const tenantIds = await Promise.all(
        [Consumer, Consumer, RequestConsumer].map(async type => {
          const instance = await resolve<object>(type, 'acme');
          const consumer =
            instance instanceof RequestConsumer ? instance.consumer : instance;
          return (consumer as Consumer).context.tenantId;
        }),
      );

      expect(tenantIds).toEqual(['acme', 'acme', 'acme']);
    });

    it('should share it between the requests of the tenant', async () => {
      const first = await resolve(Consumer, 'acme');
      const second = await resolve(Consumer, 'acme');

      expect(second).toBe(first);
      expect(second.context.tenantId).toBe('acme');
    });
  });
});
