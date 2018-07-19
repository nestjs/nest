import { ExceptionFilter } from '@nestjs/common/interfaces/exceptions/exception-filter.interface';
import { Type } from '@nestjs/common/interfaces/index';
import 'reflect-metadata';
import { NestContainer } from '../injector/container';
import { ContextCreator } from './../helpers/context-creator';
export declare class BaseExceptionFilterContext extends ContextCreator {
    private readonly container;
    protected moduleContext: string;
    constructor(container: NestContainer);
    createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
    getFilterInstance(filter: Function | ExceptionFilter): any;
    getInstanceByMetatype(filter: any): {
        instance: any;
    } | undefined;
    reflectCatchExceptions(instance: ExceptionFilter): Type<any>[];
}
