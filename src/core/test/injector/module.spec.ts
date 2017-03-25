import { expect } from 'chai';
import * as sinon from 'sinon';
import { Module as ModuleDecorator } from '../../../common/utils/module.decorator';
import { UnkownExportException } from '../../../errors/exceptions/unkown-export.exception';
import { Module } from '../../injector/module';
import { Component } from '../../../common/utils/component.decorator';

describe('Module', () => {
    let module: Module;

    @ModuleDecorator({}) class TestModule {}
    @Component() class TestComponent {}

    beforeEach(() => {
        module = new Module(TestModule);
    });

    it('should throw "UnkownExportException" when given exported component is not a part of components array', () => {
        expect(
            () => module.addExportedComponent(TestComponent)
        ).throws(UnkownExportException);
    });

    it('should add route', () => {
        const collection = new Map();
        const setSpy = sinon.spy(collection, 'set');
        (<any>module)['_routes'] = collection;

        class Test {}
        module.addRoute(Test);
        expect(setSpy.getCall(0).args).to.deep.equal([ 'Test', {
            name: 'Test',
            metatype: Test,
            instance: null,
            isResolved: false,
        }]);
    });

    it('should add component', () => {
        const collection = new Map();
        const setSpy = sinon.spy(collection, 'set');
        (<any>module)['_components'] = collection;

        module.addComponent(TestComponent);
        expect(setSpy.getCall(0).args).to.deep.equal([ 'TestComponent', {
            name: 'TestComponent',
            metatype: TestComponent,
            instance: null,
            isResolved: false,
        }]);
    });

    it('should call "addCustomComponent" when "provide" property exists', () => {
        const addCustomComponent = sinon.spy();
        module.addCustomComponent = addCustomComponent;

        const provider = { provide: 'test', useValue: 'test' };

        module.addComponent(<any>provider);
        expect((<sinon.SinonSpy>addCustomComponent).called).to.be.true;
    });

    it('should call "addCustomClass" when "useClass" property exists', () => {
        const addCustomClass = sinon.spy();
        module.addCustomClass = addCustomClass;

        const provider = { provide: 'test', useClass: () => null };

        module.addCustomComponent(<any>provider);
        expect((<sinon.SinonSpy>addCustomClass).called).to.be.true;
    });

    it('should call "addCustomValue" when "useValue" property exists', () => {
        const addCustomValue = sinon.spy();
        module.addCustomValue = addCustomValue;

        const provider = { provide: 'test', useValue: () => null };

        module.addCustomComponent(<any>provider);
        expect((<sinon.SinonSpy>addCustomValue).called).to.be.true;
    });

    it('should call "addCustomFactory" when "useFactory" property exists', () => {
        const addCustomFactory = sinon.spy();
        module.addCustomFactory = addCustomFactory;

        const provider = { provide: 'test', useFactory: () => null };

        module.addCustomComponent(<any>provider);
        expect((<sinon.SinonSpy>addCustomFactory).called).to.be.true;
    });

});