import {
  Controller,
  Module as ModuleDecorator,
  Inject,
  Injectable,
  Scope,
  UseGuards,
} from '@nestjs/common';
import { UndefinedDependencyException } from '@nestjs/core/errors/exceptions/undefined-dependency.exception.js';
import {
  UuidFactory,
  UuidFactoryMode,
} from '@nestjs/core/inspector/uuid-factory';
import { Test } from '../test.js';
import { TestingModuleBuilder } from '../testing-module.builder.js';
import { TestingModule } from '../testing-module.js';
import { TestingLogger } from '../services/testing-logger.service.js';

describe('TestingModuleBuilder', () => {
  afterEach(() => {
    UuidFactory.mode = UuidFactoryMode.Random;
  });

  describe('constructor', () => {
    it('should be created via Test.createTestingModule', () => {
      const builder = Test.createTestingModule({});
      expect(builder).toBeInstanceOf(TestingModuleBuilder);
    });
  });

  describe('overridePipe', () => {
    it('should return an OverrideBy object with useValue, useFactory, useClass', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overridePipe('somePipe');

      expect(overrideBy.useValue).toBeTypeOf('function');
      expect(overrideBy.useFactory).toBeTypeOf('function');
      expect(overrideBy.useClass).toBeTypeOf('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder.overridePipe('somePipe').useValue({});
      expect(result).toBe(builder);
    });
  });

  describe('overrideFilter', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideFilter('someFilter');
      expect(overrideBy.useValue).toBeTypeOf('function');
    });

    it('should be chainable via useClass', () => {
      const builder = Test.createTestingModule({});
      class FakeFilter {}
      const result = builder.overrideFilter('someFilter').useClass(FakeFilter);
      expect(result).toBe(builder);
    });
  });

  describe('overrideGuard', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideGuard('someGuard');
      expect(overrideBy.useValue).toBeTypeOf('function');
    });

    it('should be chainable via useFactory', () => {
      const builder = Test.createTestingModule({});
      const result = builder
        .overrideGuard('someGuard')
        .useFactory({ factory: () => ({}) });
      expect(result).toBe(builder);
    });
  });

  describe('overrideInterceptor', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideInterceptor('someInterceptor');
      expect(overrideBy.useValue).toBeTypeOf('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder
        .overrideInterceptor('someInterceptor')
        .useValue({});
      expect(result).toBe(builder);
    });
  });

  describe('overrideProvider', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideProvider('someProvider');
      expect(overrideBy.useValue).toBeTypeOf('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder.overrideProvider('someProvider').useValue({});
      expect(result).toBe(builder);
    });
  });

  describe('overrideModule', () => {
    it('should return an OverrideModule object with useModule', () => {
      const builder = Test.createTestingModule({});
      const overrideModule = builder.overrideModule({ type: class {} } as any);
      expect(overrideModule.useModule).toBeTypeOf('function');
    });

    it('should be chainable via useModule', () => {
      const builder = Test.createTestingModule({});

      @ModuleDecorator({})
      class ReplacementModule {}

      const result = builder
        .overrideModule({ type: class ToOverride {} } as any)
        .useModule({ type: ReplacementModule } as any);
      expect(result).toBe(builder);
    });
  });

  describe('useMocker', () => {
    it('should set the mocker and return the builder', () => {
      const builder = Test.createTestingModule({});
      const mocker = () => ({});
      const result = builder.useMocker(mocker);
      expect(result).toBe(builder);
    });
  });

  describe('setLogger', () => {
    it('should set the logger and return the builder', () => {
      const builder = Test.createTestingModule({});
      const logger = new TestingLogger();
      const result = builder.setLogger(logger);
      expect(result).toBe(builder);
    });
  });

  describe('compile', () => {
    it('should return a TestingModule instance', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module).toBeInstanceOf(TestingModule);
    });

    it('should allow retrieving registered providers', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'TOKEN', useValue: 'token-value' }],
      })
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module.get('TOKEN')).toBe('token-value');
    });

    it('should support overriding a provider with useValue', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'DATABASE_CONNECTION', useValue: 'real-db' }],
      })
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('DATABASE_CONNECTION')
        .useValue('mock-db')
        .compile();

      expect(module.get('DATABASE_CONNECTION')).toBe('mock-db');
    });

    it('should support overriding a provider with useClass', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'SERVICE', useClass: class OriginalService {} }],
      })
      class TestModule {}

      class MockService {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('SERVICE')
        .useClass(MockService)
        .compile();

      const service = module.get('SERVICE');
      expect(service).toBeInstanceOf(MockService);
    });

    it('should support overriding a request-scoped provider with useClass', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class OriginalService {}

      @ModuleDecorator({
        providers: [{ provide: 'SERVICE', useClass: OriginalService }],
      })
      class TestModule {}

      class MockService {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('SERVICE')
        .useClass(MockService)
        .compile();

      expect(module.get('SERVICE')).toBeInstanceOf(MockService);
    });

    it('should take the scope of the class that overrides a provider', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'SERVICE', useClass: class OriginalService {} }],
      })
      class TestModule {}

      @Injectable({ scope: Scope.REQUEST })
      class MockService {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('SERVICE')
        .useClass(MockService)
        .compile();

      expect(() => module.get('SERVICE')).toThrow();
      const [first, second] = await Promise.all([
        module.resolve('SERVICE'),
        module.resolve('SERVICE'),
      ]);
      expect(first).toBeInstanceOf(MockService);
      expect(first).not.toBe(second);
    });

    it('should support overriding a value provider with useClass', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'SERVICE', useValue: 'real-service' }],
      })
      class TestModule {}

      class MockService {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('SERVICE')
        .useClass(MockService)
        .compile();

      expect(module.get('SERVICE')).toBeInstanceOf(MockService);
    });

    it('should support overriding a value provider with useFactory', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'SERVICE', useValue: 'real-service' }],
      })
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .overrideProvider('SERVICE')
        .useFactory({ factory: () => 'mock-service' })
        .compile();

      expect(module.get('SERVICE')).toBe('mock-service');
    });

    describe('when a class is both a provider and a guard', () => {
      class AuthGuard {
        canActivate() {
          return true;
        }
      }

      @Controller()
      @UseGuards(AuthGuard)
      class TestController {}

      @ModuleDecorator({
        controllers: [TestController],
        providers: [AuthGuard],
      })
      class TestModule {}

      const providerMock = { canActivate: () => true };
      const guardMock = { canActivate: () => false };

      const getInstances = (testingModule: TestingModule) => {
        const moduleRef = [
          ...testingModule['container'].getModules().values(),
        ].find(moduleRef => moduleRef.metatype === TestModule)!;
        return {
          provider: moduleRef.getProviderByKey(AuthGuard).instance,
          guard: moduleRef.injectables.get(AuthGuard)!.instance,
        };
      };

      it('should apply both overrides when the provider is overridden first', async () => {
        const module = await Test.createTestingModule({
          imports: [TestModule],
        })
          .overrideProvider(AuthGuard)
          .useValue(providerMock)
          .overrideGuard(AuthGuard)
          .useValue(guardMock)
          .compile();

        const { provider, guard } = getInstances(module);
        expect(provider).toBe(providerMock);
        expect(guard).toBe(guardMock);
      });

      it('should apply both overrides when the guard is overridden first', async () => {
        const module = await Test.createTestingModule({
          imports: [TestModule],
        })
          .overrideGuard(AuthGuard)
          .useValue(guardMock)
          .overrideProvider(AuthGuard)
          .useValue(providerMock)
          .compile();

        const { provider, guard } = getInstances(module);
        expect(provider).toBe(providerMock);
        expect(guard).toBe(guardMock);
      });
    });

    it('should use mocker for unresolved providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable()
      class NeedsMissing {
        constructor(public readonly dep: MissingDepClass) {}
      }

      @ModuleDecorator({
        providers: [NeedsMissing],
      })
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      })
        .useMocker(token => {
          if (token === MissingDepClass) {
            return { mockValue: 'mocked-dep' };
          }
          return null;
        })
        .compile();

      const instance = module.get(NeedsMissing);
      expect(instance.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should use mocker for unresolved dependencies of request-scoped providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.REQUEST })
      class NeedsMissing {
        constructor(public readonly dep: MissingDepClass) {}
      }

      const module = await Test.createTestingModule({
        providers: [NeedsMissing],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      const instance = await module.resolve(NeedsMissing);
      expect(instance.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should use mocker for unresolved dependencies of transient providers used by request-scoped providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.TRANSIENT })
      class NeedsMissing {
        constructor(public readonly dep: MissingDepClass) {}
      }

      @Injectable({ scope: Scope.REQUEST })
      class Consumer {
        constructor(public readonly transient: NeedsMissing) {}
      }

      const module = await Test.createTestingModule({
        providers: [Consumer, NeedsMissing],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      const instance = await module.resolve(Consumer);
      expect(instance.transient.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should use mocker for unresolved properties of request-scoped providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.REQUEST })
      class NeedsMissing {
        @Inject(MissingDepClass)
        public readonly dep: MissingDepClass;
      }

      const module = await Test.createTestingModule({
        providers: [NeedsMissing],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      const instance = await module.resolve(NeedsMissing);
      expect(instance.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should use mocker for unresolved properties of transient providers used by request-scoped providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.TRANSIENT })
      class NeedsMissing {
        @Inject(MissingDepClass)
        public readonly dep: MissingDepClass;
      }

      @Injectable({ scope: Scope.REQUEST })
      class Consumer {
        constructor(public readonly transient: NeedsMissing) {}
      }

      const module = await Test.createTestingModule({
        providers: [Consumer, NeedsMissing],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      const instance = await module.resolve(Consumer);
      expect(instance.transient.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should not create extra transient instances when a mocker is set', async () => {
      let created = 0;

      @Injectable({ scope: Scope.TRANSIENT })
      class NestedTransient {
        constructor() {
          created++;
        }
      }

      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        constructor(public readonly nested: NestedTransient) {}
      }

      @Injectable()
      class ConsumerA {
        constructor(public readonly transient: TransientService) {}
      }

      @Injectable()
      class ConsumerB {
        constructor(public readonly transient: TransientService) {}
      }

      await Test.createTestingModule({
        providers: [ConsumerA, ConsumerB, TransientService, NestedTransient],
      })
        .useMocker(() => undefined)
        .compile();

      expect(created).toBe(2);
    });

    it('should use mocker for unresolved dependencies of request-scoped factory providers', async () => {
      @Injectable()
      class MissingDepClass {}

      const module = await Test.createTestingModule({
        providers: [
          {
            provide: 'NEEDS_MISSING',
            useFactory: (dep: MissingDepClass) => ({ dep }),
            inject: [MissingDepClass],
            scope: Scope.REQUEST,
          },
        ],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      const instance = await module.resolve('NEEDS_MISSING');
      expect(instance.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should fail on resolve, not on compile, when the mocker skips a dependency of a request-scoped provider', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.REQUEST })
      class NeedsMissing {
        constructor(public readonly dep: MissingDepClass) {}
      }

      const module = await Test.createTestingModule({
        providers: [NeedsMissing],
      })
        .useMocker(() => undefined)
        .compile();

      await expect(module.resolve(NeedsMissing)).rejects.toThrow(
        "Nest can't resolve dependencies of the NeedsMissing",
      );
    });

    it('should fail on resolve, not on compile, when a request-scoped factory provider has an undefined dependency', async () => {
      const module = await Test.createTestingModule({
        providers: [
          {
            provide: 'NEEDS_UNDEFINED',
            useFactory: (dep: unknown) => ({ dep }),
            inject: [undefined as any],
            scope: Scope.REQUEST,
          },
        ],
      })
        .useMocker(() => ({ mockValue: 'mocked-dep' }))
        .compile();

      await expect(module.resolve('NEEDS_UNDEFINED')).rejects.toThrow(
        UndefinedDependencyException,
      );
    });

    it('should use mocker for unresolved dependencies of transient providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        constructor(public readonly dep: MissingDepClass) {}
      }

      @Injectable()
      class NeedsTransient {
        constructor(public readonly transient: TransientService) {}
      }

      const module = await Test.createTestingModule({
        providers: [TransientService, NeedsTransient],
      })
        .useMocker(token =>
          token === MissingDepClass ? { mockValue: 'mocked-dep' } : null,
        )
        .compile();

      const instance = module.get(NeedsTransient);
      expect(instance.transient).toBeInstanceOf(TransientService);
      expect(instance.transient.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should use mocker for unresolved properties of transient providers', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        @Inject(MissingDepClass)
        public readonly dep: MissingDepClass;
      }

      @Injectable()
      class NeedsTransient {
        constructor(public readonly transient: TransientService) {}
      }

      const module = await Test.createTestingModule({
        providers: [TransientService, NeedsTransient],
      })
        .useMocker(token =>
          token === MissingDepClass ? { mockValue: 'mocked-dep' } : null,
        )
        .compile();

      const instance = module.get(NeedsTransient);
      expect(instance.transient).toBeInstanceOf(TransientService);
      expect(instance.transient.dep).toEqual({ mockValue: 'mocked-dep' });
    });

    it('should mock a transient provider that cannot be instantiated', async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        constructor(@Inject('UNKNOWN') public readonly dep: unknown) {}
      }

      @Injectable()
      class NeedsTransient {
        constructor(public readonly transient: TransientService) {}
      }

      const module = await Test.createTestingModule({
        providers: [TransientService, NeedsTransient],
      })
        .useMocker(token =>
          token === TransientService.name ? { mockValue: 'mocked' } : null,
        )
        .compile();

      expect(module.get(NeedsTransient).transient).toEqual({
        mockValue: 'mocked',
      });
    });

    it('should share one mock between providers that depend on the same token', async () => {
      @Injectable()
      class MissingDepClass {}

      @Injectable()
      class FirstConsumer {
        constructor(public readonly dep: MissingDepClass) {}
      }

      @Injectable()
      class SecondConsumer {
        constructor(public readonly dep: MissingDepClass) {}
      }

      const mocker = vi.fn(() => ({ mockValue: 'mocked-dep' }));
      const module = await Test.createTestingModule({
        providers: [FirstConsumer, SecondConsumer],
      })
        .useMocker(mocker)
        .compile();

      const mock = module.get(MissingDepClass);
      expect(module.get(FirstConsumer).dep).toBe(mock);
      expect(module.get(SecondConsumer).dep).toBe(mock);
      expect(mocker).toHaveBeenCalledTimes(1);
    });

    it('should not share mocks between tokens provided by the same class', async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        constructor(@Inject('UNKNOWN') public readonly dep: unknown) {}
      }

      @Injectable()
      class NeedsBoth {
        constructor(
          @Inject('FIRST') public readonly first: unknown,
          @Inject('SECOND') public readonly second: unknown,
        ) {}
      }

      const module = await Test.createTestingModule({
        providers: [
          { provide: 'FIRST', useClass: TransientService },
          { provide: 'SECOND', useClass: TransientService },
          NeedsBoth,
        ],
      })
        .useMocker(token =>
          token === TransientService.name ? { mockValue: 'mocked' } : null,
        )
        .compile();

      const instance = module.get(NeedsBoth);
      expect(instance.first).toEqual({ mockValue: 'mocked' });
      expect(instance.second).toEqual({ mockValue: 'mocked' });
      expect(instance.first).not.toBe(instance.second);
    });

    it('should support compiling with snapshot option', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile({ snapshot: true });

      expect(module).toBeInstanceOf(TestingModule);
    });

    it('should support compiling with preview option', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile({ preview: true });

      expect(module).toBeInstanceOf(TestingModule);
    });
  });
});
