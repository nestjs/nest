"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const injector_1 = require("../../injector/injector");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const runtime_exception_1 = require("../../errors/exceptions/runtime.exception");
const module_1 = require("../../injector/module");
const unknown_dependencies_exception_1 = require("../../errors/exceptions/unknown-dependencies.exception");
describe('Injector', () => {
    let injector;
    beforeEach(() => {
        injector = new injector_1.Injector();
    });
    describe('loadInstance', () => {
        let DependencyOne = class DependencyOne {
        };
        DependencyOne = __decorate([
            component_decorator_1.Component()
        ], DependencyOne);
        let DependencyTwo = class DependencyTwo {
        };
        DependencyTwo = __decorate([
            component_decorator_1.Component()
        ], DependencyTwo);
        let MainTest = class MainTest {
            constructor(depOne, depTwo) {
                this.depOne = depOne;
                this.depTwo = depTwo;
            }
        };
        MainTest = __decorate([
            component_decorator_1.Component(),
            __metadata("design:paramtypes", [DependencyOne,
                DependencyTwo])
        ], MainTest);
        let moduleDeps;
        let mainTest, depOne, depTwo;
        beforeEach(() => {
            moduleDeps = new module_1.Module(DependencyTwo, []);
            mainTest = {
                name: 'MainTest',
                metatype: MainTest,
                instance: Object.create(MainTest.prototype),
                isResolved: false,
            };
            depOne = {
                name: 'DependencyOne',
                metatype: DependencyOne,
                instance: Object.create(DependencyOne.prototype),
                isResolved: false,
            };
            depTwo = {
                name: 'DependencyTwo',
                metatype: DependencyTwo,
                instance: Object.create(DependencyOne.prototype),
                isResolved: false,
            };
            moduleDeps.components.set('MainTest', mainTest);
            moduleDeps.components.set('DependencyOne', depOne);
            moduleDeps.components.set('DependencyTwo', depTwo);
        });
        it('should create an instance of component with proper dependencies', () => {
            injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
            const { instance } = moduleDeps.components.get('MainTest');
            chai_1.expect(instance.depOne instanceof DependencyOne).to.be.true;
            chai_1.expect(instance.depTwo instanceof DependencyOne).to.be.true;
            chai_1.expect(instance instanceof MainTest).to.be.true;
        });
        it('should set "isResolved" property to true after instance initialization', () => {
            injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
            const { isResolved } = moduleDeps.components.get('MainTest');
            chai_1.expect(isResolved).to.be.true;
        });
        it('should throw RuntimeException when type is not stored in collection', () => {
            chai_1.expect(injector.loadInstance.bind(injector, 'Test', moduleDeps.components, moduleDeps)).to.throw(runtime_exception_1.RuntimeException);
        });
    });
    describe('loadPrototypeOfInstance', () => {
        let Test = class Test {
        };
        Test = __decorate([
            component_decorator_1.Component()
        ], Test);
        let moduleDeps;
        let test;
        beforeEach(() => {
            moduleDeps = new module_1.Module(Test, []);
            test = {
                name: 'Test',
                metatype: Test,
                instance: Object.create(Test.prototype),
                isResolved: false,
            };
            moduleDeps.components.set('Test', test);
        });
        it('should create prototype of instance', () => {
            const expectedResult = {
                instance: Object.create(Test.prototype),
                isResolved: false,
                metatype: Test,
                name: 'Test',
            };
            injector.loadPrototypeOfInstance(test, moduleDeps.components);
            chai_1.expect(moduleDeps.components.get('Test')).to.deep.equal(expectedResult);
        });
    });
    describe('resolveSingleParam', () => {
        it('should throw "RuntimeException" when param is undefined', () => {
            chai_1.expect(() => injector.resolveSingleParam(null, undefined, null, [])).throws(runtime_exception_1.RuntimeException);
        });
    });
    describe('loadInstanceOfMiddleware', () => {
        let resolveConstructorParams;
        beforeEach(() => {
            resolveConstructorParams = sinon.spy();
            injector.resolveConstructorParams = resolveConstructorParams;
        });
        it('should call "resolveConstructorParams" when instance is not resolved', () => {
            const collection = {
                get: (...args) => ({
                    instance: null,
                }),
                set: (...args) => { },
            };
            injector.loadInstanceOfMiddleware({ metatype: { name: '' } }, collection, null);
            chai_1.expect(resolveConstructorParams.called).to.be.true;
        });
        it('should not call "resolveConstructorParams" when instance is not resolved', () => {
            const collection = {
                get: (...args) => ({
                    instance: {},
                }),
                set: (...args) => { },
            };
            injector.loadInstanceOfMiddleware({ metatype: { name: '' } }, collection, null);
            chai_1.expect(resolveConstructorParams.called).to.be.false;
        });
    });
    describe('scanForComponent', () => {
        let scanForComponentInRelatedModules;
        const metatype = { name: 'test', metatype: { name: 'test' } };
        beforeEach(() => {
            scanForComponentInRelatedModules = sinon.stub();
            injector.scanForComponentInRelatedModules = scanForComponentInRelatedModules;
        });
        it('should return object from collection if exists', () => {
            const instance = { test: 3 };
            const collection = {
                has: () => true,
                get: () => instance,
            };
            const result = injector.scanForComponent(collection, metatype.name, null, metatype);
            chai_1.expect(result).to.be.equal(instance);
        });
        it('should call "scanForComponentInRelatedModules" when object is not in collection', () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            injector.scanForComponent(collection, metatype.name, null, metatype);
            chai_1.expect(scanForComponentInRelatedModules.called).to.be.true;
        });
        it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', () => {
            scanForComponentInRelatedModules.returns(null);
            const collection = {
                has: () => false,
            };
            const module = { exports: collection };
            chai_1.expect(() => injector.scanForComponent(collection, metatype.name, module, { metatype })).throws(unknown_dependencies_exception_1.UnknownDependenciesException);
        });
        it('should not throw "UnknownDependenciesException" instanceWrapper is not null', () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            const module = { exports: collection };
            chai_1.expect(() => injector.scanForComponent(collection, metatype.name, module, metatype)).not.throws(unknown_dependencies_exception_1.UnknownDependenciesException);
        });
    });
    describe('scanForComponentInRelatedModules', () => {
        let loadInstanceOfComponent;
        const metatype = { name: 'test' };
        const module = {
            relatedModules: [],
        };
        beforeEach(() => {
            loadInstanceOfComponent = sinon.spy();
            injector.loadInstanceOfComponent = loadInstanceOfComponent;
        });
        it('should return null when there is no related modules', () => {
            const result = injector.scanForComponentInRelatedModules(module, null, []);
            chai_1.expect(result).to.be.eq(null);
        });
        it('should return null when related modules do not have appropriate component', () => {
            let module = {
                relatedModules: [{
                        components: {
                            has: () => false,
                        },
                        exports: {
                            has: () => true,
                        },
                    }],
            };
            chai_1.expect(injector.scanForComponentInRelatedModules(module, metatype, [])).to.be.eq(null);
            module = {
                relatedModules: [{
                        components: {
                            has: () => true,
                        },
                        exports: {
                            has: () => false,
                        },
                    }],
            };
            chai_1.expect(injector.scanForComponentInRelatedModules(module, metatype, [])).to.be.eq(null);
        });
        it('should call "loadInstanceOfComponent" when component is not resolved', () => {
            let module = {
                relatedModules: [{
                        components: {
                            has: () => true,
                            get: () => ({
                                isResolved: false,
                            }),
                        },
                        exports: {
                            has: () => true,
                        },
                    }],
            };
            injector.scanForComponentInRelatedModules(module, metatype, []);
            chai_1.expect(loadInstanceOfComponent.called).to.be.true;
        });
        it('should not call "loadInstanceOfComponent" when component is resolved', () => {
            let module = {
                relatedModules: [{
                        components: {
                            has: () => true,
                            get: () => ({
                                isResolved: true,
                            }),
                        },
                        exports: {
                            has: () => true,
                        },
                    }],
            };
            injector.scanForComponentInRelatedModules(module, metatype, []);
            chai_1.expect(loadInstanceOfComponent.called).to.be.false;
        });
    });
    describe('scanForComponentInScopes', () => {
        it('should returns null when component is not available in any scope', () => {
            chai_1.expect(injector.scanForComponentInScopes([], '', {})).to.be.null;
        });
        it('should returns wrapper when component is available in any scope', () => {
            const component = 'test';
            sinon.stub(injector, 'scanForComponentInScope').returns(component);
            chai_1.expect(injector.scanForComponentInScopes([{}], '', {})).to.be.eql(component);
        });
    });
    describe('scanForComponentInScope', () => {
        it('should returns null when scope throws exception', () => {
            sinon.stub(injector, 'scanForComponent').throws('exception');
            chai_1.expect(injector.scanForComponentInScope({}, '', {})).to.be.null;
        });
    });
});
//# sourceMappingURL=injector.spec.js.map