/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-namespace */
import {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import fp from 'fastify-plugin';
import { safeDecodeURI } from 'find-my-way/lib/url-sanitizer';
import * as http from 'node:http';
import { Path, pathToRegexp } from 'path-to-regexp';
import reusify = require('reusify');

export type MiddlewareFn<
  Req extends { url: string; originalUrl?: string },
  Res extends { finished?: boolean; writableEnded?: boolean },
  Ctx = unknown,
> = (req: Req, res: Res, next: (err?: unknown) => void) => void;

interface MiddlewareEntry<
  Req extends { url: string; originalUrl?: string },
  Res extends { finished?: boolean; writableEnded?: boolean },
  Ctx,
> {
  regexp?: RegExp;
  fn: MiddlewareFn<Req, Res, Ctx>;
}

/**
 * A clone of `@fastify/middie` engine https://github.com/fastify/middie
 * with an extra vulnerability fix. Path is now decoded before matching to
 * avoid bypassing middleware with encoded characters.
 */
function middie<
  Req extends { url: string; originalUrl?: string },
  Res extends { finished?: boolean; writableEnded?: boolean },
  Ctx = unknown,
>(complete: (err: unknown, req: Req, res: Res, ctx: Ctx) => void) {
  const middlewares: MiddlewareEntry<Req, Res, Ctx>[] = [];
  const pool = reusify(Holder as any);

  return {
    use,
    run,
  };

  function use(
    this: unknown,
    url:
      | string
      | null
      | MiddlewareFn<Req, Res, Ctx>
      | MiddlewareFn<Req, Res, Ctx>[],
    f?: MiddlewareFn<Req, Res, Ctx> | MiddlewareFn<Req, Res, Ctx>[],
  ) {
    if (f === undefined) {
      f = url as MiddlewareFn<Req, Res, Ctx> | MiddlewareFn<Req, Res, Ctx>[];
      url = null;
    }

    let regexp: RegExp | undefined;
    if (typeof url === 'string') {
      const pathRegExp = pathToRegexp(sanitizePrefixUrl(url) as Path, {
        end: false,
      });
      regexp = pathRegExp.regexp;
    }

    if (Array.isArray(f)) {
      for (const val of f) {
        middlewares.push({ regexp, fn: val });
      }
    } else {
      middlewares.push({ regexp, fn: f });
    }

    return this;
  }

  function run(req: Req, res: Res, ctx: Ctx) {
    if (!middlewares.length) {
      complete(null, req, res, ctx);
      return;
    }

    req.originalUrl = req.url;

    const holder = pool.get() as any as HolderInstance;
    holder.req = req;
    holder.res = res;
    holder.url = sanitizeUrl(req.url);
    holder.context = ctx;
    holder.done();
  }

  interface HolderInstance {
    req: Req | null;
    res: Res | null;
    url: string | null;
    context: Ctx | null;
    i: number;
    done: (err?: unknown) => void;
  }

  function Holder(this: HolderInstance) {
    this.req = null;
    this.res = null;
    this.url = null;
    this.context = null;
    this.i = 0;

    const that = this;

    this.done = function (err?: unknown) {
      const req = that.req!;
      const res = that.res!;
      const url = that.url!;
      const context = that.context!;
      const i = that.i++;

      req.url = req.originalUrl!;

      if (res.finished === true || res.writableEnded === true) {
        cleanup();
        return;
      }

      if (err || middlewares.length === i) {
        complete(err, req, res, context);
        cleanup();
      } else {
        const { fn, regexp } = middlewares[i];

        if (regexp) {
          // Decode URL before matching to avoid bypassing middleware
          const decodedUrl = safeDecodeURI(url).path;
          const result = regexp.exec(decodedUrl);
          if (result) {
            req.url = req.url.replace(result[0], '');
            if (req.url[0] !== '/') req.url = '/' + req.url;
            fn(req, res, that.done);
          } else {
            that.done();
          }
        } else {
          fn(req, res, that.done);
        }
      }
    };

    function cleanup() {
      that.req = null;
      that.res = null;
      that.context = null;
      that.i = 0;
      pool.release(that as any);
    }
  }
}

function sanitizeUrl(url: string): string {
  for (let i = 0, len = url.length; i < len; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 63 || charCode === 35) {
      return url.slice(0, i);
    }
  }
  return url;
}

function sanitizePrefixUrl(url: string): string {
  if (url === '/') return '';
  if (url[url.length - 1] === '/') return url.slice(0, -1);
  return url;
}

const kMiddlewares = Symbol('fastify-middie-middlewares');
const kMiddie = Symbol('fastify-middie-instance');
const kMiddieHasMiddlewares = Symbol('fastify-middie-has-middlewares');

const supportedHooksWithPayload = [
  'onError',
  'onSend',
  'preParsing',
  'preSerialization',
] as const;

const supportedHooksWithoutPayload = [
  'onRequest',
  'onResponse',
  'onTimeout',
  'preHandler',
  'preValidation',
] as const;

const supportedHooks = [
  ...supportedHooksWithPayload,
  ...supportedHooksWithoutPayload,
] as const;

type SupportedHook = (typeof supportedHooks)[number];

interface MiddieOptions {
  hook?: SupportedHook;
}

function fastifyMiddie(
  fastify: FastifyInstance,
  options: MiddieOptions,
  next: (err?: Error) => void,
) {
  fastify.decorate('use', use as any);
  fastify[kMiddlewares] = [];
  fastify[kMiddieHasMiddlewares] = false;
  fastify[kMiddie] = middie(onMiddieEnd);

  const hook = options.hook || 'onRequest';

  if (!supportedHooks.includes(hook)) {
    next(new Error(`The hook "${hook}" is not supported by fastify-middie`));
    return;
  }

  fastify
    .addHook(
      hook,
      supportedHooksWithPayload.includes(hook as any)
        ? runMiddieWithPayload
        : runMiddie,
    )
    .addHook('onRegister', onRegister);

  function use(this: FastifyInstance, path: string | null, fn?: Function) {
    if (typeof path === 'string') {
      const prefix = this.prefix;
      path = prefix + (path === '/' && prefix.length > 0 ? '' : path);
    }

    this[kMiddlewares].push([path, fn]);

    if (fn == null) {
      this[kMiddie].use(path);
    } else {
      this[kMiddie].use(path, fn);
    }

    this[kMiddieHasMiddlewares] = true;
    return this;
  }

  function runMiddie(
    this: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
    next: HookHandlerDoneFunction,
  ) {
    if (this[kMiddieHasMiddlewares]) {
      const raw = req.raw as any;
      raw.id = req.id;
      raw.hostname = req.hostname;
      raw.protocol = req.protocol;
      raw.ip = req.ip;
      raw.ips = req.ips;
      raw.log = req.log;
      (req.raw as any).query = req.query;
      (reply.raw as any).log = req.log;
      if (req.body !== undefined) (req.raw as any).body = req.body;
      this[kMiddie].run(req.raw, reply.raw, next);
    } else {
      next();
    }
  }

  function runMiddieWithPayload(
    this: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply,
    _payload: unknown,
    next: HookHandlerDoneFunction,
  ) {
    runMiddie.bind(this)(req, reply, next);
  }

  function onMiddieEnd(
    err: unknown,
    _req: any,
    _res: any,
    next: (err?: unknown) => void,
  ) {
    next(err);
  }

  function onRegister(instance: FastifyInstance) {
    const middlewares = instance[kMiddlewares].slice() as Array<Array<unknown>>;
    instance[kMiddlewares] = [];
    instance[kMiddie] = middie(onMiddieEnd);
    instance[kMiddieHasMiddlewares] = false;
    instance.decorate('use', use as any);
    for (const middleware of middlewares) {
      (instance.use as any)(...middleware);
    }
  }

  next();
}

/* @eslint-disable-next-line @typescript-eslint/no-namespace */
declare namespace fastifyMiddie {
  export interface FastifyMiddieOptions {
    hook?:
      | 'onRequest'
      | 'preParsing'
      | 'preValidation'
      | 'preHandler'
      | 'preSerialization'
      | 'onSend'
      | 'onResponse'
      | 'onTimeout'
      | 'onError';
  }

  type FastifyMiddie =
    FastifyPluginCallback<fastifyMiddie.FastifyMiddieOptions>;

  export interface IncomingMessageExtended {
    body?: any;
    query?: any;
  }
  export type NextFunction = (err?: any) => void;
  export type SimpleHandleFunction = (
    req: http.IncomingMessage & IncomingMessageExtended,
    res: http.ServerResponse,
  ) => void;
  export type NextHandleFunction = (
    req: http.IncomingMessage & IncomingMessageExtended,
    res: http.ServerResponse,
    next: NextFunction,
  ) => void;

  export type Handler = SimpleHandleFunction | NextHandleFunction;

  export const fastifyMiddie: FastifyMiddie;
  export { fastifyMiddie as default };
}

declare module 'fastify' {
  interface FastifyInstance {
    use(fn: fastifyMiddie.Handler): this;
    use(route: string, fn: fastifyMiddie.Handler): this;
    use(routes: string[], fn: fastifyMiddie.Handler): this;
  }
}

/**
 * A clone of `@fastify/middie` engine https://github.com/fastify/middie
 * with an extra vulnerability fix. Path is now decoded before matching to
 * avoid bypassing middleware with encoded characters.
 */
export default fp(fastifyMiddie, {
  fastify: '5.x',
  name: '@fastify/middie',
});

export { fastifyMiddie };
