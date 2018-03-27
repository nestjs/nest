"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const extend_metadata_util_1 = require("../../utils/extend-metadata.util");
const shared_utils_1 = require("../../utils/shared.utils");
const validate_each_util_1 = require("../../utils/validate-each.util");
const defineFiltersMetadata = (...filters) => {
    return (target, key, descriptor) => {
        const isFilterValid = (filter) => shared_utils_1.isFunction(filter.catch);
        if (descriptor) {
            validate_each_util_1.validateEach(target.constructor, filters, isFilterValid, '@UseFilters', 'filter');
            extend_metadata_util_1.extendArrayMetadata(constants_1.EXCEPTION_FILTERS_METADATA, filters, descriptor.value);
            return descriptor;
        }
        validate_each_util_1.validateEach(target, filters, isFilterValid, '@UseFilters', 'filter');
        extend_metadata_util_1.extendArrayMetadata(constants_1.EXCEPTION_FILTERS_METADATA, filters, target);
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
