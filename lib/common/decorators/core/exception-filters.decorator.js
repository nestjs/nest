"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
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
/**
 * Setups exception filters to the chosen context.
 * When the `@UseFilters()` is used on the controller level:
 * - Exception Filter will be set up to every handler (every method)
 *
 * When the `@UseFilters()` is used on the handle level:
 * - Exception Filter will be set up only to specified method
 *
 * @param  {ExceptionFilter[]} ...filters (instances)
 */
exports.UseFilters = (...filters) => defineFiltersMetadata(...filters);
