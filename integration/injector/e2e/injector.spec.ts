import { Global, Injectable, Module, Scope } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception.js';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { UnknownExportException } from '@nestjs/core/errors/exceptions/unknown-export.exception.js';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  DYNAMIC_TOKEN,
  DYNAMIC_VALUE,
  NestDynamicModule,
} from '../src/dynamic/dynamic.module.js';
import { ExportsModule } from '../src/exports/exports.module.js';
import { InjectSameNameModule } from '../src/inject/inject-same-name.module.js';
import { InjectModule } from '../src/inject/inject.module.js';
import {
  SelfInjectionForwardProviderModule,
  SelfInjectionProviderCustomTokenModule,
  SelfInjectionProviderModule,
} from '../src/self-injection/self-injection-provider.module.js';

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
  });

  describe('when "providers" and "exports" properties are inconsistent', () => {
    it(`should fail with "UnknownExportException"`, async () => {
      const builder = Test.createTestingModule({
        imports: [ExportsModule],
      });
      await expect(builder.compile()).rejects.toBeInstanceOf(
        UnknownExportException,
      );
    });
  });

  describe("When class injects a provider with the same as class's name", () => {
    it('should compile with success', async () => {
      const builder = Test.createTestingModule({
        imports: [InjectSameNameModule],
      });

      await expect(builder.compile()).resolves.toBeDefined();
    });
  });

  describe('when Nest cannot resolve dependencies', () => {
    it(`should fail with "RuntimeException"`, async () => {
      const builder = Test.createTestingModule({
        imports: [InjectModule],
      });
      await expect(builder.compile()).rejects.toBeInstanceOf(RuntimeException);
    });

    describe('due to self-injection providers', () => {
      it('should fail with "UnknownDependenciesException" due to self-injection via same class reference', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionProviderModule],
        });

        await expect(builder.compile()).rejects.toBeInstanceOf(
          UnknownDependenciesException,
        );
      });
      it('should fail with "UnknownDependenciesException" due to self-injection via forwardRef to the same class reference', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionForwardProviderModule],
        });

        await expect(builder.compile()).rejects.toBeInstanceOf(
          UnknownDependenciesException,
        );
      });
      it('should fail with "UnknownDependenciesException" due to self-injection via custom provider', async () => {
        const builder = Test.createTestingModule({
          imports: [SelfInjectionProviderCustomTokenModule],
        });

        await expect(builder.compile()).rejects.toBeInstanceOf(
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
      expect(app.get(DYNAMIC_TOKEN)).toEqual(DYNAMIC_VALUE);
    });

    it(`should return provider via token (exported by token)`, async () => {
      const builder = Test.createTestingModule({
        imports: [NestDynamicModule.byName()],
      });
      const app = await builder.compile();
      expect(app.get(DYNAMIC_TOKEN)).toEqual(DYNAMIC_VALUE);
    });
  });
});
