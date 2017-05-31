import 'reflect-metadata';
import iterate from 'iterare';
import { Controller, PipeTransform, Transform } from '@nestjs/common/interfaces';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { isUndefined, isFunction, isEmpty } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from './../application-config';
import { ContextCreator } from './../helpers/context-creator';

export class PipesContextCreator extends ContextCreator {
    constructor(private readonly config: ApplicationConfig) {
        super();
    }

    public create(instance: Controller, callback: (...args) => any): Transform<any>[] {
        return this.createContext(instance, callback, PIPES_METADATA);
    }

    public createConcreteContext(metadata: PipeTransform[]): Transform<any>[] {
        if (isUndefined(metadata) || isEmpty(metadata)) {
            return [];
        }
        return iterate(metadata).filter((pipe) => pipe && pipe.transform && isFunction(pipe.transform))
                .map((pipe) => pipe.transform.bind(pipe))
                .toArray();
    }

    public getGlobalMetadata(): PipeTransform[] {
        return this.config.getGlobalPipes();
    }
}