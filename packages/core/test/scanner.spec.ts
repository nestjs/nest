import { expect } from 'chai';
import * as sinon from 'sinon';
import { GUARDS_METADATA } from '../../common/constants';
import { Component } from '../../common/decorators/core/component.decorator';
import { Controller } from '../../common/decorators/core/controller.decorator';
import { UseGuards } from '../../common/decorators/core/use-guards.decorator';
import { Module } from '../../common/decorators/modules/module.decorator';
import { ApplicationConfig } from '../application-config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '../constants';
import { MetadataScanner } from '../metadata-scanner';
import { NestContainer } from '../injector/container';
import { DependenciesScanner } from '../scanner';

class Guard {}

describe('DependenciesScanner', () => {
  @Component()
  class TestComponent {}
  @Controller('')
  class TestRoute {}

  @Module({
    providers: [TestComponent],
    controllers: [TestRoute],
    exports: [TestComponent],
  })
  class AnotherTestModule {}

  @Module({
    imports: [AnotherTestModule],
    providers: [TestComponent],
    controllers: [TestRoute],
  })
  class TestModule {}

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
  });

  afterEach(() => {
    mockContainer.restore();
  });

  it('should "storeModule" call twice (2 modules) container method "addModule"', async () => {
    const expectation = mockContainer.expects('addModule').twice();
    await scanner.scan(TestModule as any);
    expectation.verify();
  });

  it('should "storeComponent" call twice (2 components) container method "addComponent"', async () => {
    const expectation = mockContainer.expects('addComponent').twice();
    const stub = sinon.stub(scanner, 'storeExportedComponent');

    await scanner.scan(TestModule as any);
    expectation.verify();
    stub.restore();
  });

  it('should "storeRoute" call twice (2 components) container method "addController"', async () => {
    const expectation = mockContainer.expects('addController').twice();
    await scanner.scan(TestModule as any);
    expectation.verify();
  });

  it('should "storeExportedComponent" call once (1 component) container method "addExportedComponent"', async () => {
    const expectation = mockContainer.expects('addExportedComponent').once();
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

  describe('storeInjectable', () => {
    it('should call "addInjectable"', () => {
      const addInjectable = sinon
        .stub((scanner as any).container, 'addInjectable')
        .callsFake(() => undefined);
      const comp = {};
      const token = 'token';

      scanner.storeInjectable(comp as any, token);
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

  describe('storeModule', () => {
    it('should call forwardRef() when forwardRef property exists', () => {
      const module = { forwardRef: sinon.spy() };

      sinon.stub(container, 'addModule').returns({});
      scanner.storeModule(module as any, [] as any);
      expect(module.forwardRef.called).to.be.true;
    });
  });

  describe('storeRelatedModule', () => {
    it('should call forwardRef() when forwardRef property exists', async () => {
      const module = { forwardRef: sinon.stub().returns({}) };

      sinon.stub(container, 'addRelatedModule').returns({});
      await scanner.storeRelatedModule(module as any, [] as any, 'test');
      expect(module.forwardRef.called).to.be.true;
    });
    describe('when "related" is nil', () => {
      it('should throw exception', () => {
        expect(
          scanner.storeRelatedModule(undefined, [] as any, 'test'),
        ).to.eventually.throws();
      });
    });
  });

  describe('storeComponent', () => {
    const token = 'token';

    describe('when component is not custom', () => {
      it('should call container "addComponent" with expected args', () => {
        const component = {};
        const expectation = mockContainer
          .expects('addComponent')
          .withArgs(component, token);

        mockContainer.expects('addComponent').callsFake(() => false);
        scanner.storeComponent(component, token);

        expectation.verify();
      });
    });
    describe('when component is custom', () => {
      describe('and is global', () => {
        const component = {
          provide: APP_INTERCEPTOR,
          useValue: true,
        };

        it('should call container "addComponent" with expected args', () => {
          const expectation = mockContainer.expects('addComponent').atLeast(1);

          mockContainer.expects('addComponent').callsFake(() => false);
          scanner.storeComponent(component, token);

          expectation.verify();
        });
        it('should push new object to "applicationProvidersApplyMap" array', () => {
          mockContainer.expects('addComponent').callsFake(() => false);
          scanner.storeComponent(component, token);
          const applyMap = (scanner as any).applicationProvidersApplyMap;

          expect(applyMap).to.have.length(1);
          expect(applyMap[0].moduleKey).to.be.eql(token);
        });
      });
      describe('and is not global', () => {
        const component = {
          provide: 'CUSTOM',
          useValue: true,
        };
        it('should call container "addComponent" with expected args', () => {
          const expectation = mockContainer
            .expects('addComponent')
            .withArgs(component, token);

          mockContainer.expects('addComponent').callsFake(() => false);
          scanner.storeComponent(component, token);

          expectation.verify();
        });
        it('should not push new object to "applicationProvidersApplyMap" array', () => {
          expect((scanner as any).applicationProvidersApplyMap).to.have.length(
            0,
          );

          mockContainer.expects('addComponent').callsFake(() => false);
          scanner.storeComponent(component, token);
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
          components: { get: () => ({ instance: expectedInstance }) },
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
});
