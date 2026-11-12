import {
  CallHandler,
  CanActivate,
  Controller,
  ExecutionContext,
  forwardRef,
  Get,
  Inject,
  INestApplication,
  Injectable,
  NestInterceptor,
  Scope,
  Type,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
  HostComponentInfo,
  REQUEST,
} from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { map } from 'rxjs';
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

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = request.headers.authorization;
    return !!request.user;
  }
}

@Injectable({ scope: Scope.REQUEST, durable: true })
class TenantDatabase {
  static instances = 0;

  constructor(@Inject(REQUEST) private readonly tenant: { tenantId: string }) {
    TenantDatabase.instances++;
  }

  findProfile(user: string) {
    return `profile of ${user} in ${this.tenant.tenantId}`;
  }
}

// Durable on its own, but private to its consumer: reads the profile once
@Injectable({ scope: Scope.TRANSIENT })
class ProfileLoader {
  private profile?: string;

  constructor(private readonly database: TenantDatabase) {}

  load(user: string) {
    return (this.profile ??= this.database.findProfile(user));
  }
}

@Injectable({ scope: Scope.REQUEST })
class CurrentUser {
  constructor(
    @Inject(REQUEST) private readonly request: { user: string },
    private readonly profileLoader: ProfileLoader,
  ) {}

  getProfile() {
    return this.profileLoader.load(this.request.user);
  }
}

// Durable, and so is the loader that it keeps
@Injectable()
class TenantSettings {
  static instances = 0;

  constructor(private readonly profileLoader: ProfileLoader) {
    TenantSettings.instances++;
  }

  getOwnerProfile() {
    return this.profileLoader.load('owner');
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class ProfileInterceptor implements NestInterceptor {
  private profile?: string;

  constructor(private readonly database: TenantDatabase) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const { user } = context.switchToHttp().getRequest();
    this.profile ??= this.database.findProfile(user);
    return next.handle().pipe(map(body => ({ ...body, seen: this.profile })));
  }
}

@Controller('profile')
@UseGuards(AuthGuard)
@UseInterceptors(ProfileInterceptor)
class ProfileController {
  constructor(
    private readonly currentUser: CurrentUser,
    private readonly settings: TenantSettings,
  ) {}

  @Get()
  getProfile() {
    return {
      profile: this.currentUser.getProfile(),
      owner: this.settings.getOwnerProfile(),
    };
  }
}

describe('Transient providers that depend on a durable provider', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [TenantDatabase, ProfileLoader, CurrentUser, TenantSettings],
    }).compile();
    app = await listenOnLoopback(moduleRef.createNestApplication());

    ContextIdFactory.apply(new TenantContextIdStrategy());
  });

  afterAll(async () => {
    ContextIdFactory.apply({ attach: () => undefined });
    await app.close();
  });

  const call = (user: string) =>
    request(app.getHttpServer())
      .get('/profile')
      .set({ 'x-tenant-id': 'acme', authorization: user });

  it('should not serve a user with the instance created for another user of the tenant', async () => {
    await call('alice');

    const { body } = await call('bob');
    expect(body.profile).toBe('profile of bob in acme');
  });

  it('should not run a transient enhancer created for another request of the tenant', async () => {
    await call('alice');

    const { body } = await call('bob');
    expect(body.seen).toBe('profile of bob in acme');
  });

  it('should keep sharing the durable providers and the instances that they hold', async () => {
    const { body } = await call('carol');

    expect(body.owner).toBe('profile of owner in acme');
    expect(TenantDatabase.instances).toBe(1);
    expect(TenantSettings.instances).toBe(1);
  });
});

describe('Transient and durable providers that reference each other', () => {
  const knownTenants = ['acme'];
  // Constructions of TenantGate per tenant. It lets a tenant in after this
  // many of them, so that loads that keep building the providers below
  // again fail the test instead of never settling
  const maxRefusals = 50;
  const constructions = new Map<string, number>();
  const subTrees = new Map<string, ContextId>();

  class Strategy implements ContextIdStrategy {
    attach(contextId: ContextId, request: { headers: Record<string, string> }) {
      const tenantId = request.headers['x-tenant-id'];
      if (!subTrees.has(tenantId)) {
        subTrees.set(tenantId, ContextIdFactory.create());
      }
      const subTree = subTrees.get(tenantId)!;
      return (info: HostComponentInfo) =>
        info.isTreeDurable ? subTree : contextId;
    }
  }

  @Injectable({ scope: Scope.REQUEST, durable: true })
  class TenantGate {
    constructor(@Inject(REQUEST) request: { headers: Record<string, string> }) {
      const tenantId = request.headers['x-tenant-id'];
      const count = (constructions.get(tenantId) ?? 0) + 1;
      constructions.set(tenantId, count);
      if (!knownTenants.includes(tenantId) && count < maxRefusals) {
        throw new UnauthorizedException();
      }
    }
  }

  @Injectable({ scope: Scope.TRANSIENT })
  class AuditTrail {
    readonly isConstructed = true;

    constructor(
      @Inject(forwardRef(() => Ledger)) readonly ledger: unknown,
      readonly gate: TenantGate,
    ) {}
  }

  // Durable, as its dependencies are
  @Injectable()
  class Ledger {
    constructor(
      @Inject(forwardRef(() => AuditTrail)) readonly auditTrail: AuditTrail,
    ) {}
  }

  @Injectable({ scope: Scope.REQUEST })
  class LedgerConsumer {
    constructor(
      @Inject(REQUEST) readonly request: unknown,
      readonly ledger: Ledger,
    ) {}
  }

  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TenantGate, AuditTrail, Ledger, LedgerConsumer],
    }).compile();
    ContextIdFactory.apply(new Strategy());
  });

  afterAll(async () => {
    ContextIdFactory.apply({ attach: () => undefined });
    await moduleRef.close();
  });

  const resolve = <T>(type: Type<T>, tenantId: string) => {
    const request = { headers: { 'x-tenant-id': tenantId } };
    const contextId = ContextIdFactory.getByRequest(request);
    moduleRef.registerRequestByContextId(request, contextId);
    return moduleRef.resolve(type, contextId);
  };

  it.each([
    ['Ledger', () => Ledger],
    ['LedgerConsumer', () => LedgerConsumer],
  ])(
    'should reject every request of a tenant that the gate refuses, and construct %s once it accepts it',
    async (name, getType) => {
      const tenantId = `initech-${name}`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await expect(
          resolve<object>(getType(), tenantId),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(constructions.get(tenantId)).toBe(attempt);
      }

      knownTenants.push(tenantId);
      const instance = await resolve<object>(getType(), tenantId);
      const ledger =
        instance instanceof LedgerConsumer ? instance.ledger : instance;
      expect((ledger as Ledger).auditTrail.isConstructed).toBe(true);
      expect((ledger as Ledger).auditTrail.ledger).toBe(ledger);
    },
  );
});
