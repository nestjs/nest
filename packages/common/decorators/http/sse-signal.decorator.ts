import { ExecutionContext } from '../../interfaces/index.js';
import { createParamDecorator } from './create-route-param-metadata.decorator.js';

/**
 * Symbol used to carry the per-request SSE `AbortController` on the request object.
 *
 * The controller is attached by the framework before the route handler runs and is
 * aborted when the client disconnects. Its signal is exposed to route handlers
 * through the `@SseSignal()` parameter decorator.
 *
 * @publicApi
 */
export const SSE_ABORT_CONTROLLER = Symbol('SSE_ABORT_CONTROLLER');

/**
 * Route handler parameter decorator that injects the `AbortSignal` associated
 * with a Server-Sent-Events (SSE) request.
 *
 * The signal represents the lifetime of the SSE response: it is aborted once the
 * stream terminates, whether because the client disconnected, the `Observable`
 * completed, or it errored. Tying setup-phase resources to the signal therefore
 * releases them exactly once on every exit path, including resources allocated
 * before the returned `Observable` exists — which would otherwise leak, since the
 * producer is never subscribed once the client has disconnected.
 *
 * Because the signal also aborts on normal completion, `signal.aborted` is only
 * meaningful as a "did the client go away?" check *during setup*, before the
 * `Observable` is returned; at that point the stream cannot have completed yet.
 * Cleanup wired to the `abort` event should be idempotent, as it may run
 * alongside the `Observable`'s own teardown.
 *
 * @example
 * ```ts
 * @Sse('stream')
 * async stream(@SseSignal() signal: AbortSignal): Promise<Observable<MessageEvent>> {
 *   const session = await createSession();
 *   if (signal.aborted) {
 *     await session.close();
 *     return EMPTY;
 *   }
 *   return new Observable(subscriber => {
 *     const stream = startGeneration(session);
 *     signal.addEventListener('abort', () => stream.stop(), { once: true });
 *     return () => stream.stop();
 *   });
 * }
 * ```
 *
 * @publicApi
 */
export const SseSignal: () => ParameterDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AbortSignal | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const controller: AbortController | undefined =
      request?.[SSE_ABORT_CONTROLLER];
    return controller?.signal;
  },
);
