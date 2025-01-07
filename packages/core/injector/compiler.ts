import {
  DynamicModule,
  ForwardReference,
  Type,
} from '@nestjs/common/interfaces';
import { ModuleOpaqueKeyFactory } from './opaque-key-factory/interfaces/module-opaque-key-factory.interface';

export interface ModuleFactory {
  type: Type<any>;
  token: string;
  dynamicMetadata?: Partial<DynamicModule>;
}

export class ModuleCompiler {
  constructor(
    private readonly _moduleOpaqueKeyFactory: ModuleOpaqueKeyFactory,
  ) {}

  get moduleOpaqueKeyFactory(): ModuleOpaqueKeyFactory {
    return this._moduleOpaqueKeyFactory;
  }

  public async compile(
    moduleClsOrDynamic:
      | Type
      | DynamicModule
      | ForwardReference
      | Promise<DynamicModule>,
  ): Promise<ModuleFactory> {
    moduleClsOrDynamic = await moduleClsOrDynamic;

    const { type, dynamicMetadata } = this.extractMetadata(moduleClsOrDynamic);
    const token = dynamicMetadata
      ? this._moduleOpaqueKeyFactory.createForDynamic(
          type,
          dynamicMetadata,
          moduleClsOrDynamic as DynamicModule | ForwardReference,
        )
      : this._moduleOpaqueKeyFactory.createForStatic(
          type,
          moduleClsOrDynamic as Type,
        );

    return { type, dynamicMetadata, token };
  }

  public extractMetadata(
    moduleClsOrDynamic: Type | ForwardReference | DynamicModule,
  ): {
    type: Type;
    dynamicMetadata: Omit<DynamicModule, 'module'> | undefined;
  } {
    if (!this.isDynamicModule(moduleClsOrDynamic)) {
      return {
        type: (moduleClsOrDynamic as ForwardReference)?.forwardRef
          ? (moduleClsOrDynamic as ForwardReference).forwardRef()
          : moduleClsOrDynamic,
        dynamicMetadata: undefined,
      };
    }
    const { module: type, ...dynamicMetadata } = moduleClsOrDynamic;
    return { type, dynamicMetadata };
  }

  public isDynamicModule(
    moduleClsOrDynamic: Type | DynamicModule | ForwardReference,
  ): moduleClsOrDynamic is DynamicModule {
    return !!(moduleClsOrDynamic as DynamicModule).module;
  }
}
