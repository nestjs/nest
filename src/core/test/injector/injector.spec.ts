import * as sinon from 'sinon';
import { expect } from 'chai';
import { InstanceWrapper } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { Component } from '../../../common/utils/decorators/component.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { Module } from '../../injector/module';
import { UnknownDependenciesException } from '../../errors/exceptions/unknown-dependencies.exception';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

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
            moduleDeps = new Module(DependencyTwo as any, []);
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

        it('should create an instance of component with proper dependencies', async () => {
            await injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
            const { instance } = moduleDeps.components.get('MainTest') as InstanceWrapper<MainTest>;

            expect(instance.depOne).instanceof(DependencyOne);
            expect(instance.depTwo).instanceof(DependencyOne);
            expect(instance).instanceof(MainTest);
        });

        it('should set "isResolved" property to true after instance initialization', async () => {
            await injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
            const { isResolved } = moduleDeps.components.get('MainTest') as InstanceWrapper<MainTest>;
            expect(isResolved).to.be.true;
        });

        it('should throw RuntimeException when type is not stored in collection', () => {
            return expect(
                injector.loadInstance({} as any, moduleDeps.components, moduleDeps),
            ).to.eventually.be.rejected;
        });

    });

    describe('loadPrototypeOfInstance', () => {

        @Component()
        class Test {}

        let moduleDeps: Module;
        let test;

        beforeEach(() => {
            moduleDeps = new Module(Test as any, []);
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
        it('should throw "RuntimeException" when param is undefined', async () => {
            return expect(
                injector.resolveSingleParam(null, undefined, null, []),
            ).to.eventually.be.rejected;
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

        it('should return object from collection if exists', async () => {
            const instance = { test: 3 };
            const collection = {
                has: () => true,
                get: () => instance,
            };
            const result = await injector.scanForComponent(collection as any, metatype.name, null, metatype);
            expect(result).to.be.equal(instance);
        });

        it('should call "scanForComponentInRelatedModules" when object is not in collection', async () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            await injector.scanForComponent(collection as any, metatype.name, null, metatype);
            expect(scanForComponentInRelatedModules.called).to.be.true;
        });

        it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', () => {
            scanForComponentInRelatedModules.returns(null);
            const collection = {
                has: () => false,
            };
            const module = { exports: collection };
            expect(
                injector.scanForComponent(collection as any, metatype.name, module as any, { metatype }),
            ).to.eventually.be.rejected;
        });

        it('should not throw "UnknownDependenciesException" instanceWrapper is not null', () => {
            scanForComponentInRelatedModules.returns({});
            const collection = {
                has: () => false,
            };
            const module = { exports: collection };
            expect(
                injector.scanForComponent(collection as any, metatype.name, module as any, metatype),
            ).to.eventually.be.not.rejected;
        });

    });

    describe('scanForComponentInRelatedModules', () => {
        let loadInstanceOfComponent: sinon.SinonSpy;
        const metatype = { name: 'test' };
        const module = {
            relatedModules: new Map(),
        };

        beforeEach(() => {
            loadInstanceOfComponent = sinon.spy();
            (injector as any).loadInstanceOfComponent = loadInstanceOfComponent;
        });

        it('should return null when there is no related modules', async () => {
            const result = await injector.scanForComponentInRelatedModules(module as any, null, []);
            expect(result).to.be.eq(null);
        });

        it('should return null when related modules do not have appropriate component', () => {
            let module = {
                relatedModules: new Map([['key', {
                    components: {
                        has: () => false,
                    },
                    exports: {
                        has: () => true,
                    },
                }]] as any),
            };
            expect(
                injector.scanForComponentInRelatedModules(module as any, metatype as any, []),
            ).to.be.eventually.eq(null);

            module = {
                relatedModules: new Map([['key', {
                    components: {
                        has: () => true,
                    },
                    exports: {
                        has: () => false,
                    },
                }]] as any),
            };
            expect(
                injector.scanForComponentInRelatedModules(module as any, metatype as any, []),
            ).to.eventually.be.eq(null);
        });

        it('should call "loadInstanceOfComponent" when component is not resolved', async () => {
            let module = {
                relatedModules: new Map([['key', {
                    components: {
                        has: () => true,
                        get: () => ({
                          isResolved: false,
                        }),
                    },
                    exports: {
                        has: () => true,
                    },
                }]] as any),
            };
            await injector.scanForComponentInRelatedModules(module as any, metatype as any, []);
            expect(loadInstanceOfComponent.called).to.be.true;
        });

        it('should not call "loadInstanceOfComponent" when component is resolved', async () => {
            let module = {
                relatedModules: new Map([['key', {
                    components: {
                        has: () => true,
                        get: () => ({
                            isResolved: true,
                        }),
                    },
                    exports: {
                        has: () => true,
                    },
                }]] as any),
            };
            await injector.scanForComponentInRelatedModules(module as any, metatype as any, []);
            expect(loadInstanceOfComponent.called).to.be.false;
        });

    });

    describe('scanForComponentInScopes', () => {
        it('should returns null when component is not available in any scope', () => {
            expect(injector.scanForComponentInScopes([], '', {})).to.eventually.be.null;
        });
        it('should returns wrapper when component is available in any scope', () => {
            const component = 'test';
            sinon.stub(injector, 'scanForComponentInScope').returns(component);
            expect(injector.scanForComponentInScopes([{}] as any, '', {})).to.eventually.be.eql(component);
        });
    });

    describe('scanForComponentInScope', () => {
        it('should returns null when scope throws exception', () => {
            sinon.stub(injector, 'scanForComponent').throws('exception');
            expect(injector.scanForComponentInScope({} as any, '', {})).to.eventually.be.null;
        });
    });
});