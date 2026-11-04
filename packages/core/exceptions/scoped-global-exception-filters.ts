import { ApplicationConfig } from '../application-config.js';
import { ContextIdFactory } from '../helpers/context-id-factory.js';
import { NestContainer } from '../injector/container.js';
import { Injector } from '../injector/injector.js';
import {
  type ContextId,
  type InstanceWrapper,
} from '../injector/instance-wrapper.js';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants.js';

/**
 * Same injector options the microservice and HTTP stacks use, so a filter
 * loaded outside a controller is decorated like one loaded with its host.
 */
export function createContextInjector(container: NestContainer): Injector {
  return new Injector({
    preview: container.contextOptions?.preview ?? false,
    instanceDecorator: container.contextOptions?.instrument?.instanceDecorator,
  });
}

/**
 * A request-scoped filter, or a transient one whose own dependencies are not
 * static, has no constructed instance on the static context. A transient
 * filter whose tree is static was already constructed for its host, and
 * looking it up under a new context id would run the prototype instead.
 */
export function hasUnconstructedScopedGlobalFilter(
  config: ApplicationConfig,
): boolean {
  return config
    .getGlobalRequestFilters()
    .some(wrapper => !wrapper.isDependencyTreeStatic());
}

/**
 * A handler that is not built for one controller has only the scoped global
 * filters as its request-scoped tree, so they decide whether the context is
 * durable. See `InstanceWrapper#isDependencyTreeDurable()`.
 */
export function areScopedGlobalFiltersDurable(
  config: ApplicationConfig,
): boolean {
  const requestScopedWrappers = config
    .getGlobalRequestFilters()
    .filter(wrapper => !wrapper.isDependencyTreeStatic());
  return (
    requestScopedWrappers.length > 0 &&
    requestScopedWrappers.every(wrapper => wrapper.isDependencyTreeDurable())
  );
}

/**
 * Attaches `request` to a context id the way a controller handler does, and
 * reuses the id already stored on it. A second call for the same request must
 * not register a second provider.
 */
export function bindRequestContext(
  container: NestContainer,
  config: ApplicationConfig,
  request: object,
): ContextId {
  const contextId = ContextIdFactory.getByRequest(
    request as Record<string, unknown>,
  );
  const withContextId = request as Record<symbol, ContextId | undefined>;
  if (!withContextId[REQUEST_CONTEXT_ID]) {
    Object.defineProperty(request, REQUEST_CONTEXT_ID, {
      value: contextId,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    const requestProviderValue = areScopedGlobalFiltersDurable(config)
      ? contextId.payload
      : Object.assign(request, contextId.payload);
    container.registerRequestProvider(requestProviderValue, contextId);
  }
  return contextId;
}

/**
 * Instantiates each scoped global filter for `contextId`. Each filter is its
 * own inquirer, which is where a transient instance is stored; request-scoped
 * lookup ignores the inquirer. A wrapper with no host is skipped: failing the
 * load here would replace the exception the filter was meant to handle.
 */
export async function loadScopedGlobalFilters(
  injector: Injector,
  config: ApplicationConfig,
  contextId: ContextId,
): Promise<void> {
  const wrappers = config.getGlobalRequestFilters() as InstanceWrapper[];
  await Promise.all(
    wrappers.map(wrapper => {
      if (!wrapper.host) {
        return;
      }
      return injector.loadInjectable(wrapper, wrapper.host, contextId, wrapper);
    }),
  );
}
