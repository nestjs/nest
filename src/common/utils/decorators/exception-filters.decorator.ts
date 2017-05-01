import 'reflect-metadata';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';

export const ExceptionFilters = (...filters): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
    };
};
