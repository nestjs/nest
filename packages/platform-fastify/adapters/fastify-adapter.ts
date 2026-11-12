/* eslint-disable @typescript-eslint/no-floating-promises */
import { FastifyCorsOptions } from '@fastify/cors';
import {
  BadRequestException,
  HttpStatus,
  Logger,
  RawBodyRequest,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  isFunction,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { LegacyRouteConverter } from '@nestjs/core/router/legacy-route-converter';
import {
  FastifyBaseLogger,
  FastifyBodyParser,
  FastifyInstance,
  FastifyListenOptions,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyRegister,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
  HTTPMethods,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
  RequestGenericInterface,
  RouteGenericInterface,
  RouteOptions,
  RouteShorthandOptions,
  fastify,
} from 'fastify';
import * as Reply from 'fastify/lib/reply';
import { kErrorHandler, kRouteContext } from 'fastify/lib/symbols';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import {
  InjectOptions,
  Chain as LightMyRequestChain,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import { parse, pathToRegexp, Token } from 'path-to-regexp';
import { finished, Readable, Transform } from 'stream';
import { types } from 'util';
// Fastify uses `fast-querystring` internally to quickly parse URL query strings.
import { parse as querystringParse } from 'fast-querystring';
import { safeDecodeURI } from 'find-my-way/lib/url-sanitizer';
import {
  FASTIFY_ROUTE_CONFIG_METADATA,
  FASTIFY_ROUTE_CONSTRAINTS_METADATA,
  FASTIFY_ROUTE_SCHEMA_METADATA,
} from '../constants';
import { NestFastifyBodyParserOptions } from '../interfaces';
import {
  FastifyStaticOptions,
  FastifyViewOptions,
} from '../interfaces/external';
import { onResponseClose } from './utils/on-response-close.util';

type FastifyAdapterBaseOptions<
  Server extends RawServerBase = RawServerDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  skipMiddie?: boolean;
};

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http2: true;
  https: http2.SecureServerOptions;
};

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http2: true;
  http2SessionTimeout?: number;
};

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  https: https.ServerOptions;
};

type FastifyHttpOptions<
  Server extends http.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyAdapterBaseOptions<Server, Logger> & {
  http: http.ServerOptions;
};

type VersionedRoute<TRequest, TResponse> = ((
  req: TRequest,
  res: TResponse,
  next: Function,
) => Function) & {
  version: VersionValue;
  versioningOptions: VersioningOptions;
};

/**
 * The following type assertion is valid as we enforce "middie" plugin registration
 * which enhances the FastifyRequest.RawRequest with the "originalUrl" property.
 * ref https://github.com/fastify/middie/pull/16
 * ref https://github.com/fastify/fastify/pull/559
 */
// The HTTP methods Nest routes requests for (see `RequestMethod`) that a
// Fastify instance does not support until they are added to it.
const NON_DEFAULT_HTTP_METHODS = [
  'SEARCH',
  'PROPFIND',
  'PROPPATCH',
  'MKCOL',
  'COPY',
  'MOVE',
  'LOCK',
  'UNLOCK',
];

type FastifyRawRequest<TServer extends RawServerBase> =
  RawRequestDefaultExpression<TServer> & { originalUrl?: string };

/**
 * The characters that stay percent-encoded in the path the router (and
 * `sanitizeUrl()`) decodes with `safeDecodeURI()`, and their escapes. "/" is
 * left out: "%2F" never stands for a "/" of a route path.
 */
const RESERVED_CHARACTERS = /[#$%&+,:;=?@]/;
const RESERVED_ESCAPES = /%(?:2[3-6bc]|3[abdf]|40)/gi;

// find-my-way reads a parameter name up to the next "(", "-", "." or "/",
// path-to-regexp only as long as it is an identifier
const FIND_MY_WAY_NAME_ENDS = '(-./';
const PATH_TO_REGEXP_NAME =
  /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;

/**
 * The first parameter name of a route path (find-my-way syntax) that
 * find-my-way reads otherwise than path-to-regexp: ":lat,:lng" is one
 * parameter, "lat,:lng", for find-my-way, and two for path-to-regexp.
 */
function getMisreadParamName(path: string): string | undefined {
  for (let i = 0; i < path.length; i++) {
    if (path[i] !== ':') {
      continue;
    }
    if (path[i + 1] === ':') {
      // "::" is an escaped colon
      i++;
      continue;
    }
    let end = i + 1;
    while (end < path.length && !FIND_MY_WAY_NAME_ENDS.includes(path[end])) {
      end++;
    }
    const name = path.slice(i + 1, end);
    if (!PATH_TO_REGEXP_NAME.test(name)) {
      return name;
    }
    i = end - 1;
  }
  return undefined;
}

/**
 * Whether the router compares some text of a path (path-to-regexp tokens)
 * with another form of the request path than `sanitizeUrl()` returns. It
 * decodes the reserved characters of a segment before it matches the text
 * that follows a parameter there (the "@" of ":user-avatar@2x.png" matches
 * "%40"), and it reaches a "%" only as "%25" ("%2525" in such a segment).
 */
function hasTextDecodedByRouter(
  tokens: Token[],
  segment = { hasParam: false },
): boolean {
  for (const token of tokens) {
    if (token.type === 'group') {
      // The segment may go on with or without the group
      const { hasParam } = segment;
      if (hasTextDecodedByRouter(token.tokens, segment)) {
        return true;
      }
      segment.hasParam ||= hasParam;
    } else if (token.type === 'text') {
      const slashIndex = token.value.indexOf('/');
      const segmentText =
        slashIndex === -1 ? token.value : token.value.slice(0, slashIndex);
      if (
        token.value.includes('%') ||
        (segment.hasParam && RESERVED_CHARACTERS.test(segmentText))
      ) {
        return true;
      }
      segment.hasParam &&= slashIndex === -1;
    } else {
      segment.hasParam = true;
    }
  }
  return false;
}

/**
 * @publicApi
 */
export class FastifyAdapter<
  TServer extends RawServerBase = RawServerDefault,
  TRawRequest extends FastifyRawRequest<TServer> = FastifyRawRequest<TServer>,
  TRawResponse extends RawReplyDefaultExpression<TServer> =
    RawReplyDefaultExpression<TServer>,
  TRequest extends FastifyRequest<
    RequestGenericInterface,
    TServer,
    TRawRequest
  > = FastifyRequest<RequestGenericInterface, TServer, TRawRequest>,
  TReply extends FastifyReply<
    RouteGenericInterface,
    TServer,
    TRawRequest,
    TRawResponse
  > = FastifyReply<RouteGenericInterface, TServer, TRawRequest, TRawResponse>,
  TInstance extends FastifyInstance<TServer, TRawRequest, TRawResponse> =
    FastifyInstance<TServer, TRawRequest, TRawResponse>,
> extends AbstractHttpAdapter<TServer, TRequest, TReply> {
  protected readonly logger = new Logger(FastifyAdapter.name);
  protected readonly instance: TInstance;
  protected _pathPrefix?: string;

  private _isParserRegistered: boolean;
  private onRequestHook?: (
    request: TRequest,
    reply: TReply,
    done: (err?: Error) => void,
  ) => void | Promise<void>;
  private onResponseHook?: (
    request: TRequest,
    reply: TReply,
    done: (err?: Error) => void,
  ) => void | Promise<void>;
  // The request hook `@fastify/cors` adds for `app.enableCors()`, which the
  // constructor's hook runs (see `enableCors()`)
  private corsHook?: (
    request: TRequest,
    reply: TReply,
    done: (err?: Error) => void,
  ) => void;
  private isMiddieRegistered: boolean;
  private pendingMiddlewares: Array<{ args: any[] }> = [];
  // The encapsulated contexts created since middie was registered (see
  // `registerMiddie()`), or since the adapter was created with `skipMiddie`
  private readonly middieContexts: TInstance[] = [];
  private versioningOptions?: VersioningOptions;
  // Exceptions thrown by the extractor of custom versioning, by raw request
  private readonly versionExtractorErrors = new WeakMap<object, unknown>();
  private readonly versionConstraint = {
    name: 'version',
    validate(value: unknown) {
      if (!isString(value) && !Array.isArray(value)) {
        throw new Error(
          'Version constraint should be a string or an array of strings.',
        );
      }
    },
    storage() {
      const versions = new Map<string, unknown>();
      return {
        get(version: string | Array<string>) {
          if (Array.isArray(version)) {
            return versions.get(version.find(v => versions.has(v))!) || null;
          }
          return versions.get(version) || null;
        },
        set(versionOrVersions: string | Array<string>, store: unknown) {
          const storeVersionConstraint = (version: string) =>
            versions.set(version, store);
          if (Array.isArray(versionOrVersions))
            versionOrVersions.forEach(storeVersionConstraint);
          else storeVersionConstraint(versionOrVersions);
        },
        del(version: string | Array<string>) {
          if (Array.isArray(version)) {
            version.forEach(v => versions.delete(v));
          } else {
            versions.delete(version);
          }
        },
        empty() {
          versions.clear();
        },
      };
    },
    deriveConstraint: (req: FastifyRequest) => {
      // Media Type (Accept Header) Versioning Handler
      if (this.versioningOptions?.type === VersioningType.MEDIA_TYPE) {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined = (req.headers?.[
          MEDIA_TYPE_HEADER
        ] || req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()]) as string;

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : '';

        return isUndefined(acceptHeaderVersionParameter)
          ? VERSION_NEUTRAL // No version was supplied
          : acceptHeaderVersionParameter.split(this.versioningOptions.key)[1];
      }
      // Header Versioning Handler
      else if (this.versioningOptions?.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | string[] | undefined =
          req.headers?.[this.versioningOptions.header] ||
          req.headers?.[this.versioningOptions.header.toLowerCase()];

        return isUndefined(customHeaderVersionParameter)
          ? VERSION_NEUTRAL // No version was supplied
          : customHeaderVersionParameter;
      }
      // Custom Versioning Handler
      else if (this.versioningOptions?.type === VersioningType.CUSTOM) {
        try {
          return this.versioningOptions.extractor(req);
        } catch (err) {
          // Fastify routes the request, and so calls the extractor, before
          // anything could catch the exception. It is passed to the error
          // handler from an `onRequest` hook instead (see the constructor).
          this.versionExtractorErrors.set(req, err);
          return undefined;
        }
      }
      return undefined;
    },
    mustMatchWhenDerived: false,
  };

  get isParserRegistered(): boolean {
    return !!this._isParserRegistered;
  }

  constructor(
    instanceOrOptions?:
      | TInstance
      | FastifyHttp2Options<any>
      | FastifyHttp2SecureOptions<any>
      | FastifyHttpsOptions<any>
      | FastifyHttpOptions<any>
      | FastifyAdapterBaseOptions<TServer>,
  ) {
    super();

    const instance =
      instanceOrOptions && (instanceOrOptions as TInstance).server
        ? instanceOrOptions
        : fastify({
            ...(instanceOrOptions as FastifyServerOptions),
            routerOptions: {
              ...this.getTopLevelRouterOptions(
                instanceOrOptions as FastifyServerOptions,
              ),
              ...(instanceOrOptions as FastifyServerOptions)?.routerOptions,
              constraints: {
                version: this.versionConstraint as any,
              },
            },
          });

    this.setInstance(instance);

    if ((instanceOrOptions as FastifyAdapterBaseOptions)?.skipMiddie) {
      this.isMiddieRegistered = true;
      // The application registers middie itself, at a time the adapter does
      // not know, so `registerMiddie()` never runs: the contexts are tracked
      // from the start instead (see `createMiddlewareFactory()`).
      this.trackMiddieContexts();
    }

    this.instance.addHook('onRequest', (request, reply, done) => {
      if (this.onRequestHook) {
        this.onRequestHook(request as TRequest, reply as TReply, done);
      } else {
        done();
      }
    });

    // The request hook of `app.enableCors()` (see `enableCors()`). Added here
    // for the same reason as the hook above: it must run before Nest
    // middleware, so that a preflight is answered before them and the
    // responses they end carry the CORS headers, as on Express.
    this.instance.addHook('onRequest', (request, reply, done) => {
      if (!this.corsHook) {
        return done();
      }
      this.corsHook(request as TRequest, reply as TReply, (err?: Error) => {
        this.copyCorsHeadersToRaw(reply as TReply);
        done(err);
      });
    });

    // Passes requests whose target middleware cannot be matched against to
    // the not-found handler (see `isRoutableRequestTarget()`). Added here,
    // like the hook above, so that it runs before Nest middleware. A request
    // the router did not match is already on its way to the not-found
    // handler.
    this.instance.addHook('onRequest', (request, reply, done) => {
      if (request.is404 || this.isRoutableRequestTarget(request.raw.url)) {
        done();
      } else {
        reply.callNotFound();
      }
    });

    // Passes an exception thrown by the extractor of custom versioning while
    // Fastify routed the request (see `versionConstraint`) to the error
    // handler, for matched and unmatched routes alike. Added here, like the
    // hooks above, so that it runs before Nest middleware.
    this.instance.addHook('onRequest', (request, _reply, done) => {
      if (!this.versionExtractorErrors.has(request.raw)) {
        done();
        return;
      }
      const err = this.versionExtractorErrors.get(request.raw);
      this.versionExtractorErrors.delete(request.raw);
      done(
        (err as Error) || new fastify.errorCodes.FST_ERR_SEND_UNDEFINED_ERR(),
      );
    });

    this.instance.addHook('onResponse', (request, reply, done) => {
      if (this.onResponseHook) {
        this.onResponseHook(request as TRequest, reply as TReply, done);
      } else {
        done();
      }
    });
  }

  public setOnRequestHook(
    hook: (
      request: TRequest,
      reply: TReply,
      done: (err?: Error) => void,
    ) => void | Promise<void>,
  ) {
    this.onRequestHook = hook;
  }

  public setOnResponseHook(
    hook: (
      request: TRequest,
      reply: TReply,
      done: (err?: Error) => void,
    ) => void | Promise<void>,
  ) {
    this.onResponseHook = hook;
  }

  public async init() {
    if (this.isMiddieRegistered) {
      return;
    }
    await this.registerMiddie();

    // Register any pending middlewares that were added before init
    if (this.pendingMiddlewares.length > 0) {
      for (const { args } of this.pendingMiddlewares) {
        (this.instance.use as any)(...args);
      }
      this.pendingMiddlewares = [];
    }
  }

  public listen(port: string | number, callback?: () => void): void;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): void;
  public listen(
    listenOptions: string | number | FastifyListenOptions,
    ...args: any[]
  ): void {
    const isFirstArgTypeofFunction = typeof args[0] === 'function';
    const callback = isFirstArgTypeofFunction ? args[0] : args[1];

    let options: Record<string, any>;
    if (
      typeof listenOptions === 'object' &&
      (listenOptions.host !== undefined ||
        listenOptions.port !== undefined ||
        listenOptions.path !== undefined)
    ) {
      // First parameter is an object with a path, port and/or host attributes
      options = listenOptions;
    } else {
      options = {
        port: +listenOptions,
      };
    }
    if (!isFirstArgTypeofFunction) {
      options.host = args[0];
    }
    return this.instance.listen(options, callback);
  }

  public get(...args: any[]) {
    return this.injectRouteOptions('GET', ...args);
  }

  public post(...args: any[]) {
    return this.injectRouteOptions('POST', ...args);
  }

  public head(...args: any[]) {
    return this.injectRouteOptions('HEAD', ...args);
  }

  public delete(...args: any[]) {
    return this.injectRouteOptions('DELETE', ...args);
  }

  public put(...args: any[]) {
    return this.injectRouteOptions('PUT', ...args);
  }

  public patch(...args: any[]) {
    return this.injectRouteOptions('PATCH', ...args);
  }

  public options(...args: any[]) {
    return this.injectRouteOptions('OPTIONS', ...args);
  }

  public search(...args: any[]) {
    return this.injectRouteOptions('SEARCH', ...args);
  }

  public query(...args: any[]) {
    return this.injectRouteOptions('QUERY', ...args);
  }

  public propfind(...args: any[]) {
    return this.injectRouteOptions('PROPFIND', ...args);
  }

  public proppatch(...args: any[]) {
    return this.injectRouteOptions('PROPPATCH', ...args);
  }

  public mkcol(...args: any[]) {
    return this.injectRouteOptions('MKCOL', ...args);
  }

  public copy(...args: any[]) {
    return this.injectRouteOptions('COPY', ...args);
  }

  public move(...args: any[]) {
    return this.injectRouteOptions('MOVE', ...args);
  }

  public lock(...args: any[]) {
    return this.injectRouteOptions('LOCK', ...args);
  }

  public unlock(...args: any[]) {
    return this.injectRouteOptions('UNLOCK', ...args);
  }

  public all(...args: any[]) {
    // Fastify registers the route for the methods the instance supports at
    // this point. The ones it lacks by default are added first, rather than
    // with the first route for them (see `injectRouteOptions()`), so that the
    // route serves them as well, whether it is registered before or after.
    NON_DEFAULT_HTTP_METHODS.forEach(method => this.addHttpMethod(method));
    const handlerRef = args[args.length - 1];
    args[args.length - 1] = this.requireNonEmptyParams(args[0], handlerRef);
    return (this.instance.all as any)(...args);
  }

  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute<TRequest, TReply> {
    if (!this.versioningOptions) {
      this.versioningOptions = versioningOptions;
    }
    const versionedRoute = handler as VersionedRoute<TRequest, TReply>;
    versionedRoute.version = version;
    return versionedRoute;
  }

  public reply(
    response: TRawResponse | TReply,
    body: any,
    statusCode?: number,
  ) {
    const fastifyReply: TReply = this.isNativeResponse(response)
      ? this.createReplyForRawResponse(response)
      : response;

    if (statusCode) {
      fastifyReply.status(statusCode);
    }
    if (body instanceof StreamableFile) {
      const file = body;
      const stream = file.getStream();
      // Once the reply was sent (e.g. by `handlerTimeout`), send() drops the
      // stream without consuming or destroying it.
      if (fastifyReply.sent && isFunction(stream?.destroy)) {
        stream.destroy();
      }
      const streamHeaders = file.getHeaders();
      if (
        fastifyReply.getHeader('Content-Type') === undefined &&
        streamHeaders.type !== undefined
      ) {
        fastifyReply.header('Content-Type', streamHeaders.type);
      }
      if (
        fastifyReply.getHeader('Content-Disposition') === undefined &&
        streamHeaders.disposition !== undefined
      ) {
        fastifyReply.header('Content-Disposition', streamHeaders.disposition);
      }
      if (
        fastifyReply.getHeader('Content-Length') === undefined &&
        streamHeaders.length !== undefined
      ) {
        fastifyReply.header('Content-Length', streamHeaders.length);
      }
      body = stream;
      // Fastify's HEAD route handler resumes a stream payload, and a route
      // declared for HEAD (or a raw response) pipes it into a response that
      // discards it, so the whole source would be read for nothing. Fastify
      // gets an empty stream instead, as an empty body would reset
      // Content-Length to 0.
      if (
        fastifyReply.raw?.req?.method === 'HEAD' &&
        isFunction(stream?.destroy)
      ) {
        stream.destroy();
        body = Readable.from([]);
      } else {
        if (fastifyReply.raw && isFunction(stream?.destroy)) {
          // Fastify destroys the stream once the response has closed. The
          // response of a pipelined request that waits behind others on the
          // connection may never close, even when the connection does.
          onResponseClose(fastifyReply.raw, () => {
            if (!stream.readableEnded) {
              stream.destroy();
            }
          });
        }
        if (stream?.readableObjectMode) {
          body = this.toWritableChunks(stream, file);
        }
      }
    }
    if (
      fastifyReply.getHeader('Content-Type') !== undefined &&
      fastifyReply.getHeader('Content-Type') !== 'application/json' &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      Logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
        FastifyAdapter.name,
      );
      fastifyReply.header('Content-Type', 'application/json');
    }
    return fastifyReply.send(body);
  }

  public status(response: TRawResponse | TReply, statusCode: number) {
    if (this.isNativeResponse(response)) {
      response.statusCode = statusCode;
      return response;
    }
    return (response as { code: Function }).code(statusCode);
  }

  public end(response: TReply, message?: string) {
    response.raw.end(message!);
  }

  public render(
    response: TReply & { view: Function },
    view: string,
    options: any,
  ) {
    return response && response.view(view, options);
  }

  public redirect(response: TReply, statusCode: number, url: string) {
    const code = statusCode ?? HttpStatus.FOUND;
    return response.status(code).redirect(url);
  }

  public setErrorHandler(handler: Parameters<TInstance['setErrorHandler']>[0]) {
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(handler: Function) {
    return this.instance.setNotFoundHandler(handler as any);
  }

  public getHttpServer<T = TServer>(): T {
    return this.instance.server as unknown as T;
  }

  public getInstance<T = TInstance>(): T {
    return this.instance as unknown as T;
  }

  public register<
    TRegister extends Parameters<
      FastifyRegister<FastifyInstance<TServer, TRawRequest, TRawResponse>>
    >,
  >(plugin: TRegister['0'], opts?: TRegister['1']) {
    return (this.instance.register as any)(plugin, opts);
  }

  public inject(): LightMyRequestChain;
  public inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  public inject(
    opts?: InjectOptions | string,
  ): LightMyRequestChain | Promise<LightMyRequestResponse> {
    return this.instance.inject(opts!);
  }

  public async close() {
    try {
      return await this.instance.close();
    } catch (err) {
      // Check if server is still running
      if (err.code !== 'ERR_SERVER_NOT_RUNNING') {
        throw err;
      }
      return;
    }
  }

  public initHttpServer() {
    this.httpServer = this.instance.server;
  }

  public useStaticAssets(options: FastifyStaticOptions) {
    return this.register(
      loadPackage('@fastify/static', 'FastifyAdapter.useStaticAssets()', () =>
        require('@fastify/static'),
      ),
      options,
    );
  }

  public setViewEngine(options: FastifyViewOptions | string) {
    if (isString(options)) {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
      process.exit(1);
    }
    return this.register(
      loadPackage('@fastify/view', 'FastifyAdapter.setViewEngine()', () =>
        require('@fastify/view'),
      ),
      options,
    );
  }

  public isHeadersSent(response: TReply): boolean {
    return response.sent;
  }

  public getHeader(response: any, name: string) {
    return response.getHeader(name);
  }

  public setHeader(response: TReply, name: string, value: string) {
    return response.header(name, value);
  }

  public appendHeader(response: any, name: string, value: string) {
    response.header(name, value);
  }

  public getRequestHostname(request: TRequest): string {
    return request.hostname;
  }

  public getRequestMethod(request: TRequest): string {
    return request.raw ? request.raw.method! : request.method;
  }

  public getRequestUrl(request: TRequest): string;
  public getRequestUrl(request: TRawRequest): string;
  public getRequestUrl(request: TRequest & TRawRequest): string {
    return this.getRequestOriginalUrl(request.raw || request);
  }

  public enableCors(options?: FastifyCorsOptions) {
    const hook = options?.hook;
    if (hook && hook !== 'onRequest') {
      // A later hook runs after Nest middleware wherever it is added
      this.register(
        import('@fastify/cors') as unknown as Parameters<
          TInstance['register']
        >[0],
        options,
      );
      return;
    }
    const registerCors = async (instance: TInstance) => {
      const { default: fastifyCors } = await import('@fastify/cors');
      // `@fastify/cors` adds its request hook to the instance it is given,
      // which would run after middie: the hook is kept so that the hook added
      // in the constructor runs it instead
      const corsInstance = new Proxy(instance, {
        get: (target, prop) => {
          if (prop === 'addHook') {
            return (
              name: string,
              hookFn: NonNullable<typeof this.corsHook>,
            ) => {
              if (name === 'onRequest' && !this.corsHook) {
                this.corsHook = hookFn;
                return corsInstance;
              }
              return (target.addHook as Function).call(target, name, hookFn);
            };
          }
          const value = Reflect.get(target, prop, target);
          return isFunction(value) ? value.bind(target) : value;
        },
      });
      // As `register()` would, call a function that takes the instance for
      // the options; one that takes `(request, callback)` is the options
      // delegate of `@fastify/cors` (and the `cors` option)
      const corsOptions =
        isFunction(options) && (options as Function).length < 2
          ? (options as Function)(instance)
          : options;
      await new Promise<void>((resolve, reject) =>
        (fastifyCors as unknown as FastifyPluginCallback<FastifyCorsOptions>)(
          corsInstance as unknown as FastifyInstance,
          corsOptions ?? {},
          err => (err ? reject(err) : resolve()),
        ),
      );
    };
    // Like `fastify-plugin`: register on the root context, not a child one.
    Object.assign(registerCors, {
      [Symbol.for('skip-override')]: true,
      [Symbol.for('fastify.display-name')]: 'nestjs-cors',
    });
    this.instance.register(registerCors as any);
  }

  /**
   * Copies the headers `@fastify/cors` set on the reply to the Node.js
   * response, so that a response a middleware ends itself, or the error
   * response of a middleware that throws (sent through a new reply), carries
   * them too. Fastify merges them into the response it sends, in which the
   * reply's own values win.
   */
  private copyCorsHeadersToRaw(reply: TReply) {
    if (reply.raw.headersSent) {
      return;
    }
    const headers = reply.getHeaders();
    for (const name of Object.keys(headers)) {
      const value = headers[name];
      if (
        !isUndefined(value) &&
        (name === 'vary' || name.startsWith('access-control-'))
      ) {
        reply.raw.setHeader(name, value);
      }
    }
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    if (this._isParserRegistered) {
      return;
    }

    this.registerUrlencodedContentParser(rawBody);
    this.registerJsonContentParser(rawBody);

    this._isParserRegistered = true;
    this._pathPrefix = prefix
      ? !prefix.startsWith('/')
        ? `/${prefix}`
        : prefix
      : undefined;
  }

  public useBodyParser(
    type: string | string[] | RegExp,
    rawBody: boolean,
    options?: NestFastifyBodyParserOptions,
    parser?: FastifyBodyParser<Buffer, TServer>,
  ) {
    const parserOptions = {
      ...(options || {}),
      parseAs: 'buffer' as const,
    };

    this.getInstance().addContentTypeParser<Buffer>(
      type,
      parserOptions,
      (
        req: RawBodyRequest<FastifyRequest<any, TServer, TRawRequest>>,
        body: Buffer,
        done,
      ) => {
        if (rawBody === true && Buffer.isBuffer(body)) {
          req.rawBody = body;
        }

        if (parser) {
          this.runBodyParser(parser, req, body, done);
          return;
        }

        done(null, body);
      },
    );

    // To avoid the Nest application init to override our custom
    // body parser, we mark the parsers as registered.
    this._isParserRegistered = true;
  }

  /**
   * Runs a parser given to `useBodyParser()`, like `runMiddleware()` runs a
   * middleware: it completes once, a synchronous throw is passed to `done`,
   * and so is the rejection of the promise the parser returns, which Fastify
   * would not see (the content type parser above returns nothing). A parser
   * that declares `done` completes through it; the value any other one
   * resolves with is the parsed body. The promise is not returned to Fastify,
   * which would call `done` a second time for an async parser that calls it.
   */
  private runBodyParser(
    parser: FastifyBodyParser<Buffer, TServer>,
    req: FastifyRequest<any, TServer, TRawRequest>,
    body: Buffer,
    done: (err: Error | null, body?: unknown) => void,
  ): void {
    let completed = false;
    const doneOnce = (err: Error | null, parsed?: unknown) => {
      if (completed) return;
      completed = true;
      done(err, parsed);
    };
    const fail = (err: Error) => {
      if (completed) {
        this.logger.error(err);
        return;
      }
      doneOnce(err || new fastify.errorCodes.FST_ERR_SEND_UNDEFINED_ERR());
    };
    try {
      const result: any = parser(req as any, body, doneOnce);
      if (result && typeof result.then === 'function') {
        result.then((parsed: unknown) => {
          if (parser.length < 3) {
            doneOnce(null, parsed);
          }
        }, fail);
      }
    } catch (err) {
      fail(err);
    }
  }

  public async createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): Promise<(path: string, callback: Function) => any> {
    if (!this.isMiddieRegistered) {
      await this.registerMiddie();
    }
    return (path: string, callback: Function) => {
      const hasEndOfStringCharacter = path.endsWith('$');
      path = hasEndOfStringCharacter ? path.slice(0, -1) : path;

      let normalizedPath = LegacyRouteConverter.tryConvert(path);

      // Fallback to "*path" to support plugins like GraphQL
      normalizedPath = normalizedPath === '/*path' ? '*path' : normalizedPath;

      // Normalize the path to support the prefix if it set in application
      if (
        this._pathPrefix &&
        !normalizedPath.startsWith(this._pathPrefix) &&
        (normalizedPath === '/' || normalizedPath === '')
      ) {
        normalizedPath = `${this._pathPrefix}${normalizedPath}`;
        if (normalizedPath.endsWith('/')) {
          normalizedPath = `${normalizedPath}{*path}`;
        }
      }

      try {
        const { matches, isMatchedByMiddie } = this.createPathMatcher(
          normalizedPath,
          hasEndOfStringCharacter,
        );

        const createMiddleware =
          (stripsPath: boolean) =>
          (req: any, res: any, next: (err?: Error) => void) => {
            const queryParamsIndex = req.originalUrl.indexOf('?');
            let pathname =
              queryParamsIndex >= 0
                ? req.originalUrl.slice(0, queryParamsIndex)
                : req.originalUrl;

            pathname = this.sanitizeUrl(pathname);

            if (normalizedPath) {
              if (!matches(pathname)) {
                return next();
              }
              if (stripsPath) {
                // Strips the path from "req.url", as @fastify/middie does
                // when it matches the path itself
                const suffixIndex = req.originalUrl.search(/[?#]/);
                req.url =
                  suffixIndex >= 0
                    ? `/${req.originalUrl.slice(suffixIndex)}`
                    : '/';
              }
            }
            this.runMiddleware(callback, req, res, next);
          };

        // The following type assertion is valid as we use import('@fastify/middie') rather than require('@fastify/middie')
        // ref https://github.com/fastify/middie/pull/55
        this.instance.use(
          isMatchedByMiddie ? normalizedPath : '/',
          createMiddleware(!isMatchedByMiddie),
        );
        // The contexts created since middie was registered have a copy of the
        // middleware of their parent without this one (see `registerMiddie()`).
        // It is registered there without its path, which middie would prefix
        // with the one of the context.
        for (const context of this.middieContexts) {
          // With `skipMiddie`, a context may be older than middie. It then
          // has no "use()" of its own and shares the middleware of the root,
          // which must not get this one a second time.
          if (Object.prototype.hasOwnProperty.call(context, 'use')) {
            context.use(createMiddleware(true));
          }
        }
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
  }

  /**
   * Matches the paths of a middleware (path-to-regexp syntax) with a request
   * path as `sanitizeUrl()` returns it, the way the router matches the route
   * of the same path. `isMatchedByMiddie` tells whether the RegExp of
   * @fastify/middie, which sees the request path in another form, matches the
   * same paths; the path must be matched with `matches()` otherwise.
   */
  private createPathMatcher(path: string, endsAtPath = false) {
    // A case-insensitive router lower-cases the decoded path, where some
    // characters only fold to ASCII ("%E2%84%AA", KELVIN SIGN, is routed as
    // "k"). The RegExp of @fastify/middie does not fold them.
    const { caseSensitive } = this.getRouteMatchingOptions();

    // Such a router lower-cases the paths of its routes too, with
    // "toLowerCase()", which the "i" flag of a RegExp does not follow for
    // every letter ("\u0130" lower-cases to "i\u0307"), so the path of the
    // middleware is lower-cased like the request path (see `sanitizeUrl()`)
    let { regexp: re } = pathToRegexp(
      caseSensitive ? path : path.toLowerCase(),
    );
    re = endsAtPath ? new RegExp(re.source + '$', re.flags) : re;

    // The router matches some text in a decoded form of the request path
    // (see `hasTextDecodedByRouter()`): such a path is also matched with the
    // reserved characters but "/" decoded, then with "%25" folded as well.
    // Where that decodes more than the router does, the middleware only runs
    // for more requests.
    const hasDecodedText = hasTextDecodedByRouter(parse(path).tokens);
    const matchesForm = (pathname: string) =>
      re.exec(pathname.endsWith('/') ? pathname : `${pathname}/`) !== null;
    const matches = (pathname: string) => {
      if (matchesForm(pathname)) {
        return true;
      }
      if (!hasDecodedText) {
        return false;
      }
      const decoded = pathname.replace(RESERVED_ESCAPES, decodeURIComponent);
      return (
        matchesForm(decoded) || matchesForm(decoded.replaceAll('%25', '%'))
      );
    };
    return { matches, isMatchedByMiddie: caseSensitive && !hasDecodedText };
  }

  private runMiddleware(
    middleware: Function,
    req: unknown,
    res: unknown,
    next: (err?: Error) => void,
  ): void {
    let completed = false;
    const nextOnce = (err?: Error) => {
      if (completed) return;
      completed = true;
      next(err);
    };
    try {
      // middie discards the return value, so the promise is observed here:
      // the proxies of `RouterProxy` reject when the exception layer throws,
      // and an async middleware passed to `use()` when it throws.
      // Its resolution is not passed to `next`, as a middleware that answers
      // the request does not call it.
      const result = middleware(req, res, nextOnce);
      if (result && typeof result.then === 'function') {
        result.then(undefined, (err: Error) => {
          if (completed) {
            this.logger.error(err);
            return;
          }
          nextOnce(err || new fastify.errorCodes.FST_ERR_SEND_UNDEFINED_ERR());
        });
      }
    } catch (err) {
      nextOnce(err);
    }
  }

  public getType(): string {
    return 'fastify';
  }

  // The return type is spelled out (rather than "RouteMatchingOptions") so
  // that the declarations still compile against an older "@nestjs/common"
  public getRouteMatchingOptions(): {
    caseSensitive: boolean;
    ignoreTrailingSlash: boolean;
    removesTrailingSlash: boolean;
    maxParamLength: number;
    useSemicolonDelimiter: boolean;
    caseSensitiveParamSuffix: boolean;
  } {
    const initialConfig = this.instance.initialConfig as FastifyServerOptions;
    // Absent when a Fastify instance created without it is passed in
    const routerOptions = (initialConfig.routerOptions ??
      {}) as Partial<FastifyServerOptions>;
    return {
      caseSensitive: !(
        routerOptions.caseSensitive === false ||
        initialConfig.caseSensitive === false
      ),
      ignoreTrailingSlash: !!(
        routerOptions.ignoreTrailingSlash || initialConfig.ignoreTrailingSlash
      ),
      // find-my-way trims the slash before it looks for a route
      removesTrailingSlash: true,
      maxParamLength: this.getMaxParamLength(initialConfig),
      // Read as "sanitizeUrl()" reads it
      useSemicolonDelimiter: !!(
        routerOptions.useSemicolonDelimiter ||
        initialConfig.useSemicolonDelimiter
      ),
      // find-my-way lower-cases the static parts of a path only, and matches
      // a parameter with the text after it in its segment as written
      caseSensitiveParamSuffix: true,
    };
  }

  /**
   * Returns the "maxParamLength" the router uses. The one of "routerOptions"
   * wins, but "initialConfig" fills it in with the default (100) when only
   * the top-level option is set, so the lower one is taken then. A value of
   * 0 means the default, as for find-my-way.
   */
  private getMaxParamLength(initialConfig: FastifyServerOptions): number {
    const defaultMaxParamLength = 100;
    const topLevel = initialConfig.maxParamLength || defaultMaxParamLength;
    const routerOptions = initialConfig.routerOptions as
      | Partial<FastifyServerOptions>
      | undefined;
    if (!routerOptions) {
      return topLevel;
    }
    const fromRouterOptions =
      routerOptions.maxParamLength || defaultMaxParamLength;
    return fromRouterOptions === defaultMaxParamLength
      ? Math.min(fromRouterOptions, topLevel)
      : fromRouterOptions;
  }

  public use(...args: any[]) {
    // middie neither observes the promise a middleware returns nor catches
    // what it throws once an earlier one called "next" asynchronously, so
    // each middleware is run like those of `createMiddlewareFactory()`
    args = args.map(arg => this.wrapMiddleware(arg));
    // Fastify requires @fastify/middie plugin to be registered before middleware can be used.
    // If middie is not registered yet, we queue the middleware and register it later during init.
    if (!this.isMiddieRegistered) {
      this.pendingMiddlewares.push({ args });
      return this;
    }
    return (this.instance.use as any)(...args);
  }

  private wrapMiddleware(arg: unknown): unknown {
    if (Array.isArray(arg)) {
      return arg.map(item => this.wrapMiddleware(item));
    }
    // A path is left as it is, and so is a function with more than three
    // parameters: with `skipMiddie`, "use()" belongs to the plugin the
    // application registered, which may tell error handlers by their arity
    if (!isFunction(arg) || arg.length > 3) {
      return arg;
    }
    const middleware = arg;
    return (req: unknown, res: unknown, next: (err?: Error) => void) =>
      this.runMiddleware(middleware, req, res, next);
  }

  protected registerWithPrefix(
    factory:
      | FastifyPluginCallback<any>
      | FastifyPluginAsync<any>
      | Promise<{ default: FastifyPluginCallback<any> }>
      | Promise<{ default: FastifyPluginAsync<any> }>,
    prefix = '/',
  ) {
    return this.instance.register(factory, { prefix });
  }

  /**
   * Fastify pipes a stream into the response, whose write() throws for a chunk
   * that is neither a string nor bytes, inside the "data" listener of pipe(),
   * where nothing catches it. A source in object mode (e.g. "Readable.from()"
   * over values) is checked as it is read instead, by a stream that Fastify
   * sends in its place, and that fails on such a chunk before writing it.
   */
  private toWritableChunks(stream: Readable, file: StreamableFile): Readable {
    const logger = this.logger;
    // Passes the chunks on as they are (an empty string, too, which sends
    // the headers early), one at a time, so that it does not read ahead of
    // the response
    const checked = new Transform({
      objectMode: true,
      highWaterMark: 1,
      transform(chunk, _encoding, callback) {
        if (isWritableChunk(chunk)) {
          return callback(null, chunk);
        }
        // Answered like a failing file stream on the other adapters: a 400
        // with the standard body before any data (the built-in exception
        // filter answers an "http-errors" error that is not exposed with the
        // status text), and an aborted response after
        const err = Object.assign(
          new TypeError(
            `A StreamableFile can only send string and Uint8Array chunks, received ${typeof chunk}`,
          ),
          { status: 400, statusCode: 400, expose: false },
        );
        // Called as the source emits the chunk, where nothing would catch
        // what the logger throws
        try {
          file.errorLogger(err);
        } catch (loggerError) {
          logger.error(loggerError);
        }
        callback(err);
      },
    });
    // pipe() neither fails the stream Fastify sends when the source fails,
    // nor destroys the source when Fastify destroys that stream (e.g. when
    // the client goes away)
    finished(stream, { writable: false }, err => {
      if (err) {
        checked.destroy(err);
      }
    });
    finished(checked, () => {
      if (!stream.readableEnded) {
        stream.destroy();
      }
    });
    return stream.pipe(checked);
  }

  /**
   * A reply around a raw response, e.g. the one middleware and the exception
   * filters of its errors get. When a stream it sends fails or the client goes
   * away, Fastify reads the request, server and logger of the reply, and runs
   * its error handler if no data was sent yet: these are those of the instance.
   */
  private createReplyForRawResponse(response: TRawResponse): TReply {
    const instance = this.instance as TInstance & Record<symbol, unknown>;
    const request = {
      raw: (response as { req?: unknown }).req ?? {},
      server: instance,
      log: instance.log,
      [kRouteContext]: {
        preSerialization: null,
        preValidation: [],
        preHandler: [],
        onSend: [],
        onError: [],
        server: instance,
        errorHandler: instance[kErrorHandler],
      },
    };
    return new Reply(response, request, instance.log);
  }

  private isNativeResponse(
    response: TRawResponse | TReply,
  ): response is TRawResponse {
    return !('status' in response);
  }

  private registerJsonContentParser(rawBody?: boolean) {
    const contentType = 'application/json';
    const withRawBody = !!rawBody;
    const { bodyLimit } = this.getInstance().initialConfig;

    this.useBodyParser(
      contentType,
      withRawBody,
      { bodyLimit },
      (req, body, done) => {
        const { onProtoPoisoning, onConstructorPoisoning } =
          this.instance.initialConfig;
        const defaultJsonParser = this.instance.getDefaultJsonParser(
          onProtoPoisoning || 'error',
          onConstructorPoisoning || 'error',
        ) as FastifyBodyParser<string | Buffer, TServer>;
        defaultJsonParser(req, body, done);
      },
    );
  }

  private registerUrlencodedContentParser(rawBody?: boolean) {
    const contentType = 'application/x-www-form-urlencoded';
    const withRawBody = !!rawBody;
    const { bodyLimit } = this.getInstance().initialConfig;

    this.useBodyParser(
      contentType,
      withRawBody,
      { bodyLimit },
      (_req, body, done) => {
        const parsedBody = querystringParse(body.toString());
        // "fast-querystring" returns an object without a prototype, where
        // "__proto__" is an ordinary key: copied onto another object, it
        // would replace the prototype of that object. It is handled as in
        // a JSON body ("onProtoPoisoning").
        const onProtoPoisoning =
          this.instance.initialConfig.onProtoPoisoning || 'error';
        if (
          onProtoPoisoning !== 'ignore' &&
          Object.prototype.hasOwnProperty.call(parsedBody, '__proto__')
        ) {
          if (onProtoPoisoning === 'error') {
            done(
              new BadRequestException(
                'Object contains forbidden prototype property',
              ),
              undefined,
            );
            return;
          }
          delete parsedBody['__proto__'];
        }
        done(null, parsedBody);
      },
    );
  }

  private async registerMiddie() {
    this.isMiddieRegistered = true;
    await this.register(
      import('@fastify/middie') as Parameters<TInstance['register']>[0],
    );
    // middie gives each encapsulated context created from now on a copy of
    // the middleware of its parent, as it is at that time. As
    // `NestFactory.create()` registers middie before `main.ts` runs, a
    // plugin registered there with an awaited `register()` gets a context
    // without the Nest middleware `app.init()` registers later, so
    // `createMiddlewareFactory()` adds it to the contexts tracked here.
    this.trackMiddieContexts();
  }

  private trackMiddieContexts() {
    this.instance.addHook('onRegister', instance => {
      this.middieContexts.push(instance as TInstance);
    });
  }

  private getRequestOriginalUrl(rawRequest: TRawRequest) {
    return rawRequest.originalUrl || rawRequest.url!;
  }

  private injectRouteOptions(
    routerMethodKey: Uppercase<HTTPMethods>,
    ...args: any[]
  ) {
    const handlerRef = args[args.length - 1];
    const isVersioned =
      !isUndefined(handlerRef.version) &&
      handlerRef.version !== VERSION_NEUTRAL;
    const routeConfig = Reflect.getMetadata(
      FASTIFY_ROUTE_CONFIG_METADATA,
      handlerRef,
    );

    const routeConstraints = Reflect.getMetadata(
      FASTIFY_ROUTE_CONSTRAINTS_METADATA,
      handlerRef,
    );

    const routeSchema = Reflect.getMetadata(
      FASTIFY_ROUTE_SCHEMA_METADATA,
      handlerRef,
    );

    const hasConfig = !isUndefined(routeConfig);
    const hasConstraints = !isUndefined(routeConstraints);
    const hasSchema = !isUndefined(routeSchema);
    const routeToInject: RouteOptions<TServer, TRawRequest, TRawResponse> &
      RouteShorthandOptions = {
      method: routerMethodKey,
      url: args[0],
      handler: this.requireNonEmptyParams(args[0], handlerRef),
    };

    this.addHttpMethod(routerMethodKey);

    if (isVersioned || hasConstraints || hasConfig || hasSchema) {
      const isPathAndRouteTuple = args.length === 2;
      if (isPathAndRouteTuple) {
        const constraints = {
          ...(hasConstraints && routeConstraints),
          ...(isVersioned && {
            version: handlerRef.version,
          }),
        };

        const options = {
          constraints,
          ...(hasConfig && {
            config: {
              ...routeConfig,
            },
          }),
          ...(hasSchema && {
            schema: routeSchema,
          }),
        };

        const routeToInjectWithOptions = { ...routeToInject, ...options };

        return this.instance.route(routeToInjectWithOptions);
      }
    }
    return this.instance.route(routeToInject);
  }

  private addHttpMethod(method: string) {
    if (!this.instance.supportedMethods.includes(method)) {
      this.instance.addHttpMethod(method, { hasBody: true });
    }
  }

  /**
   * "find-my-way" matches an empty path segment for a route parameter
   * ("/users//profile" -> { id: "" }), while "path-to-regexp", which
   * middleware paths (and the ExpressAdapter's routes) are matched with,
   * needs at least one character per parameter. Requests with an empty route
   * parameter are passed to the not-found handler instead, as with the
   * ExpressAdapter, so that middleware and routes always match the same
   * requests. Only the wildcard ("*") may be empty.
   */
  private requireNonEmptyParams<THandler extends Function>(
    url: unknown,
    handler: THandler,
  ): THandler {
    if (isString(url) && !url.includes(':')) {
      return handler;
    }
    const matchesRequest = isString(url)
      ? this.createRouteParamsMatcher(url)
      : undefined;
    const routeHandler = function (
      this: unknown,
      request: TRequest,
      reply: TReply,
    ) {
      const params = request.params as Record<string, string>;
      for (const name in params) {
        if (params[name] === '' && name !== '*') {
          reply.callNotFound();
          return;
        }
      }
      if (matchesRequest && !matchesRequest(request)) {
        reply.callNotFound();
        return;
      }
      return handler.call(this, request, reply);
    };
    Object.defineProperty(routeHandler, 'name', {
      configurable: true,
      value: handler.name,
    });
    return routeHandler as unknown as THandler;
  }

  /**
   * For a route path whose parameters "find-my-way" does not read as
   * path-to-regexp does, returns a function that matches the path of a
   * request as the middleware of that path is matched (see
   * `createMiddlewareFactory()`), which needs at least one character per
   * parameter:
   * - "find-my-way" keeps one value per parameter name, so for a route path
   *   that uses a name more than once ("/projects/:id/tasks/:id"),
   *   "request.params" only holds the last value, and an empty earlier one
   *   cannot be seen there;
   * - it ends a parameter name at "-", "." or "/" only, so ":lat,:lng" is a
   *   single parameter that matches any segment ("/geo/12"), which is also
   *   logged when the route is registered.
   * A route path that path-to-regexp cannot read gets no such function, as
   * `createMiddlewareFactory()` does not take that path either.
   */
  private createRouteParamsMatcher(
    url: string,
  ): ((request: TRequest) => boolean) | undefined {
    let matches: (pathname: string) => boolean;
    try {
      const path = LegacyRouteConverter.tryConvert(url, { logs: false });
      const misreadName = getMisreadParamName(url);
      const names = new Set<string>();
      let hasRepeatedName = false;
      const visit = (tokens: Token[]) => {
        for (const token of tokens) {
          if (token.type === 'group') {
            visit(token.tokens);
          } else if (token.type !== 'text') {
            hasRepeatedName ||= names.has(token.name);
            names.add(token.name);
          }
        }
      };
      visit(parse(path).tokens);
      if (!hasRepeatedName && misreadName === undefined) {
        return undefined;
      }
      ({ matches } = this.createPathMatcher(path));
      if (misreadName !== undefined) {
        this.logger.warn(
          `The router reads ":${misreadName}" in the route path "${url}" as one parameter, as a parameter name ends at "-", "." or "/" only. The route only serves the requests the path matches as written; separate its parameters with "-" or ".".`,
        );
      }
    } catch {
      return undefined;
    }
    return (request: TRequest) => {
      const rawUrl = this.getRequestOriginalUrl(request.raw);
      const queryParamsIndex = rawUrl.indexOf('?');
      const pathname =
        queryParamsIndex >= 0 ? rawUrl.slice(0, queryParamsIndex) : rawUrl;
      return matches(this.sanitizeUrl(pathname));
    };
  }

  /**
   * Fastify still accepts the router options ("ignoreTrailingSlash",
   * "caseSensitive", ...) at the top level, but "initialConfig.routerOptions"
   * only reflects them when they are passed through "routerOptions". As the
   * adapter always passes "routerOptions" (for the version constraint), the
   * top-level values are folded in so that plugins relying on
   * "initialConfig.routerOptions" (like @fastify/middie) normalize request
   * paths exactly like the router does.
   */
  private getTopLevelRouterOptions(
    options?: FastifyServerOptions,
  ): NonNullable<FastifyServerOptions['routerOptions']> {
    const routerOptions: Record<string, unknown> = {};
    const routerOptionKeys = [
      'ignoreTrailingSlash',
      'ignoreDuplicateSlashes',
      'caseSensitive',
      'useSemicolonDelimiter',
      'maxParamLength',
      'allowUnsafeRegex',
    ] as const;
    for (const key of routerOptionKeys) {
      if (options?.[key] !== undefined) {
        routerOptions[key] = options[key];
      }
    }
    return routerOptions;
  }

  private sanitizeUrl(url: string): string {
    const initialConfig = this.instance.initialConfig as FastifyServerOptions;
    const routerOptions = (initialConfig.routerOptions ??
      {}) as Partial<FastifyServerOptions>;

    // Absolute-form request targets ("GET http://host/path HTTP/1.1") must be
    // resolved to their path before any other normalization, as the Fastify
    // router does, so that middleware and routes always match the same path.
    url = this.getPathFromRequestTarget(url);

    if (
      routerOptions.ignoreDuplicateSlashes ||
      initialConfig.ignoreDuplicateSlashes
    ) {
      url = this.removeDuplicateSlashes(url);
    }

    const { caseSensitive, ignoreTrailingSlash } =
      this.getRouteMatchingOptions();
    if (ignoreTrailingSlash) {
      url = this.trimLastSlash(url);
    }

    const { path } = safeDecodeURI(
      url,
      routerOptions.useSemicolonDelimiter ||
        initialConfig.useSemicolonDelimiter,
    );
    // Lower-cased once decoded, as the router does: "%E2%84%AA" (KELVIN
    // SIGN) only lower-cases to "k" then
    return caseSensitive ? path : path.toLowerCase();
  }

  private removeDuplicateSlashes(path: string) {
    const REMOVE_DUPLICATE_SLASHES_REGEXP = /\/\/+/g;
    return path.indexOf('//') !== -1
      ? path.replace(REMOVE_DUPLICATE_SLASHES_REGEXP, '/')
      : path;
  }

  private trimLastSlash(path: string) {
    if (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
      return path.slice(0, -1);
    }
    return path;
  }

  /**
   * Mirrors the absolute-form request target handling of "find-my-way".
   * Returns the path of an absolute-form target ("http://host/path" -> "/path",
   * "http://host?a=b" -> "/?a=b") and leaves any other request target
   * untouched.
   */
  private getPathFromRequestTarget(url: string): string {
    if (url.charCodeAt(0) === 47 /* '/' */) {
      return url;
    }
    const schemeEnd = url.indexOf('://');
    if (schemeEnd === -1) {
      return url;
    }
    const scheme = url.slice(0, schemeEnd).toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return url;
    }
    const authorityStart = schemeEnd + 3;
    const pathStart = url.indexOf('/', authorityStart);
    if (pathStart === authorityStart || !URL.canParse(url)) {
      // Malformed target: the router rejects it before any middleware runs
      return url;
    }
    const queryStart = url.indexOf('?', authorityStart);
    if (queryStart !== -1 && (pathStart === -1 || queryStart < pathStart)) {
      // The query ends the authority, so a "/" in it does not start the path,
      // as in "find-my-way" 9.9.0 and later ("http://host?a/users" is "/").
      // Earlier versions, which the router of a Fastify instance passed to
      // the adapter may still be, route such a target as "/users". It is left
      // untouched, so that it is answered by the not-found handler (see
      // `isRoutableRequestTarget()`).
      return pathStart === -1 ? `/${url.slice(queryStart)}` : url;
    }
    return pathStart === -1 ? '/' : url.slice(pathStart);
  }

  /**
   * Whether the request target is in origin-form ("/users") or in the
   * absolute-form of an "http(s)" URL ("http://host/users"), the only forms
   * middleware paths can match.
   *
   * Node.js accepts other targets too (e.g. "GET *users HTTP/1.1").
   * "find-my-way" routes those as if their first character were the leading
   * "/" ("*users" is served by the "/users" route), while no middleware path
   * matches them, so the route would run without its middleware. They are
   * answered by the not-found handler instead, as with the ExpressAdapter,
   * whose router never matches a path that does not start with "/".
   *
   * That includes the asterisk-form "OPTIONS *" (RFC 9112, section 3.2.4),
   * which asks about the server as a whole rather than about a resource:
   * Nest has no handler for it, and "find-my-way" would serve it with the
   * "OPTIONS /" route.
   */
  private isRoutableRequestTarget(url: string | undefined): boolean {
    return !!url && this.getPathFromRequestTarget(url).charCodeAt(0) === 47;
  }
}

function isWritableChunk(chunk: unknown): chunk is string | Uint8Array {
  return typeof chunk === 'string' || types.isUint8Array(chunk);
}
