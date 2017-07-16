"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const exceptions_handler_1 = require("../exceptions/exceptions-handler");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const context_creator_1 = require("./../helpers/context-creator");
class RouterExceptionFilters extends context_creator_1.ContextCreator {
    constructor(config) {
        super();
        this.config = config;
    }
    create(instance, callback) {
        const exceptionHandler = new exceptions_handler_1.ExceptionsHandler();
        const filters = this.createContext(instance, callback, constants_1.EXCEPTION_FILTERS_METADATA);
        if (shared_utils_1.isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters);
        return exceptionHandler;
    }
    getGlobalMetadata() {
        return this.config.getGlobalFilters();
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata)) {
            return [];
        }
        return iterare_1.default(metadata)
            .filter((instance) => instance.catch && shared_utils_1.isFunction(instance.catch))
            .map((instance) => ({
            func: instance.catch.bind(instance),
            exceptionMetatypes: this.reflectCatchExceptions(instance),
        }))
            .toArray();
    }
    reflectCatchExceptions(instance) {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, prototype.constructor) || [];
    }
}
exports.RouterExceptionFilters = RouterExceptionFilters;
//# sourceMappingURL=router-exception-filters.js.map