import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces';
import { ContextCreator } from './../helpers/context-creator';
import { NestContainer } from '../injector/container';
import { CanActivate } from '@nestjs/common';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';
export declare class GuardsContextCreator extends ContextCreator {
  private readonly container;
  private readonly config;
  private moduleContext;
  constructor(container: NestContainer, config?: ConfigurationProvider);
  create(
    instance: Controller,
    callback: (...args) => any,
    module: string
  ): CanActivate[];
  createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
  createGlobalMetadataContext<T extends any[], R extends any[]>(metadata: T): R;
  getInstanceByMetatype(
    metatype: any
  ):
    | {
        instance: any;
      }
    | undefined;
  getGlobalMetadata<T extends any[]>(): T;
}
