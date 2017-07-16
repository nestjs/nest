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
const container_1 = require("../../injector/container");
const module_decorator_1 = require("../../../common/utils/decorators/module.decorator");
const unknown_module_exception_1 = require("../../errors/exceptions/unknown-module.exception");
describe('NestContainer', () => {
    let container;
    let TestModule = class TestModule {
    };
    TestModule = __decorate([
        module_decorator_1.Module({})
    ], TestModule);
    beforeEach(() => {
        container = new container_1.NestContainer();
    });
    it('should not add module if already exists in collection', () => {
        const modules = new Map();
        const setSpy = sinon.spy(modules, 'set');
        container.modules = modules;
        container.addModule(TestModule, []);
        container.addModule(TestModule, []);
        chai_1.expect(setSpy.calledOnce).to.be.true;
    });
    it('should "addComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
        chai_1.expect(() => container.addComponent(null, 'TestModule')).throw(unknown_module_exception_1.UnknownModuleException);
    });
    it('should "addController" throw "UnknownModuleException" when module is not stored in collection', () => {
        chai_1.expect(() => container.addController(null, 'TestModule')).throw(unknown_module_exception_1.UnknownModuleException);
    });
    it('should "addExportedComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
        chai_1.expect(() => container.addExportedComponent(null, 'TestModule')).throw(unknown_module_exception_1.UnknownModuleException);
    });
});
//# sourceMappingURL=container.spec.js.map