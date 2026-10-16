import { type HttpServer, Logger } from '@nestjs/common';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context.js';
import { ExceptionsHandler } from '../exceptions/exceptions-handler.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { RouterProxyCallback } from './router-proxy.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  private static readonly logger = new Logger(RouterExceptionFilters.name);
  // Applications already warned about their request-scoped or transient
  // global filters (see "getGlobalMetadata()")
  private static readonly warnedConfigs = new WeakSet<ApplicationConfig>();

  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
    private readonly applicationRef: HttpServer,
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
    this.moduleContext = moduleKey!;

    const exceptionHandler = new ExceptionsHandler(this.applicationRef);
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

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      this.warnAboutScopedGlobalFilters();
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
      .filter(host => !!host)
      .map(host => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }

  /**
   * Handlers that are not built for a controller (middleware, the "not found"
   * handler, the exception layer) have no request to resolve request-scoped
   * or transient global filters for, so these filters are left out.
   */
  private warnAboutScopedGlobalFilters() {
    if (
      isEmptyArray(this.config.getGlobalRequestFilters()) ||
      RouterExceptionFilters.warnedConfigs.has(this.config)
    ) {
      return;
    }
    RouterExceptionFilters.warnedConfigs.add(this.config);
    RouterExceptionFilters.logger.warn(
      'Global exception filters (APP_FILTER) with request or transient scope are not applied to exceptions thrown outside of controllers, e.g. in middleware, for unknown routes or while parsing the request body. Register a global filter without a scope as well to handle them.',
    );
  }
}
