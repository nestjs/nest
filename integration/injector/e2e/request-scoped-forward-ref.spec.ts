import {
  Controller,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Module,
  Optional,
  Scope,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef, REQUEST } from '@nestjs/core';
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
