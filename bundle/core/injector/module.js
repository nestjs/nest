"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const unknown_export_exception_1 = require("../errors/exceptions/unknown-export.exception");
const application_ref_host_1 = require("../helpers/application-ref-host");
const external_context_creator_1 = require("../helpers/external-context-creator");
const reflector_service_1 = require("../services/reflector.service");
const module_ref_1 = require("./module-ref");
const modules_container_1 = require("./modules-container");
const tokens_1 = require("./tokens");
class Module {
    constructor(_metatype, _scope, container) {
        this._metatype = _metatype;
        this._scope = _scope;
        this.container = container;
        this._relatedModules = new Set();
        this._components = new Map();
        this._injectables = new Map();
        this._routes = new Map();
        this._exports = new Set();
        this.addCoreInjectables(container);
        this._id = random_string_generator_util_1.randomStringGenerator();
    }
    get id() {
        return this._id;
    }
    get scope() {
        return this._scope;
    }
    get relatedModules() {
        return this._relatedModules;
    }
    get components() {
        return this._components;
    }
    get injectables() {
        return this._injectables;
    }
    get routes() {
        return this._routes;
    }
    get exports() {
        return this._exports;
    }
    get instance() {
        if (!this._components.has(this._metatype.name)) {
            throw new runtime_exception_1.RuntimeException();
        }
        const module = this._components.get(this._metatype.name);
        return module.instance;
    }
    get metatype() {
        return this._metatype;
    }
    addCoreInjectables(container) {
        this.addModuleAsComponent();
        this.addModuleRef();
        this.addReflector(container.getReflector());
        this.addApplicationRef(container.getApplicationRef());
        this.addExternalContextCreator(container.getExternalContextCreator());
        this.addModulesContainer(container.getModulesContainer());
        this.addApplicationRefHost(container.getApplicationRefHost());
    }
    addModuleRef() {
        const moduleRef = this.createModuleRefMetatype();
        this._components.set(module_ref_1.ModuleRef.name, {
            name: module_ref_1.ModuleRef.name,
            metatype: module_ref_1.ModuleRef,
            isResolved: true,
            instance: new moduleRef(),
        });
    }
    addModuleAsComponent() {
        this._components.set(this._metatype.name, {
            name: this._metatype.name,
            metatype: this._metatype,
            isResolved: false,
            instance: null,
        });
    }
    addReflector(reflector) {
        this._components.set(reflector_service_1.Reflector.name, {
            name: reflector_service_1.Reflector.name,
            metatype: reflector_service_1.Reflector,
            isResolved: true,
            instance: reflector,
        });
    }
    addApplicationRef(applicationRef) {
        this._components.set(tokens_1.HTTP_SERVER_REF, {
            name: tokens_1.HTTP_SERVER_REF,
            metatype: {},
            isResolved: true,
            instance: applicationRef || {},
        });
    }
    addExternalContextCreator(externalContextCreator) {
        this._components.set(external_context_creator_1.ExternalContextCreator.name, {
            name: external_context_creator_1.ExternalContextCreator.name,
            metatype: external_context_creator_1.ExternalContextCreator,
            isResolved: true,
            instance: externalContextCreator,
        });
    }
    addModulesContainer(modulesContainer) {
        this._components.set(modules_container_1.ModulesContainer.name, {
            name: modules_container_1.ModulesContainer.name,
            metatype: modules_container_1.ModulesContainer,
            isResolved: true,
            instance: modulesContainer,
        });
    }
    addApplicationRefHost(applicationRefHost) {
        this._components.set(application_ref_host_1.ApplicationReferenceHost.name, {
            name: application_ref_host_1.ApplicationReferenceHost.name,
            metatype: application_ref_host_1.ApplicationReferenceHost,
            isResolved: true,
            instance: applicationRefHost,
        });
    }
    addInjectable(injectable) {
        if (this.isCustomProvider(injectable)) {
            return this.addCustomProvider(injectable, this._injectables);
        }
        this._injectables.set(injectable.name, {
            name: injectable.name,
            metatype: injectable,
            instance: null,
            isResolved: false,
        });
    }
    addComponent(component) {
        if (this.isCustomProvider(component)) {
            return this.addCustomProvider(component, this._components);
        }
        this._components.set(component.name, {
            name: component.name,
            metatype: component,
            instance: null,
            isResolved: false,
        });
        return component.name;
    }
    isCustomProvider(component) {
        return !shared_utils_1.isNil(component.provide);
    }
    addCustomProvider(component, collection) {
        const { provide } = component;
        const name = shared_utils_1.isFunction(provide) ? provide.name : provide;
        const componentWithName = Object.assign({}, component, { name });
        if (this.isCustomClass(componentWithName))
            this.addCustomClass(componentWithName, collection);
        else if (this.isCustomValue(componentWithName))
            this.addCustomValue(componentWithName, collection);
        else if (this.isCustomFactory(componentWithName))
            this.addCustomFactory(componentWithName, collection);
        return name;
    }
    isCustomClass(component) {
        return !shared_utils_1.isUndefined(component.useClass);
    }
    isCustomValue(component) {
        return !shared_utils_1.isUndefined(component.useValue);
    }
    isCustomFactory(component) {
        return !shared_utils_1.isUndefined(component.useFactory);
    }
    isDynamicModule(exported) {
        return exported && exported.module;
    }
    addCustomClass(component, collection) {
        const { name, useClass } = component;
        collection.set(name, {
            name,
            metatype: useClass,
            instance: null,
            isResolved: false,
        });
    }
    addCustomValue(component, collection) {
        const { name, useValue: value } = component;
        collection.set(name, {
            name,
            metatype: null,
            instance: value,
            isResolved: true,
            isNotMetatype: true,
            async: value instanceof Promise,
        });
    }
    addCustomFactory(component, collection) {
        const { name, useFactory: factory, inject } = component;
        collection.set(name, {
            name,
            metatype: factory,
            instance: null,
            isResolved: false,
            inject: inject || [],
            isNotMetatype: true,
        });
    }
    addExportedComponent(exportedComponent) {
        const addExportedUnit = (token) => this._exports.add(this.validateExportedProvider(token));
        if (this.isCustomProvider(exportedComponent)) {
            return this.addCustomExportedComponent(exportedComponent);
        }
        else if (shared_utils_1.isString(exportedComponent)) {
            return addExportedUnit(exportedComponent);
        }
        else if (this.isDynamicModule(exportedComponent)) {
            const { module } = exportedComponent;
            return addExportedUnit(module.name);
        }
        addExportedUnit(exportedComponent.name);
    }
    addCustomExportedComponent(exportedComponent) {
        const provide = exportedComponent.provide;
        if (shared_utils_1.isString(provide) || shared_utils_1.isSymbol(provide)) {
            return this._exports.add(this.validateExportedProvider(provide));
        }
        this._exports.add(this.validateExportedProvider(provide.name));
    }
    validateExportedProvider(token) {
        if (this._components.has(token)) {
            return token;
        }
        const importedArray = [...this._relatedModules.values()];
        const importedRefNames = importedArray
            .filter(item => item)
            .map(({ metatype }) => metatype)
            .filter(metatype => metatype)
            .map(({ name }) => name);
        if (!importedRefNames.includes(token)) {
            const { name } = this.metatype;
            throw new unknown_export_exception_1.UnknownExportException(name);
        }
        return token;
    }
    addRoute(route) {
        this._routes.set(route.name, {
            name: route.name,
            metatype: route,
            instance: null,
            isResolved: false,
        });
    }
    addRelatedModule(relatedModule) {
        this._relatedModules.add(relatedModule);
    }
    replace(toReplace, options) {
        if (options.isComponent) {
            return this.addComponent(Object.assign({ provide: toReplace }, options));
        }
        this.addInjectable(Object.assign({ provide: toReplace }, options));
    }
    createModuleRefMetatype() {
        const self = this;
        return class extends module_ref_1.ModuleRef {
            constructor() {
                super(self.container);
            }
            get(typeOrToken, options = { strict: true }) {
                if (!(options && options.strict)) {
                    return this.find(typeOrToken);
                }
                return this.findInstanceByPrototypeOrToken(typeOrToken, self);
            }
        };
    }
}
exports.Module = Module;
