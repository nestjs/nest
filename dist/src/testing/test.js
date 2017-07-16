"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const container_1 = require("@nestjs/core/injector/container");
const module_decorator_1 = require("@nestjs/common/utils/decorators/module.decorator");
const scanner_1 = require("@nestjs/core/scanner");
const instance_loader_1 = require("@nestjs/core/injector/instance-loader");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const nest_environment_enum_1 = require("@nestjs/common/enums/nest-environment.enum");
class Test {
    static createTestingModule(metadata) {
        this.init();
        const module = this.createModule(metadata);
        this.scanner.scan(module);
        this.instanceLoader.createInstancesOfDependencies();
    }
    static get(metatype) {
        const modules = this.container.getModules();
        return this.findInstanceByPrototype(metatype, modules);
    }
    static restart() {
        this.container.clear();
    }
    static init() {
        logger_service_1.Logger.setMode(nest_environment_enum_1.NestEnvironment.TEST);
        this.restart();
    }
    static findInstanceByPrototype(metatype, modules) {
        for (const [_, module] of modules) {
            const dependencies = new Map([...module.components, ...module.routes]);
            const instanceWrapper = dependencies.get(metatype.name);
            if (instanceWrapper) {
                return instanceWrapper.instance;
            }
        }
        return null;
    }
    static createModule(metadata) {
        class TestModule {
        }
        module_decorator_1.Module(metadata)(TestModule);
        return TestModule;
    }
}
Test.container = new container_1.NestContainer();
Test.scanner = new scanner_1.DependenciesScanner(Test.container);
Test.instanceLoader = new instance_loader_1.InstanceLoader(Test.container);
exports.Test = Test;
//# sourceMappingURL=test.js.map