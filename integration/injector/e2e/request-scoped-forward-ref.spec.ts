import {
  Controller,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Module,
  Optional,
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
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as request from 'supertest';

chai.use(chaiAsPromised);

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

    before(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [InvoicesController],
        providers: [AuditLog, TenantContext],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');
    });

    after(async () => {
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

  for (const [title, bothSides] of [
    ['one side', false],
    ['both sides', true],
  ] as const) {
    describe(`when ${title} of a circular dependency use "forwardRef()"`, () => {
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

      before(async () => {
        moduleRef = await Test.createTestingModule({
          providers: [TenantContext, TenantService, Consumer],
        }).compile();
      });

      after(async () => {
        await moduleRef.close();
      });

      const resolve = <T>(type: Type<T>, request: Request) => {
        const contextId = ContextIdFactory.create();
        moduleRef.registerRequestByContextId(request, contextId);
        return moduleRef.resolve(type, contextId);
      };

      it('should reject when its constructor throws', async () => {
        await expect(resolve(Consumer, anonymous)).to.be.rejectedWith(
          UnauthorizedException,
        );
      });

      it('should keep rejecting for the same context', async () => {
        const contextId = ContextIdFactory.create();
        moduleRef.registerRequestByContextId(anonymous, contextId);

        for (let attempt = 0; attempt < 2; attempt++) {
          await expect(
            moduleRef.resolve(Consumer, contextId),
          ).to.be.rejectedWith(UnauthorizedException);
        }
      });

      it('should reject "ModuleRef#create()" when its constructor throws', async () => {
        const contextId = ContextIdFactory.create();
        moduleRef.registerRequestByContextId(anonymous, contextId);

        await expect(
          moduleRef.get(ModuleRef).create(Consumer, contextId),
        ).to.be.rejectedWith(UnauthorizedException);
      });

      it('should construct both sides', async () => {
        const { service } = await resolve(Consumer, authorized);

        expect(service.tenant.isConstructed).to.equal(true);
        expect(service.tenant.service).to.equal(service);
      });
    });
  }

  for (const [kind, isAsync] of [
    ['class', false],
    ['async factory', true],
  ] as const) {
    describe(`when it depends on a durable ${kind} provider`, () => {
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

      before(async () => {
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

      after(async () => {
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
          await expect(resolve(Consumer, 'initech')).to.be.rejectedWith(
            UnauthorizedException,
          );
        }
      });

      it('should reject every request of the tenant for a consumer that is not durable', async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          await expect(resolve(RequestConsumer, 'umbrella')).to.be.rejectedWith(
            UnauthorizedException,
          );
        }
      });

      it('should reject the overlapping requests of the tenant when its constructor throws', async () => {
        const results = await Promise.allSettled(
          [Consumer, Consumer, RequestConsumer].map(type =>
            resolve<object>(type, 'hooli'),
          ),
        );

        for (const result of results) {
          expect(result.status).to.equal('rejected');
          expect((result as PromiseRejectedResult).reason).to.be.instanceOf(
            UnauthorizedException,
          );
        }
      });

      it('should construct it for the next request of the tenant once its constructor succeeds', async () => {
        await expect(resolve(Consumer, 'globex')).to.be.rejectedWith(
          UnauthorizedException,
        );

        knownTenants.push('globex');
        const { context } = await resolve(Consumer, 'globex');
        expect(context.tenantId).to.equal('globex');
      });

      it('should construct it before the overlapping requests of the tenant use it', async () => {
        const tenantIds = await Promise.all(
          [Consumer, Consumer, RequestConsumer].map(async type => {
            const instance = await resolve<object>(type, 'acme');
            const consumer =
              instance instanceof RequestConsumer
                ? instance.consumer
                : instance;
            return (consumer as Consumer).context.tenantId;
          }),
        );

        expect(tenantIds).to.deep.equal(['acme', 'acme', 'acme']);
      });

      it('should share it between the requests of the tenant', async () => {
        const first = await resolve(Consumer, 'acme');
        const second = await resolve(Consumer, 'acme');

        expect(second).to.equal(first);
        expect(second.context.tenantId).to.equal('acme');
      });

      describe('through the "ModuleRef" of a module', () => {
        // has an injector of its own
        const resolveThroughModule = <T>(type: Type<T>, tenantId: string) => {
          const request: Request = { headers: { 'x-tenant-id': tenantId } };
          const contextId = ContextIdFactory.getByRequest(request);
          moduleRef.registerRequestByContextId(request, contextId);
          return moduleRef.get(ModuleRef).resolve(type, contextId);
        };

        it('should reject every request of the tenant once its constructor threw for another injector', async () => {
          await expect(resolve(Consumer, 'cyberdyne')).to.be.rejectedWith(
            UnauthorizedException,
          );
          for (let attempt = 0; attempt < 2; attempt++) {
            await expect(
              resolveThroughModule(Consumer, 'cyberdyne'),
            ).to.be.rejectedWith(UnauthorizedException);
          }
          await expect(resolve(Consumer, 'cyberdyne')).to.be.rejectedWith(
            UnauthorizedException,
          );
        });

        it('should make another injector reject every request of the tenant once its constructor threw', async () => {
          await expect(
            resolveThroughModule(Consumer, 'tyrell'),
          ).to.be.rejectedWith(UnauthorizedException);
          for (let attempt = 0; attempt < 2; attempt++) {
            await expect(resolve(Consumer, 'tyrell')).to.be.rejectedWith(
              UnauthorizedException,
            );
          }
          await expect(
            resolveThroughModule(Consumer, 'tyrell'),
          ).to.be.rejectedWith(UnauthorizedException);
        });

        it('should construct it for a tenant that it accepts', async () => {
          const { context } = await resolveThroughModule(Consumer, 'acme');
          expect(context.tenantId).to.equal('acme');
        });
      });
    });
  }

  describe('when a pair that references each other depends on a durable provider that throws', () => {
    const knownTenants = ['acme'];
    const tenantSubTrees = new Map<string, ContextId>();
    // Constructions of TenantConnection per tenant. It lets a tenant in after
    // this many of them, so that loads that keep building the pair below
    // again fail the test instead of never leaving the microtask queue
    const maxRefusals = 100;
    const constructions = new Map<string, number>();

    class TenantContextIdStrategy implements ContextIdStrategy<Request> {
      attach(contextId: ContextId, request: Request) {
        const tenantId = request.headers['x-tenant-id']!;
        if (!tenantSubTrees.has(tenantId)) {
          tenantSubTrees.set(tenantId, ContextIdFactory.create());
        }
        const tenantSubTree = tenantSubTrees.get(tenantId)!;
        return {
          resolve: (info: HostComponentInfo) =>
            info.isTreeDurable ? tenantSubTree : contextId,
          payload: { tenantId },
        };
      }
    }

    @Injectable({ scope: Scope.REQUEST, durable: true })
    class TenantConnection {
      constructor(@Inject(REQUEST) { tenantId }: { tenantId: string }) {
        const count = (constructions.get(tenantId) ?? 0) + 1;
        constructions.set(tenantId, count);
        if (!knownTenants.includes(tenantId) && count < maxRefusals) {
          throw new UnauthorizedException();
        }
      }
    }

    // A pair whose sides do not wait for each other, and a provider that one
    // side waits for while the other side is loaded for it as well
    @Injectable()
    class UsersService {
      constructor(
        @Inject(forwardRef(() => OrdersService)) public readonly orders: any,
        public readonly connection: TenantConnection,
      ) {}
    }

    @Injectable()
    class ReportsService {
      constructor(public readonly users: UsersService) {}
    }

    @Injectable()
    class OrdersService {
      constructor(
        @Inject(forwardRef(() => UsersService)) public readonly users: any,
        public readonly reports: ReportsService,
      ) {}
    }

    @Controller('orders')
    class OrdersController {
      constructor(public readonly orders: OrdersService) {}

      @Get()
      list() {
        return [];
      }
    }

    let app: INestApplication;

    before(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [
          TenantConnection,
          UsersService,
          ReportsService,
          OrdersService,
        ],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');
      ContextIdFactory.apply(new TenantContextIdStrategy());
    });

    after(async () => {
      ContextIdFactory.apply({ attach: () => undefined });
      await app.close();
    });

    const resolve = <T>(type: Type<T>, tenantId: string) => {
      const request: Request = { headers: { 'x-tenant-id': tenantId } };
      const contextId = ContextIdFactory.getByRequest(request);
      // as the router does for a durable tree
      app.registerRequestByContextId(contextId.payload, contextId);
      return app.resolve(type, contextId);
    };
    // Lets the loads that a request left behind run
    const settle = () => new Promise(resolve => setTimeout(resolve, 10));

    it('should construct the pair for a tenant that the provider accepts', async () => {
      const orders = await resolve(OrdersService, 'acme');

      expect(orders.users).to.be.instanceOf(UsersService);
      expect(orders.users.orders).to.equal(orders);
      expect(orders.reports.users).to.equal(orders.users);
    });

    it('should reject every request of the tenant, and construct the provider once per request', async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await expect(resolve(OrdersService, 'soylent')).to.be.rejectedWith(
          UnauthorizedException,
        );
        await settle();
        expect(constructions.get('soylent')).to.equal(attempt);
      }
    });

    it('should reject the overlapping requests of the tenant, and construct the provider once per request at most', async () => {
      const results = await Promise.allSettled(
        [OrdersService, ReportsService, OrdersService].map(type =>
          resolve<object>(type, 'massive'),
        ),
      );
      await settle();

      for (const result of results) {
        expect(result.status).to.equal('rejected');
        expect((result as PromiseRejectedResult).reason).to.be.instanceOf(
          UnauthorizedException,
        );
      }
      expect(constructions.get('massive')).to.be.at.most(3);
    });

    it('should answer every request of the tenant over HTTP, and construct the provider once per request', async () => {
      const server = app.getHttpServer();
      for (let attempt = 1; attempt <= 2; attempt++) {
        await request(server)
          .get('/orders')
          .set('x-tenant-id', 'initech')
          .expect(401);
        await settle();
        expect(constructions.get('initech')).to.equal(attempt);
      }
      await request(server)
        .get('/orders')
        .set('x-tenant-id', 'acme')
        .expect(200);
    });

    it('should construct the pair for the next request of the tenant once the provider accepts it', async () => {
      await expect(resolve(OrdersService, 'stark')).to.be.rejectedWith(
        UnauthorizedException,
      );

      knownTenants.push('stark');
      const orders = await resolve(OrdersService, 'stark');
      expect(orders.users).to.be.instanceOf(UsersService);
      expect(orders.users.orders).to.equal(orders);
      expect(orders.reports.users).to.equal(orders.users);
    });
  });

  describe('when a durable factory of a pair that references each other resolves its other side through "ModuleRef"', () => {
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

    const TENANT_SETTINGS = Symbol('TENANT_SETTINGS');

    @Injectable()
    class BillingService {
      constructor(
        @Inject(forwardRef(() => InvoicesService))
        public readonly invoices: any,
        @Inject(TENANT_SETTINGS) public readonly settings: any,
      ) {}
    }

    @Injectable()
    class InvoicesService {
      constructor(
        @Inject(forwardRef(() => BillingService)) public readonly billing: any,
      ) {}
    }

    const tenantSettings: Provider = {
      provide: TENANT_SETTINGS,
      scope: Scope.REQUEST,
      durable: true,
      inject: [ModuleRef, REQUEST],
      useFactory: async (moduleRef: ModuleRef, request: Request) => ({
        // waits for the side the load of this factory is deferred for
        invoices: await moduleRef.resolve(
          InvoicesService,
          ContextIdFactory.getByRequest(request),
        ),
      }),
    };

    let moduleRef: TestingModule;

    before(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [tenantSettings, BillingService, InvoicesService],
      }).compile();
      ContextIdFactory.apply(new TenantContextIdStrategy());
    });

    after(async () => {
      ContextIdFactory.apply({ attach: () => undefined });
      await moduleRef.close();
    });

    const resolve = <T>(type: Type<T>, tenantId: string) => {
      const request: Request = { headers: { 'x-tenant-id': tenantId } };
      const contextId = ContextIdFactory.getByRequest(request);
      moduleRef.registerRequestByContextId(request, contextId);
      return Promise.race([
        moduleRef.resolve(type, contextId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Not resolved in time')), 2000),
        ),
      ]);
    };

    for (const [name, getType] of [
      ['BillingService', () => BillingService],
      ['InvoicesService', () => InvoicesService],
    ] as const) {
      it(`should resolve ${name}`, async () => {
        const instance = await resolve<object>(getType(), getType().name);
        const billing =
          instance instanceof InvoicesService ? instance.billing : instance;

        expect(billing).to.be.instanceOf(BillingService);
        expect(billing.invoices).to.be.instanceOf(InvoicesService);
        expect(billing.invoices.billing).to.equal(billing);
        expect(billing.settings.invoices).to.equal(billing.invoices);
      });
    }
  });

  describe('when the sides of a circular dependency are in different modules', () => {
    @Injectable({ scope: Scope.REQUEST })
    class Session {
      constructor(@Inject(REQUEST) public readonly request: Request) {}
    }

    @Module({ providers: [Session], exports: [Session] })
    class SessionModule {}

    // Request-scoped only because they depend on Session
    @Injectable()
    class TenantContext {
      public readonly isConstructed = true;

      constructor(
        session: Session,
        @Inject(forwardRef(() => TenantService))
        public readonly service: { tenant: TenantContext },
      ) {
        assertAuthorized(session.request);
      }
    }

    @Injectable()
    class TenantService {
      public readonly isConstructed = true;

      constructor(
        session: Session,
        @Inject(forwardRef(() => TenantContext))
        public readonly tenant: TenantContext,
      ) {}
    }

    @Module({
      imports: [SessionModule, forwardRef(() => TenantContextModule)],
      providers: [TenantService],
      exports: [TenantService],
    })
    class TenantServiceModule {}

    @Module({
      imports: [SessionModule, forwardRef(() => TenantServiceModule)],
      providers: [TenantContext],
      exports: [TenantContext],
    })
    class TenantContextModule {}

    // In a third module, with an optional dependency that is not provided
    @Injectable()
    class Consumer {
      constructor(
        public readonly service: TenantService,
        @Optional() @Inject('AUDIT_LOG') public readonly log?: unknown,
      ) {}
    }

    @Module({ imports: [TenantServiceModule], providers: [Consumer] })
    class ConsumerModule {}

    let moduleRef: TestingModule;

    before(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ConsumerModule],
      }).compile();
    });

    after(async () => {
      await moduleRef.close();
    });

    const resolve = <T>(type: Type<T>, request: Request) => {
      const contextId = ContextIdFactory.create();
      moduleRef.registerRequestByContextId(request, contextId);
      return moduleRef.resolve(type, contextId, { strict: false });
    };

    it('should construct both sides', async () => {
      const { service } = await resolve(Consumer, authorized);

      expect(service.isConstructed).to.equal(true);
      expect(service.tenant.isConstructed).to.equal(true);
      expect(service.tenant.service).to.equal(service);
    });

    it('should reject when its constructor throws', async () => {
      await expect(resolve(Consumer, anonymous)).to.be.rejectedWith(
        UnauthorizedException,
      );
    });
  });
});
