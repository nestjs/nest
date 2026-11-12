import { Inject, Injectable, Module, Scope } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';

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

    expect(first.loader).to.be.instanceOf(TransientLoader);
    expect(second.loader).to.be.instanceOf(TransientLoader);
    expect(first.loader).to.not.equal(second.loader);
    expect(first.loader.registry).to.equal(moduleRef.get(Registry));
  });

  it('should create an instance for a consumer in a module that imports the alias', () => {
    const first = moduleRef.get(FirstService);
    const importing = moduleRef.get(ImportingService);

    expect(importing.loader).to.be.instanceOf(TransientLoader);
    expect(importing.loader).to.not.equal(first.loader);
    expect(importing.loader.registry).to.equal(moduleRef.get(Registry));
  });

  it('should create an instance for each request-scoped consumer', async () => {
    const [first, second] = await Promise.all([
      moduleRef.resolve(RequestService, ContextIdFactory.create()),
      moduleRef.resolve(RequestService, ContextIdFactory.create()),
    ]);

    expect(first).to.not.equal(second);
    expect(first.loader).to.be.instanceOf(TransientLoader);
    expect(first.loader).to.not.equal(second.loader);
  });

  it('should create an instance for each "resolve()" call', async () => {
    const first = await moduleRef.resolve(LOADER);
    const second = await moduleRef.resolve(LOADER_ALIAS);
    const contextId = ContextIdFactory.create();

    expect(first).to.be.instanceOf(TransientLoader);
    expect(first).to.not.equal(second);
    expect(await moduleRef.resolve(LOADER, contextId)).to.equal(
      await moduleRef.resolve(TransientLoader, contextId),
    );
  });

  it('should report the scope of the provider it stands for', () => {
    const appModuleRef = moduleRef.get(ModuleRef);

    expect(appModuleRef.introspect(LOADER).scope).to.equal(Scope.TRANSIENT);
    expect(appModuleRef.introspect(LOADER_ALIAS).scope).to.equal(
      Scope.TRANSIENT,
    );
    expect(appModuleRef.introspect(REGISTRY).scope).to.equal(Scope.DEFAULT);
  });

  it('should keep sharing a singleton provider', async () => {
    const registry = moduleRef.get(Registry);

    expect(moduleRef.get(SecondService).registry).to.equal(registry);
    expect(moduleRef.get(REGISTRY)).to.equal(registry);
    expect(await moduleRef.resolve(REGISTRY)).to.equal(registry);
  });

  it('should inject the provider that overrides the alias', async () => {
    const loader = {};
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LOADER)
      .useValue(loader)
      .compile();

    expect(moduleRef.get(FirstService).loader).to.equal(loader);
    expect(moduleRef.get(SecondService).loader).to.equal(loader);
    expect(await moduleRef.resolve(LOADER_ALIAS)).to.equal(loader);
  });
});
