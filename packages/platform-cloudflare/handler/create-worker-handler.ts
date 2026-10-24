import type { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CloudflareAdapter } from '../adapters/cloudflare-adapter.js';
import { runWithCloudflareContext } from '../context/cloudflare-context.js';
import type {
  CloudflareExecutionContext,
  CloudflareRequestContext,
} from '../interfaces/cloudflare-context.interface.js';

/**
 * Held in a variable so that bundlers leave the import to the runtime, and so
 * that the package can still be imported (e.g. by unit tests) outside of it.
 */
const CLOUDFLARE_NODE_MODULE = 'cloudflare:node';

interface CloudflareNodeModule {
  handleAsNodeRequest(port: number, request: Request): Promise<Response>;
}

/**
 * @publicApi
 */
export interface WorkerHandlerOptions<Env = Record<string, unknown>> {
  /**
   * Options passed to `NestFactory.create()`. `abortOnError` defaults to
   * `false`: a failed bootstrap rejects the request that triggered it, and the
   * next request tries again, instead of calling `process.abort()`.
   */
  appOptions?: NestApplicationOptions;
  /**
   * Configures the application before it is initialized, i.e. what `main.ts`
   * does between `NestFactory.create()` and `app.listen()` on Node.js (global
   * pipes, prefix, versioning, CORS...). Runs while the first request is
   * handled, so `getCloudflareContext()` returns its bindings.
   */
  configure?: (app: NestExpressApplication, env: Env) => void | Promise<void>;
  /**
   * The adapter to create the application with. Defaults to a new
   * {@link CloudflareAdapter}.
   */
  adapter?: CloudflareAdapter;
}

/**
 * @publicApi
 */
export interface WorkerHandler<Env = Record<string, unknown>> {
  /**
   * The `fetch()` handler of the Worker.
   */
  fetch(
    request: Request,
    env: Env,
    ctx: CloudflareExecutionContext,
  ): Promise<Response>;
  /**
   * Returns the application, bootstrapping it on first use, e.g. to resolve
   * providers from a `scheduled()` or `queue()` handler.
   */
  getApp(
    env: Env,
    ctx: CloudflareExecutionContext,
  ): Promise<NestExpressApplication>;
}

/**
 * Creates the handler of a Worker that serves a Nest application.
 *
 * The application is bootstrapped once per isolate, on the first request, and
 * reused by the following ones. Each request is handed to the application
 * through the `node:http` support of the runtime, with its bindings available
 * to providers through `CloudflareContext`. Requires the `nodejs_compat`
 * compatibility flag and a compatibility date of 2025-09-01 or later.
 *
 * @example
 * ```ts
 * // src/worker.ts
 * export default createWorkerHandler(AppModule, {
 *   configure: app => app.useGlobalPipes(new ValidationPipe()),
 * });
 * ```
 *
 * @param module The root module of the application.
 * @param options See {@link WorkerHandlerOptions}.
 *
 * @publicApi
 */
export function createWorkerHandler<Env = Record<string, unknown>>(
  module: any,
  options: WorkerHandlerOptions<Env> = {},
): WorkerHandler<Env> {
  let bootstrap: Promise<{ app: NestExpressApplication; port: number }> | null =
    null;
  let nodeModule: Promise<CloudflareNodeModule> | null = null;

  const createApp = async (env: Env) => {
    const adapter = options.adapter ?? new CloudflareAdapter();
    const app = await NestFactory.create<NestExpressApplication>(
      module,
      adapter,
      { abortOnError: false, ...options.appOptions },
    );
    await options.configure?.(app, env);
    // Port 0 lets the runtime pick a free routing key, so several handlers
    // can live in the same Worker
    await app.listen(0);
    const port = adapter.getPort();
    if (port === undefined) {
      throw new Error('The Cloudflare adapter did not report a port');
    }
    return { app, port };
  };

  const getBootstrap = (env: Env) => {
    bootstrap ??= createApp(env).catch(err => {
      // Let the next request try again rather than failing every request
      // served by this isolate
      bootstrap = null;
      throw err;
    });
    return bootstrap;
  };

  const getNodeModule = () => {
    nodeModule ??= (
      import(CLOUDFLARE_NODE_MODULE) as Promise<CloudflareNodeModule>
    ).catch(err => {
      nodeModule = null;
      throw err;
    });
    return nodeModule;
  };

  const withContext = <T>(
    env: Env,
    ctx: CloudflareExecutionContext,
    cf: Record<string, unknown> | undefined,
    fn: () => Promise<T>,
  ) =>
    runWithCloudflareContext({ env, ctx, cf } as CloudflareRequestContext, fn);

  return {
    fetch(request, env, ctx) {
      const cf = (request as { cf?: Record<string, unknown> }).cf;
      return withContext(env, ctx, cf, async () => {
        const [{ port }, { handleAsNodeRequest }] = await Promise.all([
          getBootstrap(env),
          getNodeModule(),
        ]);
        return handleAsNodeRequest(port, request);
      });
    },
    getApp(env, ctx) {
      return withContext(env, ctx, undefined, async () => {
        const { app } = await getBootstrap(env);
        return app;
      });
    },
  };
}
