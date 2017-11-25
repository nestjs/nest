import 'reflect-metadata';

import {PIPES_METADATA} from '@nestjs/common/constants';
import {Controller, PipeTransform, Transform} from '@nestjs/common/interfaces';
import {
  isEmpty,
  isFunction,
  isUndefined
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';

import {ApplicationConfig} from './../application-config';
import {ContextCreator} from './../helpers/context-creator';

export class PipesContextCreator extends ContextCreator {
  constructor(private readonly config?: ApplicationConfig) { super(); }

  public create(instance: Controller,
                callback: (...args) => any): Transform<any>[] {
    return this.createContext(instance, callback, PIPES_METADATA);
  }

  public createConcreteContext<T extends any[], R extends any[]>(metadata: T):
      R {
    if (isUndefined(metadata) || isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
               .filter((pipe) =>
                           pipe && pipe.transform && isFunction(pipe.transform))
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