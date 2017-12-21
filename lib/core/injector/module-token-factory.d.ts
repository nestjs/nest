import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { DynamicModule } from '@nestjs/common';
export declare class ModuleTokenFactory {
  create(
    metatype: NestModuleMetatype,
    scope: NestModuleMetatype[],
    dynamicModuleMetadata?: Partial<DynamicModule> | undefined
  ): string;
  getDynamicMetadataToken(
    dynamicModuleMetadata: Partial<DynamicModule> | undefined
  ): string;
  getModuleName(metatype: NestModuleMetatype): string;
  getScopeStack(scope: NestModuleMetatype[]): string[];
  private reflectScope(metatype);
}
