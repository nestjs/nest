import 'reflect-metadata';
import { Controller, NestInterceptor } from '@nestjs/common/interfaces';
import { ContextCreator } from './../helpers/context-creator';
import { NestContainer } from '../injector/container';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';
export declare class InterceptorsContextCreator extends ContextCreator {
    private readonly container;
    private readonly config;
    private moduleContext;
    constructor(container: NestContainer, config?: ConfigurationProvider);
    create(instance: Controller, callback: (...args) => any, module: string): NestInterceptor[];
    createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
    getInterceptorInstance(interceptor: Function | NestInterceptor): any;
    getInstanceByMetatype(metatype: any): {
        instance: any;
    } | undefined;
    getGlobalMetadata<T extends any[]>(): T;
}
