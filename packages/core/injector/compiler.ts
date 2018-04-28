import { Type, DynamicModule } from '@nestjs/common/interfaces';
import { ModuleTokenFactory } from './module-token-factory';

export interface ModuleFactory {
  type: Type<any>;
  token: string;
  dynamicMetadata?: Partial<DynamicModule> | undefined;
}

export class ModuleCompiler {
  private readonly moduleTokenFactory = new ModuleTokenFactory();

  public compile(
    metatype: Type<any> | DynamicModule,
    scope: Type<any>[],
  ): ModuleFactory {
    const { type, dynamicMetadata } = this.extractMetadata(metatype);
    const token = this.moduleTokenFactory.create(type, scope, dynamicMetadata);
    return { type, dynamicMetadata, token };
  }

  public extractMetadata(
    metatype: Type<any> | DynamicModule,
  ): {
    type: Type<any>;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
  } {
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
