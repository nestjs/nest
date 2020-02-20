import { DynamicModule } from '@nestjs/common';
import { SHARED_MODULE_METADATA } from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import stringify from 'fast-safe-stringify';
import * as hash from 'object-hash';

export class ModuleTokenFactory {
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();

  public create(
    metatype: Type<unknown>,
    scope: Type<unknown>[],
    dynamicModuleMetadata?: Partial<DynamicModule> | undefined,
  ): string {
    const moduleId = this.getModuleId(metatype);
    const moduleScope = this.reflectScope(metatype);
    const isSingleScoped = moduleScope === true;
    const opaqueToken = {
      id: moduleId,
      module: this.getModuleName(metatype),
      dynamic: this.getDynamicMetadataToken(dynamicModuleMetadata),
      scope: isSingleScoped ? this.getScopeStack(scope) : moduleScope,
    };
    return hash(opaqueToken, { ignoreUnknown: true });
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

  public getModuleId(metatype: Type<unknown>): string {
    let moduleId = this.moduleIdsCache.get(metatype);
    if (moduleId) {
      return moduleId;
    }
    moduleId = randomStringGenerator();
    this.moduleIdsCache.set(metatype, moduleId);
    return moduleId;
  }

  public getModuleName(metatype: Type<any>): string {
    return metatype.name;
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
