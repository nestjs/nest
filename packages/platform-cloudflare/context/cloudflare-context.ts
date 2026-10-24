import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type {
  CloudflareExecutionContext,
  CloudflareRequestContext,
} from '../interfaces/cloudflare-context.interface.js';

const storage = new AsyncLocalStorage<CloudflareRequestContext>();

/**
 * Runs `fn` with `context` as the Cloudflare context returned by
 * {@link getCloudflareContext}. Called by the handler that
 * `createWorkerHandler()` returns, around every request it dispatches.
 */
export function runWithCloudflareContext<T>(
  context: CloudflareRequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/**
 * Returns the bindings (`env`), the `ExecutionContext` and the `cf` metadata
 * of the request being handled.
 *
 * Throws when called outside of a request dispatched by `createWorkerHandler()`
 * (e.g. from a provider constructor or a module initialization hook that runs
 * on bootstrap without a request), so as not to hand out the context of an
 * unrelated request.
 *
 * @publicApi
 */
export function getCloudflareContext<
  Env = Record<string, unknown>,
>(): CloudflareRequestContext<Env> {
  const context = storage.getStore();
  if (!context) {
    throw new Error(
      'The Cloudflare context is only available while handling a request dispatched by "createWorkerHandler()".',
    );
  }
  return context as CloudflareRequestContext<Env>;
}

/**
 * Injectable access to {@link getCloudflareContext}. The provider is a
 * singleton: every getter reads the context of the request being handled, so
 * read them when a request is handled, rather than once in a constructor.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class CatsService {
 *   constructor(private readonly cloudflare: CloudflareContext<Env>) {}
 *
 *   findOne(id: string) {
 *     return this.cloudflare.env.CATS.get(id, 'json');
 *   }
 * }
 * ```
 *
 * @publicApi
 */
@Injectable()
export class CloudflareContext<Env = Record<string, unknown>> {
  /**
   * The bindings of the Worker (KV namespaces, D1 databases, R2 buckets,
   * secrets, variables...).
   */
  get env(): Env {
    return getCloudflareContext<Env>().env;
  }

  /**
   * The `ExecutionContext` of the request, e.g. for `waitUntil()`.
   */
  get ctx(): CloudflareExecutionContext {
    return getCloudflareContext<Env>().ctx;
  }

  /**
   * The `cf` metadata of the request (country, colo, ...), if any.
   */
  get cf(): Record<string, unknown> | undefined {
    return getCloudflareContext<Env>().cf;
  }

  /**
   * Extends the lifetime of the Worker invocation until `promise` settles,
   * e.g. to send analytics once the response is out.
   */
  waitUntil(promise: Promise<unknown>): void {
    this.ctx.waitUntil(promise);
  }
}
