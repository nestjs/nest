import 'reflect-metadata';
import { GuardsContextCreator } from './../guards/guards-context-creator';
import { GuardsConsumer } from './../guards/guards-consumer';
import { InterceptorsContextCreator } from './../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from './../interceptors/interceptors-consumer';
import { Controller } from '@nestjs/common/interfaces';
import { Module } from './../injector/module';
import { ModulesContainer } from './../injector/modules-container';
export declare class ExternalContextCreator {
  private readonly guardsContextCreator;
  private readonly guardsConsumer;
  private readonly interceptorsContextCreator;
  private readonly interceptorsConsumer;
  private readonly modulesContainer;
  constructor(
    guardsContextCreator: GuardsContextCreator,
    guardsConsumer: GuardsConsumer,
    interceptorsContextCreator: InterceptorsContextCreator,
    interceptorsConsumer: InterceptorsConsumer,
    modulesContainer: ModulesContainer,
  );
  create(
    instance: Controller,
    callback: (...args) => any,
    methodName: string,
  ): (...args: any[]) => Promise<any>;
  findContextModuleName(constructor: Function): string;
  findComponentByClassName(module: Module, className: string): boolean;
}
