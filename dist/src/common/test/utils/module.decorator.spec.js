"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const chai_1 = require("chai");
const module_decorator_1 = require("../../utils/decorators/module.decorator");
const invalid_module_config_exception_1 = require("../../exceptions/invalid-module-config.exception");
describe('@Module', () => {
    const moduleProps = {
        components: ['Test'],
        modules: ['Test'],
        exports: ['Test'],
        controllers: ['Test']
    };
    let TestModule = class TestModule {
    };
    TestModule = __decorate([
        module_decorator_1.Module(moduleProps)
    ], TestModule);
    it('should enhance class with expected module metadata', () => {
        const modules = Reflect.getMetadata('modules', TestModule);
        const components = Reflect.getMetadata('components', TestModule);
        const exports = Reflect.getMetadata('exports', TestModule);
        const controllers = Reflect.getMetadata('controllers', TestModule);
        chai_1.expect(modules).to.be.eql(moduleProps.modules);
        chai_1.expect(components).to.be.eql(moduleProps.components);
        chai_1.expect(controllers).to.be.eql(moduleProps.controllers);
        chai_1.expect(exports).to.be.eql(moduleProps.exports);
    });
    it('should throw exception when module properties are invalid', () => {
        const invalidProps = Object.assign({}, moduleProps, { test: [] });
        chai_1.expect(module_decorator_1.Module.bind(null, invalidProps)).to.throw(invalid_module_config_exception_1.InvalidModuleConfigException);
    });
});
//# sourceMappingURL=module.decorator.spec.js.map