import { iterate } from 'iterare';
import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler.js';
import {
  EXCEPTION_FILTERS_METADATA,
  type Controller,
  isEmptyArray,
} from '@nestjs/common/internal';
import type { ApplicationConfig, NestContainer } from '@nestjs/core';
import {
  BaseExceptionFilterContext,
  STATIC_CONTEXT,
  type InstanceWrapper,
} from '@nestjs/core/internal';

/**
 * A filter class that has not been instantiated in a context (or for an
 * inquirer) is represented there by an object created from its prototype.
 * Its "catch()" would run without its constructor having been called, i.e.
 * without its dependencies. Filters given as value or factory providers have
 * no constructor to call.
 *
 * Checked here rather than through the "isInstantiated()" method of
 * "BaseExceptionFilterContext", which a supported "@nestjs/core" may not have.
 */
function isInstantiated(
  wrapper: InstanceWrapper,
  host: { isConstructorCalled?: boolean },
): boolean {
  return wrapper.isNotMetatype || !!host.isConstructorCalled;
}

/**
 * @publicApi
 */
export class ExceptionFiltersContext extends BaseExceptionFilterContext {
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
    this.moduleContext = module;

    const exceptionHandler = new RpcExceptionsHandler();
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
      .map(wrapper => ({
        wrapper,
        host: wrapper.getInstanceByContextId(
          this.getContextId(contextId, wrapper),
          inquirerId,
        ),
      }))
      // e.g. a request-scoped filter that the message did not instantiate
      .filter(({ wrapper, host }) => !!host && isInstantiated(wrapper, host))
      .map(({ host }) => host.instance)
      .toArray();

    return globalFilters.concat(scopedFilters) as T;
  }
}
