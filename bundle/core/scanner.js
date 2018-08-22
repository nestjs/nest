"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("reflect-metadata");
const application_config_1 = require("./application-config");
const constants_2 = require("./constants");
const circular_dependency_exception_1 = require("./errors/exceptions/circular-dependency.exception");
class DependenciesScanner {
    constructor(container, metadataScanner, applicationConfig = new application_config_1.ApplicationConfig()) {
        this.container = container;
        this.metadataScanner = metadataScanner;
        this.applicationConfig = applicationConfig;
        this.applicationProvidersApplyMap = [];
    }
    async scan(module) {
        await this.scanForModules(module);
        await this.scanModulesForDependencies();
        this.container.bindGlobalScope();
    }
    async scanForModules(module, scope = []) {
        await this.storeModule(module, scope);
        const modules = !this.isDynamicModule(module)
            ? this.reflectMetadata(module, constants_1.metadata.MODULES)
            : [
                ...this.reflectMetadata(module.module, constants_1.metadata.MODULES),
                ...(module.imports || []),
            ];
        for (const innerModule of modules) {
            await this.scanForModules(innerModule, [].concat(scope, module));
        }
    }
    async storeModule(module, scope) {
        if (module && module.forwardRef) {
            return await this.container.addModule(module.forwardRef(), scope);
        }
        await this.container.addModule(module, scope);
    }
    async scanModulesForDependencies() {
        const modules = this.container.getModules();
        for (const [token, { metatype }] of modules) {
            await this.reflectRelatedModules(metatype, token, metatype.name);
            this.reflectComponents(metatype, token);
            this.reflectControllers(metatype, token);
            this.reflectExports(metatype, token);
        }
    }
    async reflectRelatedModules(module, token, context) {
        const modules = [
            ...this.reflectMetadata(module, constants_1.metadata.MODULES),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.MODULES),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.IMPORTS),
        ];
        for (const related of modules) {
            await this.storeRelatedModule(related, token, context);
        }
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
        this.reflectGatewaysMiddleware(component, token);
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
        this.reflectParamInjectables(obj, token, constants_1.ROUTE_ARGS_METADATA);
    }
    reflectExports(module, token) {
        const exports = [
            ...this.reflectMetadata(module, constants_1.metadata.EXPORTS),
            ...this.container.getDynamicMetadataByToken(token, constants_1.metadata.EXPORTS),
        ];
        exports.map(exportedComponent => this.storeExportedComponent(exportedComponent, token));
    }
    reflectGatewaysMiddleware(component, token) {
        const middleware = this.reflectMetadata(component, constants_1.GATEWAY_MIDDLEWARES);
        middleware.map(ware => this.storeComponent(ware, token));
    }
    reflectInjectables(component, token, metadataKey) {
        const controllerInjectables = this.reflectMetadata(component, metadataKey);
        const methodsInjectables = this.metadataScanner.scanFromPrototype(null, component.prototype, this.reflectKeyMetadata.bind(this, component, metadataKey));
        const flattenMethodsInjectables = methodsInjectables.reduce((a, b) => a.concat(b), []);
        const mergedInjectables = [
            ...controllerInjectables,
            ...flattenMethodsInjectables,
        ].filter(shared_utils_1.isFunction);
        mergedInjectables.map(injectable => this.storeInjectable(injectable, token));
    }
    reflectParamInjectables(component, token, metadataKey) {
        const paramsMetadata = this.metadataScanner.scanFromPrototype(null, component.prototype, method => Reflect.getMetadata(metadataKey, component, method));
        const flatten = arr => arr.reduce((a, b) => a.concat(b), []);
        const paramsInjectables = flatten(paramsMetadata).map(param => flatten(Object.keys(param).map(k => param[k].pipes)).filter(shared_utils_1.isFunction));
        flatten(paramsInjectables).map(injectable => this.storeInjectable(injectable, token));
    }
    reflectKeyMetadata(component, key, method) {
        let prototype = component.prototype;
        do {
            const descriptor = Reflect.getOwnPropertyDescriptor(prototype, method);
            if (!descriptor) {
                continue;
            }
            return Reflect.getMetadata(key, descriptor.value);
        } while (
        // tslint:disable-next-line:no-conditional-assignment
        (prototype = Reflect.getPrototypeOf(prototype)) &&
            prototype !== Object.prototype &&
            prototype);
        return undefined;
    }
    async storeRelatedModule(related, token, context) {
        if (shared_utils_1.isUndefined(related)) {
            throw new circular_dependency_exception_1.CircularDependencyException(context);
        }
        if (related && related.forwardRef) {
            return await this.container.addRelatedModule(related.forwardRef(), token);
        }
        await this.container.addRelatedModule(related, token);
    }
    storeComponent(component, token) {
        const isCustomProvider = component && !shared_utils_1.isNil(component.provide);
        if (!isCustomProvider) {
            return this.container.addComponent(component, token);
        }
        const applyProvidersMap = this.getApplyProvidersMap();
        const providersKeys = Object.keys(applyProvidersMap);
        const type = component.provide;
        if (providersKeys.indexOf(type) < 0) {
            return this.container.addComponent(component, token);
        }
        const providerToken = random_string_generator_util_1.randomStringGenerator();
        this.applicationProvidersApplyMap.push({
            type,
            moduleKey: token,
            providerKey: providerToken,
        });
        this.container.addComponent(Object.assign({}, component, { provide: providerToken }), token);
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
    reflectMetadata(metatype, metadataKey) {
        return Reflect.getMetadata(metadataKey, metatype) || [];
    }
    applyApplicationProviders() {
        const applyProvidersMap = this.getApplyProvidersMap();
        this.applicationProvidersApplyMap.forEach(({ moduleKey, providerKey, type }) => {
            const modules = this.container.getModules();
            const { components } = modules.get(moduleKey);
            const { instance } = components.get(providerKey);
            applyProvidersMap[type](instance);
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
    isDynamicModule(module) {
        return module && !!module.module;
    }
}
exports.DependenciesScanner = DependenciesScanner;
