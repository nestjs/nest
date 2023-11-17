import { DynamicModule, Logger } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isFunction, isSymbol } from '@nestjs/common/utils/shared.utils';
import { createHash } from 'crypto';
import stringify from 'fast-safe-stringify';
import { performance } from 'perf_hooks';

const CLASS_STR = 'class ';
const CLASS_STR_LEN = CLASS_STR.length;

export class ModuleTokenFactory {
  private readonly moduleTokenCache = new Map<string, string>();
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();
  private readonly logger = new Logger(ModuleTokenFactory.name, {
    timestamp: true,
  });

  public create(
    metatype: Type<unknown>,
    dynamicModuleMetadata?: Partial<DynamicModule> | undefined,
  ): string {
    const moduleId = this.getModuleId(metatype);

    if (!dynamicModuleMetadata) {
      return this.getStaticModuleToken(moduleId, this.getModuleName(metatype));
    }
    const opaqueToken = {
      id: moduleId,
      module: this.getModuleName(metatype),
      dynamic: dynamicModuleMetadata,
    };
    const start = performance.now();
    const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken);
    const timeSpentInMs = performance.now() - start;

    if (timeSpentInMs > 10) {
      const formattedTimeSpent = timeSpentInMs.toFixed(2);
      this.logger.warn(
        `The module "${opaqueToken.module}" is taking ${formattedTimeSpent}ms to serialize, this may be caused by larger objects statically assigned to the module. More details: https://github.com/nestjs/nest/issues/12738`,
      );
    }

    return this.hashString(opaqueTokenString);
  }

  public getStaticModuleToken(moduleId: string, moduleName: string): string {
    const key = `${moduleId}_${moduleName}`;
    if (this.moduleTokenCache.has(key)) {
      return this.moduleTokenCache.get(key);
    }

    const hash = this.hashString(key);
    this.moduleTokenCache.set(key, hash);
    return hash;
  }

  public getStringifiedOpaqueToken(opaqueToken: object | undefined): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules
    // The replacer function is also required in order to obtain real class names
    // instead of the unified "Function" key
    return opaqueToken ? stringify(opaqueToken, this.replacer) : '';
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

  private hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private replacer(key: string, value: any) {
    if (isFunction(value)) {
      const funcAsString = value.toString();
      const isClass = funcAsString.slice(0, CLASS_STR_LEN) === CLASS_STR;
      if (isClass) {
        return value.name;
      }
      return funcAsString;
    }
    if (isSymbol(value)) {
      return value.toString();
    }
    return value;
  }
}
