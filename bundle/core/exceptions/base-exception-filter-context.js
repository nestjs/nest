"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
require("reflect-metadata");
const context_creator_1 = require("../helpers/context-creator");
class BaseExceptionFilterContext extends context_creator_1.ContextCreator {
    constructor(container) {
        super();
        this.container = container;
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata)) {
            return [];
        }
        return iterare_1.default(metadata)
            .filter(instance => instance && (shared_utils_1.isFunction(instance.catch) || instance.name))
            .map(filter => this.getFilterInstance(filter))
            .map(instance => ({
            func: instance.catch.bind(instance),
            exceptionMetatypes: this.reflectCatchExceptions(instance),
        }))
            .toArray();
    }
    getFilterInstance(filter) {
        const isObject = filter.catch;
        if (isObject) {
            return filter;
        }
        const instanceWrapper = this.getInstanceByMetatype(filter);
        return instanceWrapper && instanceWrapper.instance
            ? instanceWrapper.instance
            : null;
    }
    getInstanceByMetatype(filter) {
        if (!this.moduleContext) {
            return undefined;
        }
        const collection = this.container.getModules();
        const module = collection.get(this.moduleContext);
        if (!module) {
            return undefined;
        }
        return module.injectables.get(filter.name);
    }
    reflectCatchExceptions(instance) {
        const prototype = Object.getPrototypeOf(instance);
        return (Reflect.getMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, prototype.constructor) || []);
    }
}
exports.BaseExceptionFilterContext = BaseExceptionFilterContext;
