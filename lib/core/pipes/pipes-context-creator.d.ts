import 'reflect-metadata';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { ApplicationConfig } from './../application-config';
import { ContextCreator } from './../helpers/context-creator';
export declare class PipesContextCreator extends ContextCreator {
  private readonly config;
  constructor(config?: ApplicationConfig);
  create(instance: Controller, callback: (...args) => any): Transform<any>[];
  createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
  getGlobalMetadata<T extends any[]>(): T;
}
