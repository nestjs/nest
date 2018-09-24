import 'reflect-metadata';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { ExceptionFilter } from '../../index';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { isFunction } from '../../utils/shared.utils';
import { validateEach } from '../../utils/validate-each.util';

const defineFiltersMetadata = (...filters: (Function | ExceptionFilter)[]) => {
  return (target: any, key?, descriptor?) => {
    const isFilterValid = filter =>
      filter && (isFunction(filter) || isFunction(filter.catch));

    if (descriptor) {
      validateEach(
        target.constructor,
        filters,
        isFilterValid,
        '@UseFilters',
        'filter',
      );
      extendArrayMetadata(
        EXCEPTION_FILTERS_METADATA,
        filters,
        descriptor.value,
      );
      return descriptor;
    }
    validateEach(target, filters, isFilterValid, '@UseFilters', 'filter');
    extendArrayMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
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
 * @param  {ExceptionFilter[]} ...filters
 */
export const UseFilters = (...filters: (ExceptionFilter | Function)[]) =>
  defineFiltersMetadata(...filters);
