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
const iterare_1 = require("iterare");
const module_token_factory_1 = require("./injector/module-token-factory");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const unknown_module_exception_1 = require("./errors/exceptions/unknown-module.exception");
const unknown_element_exception_1 = require("./errors/exceptions/unknown-element.exception");
class NestApplicationContext {
    constructor(container, scope, contextModule) {
        this.container = container;
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
    find(typeOrToken) {
        this.initFlattenModule();
        return this.findInstanceByPrototypeOrToken(typeOrToken, this.contextModuleFixture);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.callInitHook();
            return this;
        });
    }
    callInitHook() {
        return __awaiter(this, void 0, void 0, function* () {
            const modules = this.container.getModules();
            yield Promise.all(iterare_1.default(modules.values()).map((module) => __awaiter(this, void 0, void 0, function* () { return yield this.callModuleInitHook(module); })));
        });
    }
    callModuleInitHook(module) {
        return __awaiter(this, void 0, void 0, function* () {
            const components = [...module.routes, ...module.components];
            yield Promise.all(iterare_1.default(components)
                .map(([key, { instance }]) => instance)
                .filter(instance => !shared_utils_1.isNil(instance))
                .filter(this.hasOnModuleInitHook)
                .map((instance) => __awaiter(this, void 0, void 0, function* () { return yield instance.onModuleInit(); })));
        });
    }
    hasOnModuleInitHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleInit);
    }
    findInstanceByPrototypeOrToken(metatypeOrToken, contextModule) {
        const dependencies = new Map([
            ...contextModule.components,
            ...contextModule.routes,
            ...contextModule.injectables,
        ]);
        const name = shared_utils_1.isFunction(metatypeOrToken)
            ? metatypeOrToken.name
            : metatypeOrToken;
        const instanceWrapper = dependencies.get(name);
        if (!instanceWrapper) {
            throw new unknown_element_exception_1.UnknownElementException();
        }
        return instanceWrapper.instance;
    }
    initFlattenModule() {
        if (this.contextModuleFixture) {
            return undefined;
        }
        const modules = this.container.getModules();
        const initialValue = {
            components: [],
            routes: [],
            injectables: [],
        };
        this.contextModuleFixture = [...modules.values()].reduce((flatten, curr) => ({
            components: [...flatten.components, ...curr.components],
            routes: [...flatten.routes, ...curr.routes],
            injectables: [...flatten.injectables, ...curr.injectables],
        }), initialValue);
    }
}
exports.NestApplicationContext = NestApplicationContext;
