"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
const module_1 = require("./module");
const unknown_module_exception_1 = require("../errors/exceptions/unknown-module.exception");
const module_token_factory_1 = require("./module-token-factory");
const invalid_module_exception_1 = require("./../errors/exceptions/invalid-module.exception");
const modules_container_1 = require("./modules-container");
class NestContainer {
    constructor() {
        this.globalModules = new Set();
        this.modules = new modules_container_1.ModulesContainer();
        this.dynamicModulesMetadata = new Map();
        this.moduleTokenFactory = new module_token_factory_1.ModuleTokenFactory();
    }
    setApplicationRef(applicationRef) {
        this.applicationRef = applicationRef;
    }
    getApplicationRef() {
        return this.applicationRef;
    }
    addModule(metatype, scope) {
        if (!metatype) {
            throw new invalid_module_exception_1.InvalidModuleException(scope);
        }
        const { type, dynamicMetadata } = this.extractMetadata(metatype);
        const token = this.moduleTokenFactory.create(type, scope, dynamicMetadata);
        if (this.modules.has(token)) {
            return;
        }
        const module = new module_1.Module(type, scope, this);
        this.modules.set(token, module);
        this.addDynamicMetadata(token, dynamicMetadata, [].concat(scope, type));
        this.isGlobalModule(type) && this.addGlobalModule(module);
    }
    extractMetadata(metatype) {
        if (!this.isDynamicModule(metatype)) {
            return { type: metatype };
        }
        const { module: type } = metatype, dynamicMetadata = __rest(metatype, ["module"]);
        return { type, dynamicMetadata };
    }
    isDynamicModule(module) {
        return module.module;
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
            return;
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
    addRelatedModule(relatedModule, token) {
        if (!this.modules.has(token))
            return;
        const module = this.modules.get(token);
        const parent = module.metatype;
        const { type, dynamicMetadata } = this.extractMetadata(relatedModule);
        const relatedModuleToken = this.moduleTokenFactory.create(type, [].concat(module.scope, parent), dynamicMetadata);
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
