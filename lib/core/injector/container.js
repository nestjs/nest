"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const module_1 = require("./module");
const unknown_module_exception_1 = require("../errors/exceptions/unknown-module.exception");
const module_token_factory_1 = require("./module-token-factory");
const invalid_module_exception_1 = require("./../errors/exceptions/invalid-module.exception");
class NestContainer {
    constructor() {
        this.modules = new Map();
        this.moduleTokenFactory = new module_token_factory_1.ModuleTokenFactory();
    }
    addModule(metatype, scope) {
        if (!metatype) {
            throw new invalid_module_exception_1.InvalidModuleException(scope);
        }
        const token = this.moduleTokenFactory.create(metatype, scope);
        if (this.modules.has(token)) {
            return;
        }
        this.modules.set(token, new module_1.Module(metatype, scope));
    }
    getModules() {
        return this.modules;
    }
    addRelatedModule(relatedModule, token) {
        if (!this.modules.has(token))
            return;
        const module = this.modules.get(token);
        const parent = module.metatype;
        const relatedModuleToken = this.moduleTokenFactory.create(relatedModule, [].concat(module.scope, parent));
        const related = this.modules.get(relatedModuleToken);
        module.addRelatedModule(related);
    }
    addComponent(component, token) {
        if (!this.modules.has(token)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const module = this.modules.get(token);
        module.addComponent(component);
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
        [...this.modules.values()].forEach((module) => {
            module.replace(toReplace, options);
        });
    }
}
exports.NestContainer = NestContainer;
