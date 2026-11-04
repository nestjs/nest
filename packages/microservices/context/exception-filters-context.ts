import { iterate } from 'iterare';
import { from, isObservable, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RequestContextHost } from './request-context-host.js';
import { RpcException } from '../exceptions/rpc-exception.js';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';
import type { ApplicationConfig, ContextId, NestContainer } from '@nestjs/core';
import {
  BaseExceptionFilterContext,
  STATIC_CONTEXT,
  bindRequestContext,
  createContextInjector,
  findFilterInquirer,
  hasUnconstructedScopedGlobalFilter,
  loadScopedGlobalFilters,
  type Injector,
  type InstanceWrapper,
} from '@nestjs/core/internal';

/**
 * Builds the real filters once the message that failed is known. A
 * request-scoped filter has no instance at registration time, and the one
 * stored for the static context is only a prototype.
 */
class DeferredRpcExceptionsHandler extends RpcExceptionsHandler {
  constructor(
    private readonly open: (
      host: ArgumentsHost,
    ) => Promise<RpcExceptionsHandler>,
  ) {
    super();
  }

  public handle(
    exception: Error | RpcException,
    host: ArgumentsHost,
    reportUnhandled = false,
  ): Observable<unknown> {
    // A rejection from `open` is a failure to load the filters. A rejection
    // from `handler.handle` is the filter's own result and must not be
    // replaced by the load-failure fallback.
    const opened = this.open(host).then(
      handler => handler.handle(exception, host, reportUnhandled),
      (err: Error) => super.handle(err, host, reportUnhandled),
    );
    // `mergeMap` would iterate a string and reject a plain object.
    // `RpcProxy.transformToObservable` already accepts a value, a promise,
    // or an observable from a synchronous handler.
    return from(opened).pipe(mergeMap(result => flattenFilterResult(result)));
  }
}

function flattenFilterResult(result: unknown): Observable<unknown> {
  return isObservable(result)
    ? result
    : from(Promise.resolve(result)).pipe(
        mergeMap(value => (isObservable(value) ? value : of(value))),
      );
}

/**
 * @publicApi
 */
export class ExceptionFiltersContext extends BaseExceptionFilterContext {
  private contextInjector?: Injector;

  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: <T = any>(data: T) => Observable<any>,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): RpcExceptionsHandler {
    if (!hasUnconstructedScopedGlobalFilter(this.config)) {
      return this.createHandler(
        new RpcExceptionsHandler(),
        instance,
        callback,
        module,
        contextId,
        inquirerId,
      );
    }
    // The inquirer id is not enough: a static lookup still returns a null
    // instance or an unconstructed prototype for a request-scoped filter.
    const deferredHandler = new DeferredRpcExceptionsHandler(async host => {
      // Transient filters are looked up under the controller, so they are
      // loaded under it too.
      const inquirer = inquirerId
        ? findFilterInquirer(this.container, module, inquirerId)
        : undefined;
      if (inquirerId && !inquirer) {
        return this.createHandler(
          new RpcExceptionsHandler(),
          instance,
          callback,
          module,
        );
      }
      const requestContextId =
        contextId === STATIC_CONTEXT ? this.bindRpcRequest(host) : contextId;
      await this.loadFilters(requestContextId, inquirer);
      return this.createHandler(
        new RpcExceptionsHandler(),
        instance,
        callback,
        module,
        requestContextId,
        inquirerId,
      );
    });
    return this.createHandler(deferredHandler, instance, callback, module);
  }

  public getGlobalMetadata<T extends any[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    const scopedFilterWrappers =
      this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = iterate(scopedFilterWrappers)
      .map(wrapper =>
        wrapper.getInstanceByContextId(
          this.getContextId(contextId, wrapper),
          // Without a controller, a transient filter built for the message is
          // its own inquirer (see `loadScopedGlobalFilters()`). One with a
          // static tree keeps the instance it already has.
          inquirerId ??
            (wrapper.isDependencyTreeStatic() ? undefined : wrapper.id),
        ),
      )
      .filter(
        host => !!host && host.isResolved !== false && host.instance != null,
      )
      .map(host => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }

  private createHandler<T extends RpcExceptionsHandler>(
    exceptionHandler: T,
    instance: Controller,
    callback: <TData = any>(data: TData) => Observable<any>,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    this.moduleContext = module;

    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId,
    );
    if (isEmptyArray(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  private loadFilters(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): Promise<void> {
    this.contextInjector ??= createContextInjector(this.container);
    return loadScopedGlobalFilters(
      this.contextInjector,
      this.config,
      contextId,
      inquirer,
    );
  }

  /**
   * The server calls a handler as `(data, rpcContext)`. A request-scoped
   * handler may instead be invoked with the `RequestContextHost` it already
   * registered. `switchToHttp()` is the wrong request here.
   */
  private bindRpcRequest(host: ArgumentsHost): ContextId {
    const args = host.getArgs();
    const request =
      args[0] instanceof RequestContextHost
        ? args[0]
        : RequestContextHost.create(patternOf(args[1]), args[0], args[1]);
    return bindRequestContext(this.container, this.config, request);
  }
}

function patternOf(context: unknown): string | Record<string, any> {
  if (
    context !== null &&
    typeof context === 'object' &&
    typeof (context as { getPattern?: unknown }).getPattern === 'function'
  ) {
    return (
      context as { getPattern: () => string | Record<string, any> }
    ).getPattern();
  }
  return '';
}
