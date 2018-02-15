"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
const application_config_1 = require("./application-config");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_2 = require("./constants");
class DependenciesScanner {
    constructor(container, metadataScanner, applicationConfig = new application_config_1.ApplicationConfig()) {
        this.container = container;
        this.metadataScanner = metadataScanner;
        this.applicationConfig = applicationConfig;
        this.applicationProvidersApplyMap = [];
    }
    scan(module) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
        this.container.bindGlobalScope();
    }
    scanForModules(module, scope = []) {
        this.storeModule(module, scope);
        const importedModules = this.reflectMetadata(module, constants_1.metadata.MODULES);
        importedModules.map(innerModule => {
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
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.IMPORTS),
        ];
        modules.map(related => this.storeRelatedModule(related, token));
    }
    reflectComponents(module, token) {
        const components = [
            ...this.reflectMetadata(module, constants_1.metadata.COMPONENTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.COMPONENTS),
        ];
        components.map(component => {
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
        routes.map(route => {
            this.storeRoute(route, token);
            this.reflectDynamicMetadata(route, token);
        });
    }
    reflectDynamicMetadata(obj, token) {
        if (!obj || !obj.prototype) {
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
        exports.map(exportedComponent => this.storeExportedComponent(exportedComponent, token));
    }
    reflectGatewaysMiddlewares(component, token) {
        const middlewares = this.reflectMetadata(component, constants_1.GATEWAY_MIDDLEWARES);
        middlewares.map(middleware => this.storeComponent(middleware, token));
    }
    reflectGuards(component, token) {
        const controllerGuards = this.reflectMetadata(component, constants_1.GUARDS_METADATA);
        const methodsGuards = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, constants_1.GUARDS_METADATA));
        const flattenMethodsGuards = methodsGuards.reduce((a, b) => a.concat(b), []);
        [...controllerGuards, ...flattenMethodsGuards].map(guard => this.storeInjectable(guard, token));
    }
    reflectInterceptors(component, token) {
        const controllerInterceptors = this.reflectMetadata(component, constants_1.INTERCEPTORS_METADATA);
        const methodsInterceptors = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, constants_1.INTERCEPTORS_METADATA));
        const flattenMethodsInterceptors = methodsInterceptors.reduce((a, b) => a.concat(b), []);
        [...controllerInterceptors, ...flattenMethodsInterceptors].map(guard => this.storeInjectable(guard, token));
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
        const isCustomProvider = component && !shared_utils_1.isNil(component.provide);
        if (!isCustomProvider) {
            return this.container.addComponent(component, token);
        }
        const applyProvidersMap = this.getApplyProvidersMap();
        const providersKeys = Object.keys(applyProvidersMap);
        const providerToken = component.provide;
        if (providersKeys.indexOf(providerToken) < 0) {
            return this.container.addComponent(component, token);
        }
        this.applicationProvidersApplyMap.push({
            moduleToken: token,
            providerToken,
        });
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
    applyApplicationProviders() {
        const applyProvidersMap = this.getApplyProvidersMap();
        this.applicationProvidersApplyMap.forEach(({ moduleToken, providerToken }) => {
            const modules = this.container.getModules();
            const { components } = modules.get(moduleToken);
            const { instance } = components.get(providerToken);
            applyProvidersMap[providerToken](instance);
        });
    }
    getApplyProvidersMap() {
        return {
            [constants_2.APP_INTERCEPTOR]: interceptor => this.applicationConfig.addGlobalInterceptor(interceptor),
            [constants_2.APP_PIPE]: pipe => this.applicationConfig.addGlobalPipe(pipe),
            [constants_2.APP_GUARD]: guard => this.applicationConfig.addGlobalGuard(guard),
            [constants_2.APP_FILTER]: filter => this.applicationConfig.addGlobalFilter(filter),
        };
    }
}
exports.DependenciesScanner = DependenciesScanner;
