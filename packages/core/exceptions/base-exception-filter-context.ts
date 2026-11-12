import { iterate } from 'iterare';
import { getClassRef } from '../helpers/class-ref-registry.js';
import { ContextCreator } from '../helpers/context-creator.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import {
  type InstancePerContext,
  InstanceWrapper,
} from '../injector/instance-wrapper.js';
import {
  FILTER_CATCH_EXCEPTIONS,
  isEmpty,
  isFunction,
} from '@nestjs/common/internal';
import type { Type, ExceptionFilter } from '@nestjs/common';

export class BaseExceptionFilterContext extends ContextCreator {
  protected moduleContext: string;

  constructor(private readonly container: NestContainer) {
    super();
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) {
      return [] as any[] as R;
    }
    return iterate(metadata)
      .filter(
        instance =>
          instance && (isFunction(instance.catch) || isFunction(instance)),
      )
      .map(filter => this.getFilterInstance(filter, contextId, inquirerId))
      .filter(item => !!item)
      .map(instance => ({
        func: instance!.catch.bind(instance),
        exceptionMetatypes: this.reflectCatchExceptions(instance!),
      }))
      .toArray() as R;
  }

  public getFilterInstance(
    filter: Function | ExceptionFilter,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionFilter | null {
    const isObject = !!(filter as ExceptionFilter).catch;
    if (isObject) {
      return filter as ExceptionFilter;
    }
    const instanceWrapper = this.getInstanceByMetatype(filter as Type<unknown>);
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    if (!instanceHost || !this.isInstantiated(instanceWrapper, instanceHost)) {
      return null;
    }
    return instanceHost.instance;
  }

  /**
   * A filter class that has not been instantiated in a context (or for an
   * inquirer) is represented there by an object created from its prototype,
   * e.g. a request-scoped filter of a controller that failed to resolve for
   * the request. Its "catch()" would run without its constructor having been
   * called, i.e. without its dependencies.
   */
  protected isInstantiated(
    instanceWrapper: InstanceWrapper,
    instanceHost: InstancePerContext<unknown>,
  ): boolean {
    return instanceWrapper.isNotMetatype || !!instanceHost.isConstructorCalled;
  }

  public getInstanceByMetatype(
    metatype: Type<unknown>,
  ): InstanceWrapper | undefined {
    if (!this.moduleContext) {
      return;
    }
    const collection = this.container.getModules();
    const moduleRef = collection.get(this.moduleContext);
    if (!moduleRef) {
      return;
    }
    return moduleRef.injectables.get(metatype);
  }

  public reflectCatchExceptions(instance: ExceptionFilter): Type<any>[] {
    // `@Catch()` also stores the types on the prototype of the filter class,
    // because the "constructor" of that prototype may name another class (see
    // `getClassRef`), and a filter the application instantiated itself is not
    // a registered class. The class lookup serves filters that an older
    // `@Catch()` decorated.
    return (
      Reflect.getMetadata(
        FILTER_CATCH_EXCEPTIONS,
        Object.getPrototypeOf(instance),
      ) ??
      Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, getClassRef(instance)) ??
      []
    );
  }
}
