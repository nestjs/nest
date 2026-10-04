import { createHash } from 'crypto';
import _stringify from 'fast-safe-stringify';
import { ModuleOpaqueKeyFactory } from './interfaces/module-opaque-key-factory.interface.js';
import { type DynamicModule, type Type, Logger } from '@nestjs/common';
import {
  randomStringGenerator,
  isFunction,
  isSymbol,
} from '@nestjs/common/internal';
// CJS interop: fast-safe-stringify sets module.exports.default = module.exports
const stringify = ((_stringify as any).default ?? _stringify) as unknown as (
  value: any,
  replacer?: (key: string, value: any) => any,
  space?: string | number,
) => string;

// What fast-safe-stringify returns when it can't break a cycle
const UNSERIALIZABLE = JSON.stringify(
  '[unable to serialize, circular reference is too complex to analyze]',
);

const CLASS_STR = 'class ';
const CLASS_STR_LEN = CLASS_STR.length;

export class DeepHashedModuleOpaqueKeyFactory implements ModuleOpaqueKeyFactory {
  private readonly moduleIdsCache = new WeakMap<Type<unknown>, string>();
  private readonly moduleTokenCache = new Map<string, string>();
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

    return this.hashString(opaqueTokenString);
  }

  public getStringifiedOpaqueToken(opaqueToken: object | undefined): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules.
    // The replacer is also required so classes, symbols, maps, sets and regular
    // expressions serialize to stable tagged values instead of being dropped
    if (!opaqueToken) {
      return '';
    }
    const tokenString = stringify(opaqueToken, this.replacer);
    if (tokenString !== UNSERIALIZABLE) {
      return tokenString;
    }
    // fast-safe-stringify only breaks cycles it finds through arrays and object
    // keys, so one running through a Map or Set makes it give up. Hashing that
    // constant would give modules of different classes the same token, so
    // serialize those collections as "{}" instead, as JSON.stringify does.
    return stringify(opaqueToken, (key, value) =>
      value instanceof Map || value instanceof Set
        ? {}
        : this.replacer(key, value),
    );
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
        // Name and source together: same-named classes differ in source,
        // while `mixin()` classes share one source and differ only in name
        return { Class: [value.name, funcAsString] };
      }
      return funcAsString;
    }
    if (isSymbol(value)) {
      return value.toString();
    }
    // Tagged so they don't collide with plain values holding the same data
    if (value instanceof Map) {
      return { Map: [...value] };
    }
    if (value instanceof Set) {
      return { Set: [...value] };
    }
    if (value instanceof RegExp) {
      return { RegExp: value.toString() };
    }
    return value;
  }
}
