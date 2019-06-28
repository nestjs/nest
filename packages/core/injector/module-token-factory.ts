import { DynamicModule } from '@nestjs/common';
import { SHARED_MODULE_METADATA } from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces/type.interface';
import stringify from 'fast-safe-stringify';
import * as hash from 'object-hash';

export class ModuleTokenFactory {
  public create(
    metatype: Type<any>,
    scope: Type<any>[],
    dynamicModuleMetadata?: Partial<DynamicModule> | undefined,
  ): string {
    const moduleScope = this.reflectScope(metatype);
    const isSingleScoped = moduleScope === true;
    const opaqueToken = {
      module: this.getModuleName(metatype),
      dynamic: this.getDynamicMetadataToken(dynamicModuleMetadata),
      scope: isSingleScoped ? this.getScopeStack(scope) : moduleScope,
    };
    return hash(opaqueToken);
  }

  public getDynamicMetadataToken(
    dynamicModuleMetadata: Partial<DynamicModule> | undefined,
  ): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules
    // The replacer function is also required in order to obtain real class names
    // instead of the unified "Function" key
    return dynamicModuleMetadata
      ? stringify(dynamicModuleMetadata, this.replacer)
      : '';
  }

  public getModuleName(metatype: Type<any>): string {
    return metatype.name;
  }

  public getScopeStack(scope: Type<any>[]): string[] {
    const reversedScope = scope.reverse();
    const firstGlobalIndex = reversedScope.findIndex(
      s => this.reflectScope(s) === 'global',
    );
    scope.reverse();

    const stack =
      firstGlobalIndex >= 0
        ? scope.slice(scope.length - firstGlobalIndex - 1)
        : scope;
    return stack.map(module => module.name);
  }

  private reflectScope(metatype: Type<any>) {
    const scope = Reflect.getMetadata(SHARED_MODULE_METADATA, metatype);
    return scope ? scope : 'global';
  }

  private replacer(key: string, value: any) {
    if (typeof value === 'function') {
      return value.name;
    }
    return value;
  }
}
