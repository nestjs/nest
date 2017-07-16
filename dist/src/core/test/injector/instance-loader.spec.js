"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const instance_loader_1 = require("../../injector/instance-loader");
const container_1 = require("../../injector/container");
const injector_1 = require("../../injector/injector");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const nest_environment_enum_1 = require("../../../common/enums/nest-environment.enum");
const logger_service_1 = require("../../../common/services/logger.service");
describe('InstanceLoader', () => {
    let loader;
    let container;
    let mockContainer;
    let TestRoute = class TestRoute {
    };
    TestRoute = __decorate([
        controller_decorator_1.Controller({ path: '' })
    ], TestRoute);
    let TestComponent = class TestComponent {
    };
    TestComponent = __decorate([
        component_decorator_1.Component()
    ], TestComponent);
    before(() => logger_service_1.Logger.setMode(nest_environment_enum_1.NestEnvironment.TEST));
    beforeEach(() => {
        container = new container_1.NestContainer();
        loader = new instance_loader_1.InstanceLoader(container);
        mockContainer = sinon.mock(container);
    });
    it('should call "loadPrototypeOfInstance" for each component and route in each module', () => {
        const injector = new injector_1.Injector();
        loader.injector = injector;
        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const componentWrapper = { instance: null, metatype: TestComponent };
        const routeWrapper = { instance: null, metatype: TestRoute };
        module.components.set('TestComponent', componentWrapper);
        module.routes.set('TestRoute', routeWrapper);
        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);
        const loadComponentPrototypeStub = sinon.stub(injector, 'loadPrototypeOfInstance');
        sinon.stub(injector, 'loadInstanceOfRoute');
        sinon.stub(injector, 'loadInstanceOfComponent');
        loader.createInstancesOfDependencies();
        chai_1.expect(loadComponentPrototypeStub.calledWith(componentWrapper, module.components)).to.be.true;
        chai_1.expect(loadComponentPrototypeStub.calledWith(routeWrapper, module.components)).to.be.true;
    });
    it('should call "loadInstanceOfComponent" for each component in each module', () => {
        const injector = new injector_1.Injector();
        loader.injector = injector;
        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const testComp = { instance: null, metatype: TestComponent, name: 'TestComponent' };
        module.components.set('TestComponent', testComp);
        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);
        const loadComponentStub = sinon.stub(injector, 'loadInstanceOfComponent');
        sinon.stub(injector, 'loadInstanceOfRoute');
        loader.createInstancesOfDependencies();
        chai_1.expect(loadComponentStub.calledWith(module.components.get('TestComponent'), module)).to.be.true;
    });
    it('should call "loadInstanceOfRoute" for each route in each module', () => {
        const injector = new injector_1.Injector();
        loader.injector = injector;
        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const wrapper = { name: 'TestRoute', instance: null, metatype: TestRoute };
        module.routes.set('TestRoute', wrapper);
        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);
        sinon.stub(injector, 'loadInstanceOfComponent');
        const loadRoutesStub = sinon.stub(injector, 'loadInstanceOfRoute');
        loader.createInstancesOfDependencies();
        chai_1.expect(loadRoutesStub.calledWith(module.routes.get('TestRoute'), module)).to.be.true;
    });
});
//# sourceMappingURL=instance-loader.spec.js.map