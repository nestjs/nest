import {
  CanActivate,
  Controller,
  ExecutionContext,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  Scope,
  UseGuards,
} from '@nestjs/common';
import {
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
  HostComponentInfo,
  REQUEST,
} from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const tenantSubTrees = new Map<string, ContextId>();

class TenantContextIdStrategy implements ContextIdStrategy {
  attach(contextId: ContextId, request: { headers: Record<string, string> }) {
    const tenantId = request.headers['x-tenant-id'];
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
class TenantDatabase {
  constructor(@Inject(REQUEST) readonly tenant: { tenantId: string }) {}
}

@Injectable({ scope: Scope.REQUEST })
class CurrentUser {
  name?: string;
}

@Injectable()
class AuthGuard implements CanActivate {
  constructor(private readonly currentUser: CurrentUser) {}

  canActivate(context: ExecutionContext) {
    const { headers } = context.switchToHttp().getRequest();
    this.currentUser.name = headers.authorization;
    return !!this.currentUser.name;
  }
}

@Injectable()
class OrdersService {
  constructor(
    private readonly database: TenantDatabase,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoices: { owner(): string | undefined },
  ) {}

  list() {
    return `orders of ${this.invoices.owner()} in ${this.database.tenant.tenantId}`;
  }
}

@Injectable()
class InvoicesService {
  // OrdersService, which is durable on its own, is walked before CurrentUser
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
    private readonly currentUser: CurrentUser,
  ) {}

  owner() {
    return this.currentUser.name;
  }

  summary() {
    return {
      authenticatedAs: this.currentUser.name,
      orders: this.orders.list(),
    };
  }
}

@Controller('invoices')
@UseGuards(AuthGuard)
class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  summary() {
    return this.invoices.summary();
  }
}

describe('Durable providers in a circular dependency', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [TenantDatabase, CurrentUser, OrdersService, InvoicesService],
    }).compile();
    app = await listenOnLoopback(moduleRef.createNestApplication());

    ContextIdFactory.apply(new TenantContextIdStrategy());
  });

  afterAll(async () => {
    await app.close();
  });

  const call = (user: string) =>
    request(app.getHttpServer())
      .get('/invoices')
      .set({ 'x-tenant-id': 'acme', authorization: user });

  it('should not serve a user with the instances built for another user of the tenant', async () => {
    await call('alice');

    const { body } = await call('bob');
    expect(body).toEqual({
      authenticatedAs: 'bob',
      orders: 'orders of bob in acme',
    });
  });
});
