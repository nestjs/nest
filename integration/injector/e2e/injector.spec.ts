import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';
import { UnknownExportException } from '@nestjs/core/errors/exceptions/unknown-export.exception';
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
