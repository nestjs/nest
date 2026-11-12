import { Inject, Injectable, Module, Scope } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

const LOADER = Symbol('LOADER');
const LOADER_ALIAS = 'LOADER_ALIAS';
const REGISTRY = 'REGISTRY';

@Injectable()
class Registry {}

@Injectable({ scope: Scope.TRANSIENT })
class TransientLoader {
  constructor(readonly registry: Registry) {}
}

@Injectable()
class FirstService {
  constructor(@Inject(LOADER) readonly loader: TransientLoader) {}
}

@Injectable()
class SecondService {
  @Inject(LOADER_ALIAS) readonly loader: TransientLoader;

  constructor(@Inject(REGISTRY) readonly registry: Registry) {}
}

@Injectable({ scope: Scope.REQUEST })
class RequestService {
  constructor(@Inject(LOADER) readonly loader: TransientLoader) {}
}

@Module({
  providers: [
    Registry,
    TransientLoader,
    { provide: REGISTRY, useExisting: Registry },
    { provide: LOADER, useExisting: TransientLoader },
    // an alias of the alias
    { provide: LOADER_ALIAS, useExisting: LOADER },
    FirstService,
    SecondService,
    RequestService,
  ],
  exports: [LOADER],
})
class AppModule {}

@Injectable()
class ImportingService {
  constructor(@Inject(LOADER) readonly loader: TransientLoader) {}
}

// The transient provider is not exported, only its alias is.
@Module({
  imports: [AppModule],
  providers: [ImportingService],
})
class ImportingModule {}

describe('Alias (useExisting) of a transient provider', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule, ImportingModule],
    }).compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should create an instance for each consumer', () => {
    const first = moduleRef.get(FirstService);
    const second = moduleRef.get(SecondService);

    expect(first.loader).toBeInstanceOf(TransientLoader);
    expect(second.loader).toBeInstanceOf(TransientLoader);
    expect(first.loader).not.toBe(second.loader);
    expect(first.loader.registry).toBe(moduleRef.get(Registry));
  });

  it('should create an instance for a consumer in a module that imports the alias', () => {
    const first = moduleRef.get(FirstService);
    const importing = moduleRef.get(ImportingService);

    expect(importing.loader).toBeInstanceOf(TransientLoader);
    expect(importing.loader).not.toBe(first.loader);
    expect(importing.loader.registry).toBe(moduleRef.get(Registry));
  });

  it('should create an instance for each request-scoped consumer', async () => {
    const [first, second] = await Promise.all([
      moduleRef.resolve(RequestService, ContextIdFactory.create()),
      moduleRef.resolve(RequestService, ContextIdFactory.create()),
    ]);

    expect(first).not.toBe(second);
    expect(first.loader).toBeInstanceOf(TransientLoader);
    expect(first.loader).not.toBe(second.loader);
  });

  it('should create an instance for each "resolve()" call', async () => {
    const first = await moduleRef.resolve(LOADER);
    const second = await moduleRef.resolve(LOADER_ALIAS);
    const contextId = ContextIdFactory.create();

    expect(first).toBeInstanceOf(TransientLoader);
    expect(first).not.toBe(second);
    expect(await moduleRef.resolve(LOADER, contextId)).toBe(
      await moduleRef.resolve(TransientLoader, contextId),
    );
  });

  it('should report the scope of the provider it stands for', () => {
    const appModuleRef = moduleRef.get(ModuleRef);

    expect(appModuleRef.introspect(LOADER).scope).toBe(Scope.TRANSIENT);
    expect(appModuleRef.introspect(LOADER_ALIAS).scope).toBe(Scope.TRANSIENT);
    expect(appModuleRef.introspect(REGISTRY).scope).toBe(Scope.DEFAULT);
  });

  it('should keep sharing a singleton provider', async () => {
    const registry = moduleRef.get(Registry);

    expect(moduleRef.get(SecondService).registry).toBe(registry);
    expect(moduleRef.get(REGISTRY)).toBe(registry);
    expect(await moduleRef.resolve(REGISTRY)).toBe(registry);
  });

  it('should inject the provider that overrides the alias', async () => {
    const loader = {};
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LOADER)
      .useValue(loader)
      .compile();

    expect(moduleRef.get(FirstService).loader).toBe(loader);
    expect(moduleRef.get(SecondService).loader).toBe(loader);
    expect(await moduleRef.resolve(LOADER_ALIAS)).toBe(loader);
  });
});
