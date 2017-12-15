"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
class DependenciesScanner {
    constructor(container, metadataScanner) {
        this.container = container;
        this.metadataScanner = metadataScanner;
    }
    scan(module) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
        this.container.bindGlobalScope();
    }
    scanForModules(module, scope = []) {
        this.storeModule(module, scope);
        const importedModules = this.reflectMetadata(module, constants_1.metadata.MODULES);
        importedModules.map((innerModule) => {
            this.scanForModules(innerModule, [].concat(scope, module));
        });
    }
    storeModule(module, scope) {
        if (module && module.forwardRef) {
            return this.container.addModule(module.forwardRef(), scope);
        }
        this.container.addModule(module, scope);
    }
    scanModulesForDependencies() {
        const modules = this.container.getModules();
        modules.forEach(({ metatype }, token) => {
            this.reflectRelatedModules(metatype, token);
            this.reflectComponents(metatype, token);
            this.reflectControllers(metatype, token);
            this.reflectExports(metatype, token);
        });
    }
    reflectRelatedModules(module, token) {
        const modules = [
            ...this.reflectMetadata(module, constants_1.metadata.MODULES),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.MODULES),
        ];
        modules.map((related) => this.storeRelatedModule(related, token));
    }
    reflectComponents(module, token) {
        const components = [
            ...this.reflectMetadata(module, constants_1.metadata.COMPONENTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.COMPONENTS),
        ];
        components.map((component) => {
            this.storeComponent(component, token);
            this.reflectComponentMetadata(component, token);
            this.reflectDynamicMetadata(component, token);
        });
    }
    reflectComponentMetadata(component, token) {
        this.reflectGatewaysMiddlewares(component, token);
    }
    reflectControllers(module, token) {
        const routes = [
            ...this.reflectMetadata(module, constants_1.metadata.CONTROLLERS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.CONTROLLERS),
        ];
        routes.map((route) => {
            this.storeRoute(route, token);
            this.reflectDynamicMetadata(route, token);
        });
    }
    reflectDynamicMetadata(obj, token) {
        if (!obj.prototype) {
            return;
        }
        this.reflectGuards(obj, token);
        this.reflectInterceptors(obj, token);
    }
    reflectExports(module, token) {
        const exports = [
            ...this.reflectMetadata(module, constants_1.metadata.EXPORTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.EXPORTS),
        ];
        exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, token));
    }
    reflectGatewaysMiddlewares(component, token) {
        const middlewares = this.reflectMetadata(component, constants_1.GATEWAY_MIDDLEWARES);
        middlewares.map((middleware) => this.storeComponent(middleware, token));
    }
    reflectGuards(component, token) {
        const controllerGuards = this.reflectMetadata(component, constants_1.GUARDS_METADATA);
        const methodsGuards = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, constants_1.GUARDS_METADATA));
        const flattenMethodsGuards = methodsGuards.reduce((a, b) => a.concat(b), []);
        [...controllerGuards, ...flattenMethodsGuards].map((guard) => this.storeInjectable(guard, token));
    }
    reflectInterceptors(component, token) {
        const controllerInterceptors = this.reflectMetadata(component, constants_1.INTERCEPTORS_METADATA);
        const methodsInterceptors = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, constants_1.INTERCEPTORS_METADATA));
        const flattenMethodsInterceptors = methodsInterceptors.reduce((a, b) => a.concat(b), []);
        [...controllerInterceptors, ...flattenMethodsInterceptors].map((guard) => this.storeInjectable(guard, token));
    }
    reflectKeyMetadata(component, key, method) {
        const descriptor = Reflect.getOwnPropertyDescriptor(component.prototype, method);
        return descriptor ? Reflect.getMetadata(key, descriptor.value) : undefined;
    }
    storeRelatedModule(related, token) {
        if (related.forwardRef) {
            return this.container.addRelatedModule(related.forwardRef(), token);
        }
        this.container.addRelatedModule(related, token);
    }
    storeComponent(component, token) {
        this.container.addComponent(component, token);
    }
    storeInjectable(component, token) {
        this.container.addInjectable(component, token);
    }
    storeExportedComponent(exportedComponent, token) {
        this.container.addExportedComponent(exportedComponent, token);
    }
    storeRoute(route, token) {
        this.container.addController(route, token);
    }
    reflectMetadata(metatype, metadata) {
        return Reflect.getMetadata(metadata, metatype) || [];
    }
}
exports.DependenciesScanner = DependenciesScanner;
