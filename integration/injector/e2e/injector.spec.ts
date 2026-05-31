import { Global, Inject, Injectable, Module, Scope } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';
import { UnknownExportException } from '@nestjs/core/errors/exceptions/unknown-export.exception';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  DYNAMIC_TOKEN,
  DYNAMIC_VALUE,
  NestDynamicModule,
} from '../src/dynamic/dynamic.module';
import { ExportsModule } from '../src/exports/exports.module';
import { InjectModule } from '../src/inject/inject.module';
import { InjectSameNameModule } from '../src/inject/inject-same-name.module';
import {
  SelfInjectionProviderModule,
  SelfInjectionProviderCustomTokenModule,
  SelfInjectionForwardProviderModule,
} from '../src/self-injection/self-injection-provider.module';
chai.use(chaiAsPromised);

describe('Injector', () => {
  describe('when the same provider class is declared in multiple modules', () => {
    it('should bootstrap when module-local provider instances have non-static dependency trees', async () => {
      @Injectable()
      class FirstGlobalDependency {}

      @Injectable()
      class SecondGlobalDependency {}

      @Injectable({ scope: Scope.REQUEST })
      class RequestScopedDependency {}

      @Global()
      @Module({
        providers: [FirstGlobalDependency, SecondGlobalDependency],
        exports: [FirstGlobalDependency, SecondGlobalDependency],
      })
      class GlobalDepsModule {}

      @Injectable()
      class SharedService {
        constructor(
          public readonly firstDependency: FirstGlobalDependency,
          public readonly secondDependency: SecondGlobalDependency,
          public readonly requestScopedDependency: RequestScopedDependency,
        ) {}
      }

      @Module({
        providers: [SharedService, RequestScopedDependency],
        exports: [SharedService],
      })
      class ModuleA {}

      @Module({
        providers: [SharedService, RequestScopedDependency],
      })
      class ModuleB {}

      @Module({
        imports: [GlobalDepsModule, ModuleA, ModuleB],
      })
      class AppModule {}

      let timeout: NodeJS.Timeout;
      const app = await Promise.race([
        NestFactory.create(AppModule, { logger: false }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Application initialization timed out')),
            1000,
          );
        }),
      ]);
      clearTimeout(timeout!);

      await app.close();
    });

    it('should not cache a consumer as static before imported factory deps are registered', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class RequestScopedDependency {}

      @Global()
      @Module({
        providers: [RequestScopedDependency],
        exports: [RequestScopedDependency],
      })
      class GlobalDependencyModule {}

      class RepositoryA {}
      class RepositoryB {}

      const repositoryAProvider = {
        provide: RepositoryA,
        useFactory: (_dependency: RequestScopedDependency) => new RepositoryA(),
        inject: [RequestScopedDependency],
      };
      const repositoryBProvider = {
        provide: RepositoryB,
        useFactory: (_dependency: RequestScopedDependency) => new RepositoryB(),
        inject: [RequestScopedDependency],
      };

      @Module({
        providers: [repositoryAProvider, repositoryBProvider],
        exports: [RepositoryA, RepositoryB],
      })
      class RepositoryModule {}

      const buildWrapperChain = (depth: number): Type<unknown> => {
        let inner: Type<unknown> = RepositoryModule;
        for (let index = 0; index < depth; index++) {
          @Module({ imports: [inner], exports: [inner] })
          class WrapperModule {}

          Object.defineProperty(WrapperModule, 'name', {
            value: `RepositoryWrapper_${index}`,
          });
          inner = WrapperModule;
        }
        return inner;
      };

      const RepositoryWrapperModule = buildWrapperChain(6);

      @Global()
      @Module({
        imports: [GlobalDependencyModule, RepositoryWrapperModule],
        exports: [RepositoryWrapperModule],
      })
      class GlobalRepositoryModule {}

      @Injectable()
      class ConsumerService {
        constructor(
          public readonly repositoryA: RepositoryA,
          public readonly repositoryB: RepositoryB,
        ) {}
      }

      const helpers: Type<unknown>[] = [];
      for (let index = 0; index < 30; index++) {
        @Injectable()
        class Helper {}

        Object.defineProperty(Helper, 'name', { value: `Helper_${index}` });
        helpers.push(Helper);
      }

      const helperToken = (index: number) => `HELPER_${index}`;
      const helperAliases = helpers.map((helper, index) => ({
        provide: helperToken(index),
        useExisting: helper,
      }));

      const siblings: Type<unknown>[] = [];
      for (let index = 0; index < 20; index++) {
        @Injectable()
        class Sibling {
          constructor(
            @Inject(ConsumerService) public readonly consumer: ConsumerService,
            @Inject(helperToken(index % helpers.length))
            public readonly helper: unknown,
          ) {}
        }

        Object.defineProperty(Sibling, 'name', { value: `Sibling_${index}` });
        siblings.push(Sibling);
      }

      @Module({
        providers: [ConsumerService, ...helpers, ...helperAliases, ...siblings],
      })
      class ConsumerModule {}

      @Module({ imports: [GlobalRepositoryModule, ConsumerModule] })
      class AppModule {}

      const app = await NestFactory.createApplicationContext(AppModule, {
        logger: false,
      });
      const container = (
        app as unknown as {
          container: {
            getModules(): Map<
              unknown,
              { providers: Map<unknown, { isTreeStatic?: boolean }> }
            >;
          };
        }
      ).container;
      let isTreeStatic: boolean | undefined;
      for (const [, moduleRef] of container.getModules()) {
        if (moduleRef.providers.has(ConsumerService)) {
          isTreeStatic = moduleRef.providers.get(ConsumerService)?.isTreeStatic;
          break;
        }
      }

      await app.close();

      expect(isTreeStatic).to.equal(false);
    });
  });

  describe('when "providers" and "exports" properties are inconsistent', () => {
    it(`should fail with "UnknownExportException"`, async () => {
      try {
        const builder = Test.createTestingModule({
          imports: [ExportsModule],
        });
        await builder.compile();
      } catch (err) {
        expect(err).to.be.instanceof(UnknownExportException);
      }
    });
  });

  describe("When class injects a provider with the same as class's name", () => {
    it('should compile with success', async () => {
      const builder = Test.createTestingModule({
        imports: [InjectSameNameModule],
      });

      await expect(builder.compile()).to.eventually.be.fulfilled;
    });
  });

  describe('when Nest cannot resolve dependencies', () => {
    it(`should fail with "RuntimeException"`, async () => {
      try {
        const builder = Test.createTestingModule({
          imports: [InjectModule],
        });
        await builder.compile();
      } catch (err) {
        expect(err).to.be.instanceof(RuntimeException);
      }
    });

    describe('due to self-injection providers', () => {
      it('should fail with "UnknownDependenciesException" due to self-injection via same class reference', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionProviderModule],
        });

        await expect(
          builder.compile(),
        ).to.eventually.be.rejected.and.be.an.instanceOf(
          UnknownDependenciesException,
        );
      });
      it('should fail with "UnknownDependenciesException" due to self-injection via forwardRef to the same class reference', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionForwardProviderModule],
        });

        await expect(
          builder.compile(),
        ).to.eventually.be.rejected.and.be.an.instanceOf(
          UnknownDependenciesException,
        );
      });
      it('should fail with "UnknownDependenciesException" due to self-injection via custom provider', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionProviderCustomTokenModule],
        });

        await expect(
          builder.compile(),
        ).to.eventually.be.rejected.and.be.an.instanceOf(
          UnknownDependenciesException,
        );
      });
    });
  });

  describe('when dynamic module', () => {
    it(`should return provider via token (exported by object)`, async () => {
      const builder = Test.createTestingModule({
        imports: [NestDynamicModule.byObject()],
      });
      const app = await builder.compile();
      expect(app.get(DYNAMIC_TOKEN)).to.be.eql(DYNAMIC_VALUE);
    });

    it(`should return provider via token (exported by token)`, async () => {
      const builder = Test.createTestingModule({
        imports: [NestDynamicModule.byName()],
      });
      const app = await builder.compile();
      expect(app.get(DYNAMIC_TOKEN)).to.be.eql(DYNAMIC_VALUE);
    });
  });
});
