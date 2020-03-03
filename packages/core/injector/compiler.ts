import { DynamicModule, Type } from '@nestjs/common/interfaces';
import { ModuleTokenFactory } from './module-token-factory';

export interface ModuleFactory {
  type: Type<any>;
  token: string;
  dynamicMetadata?: Partial<DynamicModule>;
}

export class ModuleCompiler {
  constructor(private readonly moduleTokenFactory = new ModuleTokenFactory()) {}

  public async compile(
    metatype: Type<any> | DynamicModule | Promise<DynamicModule>,
    scope: Type<any>[],
  ): Promise<ModuleFactory> {
    const { type, dynamicMetadata } = await this.extractMetadata(metatype);
    const token = this.moduleTokenFactory.create(type, scope, dynamicMetadata);
    return { type, dynamicMetadata, token };
  }

  public async extractMetadata(
    metatype: Type<any> | DynamicModule | Promise<DynamicModule>,
  ): Promise<{
    type: Type<any>;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
  }> {
    metatype = await metatype;
    if (!this.isDynamicModule(metatype)) {
      return { type: metatype };
    }
    const { module: type, ...dynamicMetadata } = metatype;
    return { type, dynamicMetadata };
  }

  public isDynamicModule(
    module: Type<any> | DynamicModule,
  ): module is DynamicModule {
    return !!(module as DynamicModule).module;
  }
}
