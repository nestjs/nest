"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
const unknown_module_exception_1 = require("./errors/exceptions/unknown-module.exception");
const module_ref_1 = require("./injector/module-ref");
const module_token_factory_1 = require("./injector/module-token-factory");
class NestApplicationContext extends module_ref_1.ModuleRef {
    constructor(container, scope, contextModule) {
        super(container);
        this.scope = scope;
        this.contextModule = contextModule;
        this.moduleTokenFactory = new module_token_factory_1.ModuleTokenFactory();
    }
    selectContextModule() {
        const modules = this.container.getModules().values();
        this.contextModule = modules.next().value;
    }
    select(module) {
        const modules = this.container.getModules();
        const moduleMetatype = this.contextModule.metatype;
        const scope = this.scope.concat(moduleMetatype);
        const token = this.moduleTokenFactory.create(module, scope);
        const selectedModule = modules.get(token);
        if (!selectedModule) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        return new NestApplicationContext(this.container, scope, selectedModule);
    }
    get(typeOrToken, options = { strict: false }) {
        if (!(options && options.strict)) {
            return this.find(typeOrToken);
        }
        return this.findInstanceByPrototypeOrToken(typeOrToken, this.contextModule);
    }
    async init() {
        await this.callInitHook();
        await this.callBootstrapHook();
        return this;
    }
    async close() {
        await this.callDestroyHook();
    }
    useLogger(logger) {
        common_1.Logger.overrideLogger(logger);
    }
    async callInitHook() {
        const modulesContainer = this.container.getModules();
        for (const module of [...modulesContainer.values()].reverse()) {
            await this.callModuleInitHook(module);
        }
    }
    async callModuleInitHook(module) {
        const components = [...module.components];
        // The Module (class) instance is the first element of the components array
        // Lifecycle hook has to be called once all classes are properly initialized
        const [_, { instance: moduleClassInstance }] = components.shift();
        const instances = [...module.routes, ...components];
        await Promise.all(iterare_1.default(instances)
            .map(([key, { instance }]) => instance)
            .filter(instance => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleInitHook)
            .map(async (instance) => await instance.onModuleInit()));
        if (moduleClassInstance && this.hasOnModuleInitHook(moduleClassInstance)) {
            await moduleClassInstance.onModuleInit();
        }
    }
    hasOnModuleInitHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleInit);
    }
    async callDestroyHook() {
        const modulesContainer = this.container.getModules();
        for (const module of modulesContainer.values()) {
            await this.callModuleDestroyHook(module);
        }
    }
    async callModuleDestroyHook(module) {
        const components = [...module.components];
        // The Module (class) instance is the first element of the components array
        // Lifecycle hook has to be called once all classes are properly destroyed
        const [_, { instance: moduleClassInstance }] = components.shift();
        const instances = [...module.routes, ...components];
        await Promise.all(iterare_1.default(instances)
            .map(([key, { instance }]) => instance)
            .filter(instance => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleDestroyHook)
            .map(async (instance) => await instance.onModuleDestroy()));
        if (moduleClassInstance &&
            this.hasOnModuleDestroyHook(moduleClassInstance)) {
            await moduleClassInstance.onModuleDestroy();
        }
    }
    hasOnModuleDestroyHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleDestroy);
    }
    async callBootstrapHook() {
        const modulesContainer = this.container.getModules();
        for (const module of [...modulesContainer.values()].reverse()) {
            await this.callModuleBootstrapHook(module);
        }
    }
    async callModuleBootstrapHook(module) {
        const components = [...module.components];
        const [_, { instance: moduleClassInstance }] = components.shift();
        const instances = [...module.routes, ...components];
        await Promise.all(iterare_1.default(instances)
            .map(([key, { instance }]) => instance)
            .filter(instance => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleInitHook)
            .map(async (instance) => await instance.onApplicationBootstrap()));
        if (moduleClassInstance && this.hasOnAppBotstrapHook(moduleClassInstance)) {
            await moduleClassInstance.onApplicationBootstrap();
        }
    }
    hasOnAppBotstrapHook(instance) {
        return !shared_utils_1.isUndefined(instance.onApplicationBootstrap);
    }
}
exports.NestApplicationContext = NestApplicationContext;
