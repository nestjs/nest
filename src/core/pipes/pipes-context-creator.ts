import iterate from 'iterare';
import 'reflect-metadata';
import { PIPES_METADATA } from '../constants';
import { isEmpty, isFunction, isUndefined } from '../utils/shared.utils';
import { ApplicationConfig } from './../application-config';
import { ContextCreator } from './../helpers/context-creator';
import { Controller } from './../interfaces/controllers/controller.interface';
import { PipeTransform, Transform } from './../interfaces/pipe-transform.interface';

export class PipesContextCreator extends ContextCreator {
    constructor(private readonly config?: ApplicationConfig) {
        super();
    }

    public create(instance: Controller, callback: (...args) => any): Transform<any>[] {
        return this.createContext(instance, callback, PIPES_METADATA);
    }

    public createConcreteContext<T extends any[], R extends any[]>(metadata: T): R {
        if (isUndefined(metadata) || isEmpty(metadata)) {
            return [] as R;
        }
        return iterate(metadata).filter((pipe) => pipe && pipe.transform && isFunction(pipe.transform))
            .map((pipe) => pipe.transform.bind(pipe))
            .toArray() as R;
    }

    public getGlobalMetadata<T extends any[]>(): T {
        if (!this.config) {
            return [] as T;
        }
        return this.config.getGlobalPipes() as T;
    }
}
