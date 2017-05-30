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
 * @deprecated
 * Since version 2.1.2 this decorator is deprecated. Use @UseFilters() instead.
 */
export const ExceptionFilters = (...filters: ExceptionFilter[]) => {
    const logger = new Logger('ExceptionFilters');
    logger.warn('DEPRECATED! Since version 2.1.2 `@ExceptionFilters()` decorator is deprecated. Use `@UseFilters()` instead.');
    return defineFiltersMetadata(...filters);
};

export const UseFilters = (...filters: ExceptionFilter[]) => defineFiltersMetadata(...filters);