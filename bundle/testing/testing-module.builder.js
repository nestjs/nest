"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
const instance_loader_1 = require("@nestjs/core/injector/instance-loader");
const container_1 = require("@nestjs/core/injector/container");
const common_1 = require("@nestjs/common");
const scanner_1 = require("@nestjs/core/scanner");
const testing_module_1 = require("./testing-module");
const application_config_1 = require("@nestjs/core/application-config");
class TestingModuleBuilder {
    constructor(metadataScanner, metadata) {
        this.applicationConfig = new application_config_1.ApplicationConfig();
        this.container = new container_1.NestContainer();
        this.overloadsMap = new Map();
        this.instanceLoader = new instance_loader_1.InstanceLoader(this.container);
        this.scanner = new scanner_1.DependenciesScanner(this.container, metadataScanner, this.applicationConfig);
        this.module = this.createModule(metadata);
        this.scanner.scan(this.module);
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
    compile() {
        return __awaiter(this, void 0, void 0, function* () {
            [...this.overloadsMap.entries()].map(([component, options]) => {
                this.container.replace(component, options);
            });
            yield this.instanceLoader.createInstancesOfDependencies();
            this.scanner.applyApplicationProviders();
            const modules = this.container.getModules().values();
            const root = modules.next().value;
            return new testing_module_1.TestingModule(this.container, [], root, this.applicationConfig);
        });
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
    createModule(metadata) {
        class TestModule {
        }
        common_1.Module(metadata)(TestModule);
        return TestModule;
    }
}
exports.TestingModuleBuilder = TestingModuleBuilder;
