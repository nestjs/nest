import {
  CallHandler,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Inject,
  INestApplication,
  Injectable,
  NestInterceptor,
  Scope,
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
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { map } from 'rxjs';
import * as request from 'supertest';

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

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [TenantDatabase, ProfileLoader, CurrentUser, TenantSettings],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');

    ContextIdFactory.apply(new TenantContextIdStrategy());
  });

  after(async () => {
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
    expect(body.profile).to.equal('profile of bob in acme');
  });

  it('should not run a transient enhancer created for another request of the tenant', async () => {
    await call('alice');

    const { body } = await call('bob');
    expect(body.seen).to.equal('profile of bob in acme');
  });

  it('should keep sharing the durable providers and the instances that they hold', async () => {
    const { body } = await call('carol');

    expect(body.owner).to.equal('profile of owner in acme');
    expect(TenantDatabase.instances).to.equal(1);
    expect(TenantSettings.instances).to.equal(1);
  });
});
