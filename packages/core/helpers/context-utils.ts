import type { ParamData } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe.js';
import { MISSING_HANDLER_METADATA_MESSAGE } from '../errors/messages.js';
import { getClassRef, getParamsHost } from './class-ref-registry.js';
import { ExecutionContextHost } from './execution-context-host.js';
import {
  PARAMTYPES_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
  type Controller,
  isFunction,
  isString,
} from '@nestjs/common/internal';
import type { ContextType, PipeTransform, Type } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

// Handlers already warned about (see `warnOnMissingParamtypes()`). Shared, as
// each context creator has its own `ContextUtils`.
const handlersWithoutParamtypes = new WeakSet<Function>();

export interface ParamProperties<T = any, IExtractor extends Function = any> {
  index: number;
  type: T | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: IExtractor;
  schema?: StandardSchemaV1;
}

export class ContextUtils {
  public mapParamType(key: string): string {
    const keyPair = key.split(':');
    return keyPair[0];
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    methodName: string,
  ): any[] {
    // The types are stored on the prototype that declared the method, which a
    // method copied by a mixin helper does not share with the instance.
    const paramsHost = this.getParamsHost(instance, methodName);
    return (
      (paramsHost?.prototype &&
        Reflect.getMetadata(
          PARAMTYPES_METADATA,
          paramsHost.prototype,
          methodName,
        )) ??
      Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName)
    );
  }

  public reflectCallbackMetadata<T = any>(
    instance: Controller,
    methodName: string,
    metadataKey: string,
  ): T {
    return Reflect.getMetadata(
      metadataKey,
      this.getParamsHost(instance, methodName),
      methodName,
    );
  }

  public reflectPassthrough(instance: Controller, methodName: string): boolean {
    return Reflect.getMetadata(
      RESPONSE_PASSTHROUGH_METADATA,
      this.getParamsHost(instance, methodName),
      methodName,
    );
  }

  /**
   * Returns the class that the parameter decorators of the given handler
   * stored their metadata on (see `getParamsHost`).
   */
  private getParamsHost(instance: Controller, methodName: string): Function {
    return getParamsHost(getClassRef(instance), methodName);
  }

  public getArgumentsLength<T>(keys: string[], metadata: T): number {
    return keys.length
      ? Math.max(...keys.map(key => metadata[key].index)) + 1
      : 0;
  }

  public createNullArray(length: number): any[] {
    const a = new Array(length);
    for (let i = 0; i < length; ++i) a[i] = undefined;
    return a;
  }

  public mergeParamsMetatypes(
    paramsProperties: ParamProperties[],
    paramtypes: any[],
  ): (ParamProperties & { metatype?: any })[] {
    if (!paramtypes) {
      return paramsProperties;
    }
    return paramsProperties.map(param => ({
      ...param,
      metatype: paramtypes[param.index],
    }));
  }

  /**
   * A handler has parameter types only if its compiler emits decorator
   * metadata, and tsx and esbuild don't. Without them a `ValidationPipe` has
   * nothing to validate a parameter against and passes it on as it came, so
   * this says so once per handler, when the handler is set up. It doesn't
   * throw, as the handler may not rely on the pipe. A parameter whose
   * `ValidationPipe` was given an `expectedType` needs no metadata, so it isn't
   * reported, and neither is a custom decorator's, which `ValidationPipe`
   * skips by default.
   *
   * @param pipes pipes bound to the handler (global, class and method ones)
   * @param paramsProperties parameters the pipes are applied to
   */
  public warnOnMissingParamtypes(
    instance: Controller,
    methodName: string,
    paramtypes: unknown[] | undefined,
    pipes: PipeTransform[],
    paramsProperties: ParamProperties[],
  ) {
    const handler = instance[methodName];
    if (
      paramtypes ||
      !isFunction(handler) ||
      handlersWithoutParamtypes.has(handler)
    ) {
      return;
    }
    const isLeftUnvalidated = ({
      type,
      pipes: paramPipes,
    }: ParamProperties) => {
      if (isString(type)) {
        return false;
      }
      const validationPipes = pipes
        .concat(paramPipes ?? [])
        .filter(
          (pipe): pipe is ValidationPipe => pipe instanceof ValidationPipe,
        );
      // `expectedType` is protected: read it the way `transform()` does
      return (
        validationPipes.length > 0 &&
        !validationPipes.some(pipe => pipe['expectedType'])
      );
    };
    if (!paramsProperties.some(isLeftUnvalidated)) {
      return;
    }
    handlersWithoutParamtypes.add(handler);
    new Logger(ContextUtils.name).warn(
      MISSING_HANDLER_METADATA_MESSAGE(getClassRef(instance).name, methodName),
    );
  }

  public getCustomFactory(
    factory: (...args: unknown[]) => void,
    data: unknown,
    contextFactory: (args: unknown[]) => ExecutionContextHost,
  ): (...args: unknown[]) => unknown {
    return isFunction(factory)
      ? (...args: unknown[]) => factory(data, contextFactory(args))
      : () => null;
  }

  public getContextFactory<TContext extends string = ContextType>(
    contextType: TContext,
    instance?: object,
    callback?: Function,
  ): (args: unknown[]) => ExecutionContextHost {
    const type = instance && (instance.constructor as Type<unknown>);
    return (args: unknown[]) => {
      const ctx = new ExecutionContextHost(args, type, callback);
      ctx.setType(contextType);
      return ctx;
    };
  }
}
