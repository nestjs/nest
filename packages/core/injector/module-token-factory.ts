import { DynamicModule } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isFunction, isSymbol } from '@nestjs/common/utils/shared.utils';
import * as hash from 'object-hash';

export class ModuleTokenFactory {
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();

  public create(
    metatype: Type<unknown>,
    dynamicModuleMetadata?: Partial<DynamicModule> | undefined,
  ): string {
    const moduleId = this.getModuleId(metatype);
    const opaqueToken = {
      id: moduleId,
      module: this.getModuleName(metatype),
      dynamic: dynamicModuleMetadata,
    };
    return hash(this.shallow(opaqueToken));
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

  public shallow(obj: Record<string, any>, depth = 4) {
    if (typeof obj === 'function') {
      return `${obj.name}${depth}`;
    }
    if (typeof obj === 'object' && obj !== null) {
      if (depth <= 0) {
        return `object${depth}`;
      }

      const result = Object.create(null);
      // for-loop + Object.create is much faster than reduce
      for (const key of Object.keys(obj)) {
        result[key] = this.shallow(obj[key], depth - 1);
      }

      return result;
    }
    return obj?.toString ? `${obj}${depth}` : obj;
  }
}
