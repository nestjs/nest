"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const context_creator_1 = require("./../helpers/context-creator");
class BaseExceptionFilterContext extends context_creator_1.ContextCreator {
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
exports.BaseExceptionFilterContext = BaseExceptionFilterContext;
