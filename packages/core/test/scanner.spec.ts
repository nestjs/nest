import { Injectable } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GUARDS_METADATA } from '../../common/constants';
import { Controller } from '../../common/decorators/core/controller.decorator';
import { UseGuards } from '../../common/decorators/core/use-guards.decorator';
import { Module } from '../../common/decorators/modules/module.decorator';
import { Scope } from '../../common/interfaces';
import { ApplicationConfig } from '../application-config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '../constants';
import { InvalidModuleException } from '../errors/exceptions/invalid-module.exception';
import { UndefinedModuleException } from '../errors/exceptions/undefined-module.exception';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { MetadataScanner } from '../metadata-scanner';
import { DependenciesScanner } from '../scanner';

describe('DependenciesScanner', () => {
  class Guard {}

  @Injectable()
  class TestComponent {}

  @Controller('')
  class TestController {}

  @Module({
    providers: [TestComponent],
    controllers: [TestController],
    exports: [TestComponent],
  })
  class BasicModule {}

  @Module({
    imports: [BasicModule],
    providers: [TestComponent],
    controllers: [TestController],
  })
  class TestModule {}

  @Module({
    imports: [undefined],
  })
  class UndefinedModule {}

  @Module({
    imports: [null],
  })
  class InvalidModule {}

  let scanner: DependenciesScanner;
  let mockContainer: sinon.SinonMock;
  let container: NestContainer;

  beforeEach(() => {
    container = new NestContainer();
    mockContainer = sinon.mock(container);

    scanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      new ApplicationConfig(),
    );
    sinon.stub(scanner, 'registerCoreModule').callsFake(async () => {});
  });

  afterEach(() => {
    mockContainer.restore();
  });

  it('should "insertModule" call twice (2 modules) container method "addModule"', async () => {
    const expectation = mockContainer.expects('addModule').twice();

    await scanner.scan(TestModule as any);
    expectation.verify();
  });

  it('should "insertProvider" call twice (2 components) container method "addProvider"', async () => {
    const expectation = mockContainer.expects('addProvider').twice();
    const stub = sinon.stub(scanner, 'insertExportedProvider');

    await scanner.scan(TestModule as any);
    expectation.verify();
    stub.restore();
  });

  it('should "insertController" call twice (2 components) container method "addController"', async () => {
    const expectation = mockContainer.expects('addController').twice();
    await scanner.scan(TestModule as any);
    expectation.verify();
  });

  it('should "insertExportedProvider" call once (1 component) container method "addExportedProvider"', async () => {
    const expectation = mockContainer.expects('addExportedProvider').once();
    await scanner.scan(TestModule as any);
    expectation.verify();
  });

  describe('reflectDynamicMetadata', () => {
    describe('when param has prototype', () => {
      it('should call "reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = sinon
          .stub(scanner, 'reflectInjectables')
          .callsFake(() => undefined);

        const reflectParamInjectables = sinon
          .stub(scanner, 'reflectParamInjectables')
          .callsFake(() => undefined);

        scanner.reflectDynamicMetadata({ prototype: true } as any, '');
        expect(reflectInjectables.called).to.be.true;
        expect(reflectParamInjectables.called).to.be.true;
      });
    });
    describe('when param has not prototype', () => {
      it('should not call ""reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = sinon
          .stub(scanner, 'reflectInjectables')
          .callsFake(() => undefined);
        const reflectParamInjectables = sinon
          .stub(scanner, 'reflectParamInjectables')

          .callsFake(() => undefined);
        scanner.reflectDynamicMetadata({} as any, '');

        expect(reflectInjectables.called).to.be.false;
        expect(reflectParamInjectables.called).to.be.false;
      });
    });
  });

  describe('insertInjectable', () => {
    it('should call "addInjectable"', () => {
      const addInjectable = sinon
        .stub((scanner as any).container, 'addInjectable')
        .callsFake(() => undefined);
      const comp = {};
      const token = 'token';

      scanner.insertInjectable(comp as any, token, null);
      expect(addInjectable.calledWith(comp, token)).to.be.true;
    });
  });

  class CompMethod {
    @UseGuards(Guard)
    public method() {}
  }
  describe('reflectKeyMetadata', () => {
    it('should return undefined', () => {
      const result = scanner.reflectKeyMetadata(TestComponent, 'key', 'method');
      expect(result).to.be.undefined;
    });
    it('should return array', () => {
      const result = scanner.reflectKeyMetadata(
        CompMethod,
        GUARDS_METADATA,
        'method',
      );
      expect(result).to.be.eql([Guard]);
    });
  });

  describe('insertModule', () => {
    it('should call forwardRef() when forwardRef property exists', () => {
      const module = { forwardRef: sinon.spy() };

      sinon.stub(container, 'addModule').returns({} as any);
      scanner.insertModule(module as any, [] as any);
      expect(module.forwardRef.called).to.be.true;
    });
  });

  describe('insertImport', () => {
    it('should call forwardRef() when forwardRef property exists', async () => {
      const module = { forwardRef: sinon.stub().returns({}) };

      sinon.stub(container, 'addImport').returns({} as any);
      await scanner.insertImport(module as any, [] as any, 'test');
      expect(module.forwardRef.called).to.be.true;
    });
    describe('when "related" is nil', () => {
      it('should throw exception', async () => {
        let error;
        try {
          await scanner.insertImport(undefined, [] as any, 'test');
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
      });
    });
  });

  describe('insertProvider', () => {
    const token = 'token';

    describe('when provider is not custom', () => {
      it('should call container "addProvider" with expected args', () => {
        const provider = {};
        const expectation = mockContainer
          .expects('addProvider')
          .withArgs(provider, token);

        mockContainer.expects('addProvider').callsFake(() => false);
        scanner.insertProvider(provider as any, token);

        expectation.verify();
      });
    });
    describe('when provider is custom', () => {
      describe('and is global', () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
        };

        it('should call container "addProvider" with expected args', () => {
          const expectation = mockContainer.expects('addProvider').atLeast(1);

          mockContainer.expects('addProvider').callsFake(() => false);
          scanner.insertProvider(provider, token);

          expectation.verify();
        });
        it('should push new object to "applicationProvidersApplyMap" array', () => {
          mockContainer.expects('addProvider').callsFake(() => false);
          scanner.insertProvider(provider, token);
          const applyMap = (scanner as any).applicationProvidersApplyMap;

          expect(applyMap).to.have.length(1);
          expect(applyMap[0].moduleKey).to.be.eql(token);
        });
      });
      describe('and is global and request/transient scoped', () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
          scope: Scope.REQUEST,
        };
        it('should call container "addInjectable" with expected args', () => {
          const expectation = mockContainer.expects('addInjectable').atLeast(1);

          mockContainer.expects('addInjectable').callsFake(() => false);
          scanner.insertProvider(provider, token);

          expectation.verify();
        });
      });
      describe('and is not global', () => {
        const component = {
          provide: 'CUSTOM',
          useValue: true,
        };
        it('should call container "addProvider" with expected args', () => {
          const expectation = mockContainer
            .expects('addProvider')
            .withArgs(component, token);

          mockContainer.expects('addProvider').callsFake(() => false);
          scanner.insertProvider(component, token);

          expectation.verify();
        });
        it('should not push new object to "applicationProvidersApplyMap" array', () => {
          expect((scanner as any).applicationProvidersApplyMap).to.have.length(
            0,
          );

          mockContainer.expects('addProvider').callsFake(() => false);
          scanner.insertProvider(component, token);
          expect((scanner as any).applicationProvidersApplyMap).to.have.length(
            0,
          );
        });
      });
    });
  });
  describe('applyApplicationProviders', () => {
    it('should apply each provider', () => {
      const provider = {
        moduleKey: 'moduleToken',
        providerKey: 'providerToken',
        type: APP_GUARD,
      };
      (scanner as any).applicationProvidersApplyMap = [provider];

      const expectedInstance = {};
      mockContainer.expects('getModules').callsFake(() => ({
        get: () => ({
          providers: { get: () => ({ instance: expectedInstance }) },
        }),
      }));
      const applySpy = sinon.spy();
      sinon.stub(scanner, 'getApplyProvidersMap').callsFake(() => ({
        [provider.type]: applySpy,
      }));
      scanner.applyApplicationProviders();
      expect(applySpy.called).to.be.true;
      expect(applySpy.calledWith(expectedInstance)).to.be.true;
    });
    it('should apply each globally scoped provider', () => {
      const provider = {
        moduleKey: 'moduleToken',
        providerKey: 'providerToken',
        type: APP_GUARD,
        scope: Scope.REQUEST,
      };
      (scanner as any).applicationProvidersApplyMap = [provider];

      const expectedInstanceWrapper = new InstanceWrapper();
      mockContainer.expects('getModules').callsFake(() => ({
        get: () => ({
          injectables: { get: () => expectedInstanceWrapper },
        }),
      }));
      const applySpy = sinon.spy();
      sinon.stub(scanner, 'getApplyRequestProvidersMap').callsFake(() => ({
        [provider.type]: applySpy,
      }));
      scanner.applyApplicationProviders();
      expect(applySpy.called).to.be.true;
      expect(applySpy.calledWith(expectedInstanceWrapper)).to.be.true;
    });
  });

  describe('addScopedEnhancersMetadata', () => {
    const provider = {
      moduleKey: 'moduleToken',
      providerKey: 'providerToken',
      type: APP_GUARD,
      scope: Scope.REQUEST,
    };

    it('should add enhancers metadata to every controller', () => {
      (scanner as any).applicationProvidersApplyMap = [provider];

      const instance = new InstanceWrapper({ name: 'test' });
      const controllers = new Map();
      const mockController = new InstanceWrapper();

      controllers.set('test', mockController);
      mockContainer.expects('getModules').callsFake(() => ({
        get: () => ({
          injectables: { get: () => instance },
          controllers,
        }),
        values() {
          return [this.get()];
        },
      }));
      const addEnhancerMetadataSpy = sinon.spy(
        mockController,
        'addEnhancerMetadata',
      );
      scanner.addScopedEnhancersMetadata();

      expect(addEnhancerMetadataSpy.called).to.be.true;
      expect(addEnhancerMetadataSpy.calledWith(instance)).to.be.true;
    });
  });

  describe('getApplyProvidersMap', () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalInterceptor"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalInterceptor',
        );
        scanner.getApplyProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalGuard"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalGuard',
        );
        scanner.getApplyProvidersMap()[APP_GUARD](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalPipe"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalPipe',
        );
        scanner.getApplyProvidersMap()[APP_PIPE](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalFilter"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalFilter',
        );
        scanner.getApplyProvidersMap()[APP_FILTER](null);
        expect(addSpy.called).to.be.true;
      });
    });
  });
  describe('getApplyRequestProvidersMap', () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalRequestInterceptor"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalRequestInterceptor',
        );
        scanner.getApplyRequestProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalRequestGuard"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalRequestGuard',
        );
        scanner.getApplyRequestProvidersMap()[APP_GUARD](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalRequestPipe"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalRequestPipe',
        );
        scanner.getApplyRequestProvidersMap()[APP_PIPE](null);
        expect(addSpy.called).to.be.true;
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalRequestFilter"', () => {
        const addSpy = sinon.spy(
          (scanner as any).applicationConfig,
          'addGlobalRequestFilter',
        );
        scanner.getApplyRequestProvidersMap()[APP_FILTER](null);
        expect(addSpy.called).to.be.true;
      });
    });
  });
  describe('scanForModules', () => {
    it('should throw an exception when the imports array includes undefined', () => {
      try {
        scanner.scanForModules(UndefinedModule, [UndefinedModule]);
      } catch (exception) {
        expect(exception instanceof UndefinedModuleException).to.be.true;
      }
    });
    it('should throw an exception when the imports array includes an invalid value', () => {
      try {
        scanner.scanForModules(InvalidModule, [InvalidModule]);
      } catch (exception) {
        expect(exception instanceof InvalidModuleException).to.be.true;
      }
    });
  });
});
