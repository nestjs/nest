import { Controller, PipeTransform, Transform } from '@nestjs/common/interfaces';
import 'reflect-metadata';
import { ApplicationConfig } from '../application-config';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';
export declare class PipesContextCreator extends ContextCreator {
    private readonly container;
    private readonly config;
    private moduleContext;
    constructor(container: NestContainer, config?: ApplicationConfig);
    create(instance: Controller, callback: (...args) => any, module: string): Transform<any>[];
    createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
    getPipeInstance(pipe: Function | PipeTransform): any;
    getInstanceByMetatype(metatype: any): {
        instance: any;
    } | undefined;
    getGlobalMetadata<T extends any[]>(): T;
    setModuleContext(context: string): void;
}
