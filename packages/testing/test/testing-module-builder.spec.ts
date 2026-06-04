import { expect } from 'chai';
import { Module as ModuleDecorator, Injectable } from '@nestjs/common';
import {
  UuidFactory,
  UuidFactoryMode,
} from '@nestjs/core/inspector/uuid-factory';
import { Test } from '../test';
import { TestingModuleBuilder } from '../testing-module.builder';
import { TestingModule } from '../testing-module';
import { TestingLogger } from '../services/testing-logger.service';

describe('TestingModuleBuilder', () => {
  describe('constructor', () => {
    it('should be created via Test.createTestingModule', () => {
      const builder = Test.createTestingModule({});
      expect(builder).to.be.instanceOf(TestingModuleBuilder);
    });
  });

  describe('overridePipe', () => {
    it('should return an OverrideBy object with useValue, useFactory, useClass', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overridePipe('somePipe');

      expect(overrideBy.useValue).to.be.a('function');
      expect(overrideBy.useFactory).to.be.a('function');
      expect(overrideBy.useClass).to.be.a('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder.overridePipe('somePipe').useValue({});
      expect(result).to.equal(builder);
    });
  });

  describe('overrideFilter', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideFilter('someFilter');
      expect(overrideBy.useValue).to.be.a('function');
    });

    it('should be chainable via useClass', () => {
      const builder = Test.createTestingModule({});
      class FakeFilter {}
      const result = builder.overrideFilter('someFilter').useClass(FakeFilter);
      expect(result).to.equal(builder);
    });
  });

  describe('overrideGuard', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideGuard('someGuard');
      expect(overrideBy.useValue).to.be.a('function');
    });

    it('should be chainable via useFactory', () => {
      const builder = Test.createTestingModule({});
      const result = builder
        .overrideGuard('someGuard')
        .useFactory({ factory: () => ({}) });
      expect(result).to.equal(builder);
    });
  });

  describe('overrideInterceptor', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideInterceptor('someInterceptor');
      expect(overrideBy.useValue).to.be.a('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder
        .overrideInterceptor('someInterceptor')
        .useValue({});
      expect(result).to.equal(builder);
    });
  });

  describe('overrideProvider', () => {
    it('should return an OverrideBy object', () => {
      const builder = Test.createTestingModule({});
      const overrideBy = builder.overrideProvider('someProvider');
      expect(overrideBy.useValue).to.be.a('function');
    });

    it('should be chainable via useValue', () => {
      const builder = Test.createTestingModule({});
      const result = builder.overrideProvider('someProvider').useValue({});
      expect(result).to.equal(builder);
    });
  });

  describe('overrideModule', () => {
    it('should return an OverrideModule object with useModule', () => {
      const builder = Test.createTestingModule({});
      const overrideModule = builder.overrideModule({ type: class {} } as any);
      expect(overrideModule.useModule).to.be.a('function');
    });

    it('should be chainable via useModule', () => {
      const builder = Test.createTestingModule({});

      @ModuleDecorator({})
      class ReplacementModule {}

      const result = builder
        .overrideModule({ type: class ToOverride {} } as any)
        .useModule({ type: ReplacementModule } as any);
      expect(result).to.equal(builder);
    });
  });

  describe('useMocker', () => {
    it('should set the mocker and return the builder', () => {
      const builder = Test.createTestingModule({});
      const mocker = () => ({});
      const result = builder.useMocker(mocker);
      expect(result).to.equal(builder);
    });
  });

  describe('setLogger', () => {
    it('should set the logger and return the builder', () => {
      const builder = Test.createTestingModule({});
      const logger = new TestingLogger();
      const result = builder.setLogger(logger);
      expect(result).to.equal(builder);
    });
  });

  describe('compile', () => {
    afterEach(() => {
      UuidFactory.mode = UuidFactoryMode.Random;
    });

    it('should return a TestingModule instance', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module).to.be.instanceOf(TestingModule);
    });

    it('should allow retrieving registered providers', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'TOKEN', useValue: 'token-value' }],
      })
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      expect(module.get('TOKEN')).to.equal('token-value');
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

      expect(module.get('DATABASE_CONNECTION')).to.equal('mock-db');
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
      expect(service).to.be.instanceOf(MockService);
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
      expect(instance.dep).to.deep.equal({ mockValue: 'mocked-dep' });
    });

    it('should support compiling with snapshot option', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile({ snapshot: true });

      expect(module).to.be.instanceOf(TestingModule);
    });

    it('should support compiling with preview option', async () => {
      @ModuleDecorator({})
      class TestModule {}

      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile({ preview: true });

      expect(module).to.be.instanceOf(TestingModule);
    });
  });
});
