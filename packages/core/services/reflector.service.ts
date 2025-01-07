import { CustomDecorator, SetMetadata, Type } from '@nestjs/common';
import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';
import { uid } from 'uid';

/**
 * @publicApi
 */
export interface CreateDecoratorOptions<TParam = any, TTransformed = TParam> {
  /**
   * The key for the metadata.
   * @default uid(21)
   */
  key?: string;

  /**
   * The transform function to apply to the metadata value.
   * @default value => value
   */
  transform?: (value: TParam) => TTransformed;
}

type CreateDecoratorWithTransformOptions<
  TParam,
  TTransformed = TParam,
> = CreateDecoratorOptions<TParam, TTransformed> &
  Required<Pick<CreateDecoratorOptions<TParam, TTransformed>, 'transform'>>;

/**
 * @publicApi
 */
export type ReflectableDecorator<TParam, TTransformed = TParam> = ((
  opts?: TParam,
) => CustomDecorator) & {
  KEY: string;
};

/**
 * Helper class providing Nest reflection capabilities.
 *
 * @see [Reflection](https://docs.nestjs.com/guards#putting-it-all-together)
 *
 * @publicApi
 */
export class Reflector {
  /**
   * Creates a decorator that can be used to decorate classes and methods with metadata.
   * Can be used as a strongly-typed alternative to `@SetMetadata`.
   * @param options Decorator options.
   * @returns A decorator function.
   */
  static createDecorator<TParam>(
    options?: CreateDecoratorOptions<TParam>,
  ): ReflectableDecorator<TParam>;
  static createDecorator<TParam, TTransformed>(
    options: CreateDecoratorWithTransformOptions<TParam, TTransformed>,
  ): ReflectableDecorator<TParam, TTransformed>;
  static createDecorator<TParam, TTransformed = TParam>(
    options: CreateDecoratorOptions<TParam, TTransformed> = {},
  ): ReflectableDecorator<TParam, TTransformed> {
    const metadataKey = options.key ?? uid(21);
    const decoratorFn =
      (metadataValue: TParam) =>
      (target: object | Function, key?: string | symbol, descriptor?: any) => {
        const value = options.transform
          ? options.transform(metadataValue)
          : metadataValue;
        SetMetadata(metadataKey, value ?? {})(target, key!, descriptor);
      };

    decoratorFn.KEY = metadataKey;
    return decoratorFn as ReflectableDecorator<TParam, TTransformed>;
  }

  /**
   * Retrieve metadata for a reflectable decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.get(Roles, context.getHandler());`
   *
   * @param decorator reflectable decorator created through `Reflector.createDecorator`
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<T extends ReflectableDecorator<any>>(
    decorator: T,
    target: Type<any> | Function,
  ): T extends ReflectableDecorator<any, infer R> ? R : unknown;
  /**
   * Retrieve metadata for a specified key for a specified target.
   *
   * @example
   * `const roles = this.reflector.get<string[]>('roles', context.getHandler());`
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<TResult = any, TKey = any>(
    metadataKey: TKey,
    target: Type<any> | Function,
  ): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified target.
   *
   * @example
   * `const roles = this.reflector.get<string[]>('roles', context.getHandler());`
   *
   * @param metadataKey lookup key or decorator for metadata to retrieve
   * @param target context (decorated object) to retrieve metadata from
   *
   */
  public get<TResult = any, TKey = any>(
    metadataKeyOrDecorator: TKey,
    target: Type<any> | Function,
  ): TResult {
    const metadataKey =
      (metadataKeyOrDecorator as ReflectableDecorator<unknown>).KEY ??
      metadataKeyOrDecorator;

    return Reflect.getMetadata(metadataKey, target);
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TParam = any, TTransformed = TParam>(
    decorator: ReflectableDecorator<TParam, TTransformed>,
    targets: (Type<any> | Function)[],
  ): TTransformed extends Array<any> ? TTransformed : TTransformed[];
  /**
   * Retrieve metadata for a specified key for a specified set of targets.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TResult extends any[] = any[], TKey = any>(
    metadataKey: TKey,
    targets: (Type<any> | Function)[],
  ): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets.
   *
   * @param metadataKeyOrDecorator lookup key or decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAll<TResult extends any[] = any[], TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type<any> | Function)[],
  ): TResult {
    return (targets || []).map(target =>
      this.get(metadataKeyOrDecorator, target),
    ) as TResult;
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets and merge results.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TParam = any, TTransformed = TParam>(
    decorator: ReflectableDecorator<TParam, TTransformed>,
    targets: (Type<any> | Function)[],
  ): TTransformed extends Array<any>
    ? TTransformed
    : TTransformed extends object
      ? TTransformed
      : TTransformed[];
  /**
   * Retrieve metadata for a specified key for a specified set of targets and merge results.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TResult extends any[] | object = any[], TKey = any>(
    metadataKey: TKey,
    targets: (Type<any> | Function)[],
  ): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets and merge results.
   *
   * @param metadataKeyOrDecorator lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndMerge<TResult extends any[] | object = any[], TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type<any> | Function)[],
  ): TResult {
    const metadataCollection = this.getAll<any[], TKey>(
      metadataKeyOrDecorator,
      targets,
    ).filter(item => item !== undefined);

    if (isEmpty(metadataCollection)) {
      return metadataCollection as TResult;
    }
    if (metadataCollection.length === 1) {
      const value = metadataCollection[0];
      if (isObject(value)) {
        return value as TResult;
      }
      return metadataCollection as TResult;
    }
    return metadataCollection.reduce((a, b) => {
      if (Array.isArray(a)) {
        return a.concat(b);
      }
      if (isObject(a) && isObject(b)) {
        return {
          ...a,
          ...b,
        };
      }
      return [a, b];
    });
  }

  /**
   * Retrieve metadata for a specified decorator for a specified set of targets and return a first not undefined value.
   *
   * @param decorator lookup decorator for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TParam = any, TTransformed = TParam>(
    decorator: ReflectableDecorator<TParam, TTransformed>,
    targets: (Type<any> | Function)[],
  ): TTransformed;
  /**
   * Retrieve metadata for a specified key for a specified set of targets and return a first not undefined value.
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TResult = any, TKey = any>(
    metadataKey: TKey,
    targets: (Type<any> | Function)[],
  ): TResult;
  /**
   * Retrieve metadata for a specified key or decorator for a specified set of targets and return a first not undefined value.
   *
   * @param metadataKeyOrDecorator lookup key or metadata for metadata to retrieve
   * @param targets context (decorated objects) to retrieve metadata from
   *
   */
  public getAllAndOverride<TResult = any, TKey = any>(
    metadataKeyOrDecorator: TKey,
    targets: (Type<any> | Function)[],
  ): TResult | undefined {
    for (const target of targets) {
      const result = this.get(metadataKeyOrDecorator, target);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }
}
