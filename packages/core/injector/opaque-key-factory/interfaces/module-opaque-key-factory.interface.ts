import { DynamicModule } from '@nestjs/common/interfaces/modules/dynamic-module.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';

export interface ModuleOpaqueKeyFactory {
  /**
   * Creates a unique opaque key for the given static module.
   * @param moduleCls A static module class.
   * @param originalRef Original object reference. In most cases, it's the same as `moduleCls`.
   */
  createForStatic(
    moduleCls: Type,
    originalRef: Type | ForwardReference,
  ): string;
  /**
   * Creates a unique opaque key for the given dynamic module.
   * @param moduleCls  A dynamic module class reference.
   * @param dynamicMetadata Dynamic module metadata.
   * @param originalRef Original object reference.
   */
  createForDynamic(
    moduleCls: Type<unknown>,
    dynamicMetadata: Omit<DynamicModule, 'module'>,
    originalRef: DynamicModule | ForwardReference,
  ): string;
}
