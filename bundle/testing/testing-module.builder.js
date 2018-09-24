"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const application_config_1 = require("@nestjs/core/application-config");
const container_1 = require("@nestjs/core/injector/container");
const instance_loader_1 = require("@nestjs/core/injector/instance-loader");
const scanner_1 = require("@nestjs/core/scanner");
const deprecate = require("deprecate");
const testing_logger_service_1 = require("./services/testing-logger.service");
const testing_module_1 = require("./testing-module");
class TestingModuleBuilder {
    constructor(metadataScanner, metadata) {
        this.applicationConfig = new application_config_1.ApplicationConfig();
        this.container = new container_1.NestContainer(this.applicationConfig);
        this.overloadsMap = new Map();
        this.instanceLoader = new instance_loader_1.InstanceLoader(this.container);
        this.scanner = new scanner_1.DependenciesScanner(this.container, metadataScanner, this.applicationConfig);
        this.module = this.createModule(metadata);
    }
    overridePipe(typeOrToken) {
        return this.override(typeOrToken, false);
    }
    overrideFilter(typeOrToken) {
        return this.override(typeOrToken, false);
    }
    overrideGuard(typeOrToken) {
        return this.override(typeOrToken, false);
    }
    overrideInterceptor(typeOrToken) {
        return this.override(typeOrToken, false);
    }
    /** @deprecated */
    overrideComponent(typeOrToken) {
        deprecate('The "overrideComponent()" method is deprecated and will be removed within next major release. Use "overrideProvider()" instead.');
        return this.override(typeOrToken, true);
    }
    overrideProvider(typeOrToken) {
        return this.override(typeOrToken, true);
    }
    async compile() {
        this.applyLogger();
        await this.scanner.scan(this.module);
        this.applyOverloadsMap();
        await this.instanceLoader.createInstancesOfDependencies();
        this.scanner.applyApplicationProviders();
        const root = this.getRootModule();
        return new testing_module_1.TestingModule(this.container, [], root, this.applicationConfig);
    }
    override(typeOrToken, isComponent) {
        const addOverload = options => {
            this.overloadsMap.set(typeOrToken, Object.assign({}, options, { isComponent }));
            return this;
        };
        return this.createOverrideByBuilder(addOverload);
    }
    createOverrideByBuilder(add) {
        return {
            useValue: value => add({ useValue: value }),
            useFactory: (options) => add(Object.assign({}, options, { useFactory: options.factory })),
            useClass: metatype => add({ useClass: metatype }),
        };
    }
    applyOverloadsMap() {
        [...this.overloadsMap.entries()].forEach(([component, options]) => {
            this.container.replace(component, options);
        });
    }
    getRootModule() {
        const modules = this.container.getModules().values();
        return modules.next().value;
    }
    createModule(metadata) {
        class TestModule {
        }
        common_1.Module(metadata)(TestModule);
        return TestModule;
    }
    applyLogger() {
        common_1.Logger.overrideLogger(new testing_logger_service_1.TestingLogger());
    }
}
exports.TestingModuleBuilder = TestingModuleBuilder;
