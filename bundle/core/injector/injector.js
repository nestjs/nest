"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const unknown_dependencies_exception_1 = require("../errors/exceptions/unknown-dependencies.exception");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/common/constants");
const undefined_dependency_exception_1 = require("./../errors/exceptions/undefined-dependency.exception");
class Injector {
    loadInstanceOfMiddleware(wrapper, collection, module) {
        return __awaiter(this, void 0, void 0, function* () {
            const { metatype } = wrapper;
            const currentMetatype = collection.get(metatype.name);
            if (currentMetatype.instance !== null)
                return;
            yield this.resolveConstructorParams(wrapper, module, null, null, instances => {
                collection.set(metatype.name, {
                    instance: new metatype(...instances),
                    metatype,
                });
            });
        });
    }
    loadInstanceOfRoute(wrapper, module) {
        return __awaiter(this, void 0, void 0, function* () {
            const routes = module.routes;
            yield this.loadInstance(wrapper, routes, module);
        });
    }
    loadInstanceOfInjectable(wrapper, module) {
        return __awaiter(this, void 0, void 0, function* () {
            const injectables = module.injectables;
            yield this.loadInstance(wrapper, injectables, module);
        });
    }
    loadPrototypeOfInstance({ metatype, name }, collection) {
        if (!collection)
            return null;
        const target = collection.get(name);
        if (target.isResolved || !shared_utils_1.isNil(target.inject) || !metatype.prototype)
            return null;
        collection.set(name, Object.assign({}, collection.get(name), { instance: Object.create(metatype.prototype) }));
    }
    loadInstanceOfComponent(wrapper, module, context = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const components = module.components;
            yield this.loadInstance(wrapper, components, module, context);
        });
    }
    applyDoneSubject(wrapper) {
        let done;
        wrapper.done$ = new Promise((resolve, reject) => {
            done = resolve;
        });
        wrapper.isPending = true;
        return done;
    }
    loadInstance(wrapper, collection, module, context = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (wrapper.isPending) {
                return yield wrapper.done$;
            }
            const done = this.applyDoneSubject(wrapper);
            const { metatype, name, inject } = wrapper;
            const currentMetatype = collection.get(name);
            if (shared_utils_1.isUndefined(currentMetatype)) {
                throw new runtime_exception_1.RuntimeException();
            }
            if (currentMetatype.isResolved)
                return null;
            yield this.resolveConstructorParams(wrapper, module, inject, context, (instances) => __awaiter(this, void 0, void 0, function* () {
                if (shared_utils_1.isNil(inject)) {
                    currentMetatype.instance = Object.assign(currentMetatype.instance, new metatype(...instances));
                }
                else {
                    const factoryResult = currentMetatype.metatype(...instances);
                    currentMetatype.instance = yield this.resolveFactoryInstance(factoryResult);
                }
                currentMetatype.isResolved = true;
                done();
            }));
        });
    }
    resolveConstructorParams(wrapper, module, inject, context, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            let isResolved = true;
            const args = shared_utils_1.isNil(inject)
                ? this.reflectConstructorParams(wrapper.metatype)
                : inject;
            const instances = yield Promise.all(args.map((param, index) => __awaiter(this, void 0, void 0, function* () {
                const paramWrapper = yield this.resolveSingleParam(wrapper, param, { index, length: args.length }, module, context);
                if (!paramWrapper.isResolved && !paramWrapper.forwardRef) {
                    isResolved = false;
                }
                return paramWrapper.instance;
            })));
            isResolved && (yield callback(instances));
        });
    }
    reflectConstructorParams(type) {
        const paramtypes = Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, type) || [];
        const selfParams = this.reflectSelfParams(type);
        selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
        return paramtypes;
    }
    reflectSelfParams(type) {
        return Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, type) || [];
    }
    resolveSingleParam(wrapper, param, { index, length }, module, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shared_utils_1.isUndefined(param)) {
                throw new undefined_dependency_exception_1.UndefinedDependencyException(wrapper.name, index, length);
            }
            const token = this.resolveParamToken(wrapper, param);
            return yield this.resolveComponentInstance(module, shared_utils_1.isFunction(token) ? token.name : token, { index, length }, wrapper, context);
        });
    }
    resolveParamToken(wrapper, param) {
        if (!param.forwardRef) {
            return param;
        }
        wrapper.forwardRef = true;
        return param.forwardRef();
    }
    resolveComponentInstance(module, name, { index, length }, wrapper, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const components = module.components;
            const instanceWrapper = yield this.scanForComponent(components, module, { name, index, length }, wrapper, context);
            if (!instanceWrapper.isResolved && !instanceWrapper.forwardRef) {
                yield this.loadInstanceOfComponent(instanceWrapper, module);
            }
            if (instanceWrapper.async) {
                instanceWrapper.instance = yield instanceWrapper.instance;
            }
            return instanceWrapper;
        });
    }
    scanForComponent(components, module, { name, index, length }, { metatype }, context = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const component = yield this.scanForComponentInScopes(context, { name, index, length }, metatype);
            if (component) {
                return component;
            }
            const scanInExports = () => this.scanForComponentInExports(components, { name, index, length }, module, metatype, context);
            return components.has(name) ? components.get(name) : yield scanInExports();
        });
    }
    scanForComponentInExports(components, { name, index, length }, module, metatype, context = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const instanceWrapper = yield this.scanForComponentInRelatedModules(module, name, context);
            if (shared_utils_1.isNil(instanceWrapper)) {
                throw new unknown_dependencies_exception_1.UnknownDependenciesException(metatype.name, index, length);
            }
            return instanceWrapper;
        });
    }
    scanForComponentInScopes(context, { name, index, length }, metatype) {
        return __awaiter(this, void 0, void 0, function* () {
            context = context || [];
            for (const ctx of context) {
                const component = yield this.scanForComponentInScope(ctx, { name, index, length }, metatype);
                if (component)
                    return component;
            }
            return null;
        });
    }
    scanForComponentInScope(context, { name, index, length }, metatype) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const component = yield this.scanForComponent(context.components, context, { name, index, length }, { metatype }, null);
                if (!component.isResolved && !component.forwardRef) {
                    yield this.loadInstanceOfComponent(component, context);
                }
                return component;
            }
            catch (e) {
                if (e instanceof runtime_exception_1.RuntimeException) {
                    return null;
                }
                throw e;
            }
        });
    }
    scanForComponentInRelatedModules(module, name, context) {
        return __awaiter(this, void 0, void 0, function* () {
            let component = null;
            const relatedModules = module.relatedModules || [];
            for (const relatedModule of this.flatMap([...relatedModules.values()])) {
                const { components, exports } = relatedModule;
                const isInScope = context === null;
                if ((!exports.has(name) && !isInScope) || !components.has(name)) {
                    continue;
                }
                component = components.get(name);
                if (!component.isResolved && !component.forwardRef) {
                    const ctx = isInScope ? [module] : [].concat(context, module);
                    yield this.loadInstanceOfComponent(component, relatedModule, ctx);
                    break;
                }
            }
            return component;
        });
    }
    resolveFactoryInstance(factoryResult) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(factoryResult instanceof Promise)) {
                return factoryResult;
            }
            const result = yield factoryResult;
            return result;
        });
    }
    flatMap(modules) {
        return modules.concat.apply(modules, modules.map((module) => {
            const { relatedModules, exports } = module;
            return this.flatMap([...relatedModules.values()]
                .filter(related => !!related)
                .filter(related => {
                const { metatype } = related;
                return exports.has(metatype.name);
            }));
        }));
    }
}
exports.Injector = Injector;
