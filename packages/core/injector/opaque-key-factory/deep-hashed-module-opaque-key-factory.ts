import { createHash } from 'crypto';
import _stringify from 'fast-safe-stringify';
import { ModuleOpaqueKeyFactory } from './interfaces/module-opaque-key-factory.interface.js';
import {
  type DynamicModule,
  type ForwardReference,
  type Type,
  Logger,
} from '@nestjs/common';
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
  private readonly functionIds = new WeakMap<Function, string>();
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
      DynamicModule | ForwardReference,
  ): string {
    const moduleId = this.getModuleId(moduleCls);
    const moduleName = this.getModuleName(moduleCls);
    const opaqueToken = {
      id: moduleId,
      module: moduleName,
      dynamic: dynamicMetadata,
    };
    const start = performance.now();
    // A class is serialized as its name and a function as its source, so two
    // classes of the same name, or two closures of the same source over
    // different values ("useFactory: () => options"), would give different
    // modules the same token. Each function is identified by reference too.
    const functionIds: string[] = [];
    const opaqueTokenString = this.getStringifiedOpaqueToken(opaqueToken, fn =>
      functionIds.push(this.getFunctionId(fn)),
    );
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
    return this.hashString(`${opaqueTokenString}_${functionIds.join(',')}`);
  }

  /**
   * @param onFunction called with each function (class or not) serialized in
   * the token, in order.
   */
  public getStringifiedOpaqueToken(
    opaqueToken: object | undefined,
    onFunction?: (fn: Function) => void,
  ): string {
    // Uses safeStringify instead of JSON.stringify to support circular dynamic modules
    // The replacer function is also required in order to obtain real class names
    // instead of the unified "Function" key
    if (!opaqueToken) {
      return '';
    }
    const functions: Function[] = [];
    const replacer = (key: string, value: any) => {
      if (isFunction(value)) {
        functions.push(value);
      }
      return this.replacer(key, value);
    };
    let tokenString = stringify(opaqueToken, replacer);
    if (tokenString === UNSERIALIZABLE) {
      // fast-safe-stringify only breaks cycles it finds through arrays and object
      // keys, so one running through a Map or Set makes it give up. Hashing that
      // constant would give modules of different classes the same token, so
      // serialize those collections as "{}" instead, as JSON.stringify does.
      functions.length = 0;
      tokenString = stringify(opaqueToken, (key, value) =>
        value instanceof Map || value instanceof Set
          ? {}
          : replacer(key, value),
      );
    }
    if (onFunction && tokenString !== UNSERIALIZABLE) {
      functions.forEach(onFunction);
    }
    return tokenString;
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

  private getFunctionId(fn: Function): string {
    let functionId = this.functionIds.get(fn);
    if (!functionId) {
      functionId = randomStringGenerator();
      this.functionIds.set(fn, functionId);
    }
    return functionId;
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
