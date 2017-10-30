import 'reflect-metadata';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { Logger } from '@nestjs/common';
import { ExceptionFilter } from '../../index';

const defineFiltersMetadata = (...filters: ExceptionFilter[]) => {
    return (target: object, key?, descriptor?) => {
        if (descriptor) {
            Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
        return target;
    };
};

/**
 * Setups exception filters to the chosen context.
 * When the `@UseFilters()` is used on the controller level:
 * - Exception Filter will be setuped to the every handler (every method)
 *
 * When the `@UseFilters()` is used on the handle level:
 * - Exception Filter will be setuped only to specified method
 *
 * @param  {ExceptionFilter[]} ...filters (instances)
 */
export const UseFilters = (...filters: ExceptionFilter[]) => defineFiltersMetadata(...filters);