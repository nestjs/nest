import { Observable } from 'rxjs';
import { ExecutionContext } from '../features/execution-context.interface.js';

/**
 * Interface describing a global preRequest hook for microservices.
 *
 * Hooks are executed before guards, allowing setup of context (e.g. AsyncLocalStorage)
 * that is available to all downstream enhancers.
 *
 * @example
 * ```typescript
 * const als = new AsyncLocalStorage();
 * app.registerPreRequestHook((context, next) => {
 *   als.enterWith({ correlationId: uuid() });
 *   return next();
 * });
 * ```
 *
 * @publicApi
 */
export interface PreRequestHook {
  (
    context: ExecutionContext,
    next: () => Observable<unknown>,
  ): Observable<unknown>;
}
