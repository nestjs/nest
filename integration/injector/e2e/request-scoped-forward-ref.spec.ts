import {
  Controller,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef, REQUEST } from '@nestjs/core';
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
});
