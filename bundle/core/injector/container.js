"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
require("reflect-metadata");
const invalid_module_exception_1 = require("../errors/exceptions/invalid-module.exception");
const unknown_module_exception_1 = require("../errors/exceptions/unknown-module.exception");
const compiler_1 = require("./compiler");
const module_1 = require("./module");
const modules_container_1 = require("./modules-container");
class NestContainer {
    constructor(_applicationConfig = void 0) {
        this._applicationConfig = _applicationConfig;
        this.globalModules = new Set();
        this.moduleCompiler = new compiler_1.ModuleCompiler();
        this.modules = new modules_container_1.ModulesContainer();
        this.dynamicModulesMetadata = new Map();
    }
    get applicationConfig() {
        return this._applicationConfig;
    }
    setApplicationRef(applicationRef) {
        this.applicationRef = applicationRef;
    }
    getApplicationRef() {
        return this.applicationRef;
    }
    async addModule(metatype, scope) {
        if (!metatype) {
            throw new invalid_module_exception_1.InvalidModuleException(scope);
        }
        const { type, dynamicMetadata, token } = await this.moduleCompiler.compile(metatype, scope);
        if (this.modules.has(token)) {
            return;
        }
        const module = new module_1.Module(type, scope, this);
        this.modules.set(token, module);
        this.addDynamicMetadata(token, dynamicMetadata, [].concat(scope, type));
        this.isGlobalModule(type) && this.addGlobalModule(module);
    }
    addDynamicMetadata(token, dynamicModuleMetadata, scope) {
        if (!dynamicModuleMetadata) {
            return undefined;
        }
        this.dynamicModulesMetadata.set(token, dynamicModuleMetadata);
        const { modules, imports } = dynamicModuleMetadata;
        this.addDynamicModules(modules, scope);
        this.addDynamicModules(imports, scope);
    }
    addDynamicModules(modules, scope) {
        if (!modules) {
            return undefined;
        }
        modules.map(module => this.addModule(module, scope));
    }
    isGlobalModule(metatype) {
        return !!Reflect.getMetadata(constants_1.GLOBAL_MODULE_METADATA, metatype);
    }
    addGlobalModule(module) {
        this.globalModules.add(module);
    }
    getModules() {
        return this.modules;
    }
    async addRelatedModule(relatedModule, token) {
        if (!this.modules.has(token))
            return;
        const module = this.modules.get(token);
        const parent = module.metatype;
        const scope = [].concat(module.scope, parent);
        const { token: relatedModuleToken } = await this.moduleCompiler.compile(relatedModule, scope);
        const related = this.modules.get(relatedModuleToken);
        module.addRelatedModule(related);
    }
    addComponent(component, token) {
        if (!this.modules.has(token)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const module = this.modules.get(token);
        return module.addComponent(component);
    }
    addInjectable(injectable, token) {
        if (!this.modules.has(token)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const module = this.modules.get(token);
        module.addInjectable(injectable);
    }
    addExportedComponent(exportedComponent, token) {
        if (!this.modules.has(token)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const module = this.modules.get(token);
        module.addExportedComponent(exportedComponent);
    }
    addController(controller, token) {
        if (!this.modules.has(token)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const module = this.modules.get(token);
        module.addRoute(controller);
    }
    clear() {
        this.modules.clear();
    }
    replace(toReplace, options) {
        [...this.modules.values()].forEach(module => {
            module.replace(toReplace, options);
        });
    }
    bindGlobalScope() {
        this.modules.forEach(module => this.bindGlobalsToRelatedModules(module));
    }
    bindGlobalsToRelatedModules(module) {
        this.globalModules.forEach(globalModule => this.bindGlobalModuleToModule(module, globalModule));
    }
    bindGlobalModuleToModule(module, globalModule) {
        if (module === globalModule) {
            return undefined;
        }
        module.addRelatedModule(globalModule);
    }
    getDynamicMetadataByToken(token, metadataKey) {
        const metadata = this.dynamicModulesMetadata.get(token);
        if (metadata && metadata[metadataKey]) {
            return metadata[metadataKey];
        }
        return [];
    }
}
exports.NestContainer = NestContainer;
