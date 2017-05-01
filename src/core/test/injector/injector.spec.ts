import * as sinon from 'sinon';
import { expect } from 'chai';
import { InstanceWrapper } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { Component } from '../../../common/utils/decorators/component.decorator';
import { RuntimeException } from '../../../errors/exceptions/runtime.exception';
import { Module } from '../../injector/module';
import { UnkownDependenciesException } from '../../../errors/exceptions/unkown-dependencies.exception';

describe('Injector', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = new Injector();
    });

    describe('loadInstance', () => {

        @Component()
        class DependencyOne {}

        @Component()
        class DependencyTwo {}

        @Component()
        class MainTest {
            constructor(
                public depOne: DependencyOne,
                public depTwo: DependencyTwo) {}
        }

        let moduleDeps: Module;
        let mainTest, depOne, depTwo;

        beforeEach(() => {
            moduleDeps = new Module(DependencyTwo);
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
            const { instance } = moduleDeps.components.get('MainTest') as InstanceWrapper<MainTest>;

            expect(instance.depOne instanceof DependencyOne).to.be.true;
            expect(instance.depTwo instanceof DependencyOne).to.be.true;
            expect(instance instanceof MainTest).to.be.true;
        });

        it('should set "isResolved" property to true after instance initialization', () => {
            injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
            const { isResolved } = moduleDeps.components.get('MainTest') as InstanceWrapper<MainTest>;
            expect(isResolved).to.be.true;
        });

        it('should throw RuntimeException when type is not stored in collection', () => {
            expect(
                injector.loadInstance.bind(injector, 'Test', moduleDeps.components, moduleDeps),
            ).to.throw(RuntimeException);
        });

    });

    describe('loadPrototypeOfInstance', () => {

        @Component()
        class Test {}

        let moduleDeps: Module;
        let test;

        beforeEach(() => {
            moduleDeps = new Module(Test);
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
            expect(moduleDeps.components.get('Test')).to.deep.equal(expectedResult);
        });
    });

    describe('resolveSingleParam', () => {
        it('should throw "RuntimeException" when param is undefined', () => {
            expect(() => injector.resolveSingleParam(null, undefined, null)).throws(RuntimeException);
        });
    });

    describe('loadInstanceOfMiddleware', () => {
        let resolveConstructorParams: sinon.SinonSpy;

        beforeEach(() => {
            resolveConstructorParams = sinon.spy();
            injector.resolveConstructorParams = resolveConstructorParams;
        });

        it('should call "resolveConstructorParams" when instance is not resolved', () => {
            const collection = {
                get: (...args) => ({
                    instance: null,
                }),
                set: (...args) => {},
            };

            injector.loadInstanceOfMiddleware({ metatype: { name: '' }} as any, collection as any, null);
            expect(resolveConstructorParams.called).to.be.true;
        });

        it('should not call "resolveConstructorParams" when instance is not resolved', () => {
            const collection = {
                get: (...args) => ({
                    instance: {},
                }),
                set: (...args) => {},
            };

            injector.loadInstanceOfMiddleware({ metatype: { name: '' }} as any, collection as any, null);
            expect(resolveConstructorParams.called).to.be.false;
        });
    });

    describe('scanForComponent', () => {
        let scanForComponentInRelatedModules: sinon.SinonStub;
        const metatype = { name: 'test', metatype: { name: 'test' }};

        beforeEach(() => {
            scanForComponentInRelatedModules = sinon.stub();
            (injector as any).scanForComponentInRelatedModules = scanForComponentInRelatedModules;
        });

        it('should return object from collection if exists', () => {
            const instance = { test: 3 };
            const collection = {
                has: () => true,
                get: () => instance,
            };
            const result = injector.scanForComponent(collection as any, metatype.name, null, metatype);
            expect(result).to.be.equal(instance);
        });

        it('should call "scanForComponentInRelatedModules" when object is not in collection', () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            injector.scanForComponent(collection as any, metatype.name, null, metatype);
            expect(scanForComponentInRelatedModules.called).to.be.true;
        });

        it('should throw "UnkownDependenciesException" instanceWrapper is null', () => {
            scanForComponentInRelatedModules.returns(null);
            const collection = {
                has: () => false,
            };

            expect(
                () => injector.scanForComponent(collection as any, metatype.name, null, metatype)
            ).throws(UnkownDependenciesException);
        });

        it('should not throw "UnkownDependenciesException" instanceWrapper is not null', () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            expect(
                () => injector.scanForComponent(collection as any, metatype.name, null, metatype)
            ).not.throws(UnkownDependenciesException);
        });

    });

    describe('scanForComponentInRelatedModules', () => {
        let loadInstanceOfComponent: sinon.SinonSpy;
        const metatype = { name: 'test' };
        const module = {
            relatedModules: [],
        };

        beforeEach(() => {
            loadInstanceOfComponent = sinon.spy();
            (injector as any).loadInstanceOfComponent = loadInstanceOfComponent;
        });

        it('should return null when there is no related modules', () => {
            const result = injector.scanForComponentInRelatedModules(module as any, null);
            expect(result).to.be.eq(null);
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
            expect(injector.scanForComponentInRelatedModules(module as any, metatype as any)).to.be.eq(null);

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
            expect(injector.scanForComponentInRelatedModules(module as any, metatype as any)).to.be.eq(null);
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
            injector.scanForComponentInRelatedModules(module as any, metatype as any);
            expect(loadInstanceOfComponent.called).to.be.true;
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
            injector.scanForComponentInRelatedModules(module as any, metatype as any);
            expect(loadInstanceOfComponent.called).to.be.false;
        });

    });

});