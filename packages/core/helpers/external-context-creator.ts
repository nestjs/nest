import { ForbiddenException } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import 'reflect-metadata';
import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { Module } from '../injector/module';
import { ModulesContainer } from '../injector/modules-container';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';

export class ExternalContextCreator {
  constructor(
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  public create(
    instance: Controller,
    callback: (...args) => any,
    methodName: string,
  ) {
    const module = this.findContextModuleName(instance.constructor);
    const guards = this.guardsContextCreator.create(instance, callback, module);
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
    );
    return async (...args) => {
      const canActivate = await this.guardsConsumer.tryActivate(
        guards,
        args,
        instance,
        callback,
      );
      if (!canActivate) {
        throw new ForbiddenException(FORBIDDEN_MESSAGE);
      }
      const handler = () => callback.apply(instance, args);
      return await this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler,
      );
    };
  }

  public findContextModuleName(constructor: Function): string {
    const className = constructor.name;
    if (!className) {
      return '';
    }
    for (const [key, module] of [...this.modulesContainer.entries()]) {
      if (this.findComponentByClassName(module, className)) {
        return key;
      }
    }
    return '';
  }

  public findComponentByClassName(module: Module, className: string): boolean {
    const { components } = module;
    const hasComponent = [...components.keys()].find(
      component => component === className,
    );
    return !!hasComponent;
  }
}
