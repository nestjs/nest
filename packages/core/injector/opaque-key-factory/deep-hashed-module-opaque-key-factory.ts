import { DynamicModule } from '@nestjs/common/interfaces/modules/dynamic-module.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isFunction, isSymbol } from '@nestjs/common/utils/shared.utils';
import { createHash } from 'crypto';
import stringify from 'fast-safe-stringify';
import { ModuleOpaqueKeyFactory } from './interfaces/module-opaque-key-factory.interface';

// What fast-safe-stringify returns whenever JSON.stringify throws (e.g., on a
// cycle it can't break, or on a `toJSON()` that throws)
const UNSERIALIZABLE = JSON.stringify(
  '[unable to serialize, circular reference is too complex to analyze]',
);

const CLASS_STR = 'class ';
const CLASS_STR_LEN = CLASS_STR.length;

export class DeepHashedModuleOpaqueKeyFactory implements ModuleOpaqueKeyFactory {
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();
  private readonly moduleTokenCache = new Map<string, string>();
  private readonly unserializableModuleIds = new WeakMap<object, string>();
  private readonly logger = new Logger(DeepHashedModuleOpaqueKeyFactory.name, {
    timestamp: true,
  });

  public createForStatic(moduleCls: Type): string {
    const moduleId = this.getModuleId(moduleCls);
    const moduleName = this.getModuleName(moduleCls);

    const key = `${moduleId}_${moduleName}`;
    if (this.moduleTokenCache.has(key)) {
      return this.moduleTokenCache.get(key)!;
    }

    const hash = this.hashString(key);
    this.moduleTokenCache.set(key, hash);
    return hash;
  }

  public createForDynamic(
    moduleCls: Type<unknown>,
    dynamicMetadata: Omit<DynamicModule, 'module'>,
    originalRef: DynamicModule | ForwardReference = dynamicMetadata as
      | DynamicModule
      | ForwardReference,
  ): string {
    const moduleId = this.getModuleId(moduleCls);
    const moduleName = this.getModuleName(moduleCls);
    const opaqueToken = {
      id: moduleId,
      module: moduleName,
      dynamic: dynamicMetadata,
    };
    const start = performance.now();
    const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken);
    const timeSpentInMs = performance.now() - start;

    if (timeSpentInMs > 10) {
      const formattedTimeSpent = timeSpentInMs.toFixed(2);
      this.logger.warn(
        `The module "${opaqueToken.module}" is taking ${formattedTimeSpent}ms to serialize, this may be caused by larger objects statically assigned to the module. Consider changing the "moduleIdGeneratorAlgorithm" option to "reference" to improve the performance.`,
      );
    }

    if (opaqueTokenString === UNSERIALIZABLE) {
      // Nothing of the module is left in that constant, not even its class,
      // so hashing it would give every such module the same token, and the
      // container would keep only the first of them. Identify the module by
      // reference instead, as the "reference" algorithm does.
      return this.hashString(
        `${moduleId}_${moduleName}_${this.getUnserializableModuleId(originalRef)}`,
      );
    }
    return this.hashString(opaqueTokenString);
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

  private getUnserializableModuleId(originalRef: object): string {
    let moduleId = this.unserializableModuleIds.get(originalRef);
    if (!moduleId) {
      moduleId = randomStringGenerator();
      this.unserializableModuleIds.set(originalRef, moduleId);
    }
    return moduleId;
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
    // JSON.stringify throws on a bigint
    if (typeof value === 'bigint') {
      return { BigInt: value.toString() };
    }
    return value;
  }
}
