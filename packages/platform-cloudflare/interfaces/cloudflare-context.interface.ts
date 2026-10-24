/**
 * The subset of the Workers `ExecutionContext` that Nest relies on. Declared
 * here so that the package does not depend on `@cloudflare/workers-types`;
 * the `ctx` that the runtime passes to `fetch()` satisfies it.
 *
 * @publicApi
 */
export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/**
 * What the Workers runtime passes to the `fetch()` handler, alongside the
 * request.
 *
 * @publicApi
 */
export interface CloudflareRequestContext<Env = Record<string, unknown>> {
  /**
   * The bindings of the Worker.
   */
  env: Env;
  /**
   * The `ExecutionContext` of the invocation.
   */
  ctx: CloudflareExecutionContext;
  /**
   * The `cf` property of the incoming request.
   */
  cf?: Record<string, unknown>;
}
