import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import {
  type ContextId,
  type InstanceWrapper,
} from '../injector/instance-wrapper.js';
import { RouterProxyCallback } from '../router/router-proxy.js';
import { BaseExceptionFilterContext } from './base-exception-filter-context.js';
import { ExternalExceptionsHandler } from './external-exceptions-handler.js';
import {
  bindRequestContext,
  createContextInjector,
  hasUnconstructedScopedGlobalFilter,
  loadScopedGlobalFilters,
} from './scoped-global-exception-filters.js';
import type { Injector } from '../injector/injector.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  type ExceptionFilterMetadata,
  isEmptyArray,
} from '@nestjs/common/internal';
import type { ArgumentsHost } from '@nestjs/common';

/**
 * Builds the real filters once the call that failed is known. Without a
 * request, the handler falls back to the filters that have no scope.
 */
class DeferredExternalExceptionsHandler extends ExternalExceptionsHandler {
  constructor(
    private readonly open: (
      host: ArgumentsHost,
    ) => Promise<ExternalExceptionsHandler>,
  ) {
    super();
  }

  public next(exception: Error, host: ArgumentsHost): Promise<any> {
    return this.open(host).then(
      handler => handler.next(exception, host),
      (err: Error) => super.next(err, host),
    );
  }
}

export class ExternalExceptionFilterContext extends BaseExceptionFilterContext {
  private contextInjector?: Injector;

  constructor(
    container: NestContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: RouterProxyCallback,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExternalExceptionsHandler {
    if (!this.config || !hasUnconstructedScopedGlobalFilter(this.config)) {
      return this.createHandler(
        new ExternalExceptionsHandler(),
        instance,
        callback,
        module,
        contextId,
        inquirerId,
      );
    }
    const config = this.config;
    const unscopedHandler = this.createHandler(
      new ExternalExceptionsHandler(),
      instance,
      callback,
      module,
    );
    const deferredHandler = new DeferredExternalExceptionsHandler(
      async host => {
        const requestContextId =
          contextId === STATIC_CONTEXT
            ? this.contextIdForStaticHost(host, config)
            : contextId;
        if (!requestContextId) {
          return unscopedHandler;
        }
        await this.loadFilters(config, requestContextId);
        return this.createHandler(
          new ExternalExceptionsHandler(),
          instance,
          callback,
          module,
          requestContextId,
          inquirerId,
        );
      },
    );
    return this.createHandler(deferredHandler, instance, callback, module);
  }

  public getGlobalMetadata<T extends any[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as any[] as T;
    }
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
          inquirerId,
        ),
      )
      .filter(
        host => !!host && host.isResolved !== false && host.instance != null,
      )
      .map(host => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }

  private createHandler<T extends ExternalExceptionsHandler>(
    exceptionHandler: T,
    instance: Controller,
    callback: RouterProxyCallback,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    this.moduleContext = module;

    const filters = this.createContext<ExceptionFilterMetadata[]>(
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
    config: ApplicationConfig,
    contextId: ContextId,
  ): Promise<void> {
    this.contextInjector ??= createContextInjector(this.container);
    return loadScopedGlobalFilters(this.contextInjector, config, contextId);
  }

  /**
   * GraphQL calls the same handler with `(parent, args, context, info)`, so
   * argument 0 is not the request. Only an HTTP or WebSocket host has it there.
   * No request means the scoped filters cannot be built for this call.
   */
  private contextIdForStaticHost(
    host: ArgumentsHost,
    config: ApplicationConfig,
  ): ContextId | undefined {
    const type = host.getType();
    if (type !== 'http' && type !== 'ws') {
      return undefined;
    }
    const request = host.switchToHttp().getRequest();
    if (request == null || typeof request !== 'object') {
      return undefined;
    }
    return bindRequestContext(this.container, config, request);
  }
}
