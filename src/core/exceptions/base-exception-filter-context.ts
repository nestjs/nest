import iterate from 'iterare';
import 'reflect-metadata';
import { ApplicationConfig } from '../application-config';
import { EXCEPTION_FILTERS_METADATA, FILTER_CATCH_EXCEPTIONS } from '../constants';
import { UnknownModuleException } from '../errors/exceptions/unknown-module.exception';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { ContextCreator } from '../helpers/context-creator';
import { Controller } from '../interfaces/controllers/controller.interface';
import { ExceptionFilterMetadata } from '../interfaces/exceptions/exception-filter-metadata.interface';
import { ExceptionFilter } from '../interfaces/exceptions/exception-filter.interface';
import { Metatype } from '../interfaces/metatype.interface';
import { RouterProxyCallback } from '../router/router-proxy';
import { isEmpty, isFunction, isUndefined } from '../utils/shared.utils';

export class BaseExceptionFilterContext extends ContextCreator {
    public createConcreteContext<T extends any[], R extends any[]>(metadata: T): R {
        if (isUndefined(metadata) || isEmpty(metadata)) {
            return [] as R;
        }
        return iterate(metadata)
            .filter((instance) => instance.catch && isFunction(instance.catch))
            .map((instance) => ({
                func: instance.catch.bind(instance),
                exceptionMetatypes: this.reflectCatchExceptions(instance),
            }))
            .toArray() as R;
    }

    public reflectCatchExceptions(instance: ExceptionFilter): Metatype<any>[] {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, prototype.constructor) || [];
    }
}
