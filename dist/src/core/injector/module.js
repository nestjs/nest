"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unknown_export_exception_1 = require("../errors/exceptions/unknown-export.exception");
const module_ref_1 = require("./module-ref");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
class Module {
    constructor(_metatype, _scope) {
        this._metatype = _metatype;
        this._scope = _scope;
        this._relatedModules = new Set();
        this._components = new Map();
        this._injectables = new Map();
        this._routes = new Map();
        this._exports = new Set();
        this.addModuleRef();
        this.addModuleAsComponent();
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
    addModuleRef() {
        const moduleRef = this.getModuleRefMetatype(this._components);
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
    addInjectable(injectable) {
        this._injectables.set(injectable.name, {
            name: injectable.name,
            metatype: injectable,
            instance: null,
            isResolved: false,
        });
    }
    addComponent(component) {
        if (this.isCustomComponent(component)) {
            this.addCustomComponent(component);
            return;
        }
        this._components.set(component.name, {
            name: component.name,
            metatype: component,
            instance: null,
            isResolved: false,
        });
    }
    isCustomComponent(component) {
        return !shared_utils_1.isNil(component.provide);
    }
    addCustomComponent(component) {
        const { provide } = component;
        const name = shared_utils_1.isFunction(provide) ? provide.name : provide;
        const comp = Object.assign({}, component, { name });
        if (this.isCustomClass(comp))
            this.addCustomClass(comp);
        else if (this.isCustomValue(comp))
            this.addCustomValue(comp);
        else if (this.isCustomFactory(comp))
            this.addCustomFactory(comp);
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
    addCustomClass(component) {
        const { provide, name, useClass } = component;
        this._components.set(name, {
            name,
            metatype: useClass,
            instance: null,
            isResolved: false,
        });
    }
    addCustomValue(component) {
        const { provide, name, useValue: value } = component;
        this._components.set(name, {
            name,
            metatype: null,
            instance: value,
            isResolved: true,
            isNotMetatype: true,
            async: value instanceof Promise,
        });
    }
    addCustomFactory(component) {
        const { provide, name, useFactory: factory, inject } = component;
        this._components.set(name, {
            name,
            metatype: factory,
            instance: null,
            isResolved: false,
            inject: inject || [],
            isNotMetatype: true,
        });
    }
    addExportedComponent(exportedComponent) {
        if (this.isCustomComponent(exportedComponent)) {
            this.addCustomExportedComponent(exportedComponent);
            return;
        }
        if (!this._components.get(exportedComponent.name)) {
            throw new unknown_export_exception_1.UnknownExportException(exportedComponent.name);
        }
        this._exports.add(exportedComponent.name);
    }
    addCustomExportedComponent(exportedComponent) {
        this._exports.add(exportedComponent.provide);
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
    getModuleRefMetatype(components) {
        return class {
            constructor() {
                this.components = components;
            }
            get(type) {
                const name = shared_utils_1.isFunction(type) ? type.name : type;
                const exists = this.components.has(name);
                return exists ? this.components.get(name).instance : null;
            }
        };
    }
}
exports.Module = Module;
//# sourceMappingURL=module.js.map