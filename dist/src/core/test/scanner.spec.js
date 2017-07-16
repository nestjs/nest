"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const scanner_1 = require("./../scanner");
const container_1 = require("./../injector/container");
const module_decorator_1 = require("../../common/utils/decorators/module.decorator");
const component_decorator_1 = require("../../common/utils/decorators/component.decorator");
const controller_decorator_1 = require("../../common/utils/decorators/controller.decorator");
describe('DependenciesScanner', () => {
    let TestComponent = class TestComponent {
    };
    TestComponent = __decorate([
        component_decorator_1.Component()
    ], TestComponent);
    let TestRoute = class TestRoute {
    };
    TestRoute = __decorate([
        controller_decorator_1.Controller({ path: '' })
    ], TestRoute);
    let AnotherTestModule = class AnotherTestModule {
    };
    AnotherTestModule = __decorate([
        module_decorator_1.Module({
            components: [TestComponent],
            controllers: [TestRoute],
            exports: [TestComponent],
        })
    ], AnotherTestModule);
    let TestModule = class TestModule {
    };
    TestModule = __decorate([
        module_decorator_1.Module({
            modules: [AnotherTestModule],
            components: [TestComponent],
            controllers: [TestRoute],
        })
    ], TestModule);
    let scanner;
    let mockContainer;
    let container;
    before(() => {
        container = new container_1.NestContainer();
        mockContainer = sinon.mock(container);
    });
    beforeEach(() => {
        scanner = new scanner_1.DependenciesScanner(container);
    });
    afterEach(() => {
        mockContainer.restore();
    });
    it('should "storeModule" call twice (2 modules) container method "addModule"', () => {
        const expectation = mockContainer.expects('addModule').twice();
        scanner.scan(TestModule);
        expectation.verify();
    });
    it('should "storeComponent" call twice (2 components) container method "addComponent"', () => {
        const expectation = mockContainer.expects('addComponent').twice();
        const stub = sinon.stub(scanner, 'storeExportedComponent');
        scanner.scan(TestModule);
        expectation.verify();
        stub.restore();
    });
    it('should "storeRoute" call twice (2 components) container method "addController"', () => {
        const expectation = mockContainer.expects('addController').twice();
        scanner.scan(TestModule);
        expectation.verify();
    });
    it('should "storeExportedComponent" call once (1 component) container method "addExportedComponent"', () => {
        const expectation = mockContainer.expects('addExportedComponent').once();
        scanner.scan(TestModule);
        expectation.verify();
    });
});
//# sourceMappingURL=scanner.spec.js.map