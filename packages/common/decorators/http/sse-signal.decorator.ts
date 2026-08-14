import { ExecutionContext } from '../../interfaces';
import { createParamDecorator } from './create-route-param-metadata.decorator';

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
 * The signal is aborted when the client disconnects. Async `@Sse()` handlers can
 * use it to stop in-flight setup work and clean up resources allocated before the
 * returned `Observable` is created — resources that would otherwise leak because
 * the producer `Observable` is never subscribed once the client has disconnected.
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
