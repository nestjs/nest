import * as sinon from 'sinon';
import { expect } from 'chai';
import { DependenciesScanner } from './../scanner';
import { NestContainer } from './../injector/container';
import { Module } from '../../common/utils/decorators/module.decorator';
import { NestModule } from '../../common/interfaces/modules/nest-module.interface';
import { Component } from '../../common/utils/decorators/component.decorator';
import { UseGuards } from '../../common/utils/decorators/use-guards.decorator';
import { Controller } from '../../common/utils/decorators/controller.decorator';
import { MetadataScanner } from '../metadata-scanner';
import { GUARDS_METADATA } from '../../common/constants';

describe('DependenciesScanner', () => {

    @Component() class TestComponent {}
    @Controller('') class TestRoute {}

    @Module({
        components: [ TestComponent ],
        controllers: [ TestRoute ],
        exports: [ TestComponent ],
    })
    class AnotherTestModule {}

    @Module({
        modules: [ AnotherTestModule ],
        components: [ TestComponent ],
        controllers: [ TestRoute ],
    })
    class TestModule {}

    let scanner: DependenciesScanner;
    let mockContainer: sinon.SinonMock;
    let container: NestContainer;

    before(() => {
        container = new NestContainer();
        mockContainer = sinon.mock(container);
    });

    beforeEach(() => {
        scanner = new DependenciesScanner(container, new MetadataScanner());
    });

    afterEach(() => {
        mockContainer.restore();
    });

    it('should "storeModule" call twice (2 modules) container method "addModule"', () => {
        const expectation = mockContainer.expects('addModule').twice();
        scanner.scan(TestModule as any);
        expectation.verify();
    });

    it('should "storeComponent" call twice (2 components) container method "addComponent"', () => {
        const expectation = mockContainer.expects('addComponent').twice();
        const stub = sinon.stub(scanner, 'storeExportedComponent');

        scanner.scan(TestModule as any);
        expectation.verify();
        stub.restore();
    });

    it('should "storeRoute" call twice (2 components) container method "addController"', () => {
        const expectation = mockContainer.expects('addController').twice();
        scanner.scan(TestModule as any);
        expectation.verify();
    });

    it('should "storeExportedComponent" call once (1 component) container method "addExportedComponent"', () => {
        const expectation = mockContainer.expects('addExportedComponent').once();
        scanner.scan(TestModule as any);
        expectation.verify();
    });

    describe('reflectDynamicMetadata', () => {
      describe('when param has prototype', () => {
        it('should call "reflectGuards" and "reflectInterceptors"', () => {
          const reflectGuards = sinon.stub(scanner, 'reflectGuards').callsFake(() => undefined);
          const reflectInterceptors = sinon.stub(scanner, 'reflectInterceptors').callsFake(() => undefined);
          scanner.reflectDynamicMetadata({ prototype: true } as any, '');

          expect(reflectGuards.called).to.be.true;
          expect(reflectInterceptors.called).to.be.true;
        });
      });
      describe('when param has not prototype', () => {
        it('should not call "reflectGuards" and "reflectInterceptors"', () => {
          const reflectGuards = sinon.stub(scanner, 'reflectGuards').callsFake(() => undefined);
          const reflectInterceptors = sinon.stub(scanner, 'reflectInterceptors').callsFake(() => undefined);
          scanner.reflectDynamicMetadata({} as any, '');

          expect(reflectGuards.called).to.be.false;
          expect(reflectInterceptors.called).to.be.false;
        });
      });
    });

    describe('storeInjectable', () => {
      it('should call "addInjectable"', () => {
        const addInjectable = sinon.stub((scanner as any).container, 'addInjectable').callsFake(() => undefined);
        const comp = {};
        const token = 'token';

        scanner.storeInjectable(comp as any, token);
        expect(addInjectable.calledWith(comp, token)).to.be.true;
      });
    });
 
    class CompMethod {
      @UseGuards('test')
      public method() {}
    }
    describe('reflectKeyMetadata', () => {
      it('should return undefined', () => {
        const result = scanner.reflectKeyMetadata(TestComponent, 'key', 'method');
        expect(result).to.be.undefined;
      });
      it('should return array', () => {
        const result = scanner.reflectKeyMetadata(CompMethod, GUARDS_METADATA, 'method');
        expect(result).to.be.eql(['test']);
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
      it('should call forwardRef() when forwardRef property exists', () => {
        const module = { forwardRef: sinon.stub().returns({}) };

        sinon.stub(container, 'addRelatedModule').returns({});
        scanner.storeRelatedModule(module as any, [] as any);
        expect(module.forwardRef.called).to.be.true;
      });
    });
});