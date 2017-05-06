import { expect } from 'chai';
import * as sinon from 'sinon';
import { Module as ModuleDecorator } from '../../../common/utils/decorators/module.decorator';
import { UnkownExportException } from '../../../errors/exceptions/unkown-export.exception';
import { Module } from '../../injector/module';
import { Component } from '../../../common/utils/decorators/component.decorator';
import { RuntimeException } from '../../../errors/exceptions/runtime.exception';

describe('Module', () => {
    let module: Module;

    @ModuleDecorator({}) class TestModule {}
    @Component() class TestComponent {}

    beforeEach(() => {
        module = new Module(TestModule);
    });

    it('should throw "UnkownExportException" when given exported component is not a part of components array', () => {
        expect(
            () => module.addExportedComponent(TestComponent),
        ).throws(UnkownExportException);
    });

    it('should add route', () => {
        const collection = new Map();
        const setSpy = sinon.spy(collection, 'set');
        (module as any)._routes = collection;

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
        (module as any)._components = collection;

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

        module.addComponent(provider as any);
        expect((addCustomComponent as sinon.SinonSpy).called).to.be.true;
    });

    it('should call "addCustomClass" when "useClass" property exists', () => {
        const addCustomClass = sinon.spy();
        module.addCustomClass = addCustomClass;

        const provider = { provide: 'test', useClass: () => null };

        module.addCustomComponent(provider as any);
        expect((addCustomClass as sinon.SinonSpy).called).to.be.true;
    });

    it('should call "addCustomValue" when "useValue" property exists', () => {
        const addCustomValue = sinon.spy();
        module.addCustomValue = addCustomValue;

        const provider = { provide: 'test', useValue: () => null };

        module.addCustomComponent(provider as any);
        expect((addCustomValue as sinon.SinonSpy).called).to.be.true;
    });

    it('should call "addCustomFactory" when "useFactory" property exists', () => {
        const addCustomFactory = sinon.spy();
        module.addCustomFactory = addCustomFactory;

        const provider = { provide: 'test', useFactory: () => null };

        module.addCustomComponent(provider as any);
        expect((addCustomFactory as sinon.SinonSpy).called).to.be.true;
    });

    describe('addCustomClass', () => {
        const type = { name: 'TypeTest' };
        const component = { provide: type, useClass: type, name: 'test' };
        let setSpy;
        beforeEach(() => {
            const collection = new Map();
            setSpy = sinon.spy(collection, 'set');
            (module as any)._components = collection;
        });
        it('should store component', () => {
            module.addCustomClass(component as any);
            expect(setSpy.calledWith(component.name, {
                name: component.name,
                metatype: type,
                instance: null,
                isResolved: false,
            })).to.be.true;
        });
    });

    describe('addCustomValue', () => {
        let setSpy;
        const value = () => ({});
        const name = 'test';
        const component = { provide: value, name, useValue: value };

        beforeEach(() => {
            const collection = new Map();
            setSpy = sinon.spy(collection, 'set');
            (module as any)._components = collection;
        });

        it('should store component', () => {
            module.addCustomValue(component as any);
            expect(setSpy.calledWith(name, {
                name,
                metatype: null,
                instance: value,
                isResolved: true,
                isNotMetatype: true,
            })).to.be.true;
        });
    });

    describe('addCustomFactory', () => {
        const type = { name: 'TypeTest' };
        const inject = [1, 2, 3];
        const component = { provide: type, useFactory: type, name: 'test', inject };

        let setSpy;
        beforeEach(() => {
            const collection = new Map();
            setSpy = sinon.spy(collection, 'set');
            (module as any)._components = collection;
        });
        it('should store component', () => {
            module.addCustomFactory(component as any);
            expect(setSpy.getCall(0).args).to.deep.equal([component.name, {
                name: component.name,
                metatype: type,
                instance: null,
                isResolved: false,
                inject,
                isNotMetatype: true,
            }]);
        });
    });

    describe('when get instance', () => {
        describe('when metatype does not exists in components collection', () => {
            beforeEach(() => {
                sinon.stub((module as any)._components, 'has').returns(false);
            });
            it('should throws RuntimeException', () => {
                expect(() => module.instance).to.throws(RuntimeException);
            });
        });
        describe('when metatype exists in components collection', () => {
            it('should returns null', () => {
                expect(module.instance).to.be.eql(null);
            });
        });
    });

});