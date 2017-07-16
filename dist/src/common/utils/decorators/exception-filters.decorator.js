"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const common_1 = require("@nestjs/common");
const defineFiltersMetadata = (...filters) => {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.EXCEPTION_FILTERS_METADATA, filters, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.EXCEPTION_FILTERS_METADATA, filters, target);
        return target;
    };
};
exports.ExceptionFilters = (...filters) => {
    const logger = new common_1.Logger('ExceptionFilters');
    logger.warn('DEPRECATED! Since version 2.1.2 `@ExceptionFilters()` decorator is deprecated. Use `@UseFilters()` instead.');
    return defineFiltersMetadata(...filters);
};
exports.UseFilters = (...filters) => defineFiltersMetadata(...filters);
//# sourceMappingURL=exception-filters.decorator.js.map