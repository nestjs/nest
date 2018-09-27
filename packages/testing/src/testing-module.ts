import { Dependency, NestFactory, Provider, Token, Type } from '@nest/core';

import { OverrideBy, OverrideByFactoryOptions } from './interfaces';

export interface Overload extends OverrideBy {
  isComponent: boolean;
}

export class TestingModule extends NestFactory {
  private readonly overloadsMap = new Map<Dependency, Overload>();

  private createOverrideByBuilder(
    add: (provider: Provider) => TestingModule,
  ): OverrideBy {
    return {
      useValue: (value: any) => add({ useValue: value }),
      useClass: (metatype: Type<any>) => add({ useClass: metatype }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
    };
  }

  public async compile() {
    this.applyOverloadsMap();
    await this.start();

    return this;
  }

  public override(typeOrToken: Dependency, isComponent: boolean) {
    const addOverload = (options: OverrideBy) => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isComponent,
      });

      return this;
    };

    return this.createOverrideByBuilder(addOverload);
  }

  private applyOverloadsMap() {
    for (const [component, options] of this.overloadsMap) {
      this.container.replace(component, options);
    }
  }

  public getRootModule() {
    const modules = this.container.getModules().values();
    return modules.next().value;
  }
}
