"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_token_factory_1 = require("./injector/module-token-factory");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class NestApplicationContext {
    constructor(container, scope, contextModule) {
        this.container = container;
        this.scope = scope;
        this.contextModule = contextModule;
        this.moduleTokenFactory = new module_token_factory_1.ModuleTokenFactory();
    }
    select(module) {
        const modules = this.container.getModules();
        const moduleMetatype = this.contextModule.metatype;
        const scope = this.scope.concat(moduleMetatype);
        const token = this.moduleTokenFactory.create(module, scope);
        const selectedModule = modules.get(token);
        return selectedModule
            ? new NestApplicationContext(this.container, scope, selectedModule)
            : null;
    }
    get(metatypeOrToken) {
        return this.findInstanceByPrototypeOrToken(metatypeOrToken);
    }
    findInstanceByPrototypeOrToken(metatypeOrToken) {
        const dependencies = new Map([
            ...this.contextModule.components,
            ...this.contextModule.routes,
            ...this.contextModule.injectables,
        ]);
        const name = shared_utils_1.isFunction(metatypeOrToken) ? metatypeOrToken.name : metatypeOrToken;
        const instanceWrapper = dependencies.get(name);
        return instanceWrapper
            ? instanceWrapper.instance
            : null;
    }
}
exports.NestApplicationContext = NestApplicationContext;
