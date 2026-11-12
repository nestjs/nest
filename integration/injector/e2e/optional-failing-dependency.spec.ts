import {
  Inject,
  Injectable,
  Optional,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { ContextIdFactory, ModuleRef, REQUEST } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

@Injectable({ scope: Scope.REQUEST })
class CurrentUser {
  readonly name: string;

  constructor(@Inject(REQUEST) request: { user?: string }) {
    if (!request.user) {
      throw new UnauthorizedException();
    }
    this.name = request.user;
  }
}

@Injectable()
class ConstructorHost {
  constructor(@Optional() readonly user?: CurrentUser) {}
}

@Injectable()
class PropertyHost {
  @Optional() @Inject(CurrentUser) readonly user?: CurrentUser;
}

@Injectable()
class MissingAndFailingHost {
  constructor(
    @Optional() @Inject('MISSING') readonly missing?: unknown,
    @Optional() readonly user?: CurrentUser,
  ) {}
}

describe('Optional dependency that fails to instantiate', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        CurrentUser,
        ConstructorHost,
        PropertyHost,
        MissingAndFailingHost,
      ],
    }).compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const contextOf = (request: { user?: string }) => {
    const contextId = ContextIdFactory.create();
    moduleRef.registerRequestByContextId(request, contextId);
    return contextId;
  };

  describe.each([
    { host: ConstructorHost },
    { host: PropertyHost },
    { host: MissingAndFailingHost },
  ])('$host.name', ({ host }) => {
    it('should be rejected by ModuleRef#resolve()', async () => {
      await expect(
        moduleRef.resolve(host, contextOf({})),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should be rejected by ModuleRef#create()', async () => {
      await expect(
        moduleRef.get(ModuleRef).create(host, contextOf({})),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should get the dependency when it is instantiated', async () => {
      const contextId = contextOf({ user: 'alice' });
      const resolved = await moduleRef.resolve(host, contextId);
      const created = await moduleRef.get(ModuleRef).create(host, contextId);

      expect(resolved.user!.name).toBe('alice');
      expect(created.user).toBe(resolved.user);
    });
  });

  it('should still inject "undefined" for a missing dependency', async () => {
    const contextId = contextOf({ user: 'alice' });
    const resolved = await moduleRef.resolve(MissingAndFailingHost, contextId);
    const created = await moduleRef
      .get(ModuleRef)
      .create(MissingAndFailingHost, contextId);

    expect(resolved.missing).toBeUndefined();
    expect(created.missing).toBeUndefined();
  });

  // Only the dependencies built per request fail their consumer, so that an
  // application that starts today keeps starting
  it('should still inject "undefined" at bootstrap for a transient dependency that fails', async () => {
    const testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'FAILING',
          scope: Scope.TRANSIENT,
          useFactory: () => {
            throw new Error('failing');
          },
        },
        {
          provide: 'FACTORY',
          useFactory: (dependency?: unknown) => dependency ?? 'DEFAULT_VALUE',
          inject: [{ token: 'FAILING', optional: true }],
        },
      ],
    }).compile();

    expect(testingModule.get('FACTORY')).toBe('DEFAULT_VALUE');
    await testingModule.close();
  });
});
