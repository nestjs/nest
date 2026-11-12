import {
  Controller,
  Get,
  Inject,
  Injectable,
  INestApplication,
  INestMicroservice,
  Scope,
} from '@nestjs/common';
import {
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
  HostComponentInfo,
  REQUEST,
} from '@nestjs/core';
import {
  ClientProxy,
  ClientProxyFactory,
  CONTEXT,
  MessagePattern,
  MicroserviceOptions,
  RequestContext,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

type TenantPayload = { tenantId: string };

/**
 * The strategy of the "Durable providers" documentation. `getTenantId` reads
 * the tenant from what the transport hands over as the request.
 */
class TenantContextIdStrategy<T> implements ContextIdStrategy<T> {
  private readonly tenants = new Map<string, ContextId>();

  constructor(private readonly getTenantId: (request: T) => string) {}

  attach(contextId: ContextId, request: T) {
    const tenantId = this.getTenantId(request);
    if (!this.tenants.has(tenantId)) {
      this.tenants.set(tenantId, ContextIdFactory.create());
    }
    const tenantSubTreeId = this.tenants.get(tenantId)!;
    return {
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
      payload: { tenantId } satisfies TenantPayload,
    };
  }
}

describe('Request payload of durable providers', () => {
  afterEach(() => {
    ContextIdFactory.apply({ attach: () => undefined });
  });

  describe('when a controller that is not durable uses them (HTTP)', () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class TenantFormatter {
      constructor(@Inject(REQUEST) public readonly tenant: TenantPayload) {}
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class TenantLogger {
      constructor(
        @Inject(REQUEST) public readonly tenant: TenantPayload,
        public readonly formatter: TenantFormatter,
      ) {}
    }

    @Injectable({ scope: Scope.REQUEST, durable: true })
    class TenantStats {
      @Inject(REQUEST)
      public readonly tenantProperty: TenantPayload;

      constructor(
        @Inject(REQUEST) public readonly tenant: TenantPayload,
        public readonly logger: TenantLogger,
      ) {}
    }

    @Injectable({ scope: Scope.REQUEST })
    class CurrentUser {
      public readonly name: string;

      constructor(@Inject(REQUEST) req: { headers: Record<string, string> }) {
        this.name = req.headers['x-user'];
      }
    }

    // Not durable, as CurrentUser is not
    @Controller('orders')
    class OrdersController {
      constructor(
        private readonly user: CurrentUser,
        private readonly stats: TenantStats,
      ) {}

      @Get()
      list() {
        return { user: this.user.name };
      }
    }

    // Durable
    @Controller('stats')
    class StatsController {
      constructor(private readonly stats: TenantStats) {}

      @Get()
      describe() {
        return {
          constructorParam: this.stats.tenant,
          property: this.stats.tenantProperty,
          transientDependency: this.stats.logger.tenant,
          nestedTransientDependency: this.stats.logger.formatter.tenant,
        };
      }
    }

    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [OrdersController, StatsController],
        providers: [TenantFormatter, TenantLogger, TenantStats, CurrentUser],
      }).compile();
      app = await listenOnLoopback(
        moduleRef.createNestApplication({ logger: false }),
      );
      ContextIdFactory.apply(
        new TenantContextIdStrategy<{ headers: Record<string, string> }>(
          req => req.headers['x-tenant-id'],
        ),
      );
    });

    afterEach(async () => {
      await app.close();
    });

    const get = (path: string, tenantId: string, user: string) =>
      request(app.getHttpServer())
        .get(path)
        .set('x-tenant-id', tenantId)
        .set('x-user', user);

    it('should build them with the payload of the strategy', async () => {
      for (const tenantId of ['acme', 'globex']) {
        await get('/orders', tenantId, 'alice').expect(200, { user: 'alice' });
        await get('/stats', tenantId, 'bob').expect(200, {
          constructorParam: { tenantId },
          property: { tenantId },
          transientDependency: { tenantId },
          nestedTransientDependency: { tenantId },
        });
        await get('/orders', tenantId, 'bob').expect(200, { user: 'bob' });
      }
    });
  });

  describe('when a controller that is not durable uses them (microservices)', () => {
    const PORT = 3893;

    @Injectable({ scope: Scope.REQUEST, durable: true })
    class TenantStats {
      public orders = 0;

      constructor(@Inject(CONTEXT) public readonly tenant: TenantPayload) {}
    }

    @Injectable({ scope: Scope.REQUEST })
    class AuditTrail {
      static readonly users: string[] = [];

      constructor(@Inject(CONTEXT) private readonly message: RequestContext) {}

      record() {
        AuditTrail.users.push(this.message.data.user);
      }
    }

    // Not durable, as AuditTrail is not
    @Controller()
    class OrdersController {
      constructor(
        private readonly audit: AuditTrail,
        private readonly stats: TenantStats,
      ) {}

      @MessagePattern('order.create')
      create() {
        this.audit.record();
        this.stats.orders++;
        return { accepted: true };
      }
    }

    // Durable
    @Controller()
    class StatsController {
      constructor(private readonly stats: TenantStats) {}

      @MessagePattern('tenant.describe')
      describe() {
        return { ...this.stats.tenant, orders: this.stats.orders };
      }
    }

    let app: INestMicroservice;
    let client: ClientProxy;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [OrdersController, StatsController],
        providers: [AuditTrail, TenantStats],
      }).compile();
      app = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: PORT },
        logger: false,
      });
      await app.listen();
      ContextIdFactory.apply(
        new TenantContextIdStrategy<RequestContext>(
          message => message.data.tenantId,
        ),
      );

      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: PORT },
      });
      await client.connect();
    });

    afterEach(async () => {
      await client.close();
      await app.close();
    });

    it('should not answer a request of the tenant with the message they were built for', async () => {
      await firstValueFrom(
        client.send('order.create', { tenantId: 'acme', user: 'alice' }),
      );
      const reply = await firstValueFrom(
        client.send('tenant.describe', { tenantId: 'acme', user: 'bob' }),
      );

      expect(reply).toEqual({ tenantId: 'acme', orders: 1 });
      expect(AuditTrail.users).toEqual(['alice']);
    });
  });
});
