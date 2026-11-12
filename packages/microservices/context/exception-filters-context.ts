import { iterate } from 'iterare';
import { from, isObservable, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
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
 * stored for the static context is only a prototype. Its own filters are the
 * ones without a scope: they handle the message when `open` returns no
 * handler, or when the scoped filters cannot be built.
 */
class DeferredRpcExceptionsHandler extends RpcExceptionsHandler {
  constructor(
    private readonly open: () => Promise<RpcExceptionsHandler | undefined>,
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
    const opened = this.open().then(
      handler =>
        handler
          ? handler.handle(exception, host, reportUnhandled)
          : super.handle(exception, host, reportUnhandled),
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
    // `ListenersController` passes a context id for every controller that has
    // a scoped global filter, as such a filter makes the controller
    // request-scoped. A static one has no message to build the filters for.
    if (
      contextId === STATIC_CONTEXT ||
      !hasUnconstructedScopedGlobalFilter(this.config)
    ) {
      return this.createHandler(
        new RpcExceptionsHandler(),
        instance,
        callback,
        module,
        contextId,
        inquirerId,
      );
    }
    const deferredHandler = new DeferredRpcExceptionsHandler(async () => {
      // Transient filters are looked up under the controller, so they are
      // loaded under it too.
      const inquirer = inquirerId
        ? findFilterInquirer(this.container, module, inquirerId)
        : undefined;
      if (inquirerId && !inquirer) {
        return undefined;
      }
      await this.loadFilters(contextId, inquirer);
      return this.createHandler(
        new RpcExceptionsHandler(),
        instance,
        callback,
        module,
        contextId,
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
          // Without a controller, a transient filter is its own inquirer (see
          // `loadScopedGlobalFilters()`). A filter that was not loaded under
          // it is an unresolved clone and is left out below.
          inquirerId ?? wrapper.id,
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
}
