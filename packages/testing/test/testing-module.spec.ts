import { Module as ModuleDecorator } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
import { Module } from '@nestjs/core/injector/module';
import { NestApplicationContext } from '@nestjs/core';
import { NoopGraphInspector } from '@nestjs/core/inspector/noop-graph-inspector';
import { tryLoadPackage } from '@nestjs/common/internal';
import { Test } from '../test.js';
import { TestingModule as TM } from '../testing-module.js';

class MockNestMicroservice {
  constructor(
    public container: any,
    public options: any,
    public graphInspector: any,
    public applicationConfig: any,
  ) {}
}

function createMockAdapter(extraProps: Record<string, any> = {}) {
  return {
    patch() {},
    initHttpServer() {},
    getHttpServer() {
      return {};
    },
    close() {},
    ...extraProps,
  };
}

describe('TestingModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should extend NestApplicationContext', () => {
      const container = new NestContainer();
      const rootModule = new Module(class _RootTest {}, container);

      const module = new TM(
        container,
        NoopGraphInspector,
        rootModule,
        new ApplicationConfig(),
      );
      expect(module).toBeInstanceOf(NestApplicationContext);
    });
  });

  describe('createNestMicroservice', () => {
    it('should create a NestMicroservice with the provided options', async () => {
      await tryLoadPackage('@nestjs/microservices', () => ({
        NestMicroservice: MockNestMicroservice,
      }));

      @ModuleDecorator({})
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const options = { transport: 0 };
      const microservice = module.createNestMicroservice(options);

      expect((microservice as any).options).toBe(options);
    });
  });

  describe('createNestApplication', () => {
    it('should create a NestApplication and return a Proxy when given an adapter', async () => {
      @ModuleDecorator({})
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const adapter = createMockAdapter({
        customAdapterProp: 'adapter-value',
      });

      const app: any = module.createNestApplication(adapter as any);

      expect(app.getHttpAdapter).toBeTypeOf('function');
      expect(app.customAdapterProp).toBe('adapter-value');
    });

    it('should apply logger options when provided', async () => {
      @ModuleDecorator({})
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const overrideSpy = vi.spyOn(Logger, 'overrideLogger');

      const adapter = createMockAdapter();
      module.createNestApplication(adapter as any, { logger: false });

      expect(overrideSpy).toHaveBeenCalledOnce();
    });
  });

  describe('get', () => {
    it('should retrieve providers from the compiled module', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'MY_TOKEN', useValue: 'my-value' }],
      })
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      expect(module.get('MY_TOKEN')).toBe('my-value');
    });
  });

  describe('select', () => {
    it('should allow selecting a module within the tree', async () => {
      @ModuleDecorator({
        providers: [{ provide: 'TOKEN', useValue: 'selected-value' }],
      })
      class ChildModule {}

      @ModuleDecorator({
        imports: [ChildModule],
      })
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const selected = module.select(ChildModule);
      expect(selected.get('TOKEN')).toBe('selected-value');
    });
  });

  describe('init and close', () => {
    it('should initialize and close without error', async () => {
      @ModuleDecorator({})
      class TestAppModule {}

      const module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();
      await module.close();
    });
  });
});
