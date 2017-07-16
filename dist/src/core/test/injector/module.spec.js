"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const module_decorator_1 = require("../../../common/utils/decorators/module.decorator");
const unknown_export_exception_1 = require("../../errors/exceptions/unknown-export.exception");
const module_1 = require("../../injector/module");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const runtime_exception_1 = require("../../errors/exceptions/runtime.exception");
describe('Module', () => {
    let module;
    let TestModule = class TestModule {
    };
    TestModule = __decorate([
        module_decorator_1.Module({})
    ], TestModule);
    let TestComponent = class TestComponent {
    };
    TestComponent = __decorate([
        component_decorator_1.Component()
    ], TestComponent);
    beforeEach(() => {
        module = new module_1.Module(TestModule, []);
    });
    it('should throw "UnknownExportException" when given exported component is not a part of components array', () => {
        chai_1.expect(() => module.addExportedComponent(TestComponent)).throws(unknown_export_exception_1.UnknownExportException);
    });
    it('should add route', () => {
        const collection = new Map();
        const setSpy = sinon.spy(collection, 'set');
        module._routes = collection;
        class Test {
        }
        module.addRoute(Test);
        chai_1.expect(setSpy.getCall(0).args).to.deep.equal(['Test', {
                name: 'Test',
                metatype: Test,
                instance: null,
                isResolved: false,
            }]);
    });
    it('should add component', () => {
        const collection = new Map();
        const setSpy = sinon.spy(collection, 'set');
        module._components = collection;
        module.addComponent(TestComponent);
        chai_1.expect(setSpy.getCall(0).args).to.deep.equal(['TestComponent', {
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
        module.addComponent(provider);
        chai_1.expect(addCustomComponent.called).to.be.true;
    });
    it('should call "addCustomClass" when "useClass" property exists', () => {
        const addCustomClass = sinon.spy();
        module.addCustomClass = addCustomClass;
        const provider = { provide: 'test', useClass: () => null };
        module.addCustomComponent(provider);
        chai_1.expect(addCustomClass.called).to.be.true;
    });
    it('should call "addCustomValue" when "useValue" property exists', () => {
        const addCustomValue = sinon.spy();
        module.addCustomValue = addCustomValue;
        const provider = { provide: 'test', useValue: () => null };
        module.addCustomComponent(provider);
        chai_1.expect(addCustomValue.called).to.be.true;
    });
    it('should call "addCustomFactory" when "useFactory" property exists', () => {
        const addCustomFactory = sinon.spy();
        module.addCustomFactory = addCustomFactory;
        const provider = { provide: 'test', useFactory: () => null };
        module.addCustomComponent(provider);
        chai_1.expect(addCustomFactory.called).to.be.true;
    });
    describe('addCustomClass', () => {
        const type = { name: 'TypeTest' };
        const component = { provide: type, useClass: type, name: 'test' };
        let setSpy;
        beforeEach(() => {
            const collection = new Map();
            setSpy = sinon.spy(collection, 'set');
            module._components = collection;
        });
        it('should store component', () => {
            module.addCustomClass(component);
            chai_1.expect(setSpy.calledWith(component.name, {
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
            module._components = collection;
        });
        it('should store component', () => {
            module.addCustomValue(component);
            chai_1.expect(setSpy.calledWith(name, {
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
            module._components = collection;
        });
        it('should store component', () => {
            module.addCustomFactory(component);
            chai_1.expect(setSpy.getCall(0).args).to.deep.equal([component.name, {
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
                sinon.stub(module._components, 'has').returns(false);
            });
            it('should throws RuntimeException', () => {
                chai_1.expect(() => module.instance).to.throws(runtime_exception_1.RuntimeException);
            });
        });
        describe('when metatype exists in components collection', () => {
            it('should returns null', () => {
                chai_1.expect(module.instance).to.be.eql(null);
            });
        });
    });
});
//# sourceMappingURL=module.spec.js.map