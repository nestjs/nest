import {
  DynamicModule,
  ForwardReference,
  Type,
} from '@nestjs/common/interfaces';
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
  ): Promise<ModuleFactory> {
    const { type, dynamicMetadata } = this.extractMetadata(await metatype);
    const token = this.moduleTokenFactory.create(type, dynamicMetadata);
    return { type, dynamicMetadata, token };
  }

  public extractMetadata(
    metatype: Type<any> | ForwardReference | DynamicModule,
  ): {
    type: Type<any>;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
  } {
    if (!this.isDynamicModule(metatype)) {
      return {
        type: (metatype as ForwardReference)?.forwardRef
          ? (metatype as ForwardReference).forwardRef()
          : metatype,
      };
    }
    const { module: type, ...dynamicMetadata } = metatype;
    return { type, dynamicMetadata };
  }

  public isDynamicModule(
    module: Type<any> | DynamicModule | ForwardReference,
  ): module is DynamicModule {
    return !!(module as DynamicModule).module;
  }
}
