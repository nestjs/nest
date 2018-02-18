import { ModuleTokenFactory } from './injector/module-token-factory';
import { NestContainer, InstanceWrapper } from './injector/container';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { INestApplicationContext } from '@nestjs/common';

export class NestApplicationContext implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();

  constructor(
    protected readonly container: NestContainer,
    private readonly scope: Type<any>[],
    protected contextModule,
  ) {}

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value;
  }

  public select<T>(module: Metatype<T>): INestApplicationContext {
    const modules = this.container.getModules();
    const moduleMetatype = this.contextModule.metatype;
    const scope = this.scope.concat(moduleMetatype);

    const token = this.moduleTokenFactory.create(module as any, scope);
    const selectedModule = modules.get(token);
    return selectedModule
      ? new NestApplicationContext(this.container, scope, selectedModule)
      : null;
  }

  public get<T>(metatypeOrToken: Type<T> | string | symbol): T {
    return this.findInstanceByPrototypeOrToken<T>(metatypeOrToken);
  }

  private findInstanceByPrototypeOrToken<T>(
    metatypeOrToken: Type<T> | string | symbol,
  ) {
    const dependencies = new Map([
      ...this.contextModule.components,
      ...this.contextModule.routes,
      ...this.contextModule.injectables,
    ]);
    const name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as any).name
      : metatypeOrToken;
    const instanceWrapper = dependencies.get(name);
    return instanceWrapper
      ? (instanceWrapper as InstanceWrapper<any>).instance
      : null;
  }
}
