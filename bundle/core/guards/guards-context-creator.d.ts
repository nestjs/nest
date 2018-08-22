import { CanActivate } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';
import 'reflect-metadata';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';
export declare class GuardsContextCreator extends ContextCreator {
    private readonly container;
    private readonly config;
    private moduleContext;
    constructor(container: NestContainer, config?: ConfigurationProvider);
    create(instance: Controller, callback: (...args) => any, module: string): CanActivate[];
    createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
    getGuardInstance(guard: Function | CanActivate): any;
    getInstanceByMetatype(guard: any): {
        instance: any;
    } | undefined;
    getGlobalMetadata<T extends any[]>(): T;
}
