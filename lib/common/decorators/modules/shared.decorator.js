"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const index_1 = require("../../index");
/**
 * Specifies scope of this module. When module is `@Shared()`, Nest will create only one instance of this
 * module and share them between all of the modules.
 * @deprecated
 */
exports.Shared = (scope = 'global') => {
    const logger = new index_1.Logger('Shared');
    logger.warn('DEPRECATED! Since version 4.0.0 `@Shared()` decorator is deprecated. All modules are singletons now.');
    return (target) => {
        const Metatype = target;
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(constants_1.SHARED_MODULE_METADATA, scope, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type;
    };
};
