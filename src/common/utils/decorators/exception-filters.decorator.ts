import 'reflect-metadata';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { Logger } from '@nestjs/common';

const defineFiltersMetadata = (...filters) => {
    return (target: object) => {
        Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
    };
};

/**
 * @deprecated
 * Since version 2.1.2 this decorator is deprecated. Use @UseFilters() instead.
 */
export const ExceptionFilters = (...filters): ClassDecorator => {
    const logger = new Logger('ExceptionFilters');
    logger.warn('DEPRECATED! Since version 2.1.2 `@ExceptionFilters()` decorator is deprecated. Use `@UseFilters()` instead.');
    return defineFiltersMetadata(...filters);
};

export const UseFilters = (...filters): ClassDecorator => defineFiltersMetadata(...filters);