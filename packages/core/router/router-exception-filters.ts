import type { ArgumentsHost, HttpException, HttpServer } from '@nestjs/common';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context.js';
import { ExceptionsHandler } from '../exceptions/exceptions-handler.js';
import { ContextIdFactory } from '../helpers/context-id-factory.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { Injector } from '../injector/injector.js';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper.js';
import { REQUEST_CONTEXT_ID } from './request/request-constants.js';
import { RouterProxyCallback } from './router-proxy.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';

/**
 * Exceptions handler of a callback that is not bound to a controller
 * (middleware, the "not found" handler, the exception layer, a failed
 * per-request resolution). Request-scoped and transient global filters can
 * only be instantiated for the request that has failed, so the handler that
 * includes them is built then.
 */
class DeferredExceptionsHandler extends ExceptionsHandler {
  constructor(
    applicationRef: HttpServer,
    private readonly createHandler: (
      ctx: ArgumentsHost,
    ) => Promise<ExceptionsHandler>,
  ) {
    super(applicationRef);
  }

  public async next(exception: Error | HttpException, ctx: ArgumentsHost) {
    let exceptionsHandler: ExceptionsHandler;
    try {
      exceptionsHandler = await this.createHandler(ctx);
    } catch (err) {
      // As for a controller whose enhancers cannot be instantiated, the
      // request fails with that error, left to the filters without a scope
      return super.next(err, ctx);
    }
    return exceptionsHandler.next(exception, ctx);
  }
}

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
    private readonly applicationRef: HttpServer,
    private readonly injector: Injector,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: RouterProxyCallback,
    moduleKey: string | undefined,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionsHandler {
    if (inquirerId || isEmptyArray(this.config.getGlobalRequestFilters())) {
      return this.createHandler(
        new ExceptionsHandler(this.applicationRef),
        instance,
        callback,
        moduleKey,
        contextId,
        inquirerId,
      );
    }
    const deferredHandler = new DeferredExceptionsHandler(
      this.applicationRef,
      async ctx => {
        const requestContextId =
          contextId === STATIC_CONTEXT
            ? this.getRequestContextId(ctx.switchToHttp().getRequest())
            : contextId;
        await this.loadScopedGlobalFilters(requestContextId);
        return this.createHandler(
          new ExceptionsHandler(this.applicationRef),
          instance,
          callback,
          moduleKey,
          requestContextId,
        );
      },
    );
    // What the deferred handler falls back to: the filters without a scope
    return this.createHandler(deferredHandler, instance, callback, moduleKey);
  }

  public getGlobalMetadata<T extends unknown[]>(
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
          // Without a controller, a transient filter is its own inquirer
          // (see "loadScopedGlobalFilters()")
          inquirerId ?? wrapper.id,
        ),
      )
      .filter(host => !!host)
      .map(host => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }

  private createHandler<T extends ExceptionsHandler>(
    exceptionHandler: T,
    instance: Controller,
    callback: RouterProxyCallback,
    moduleKey: string | undefined,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    this.moduleContext = moduleKey!;

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

  /**
   * Request-scoped and transient global filters are instantiated along with
   * the controller that handles the request. A handler that is not built for
   * a controller has to instantiate them for the request itself, as
   * "Injector#loadPerContext()" does: each filter is its own inquirer.
   */
  private async loadScopedGlobalFilters(contextId: ContextId) {
    const scopedFilterWrappers =
      this.config.getGlobalRequestFilters() as InstanceWrapper[];
    await Promise.all(
      scopedFilterWrappers.map(wrapper =>
        this.injector.loadInjectable(
          wrapper,
          wrapper.host!,
          contextId,
          wrapper,
        ),
      ),
    );
  }

  private getRequestContextId<T extends Record<any, unknown> = any>(
    request: T,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = this.areScopedGlobalFiltersDurable()
        ? contextId.payload
        : Object.assign(request, contextId.payload);
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }

  /**
   * Outside of a controller, the scoped global filters are the only
   * request-scoped tree, so they decide whether the context is durable (see
   * "InstanceWrapper#isDependencyTreeDurable()").
   */
  private areScopedGlobalFiltersDurable(): boolean {
    const requestScopedWrappers = (
      this.config.getGlobalRequestFilters() as InstanceWrapper[]
    ).filter(wrapper => !wrapper.isDependencyTreeStatic());
    return (
      requestScopedWrappers.length > 0 &&
      requestScopedWrappers.every(wrapper => wrapper.isDependencyTreeDurable())
    );
  }
}
