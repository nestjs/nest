"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
const application_config_1 = require("./application-config");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_2 = require("./constants");
const circular_dependency_exception_1 = require("./errors/exceptions/circular-dependency.exception");
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
            this.reflectRelatedModules(metatype, token, metatype.name);
            this.reflectComponents(metatype, token);
            this.reflectControllers(metatype, token);
            this.reflectExports(metatype, token);
        });
    }
    reflectRelatedModules(module, token, context) {
        const modules = [
            ...this.reflectMetadata(module, constants_1.metadata.MODULES),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.MODULES),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.IMPORTS),
        ];
        modules.map(related => this.storeRelatedModule(related, token, context));
    }
    reflectComponents(module, token) {
        const components = [
            ...this.reflectMetadata(module, constants_1.metadata.COMPONENTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.COMPONENTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.PROVIDERS),
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
        this.reflectInjectables(obj, token, constants_1.GUARDS_METADATA);
        this.reflectInjectables(obj, token, constants_1.INTERCEPTORS_METADATA);
        this.reflectInjectables(obj, token, constants_1.EXCEPTION_FILTERS_METADATA);
        this.reflectInjectables(obj, token, constants_1.PIPES_METADATA);
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
    reflectInjectables(component, token, metadataKey) {
        const controllerInjectables = this.reflectMetadata(component, metadataKey);
        const methodsInjectables = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, metadataKey));
        const flattenMethodsInjectables = methodsInjectables.reduce((a, b) => a.concat(b), []);
        const mergedInjectableConstructors = [
            ...controllerInjectables,
            ...flattenMethodsInjectables,
        ].filter(shared_utils_1.isFunction);
        mergedInjectableConstructors.map(injectable => this.storeInjectable(injectable, token));
    }
    reflectKeyMetadata(component, key, method) {
        const descriptor = Reflect.getOwnPropertyDescriptor(component.prototype, method);
        return descriptor ? Reflect.getMetadata(key, descriptor.value) : undefined;
    }
    storeRelatedModule(related, token, context) {
        if (shared_utils_1.isUndefined(related)) {
            throw new circular_dependency_exception_1.CircularDependencyException(context);
        }
        if (related && related.forwardRef) {
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
