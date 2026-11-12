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
  private readonly forwardReferences = new WeakMap<ForwardReference, any>();

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
    if (this.isForwardReference(moduleClsOrDynamic)) {
      // The token is the one of the module the reference resolves to, which
      // may be given without the reference elsewhere
      moduleClsOrDynamic = (await this.resolveForwardReference(
        moduleClsOrDynamic,
      )) as Type | DynamicModule;
    }

    const { type, dynamicMetadata } = this.extractMetadata(moduleClsOrDynamic);
    const token = dynamicMetadata
      ? this._moduleOpaqueKeyFactory.createForDynamic(
          type,
          dynamicMetadata,
          moduleClsOrDynamic as DynamicModule,
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
    if (this.isForwardReference(moduleClsOrDynamic)) {
      moduleClsOrDynamic = this.resolveForwardReference(moduleClsOrDynamic);
    }
    if (!this.isDynamicModule(moduleClsOrDynamic)) {
      return {
        type: moduleClsOrDynamic as Type,
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

  /**
   * Resolves a forward reference once, and returns the same module every
   * time after. The function may build a dynamic module
   * (`forwardRef(() => CatsModule.register())`), a new object on every call,
   * while a dynamic module is identified by reference: the module that is
   * scanned and imported has to be the one that was registered. A reference
   * that resolves to nothing yet is not remembered.
   */
  public resolveForwardReference(reference: ForwardReference): any {
    if (this.forwardReferences.has(reference)) {
      return this.forwardReferences.get(reference);
    }
    const resolved = reference.forwardRef();
    if (resolved !== undefined && resolved !== null) {
      this.forwardReferences.set(reference, resolved);
    }
    return resolved;
  }

  private isForwardReference(
    moduleClsOrDynamic: Type | DynamicModule | ForwardReference,
  ): moduleClsOrDynamic is ForwardReference {
    return !!(moduleClsOrDynamic as ForwardReference)?.forwardRef;
  }
}
