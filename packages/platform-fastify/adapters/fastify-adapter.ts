/* eslint-disable @typescript-eslint/no-floating-promises */
import { FastifyCorsOptions } from '@fastify/cors';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  type NestApplicationOptions,
  type RawBodyRequest,
  type RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import {
  FastifyBaseLogger,
  FastifyBodyParser,
  FastifyError,
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
import Reply from 'fastify/lib/reply.js';
import fastifySymbols from 'fastify/lib/symbols.js';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import * as net from 'net';
import {
  InjectOptions,
  Chain as LightMyRequestChain,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import { pathToRegexp } from 'path-to-regexp';
import { Duplex } from 'stream';
import middie from '@fastify/middie';
import {
  type SecurityRequestHook,
  type VersionValue,
  loadPackage,
  tryLoadPackage,
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/internal';
import { AbstractHttpAdapter } from '@nestjs/core';
import { LegacyRouteConverter } from '@nestjs/core/internal';
const { kRouteContext } = fastifySymbols;
// Fastify uses `fast-querystring` internally to quickly parse URL query strings.
import { parse as querystringParse } from 'fast-querystring';
import urlSanitizer from 'find-my-way/lib/url-sanitizer.js';
import {
  FASTIFY_ROUTE_CONFIG_METADATA,
  FASTIFY_ROUTE_CONSTRAINTS_METADATA,
  FASTIFY_ROUTE_SCHEMA_METADATA,
} from '../constants.js';
import {
  FastifyMultipartOptions,
  FastifyStaticOptions,
  FastifyViewOptions,
} from '../interfaces/external/index.js';
import { NestFastifyBodyParserOptions } from '../interfaces/index.js';
const { safeDecodeURI } = urlSanitizer;

const MISSING_MULTIPART_PACKAGE_MESSAGE =
  'The "@fastify/multipart" package is missing. Please, make sure to install it (npm i @fastify/multipart) ' +
  'to use the file upload interceptors from "@nestjs/platform-fastify/multipart".';

function isFastifyMultipartPlugin(plugin: unknown): boolean {
  const fn = (plugin as { default?: unknown })?.default ?? plugin;
  return (
    typeof fn === 'function' &&
    ((fn as any)[Symbol.for('plugin-meta')]?.name === '@fastify/multipart' ||
      fn.name === 'fastifyMultipart')
  );
}

type FastifyAdapterBaseOptions<
  Server extends RawServerBase = RawServerDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  skipMiddie?: boolean;
  /**
   * Controls the "@fastify/multipart" plugin (an optional peer dependency),
   * which the upload interceptors from "@nestjs/platform-fastify/multipart"
   * require.
   *
   * - unset (default): the adapter registers the plugin when an upload
   *   interceptor is used, unless it is already registered.
   * - an object: plugin options (e.g. `limits`); the plugin is registered
   *   when the application initializes.
   * - `true`: the same, with the plugin defaults.
   * - `false`: the adapter never registers the plugin.
   */
  multipart?: boolean | FastifyMultipartOptions;
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
type FastifyRawRequest<TServer extends RawServerBase> =
  RawRequestDefaultExpression<TServer> & { originalUrl?: string };

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
  declare protected readonly instance: TInstance;
  protected _pathPrefix?: string;

  private readonly openConnections = new Set<Duplex>();
  private isClosing = false;
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
  private isMiddieRegistered: boolean;
  private multipartMode: 'auto' | 'eager' | 'off' = 'auto';
  private multipartOptions: FastifyMultipartOptions = {};
  private isMultipartRequested = false;
  private pendingMiddlewares: Array<{ args: any[] }> = [];
  private versioningOptions?: VersioningOptions;
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
          : undefined;

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
        return this.versioningOptions.extractor(req);
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
    }
    const multipart = (instanceOrOptions as FastifyAdapterBaseOptions)
      ?.multipart;
    if (multipart === false) {
      this.multipartMode = 'off';
    } else if (multipart) {
      this.multipartMode = 'eager';
      this.multipartOptions = multipart === true ? {} : { ...multipart };
    }

    this.instance.addHook('onRequest', (request, reply, done) => {
      if (this.onRequestHook) {
        this.onRequestHook(request as TRequest, reply as TReply, done);
      } else {
        done();
      }
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
    if (this.multipartMode === 'eager') {
      this.useMultipart();
    }
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
      ? new Reply(
          response,
          {
            [kRouteContext]: {
              preSerialization: null,
              preValidation: [],
              preHandler: [],
              onSend: [],
              onError: [],
            },
          },
          {},
        )
      : response;

    if (!isNil(statusCode)) {
      fastifyReply.status(statusCode);
    }
    if (body instanceof StreamableFile) {
      const streamHeaders = body.getHeaders();
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
      body = body.getStream();
    }
    const responseContentType = fastifyReply.getHeader('Content-Type');
    if (
      typeof responseContentType === 'string' &&
      !responseContentType.startsWith('application/json') &&
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
    if (
      this.multipartMode !== 'off' &&
      isFastifyMultipartPlugin(plugin) &&
      !this.instance.hasRequestDecorator('isMultipart')
    ) {
      // The adapter owns the "@fastify/multipart" registration, so that the
      // plugin is registered once whether or not the user registers it too.
      // The user's options apply over the adapter's.
      this.multipartOptions = { ...this.multipartOptions, ...opts };
      this.useMultipart();
      return this.instance;
    }
    return (this.instance.register as any)(plugin, opts);
  }

  /**
   * Registers the "@fastify/multipart" plugin, unless the adapter's
   * `multipart` option is `false`, or the plugin has been registered
   * already by the time it loads. Idempotent. Called by the upload
   * interceptors from "@nestjs/platform-fastify/multipart".
   *
   * The plugin is loaded lazily, and a missing package fails the
   * application's startup (`ready()`) with an error naming the package,
   * rather than exiting the process.
   */
  public useMultipart() {
    if (this.multipartMode === 'off' || this.isMultipartRequested) {
      return;
    }
    this.isMultipartRequested = true;
    const registerMultipart = async (instance: FastifyInstance) => {
      // Plugins load in registration order, so one the user registered
      // before this point has loaded by now.
      if (instance.hasRequestDecorator('isMultipart')) {
        return;
      }
      const multipart = await tryLoadPackage(
        '@fastify/multipart',
        () => import('@fastify/multipart'),
      );
      if (!multipart) {
        throw new Error(MISSING_MULTIPART_PACKAGE_MESSAGE);
      }
      // Copied: the plugin writes its defaults into the options it receives.
      const { limits, ...options } = this.multipartOptions;
      await instance.register(multipart, {
        ...options,
        ...(limits && { limits: { ...limits } }),
      });
    };
    // Like `fastify-plugin`: register on the root context, not a child one.
    Object.assign(registerMultipart, {
      [Symbol.for('skip-override')]: true,
      [Symbol.for('fastify.display-name')]: 'nestjs-multipart',
    });
    this.instance.register(registerMultipart as any);
  }

  public inject(): LightMyRequestChain;
  public inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  public inject(
    opts?: InjectOptions | string,
  ): LightMyRequestChain | Promise<LightMyRequestResponse> {
    return this.instance.inject(opts!);
  }

  public async close() {
    this.isClosing = true;
    try {
      this.closeOpenConnections();
    } finally {
      await this.instance.close().catch(err => {
        // Check if server is still running
        if (err.code !== 'ERR_SERVER_NOT_RUNNING') {
          throw err;
        }
      });
    }
  }

  public initHttpServer(options: NestApplicationOptions = {}) {
    this.httpServer = this.instance.server;
    if (options?.forceCloseConnections) {
      this.trackOpenConnections();
    }
  }

  // `register()` accepts a promise of a plugin, so the import is handed over
  // unawaited on purpose. `NestApplication.useStaticAssets()` discards what
  // this returns, so awaiting here would enqueue the plugin after the caller
  // has already moved on to `listen()`.
  public useStaticAssets(options: FastifyStaticOptions) {
    return this.register(
      loadPackage(
        '@fastify/static',
        'FastifyAdapter.useStaticAssets()',
        () => import('@fastify/static'),
      ),
      options,
    );
  }

  // Handed over unawaited for the same reason as `useStaticAssets()` above.
  public setViewEngine(options: FastifyViewOptions | string) {
    if (isString(options)) {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
      process.exit(1);
    }
    return this.register(
      loadPackage(
        '@fastify/view',
        'FastifyAdapter.setViewEngine()',
        () => import('@fastify/view'),
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
    const current = response.getHeader(name);
    if (current === undefined) {
      return response.header(name, value);
    }
    // Fastify Reply.header() already concatenates set-cookie.
    // Re-passing the accumulated list would duplicate previous cookies.
    if (String(name).toLowerCase() === 'set-cookie') {
      return response.header(name, value);
    }
    const values = Array.isArray(current) ? current : [current];
    return response.header(name, values.concat(value));
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
    this.register(
      import('@fastify/cors') as unknown as Parameters<
        TInstance['register']
      >[0],
      options,
    );
  }

  /**
   * Runs the request hook of the built-in HTTP security features in an
   * `onRequest` hook: before middie (Nest middleware), content-type parsing,
   * guards and handlers, and also for unmatched routes. Headers set by the
   * hook go to the Node.js response (`reply.raw`): Fastify merges them into
   * every response it sends, errors and `404`s included, while
   * `reply.header()` / `@Header()` values take precedence, and responses
   * written to `reply.raw` directly (e.g. `@Sse()`) carry them too. A
   * rejection goes to `done(error)`, i.e. to the Nest exception layer
   * installed with `setErrorHandler()`.
   */
  public registerSecurityHook(hook: SecurityRequestHook<TRequest>) {
    this.instance.addHook('onRequest', (request, reply, done) => {
      done(hook(request as TRequest, reply.raw) as FastifyError | undefined);
    });
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
          parser(req, body, done);
          return;
        }

        done(null, body);
      },
    );

    // To avoid the Nest application init to override our custom
    // body parser, we mark the parsers as registered.
    this._isParserRegistered = true;
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
        let { regexp: re } = pathToRegexp(normalizedPath);
        re = hasEndOfStringCharacter
          ? new RegExp(re.source + '$', re.flags)
          : re;

        // The following type assertion is valid as we use import('@fastify/middie') rather than require('@fastify/middie')
        // ref https://github.com/fastify/middie/pull/55
        this.instance.use(
          normalizedPath,
          (req: any, res: any, next: Function) => {
            const queryParamsIndex = req.originalUrl.indexOf('?');
            let pathname =
              queryParamsIndex >= 0
                ? req.originalUrl.slice(0, queryParamsIndex)
                : req.originalUrl;

            pathname = this.sanitizeUrl(pathname);

            if (normalizedPath) {
              const pathToCheck = pathname.endsWith('/')
                ? pathname
                : `${pathname}/`;
              if (!re.exec(pathToCheck)) {
                return next();
              }
            }
            return callback(req, res, next);
          },
        );
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
  }

  public getType(): string {
    return 'fastify';
  }

  public isRouteOrderSensitive(): boolean {
    return false;
  }

  public use(...args: any[]) {
    // Fastify requires @fastify/middie plugin to be registered before middleware can be used.
    // If middie is not registered yet, we queue the middleware and register it later during init.
    if (!this.isMiddieRegistered) {
      this.pendingMiddlewares.push({ args });
      return this;
    }
    return (this.instance.use as any)(...args);
  }

  public mapException(error: unknown): unknown {
    if (this.isHttpFastifyError(error)) {
      return new HttpException(error.message, error.statusCode);
    }

    return error;
  }

  private isHttpFastifyError(
    error: any,
  ): error is Error & { statusCode: number } {
    // condition based on this code - https://github.com/fastify/fastify-error/blob/d669b150a82968322f9f7be992b2f6b463272de3/index.js#L22
    return (
      error.statusCode !== undefined &&
      error instanceof Error &&
      error.name === 'FastifyError'
    );
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
        done(null, querystringParse(body.toString()));
      },
    );
  }

  private async registerMiddie() {
    this.isMiddieRegistered = true;
    await this.register(
      middie as unknown as Parameters<TInstance['register']>[0],
    );
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
      handler: handlerRef,
    };

    if (!this.instance.supportedMethods.includes(routerMethodKey)) {
      this.instance.addHttpMethod(routerMethodKey, { hasBody: true });
    }

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
    const routerOptions =
      initialConfig.routerOptions as Partial<FastifyServerOptions>;

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

    if (
      routerOptions.ignoreTrailingSlash ||
      initialConfig.ignoreTrailingSlash
    ) {
      url = this.trimLastSlash(url);
    }

    if (
      routerOptions.caseSensitive === false ||
      initialConfig.caseSensitive === false
    ) {
      url = url.toLowerCase();
    }
    return safeDecodeURI(
      url,
      routerOptions.useSemicolonDelimiter ||
        initialConfig.useSemicolonDelimiter,
    ).path;
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
   * Returns the path of an absolute-form target ("http://host/path" -> "/path")
   * and leaves any other request target untouched.
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
    return pathStart === -1 ? '/' : url.slice(pathStart);
  }

  private trackOpenConnections() {
    const track = (socket: Duplex) => {
      if (this.isClosing) {
        // Fastify runs its `preClose` hooks before it stops accepting
        // connections, so destroy anything that arrives in the meantime
        socket.destroy();
        return;
      }
      if (this.openConnections.has(socket)) {
        return;
      }
      this.openConnections.add(socket);
      socket.on('close', () => this.openConnections.delete(socket));
    };
    this.httpServer.on('connection', track);
    // Sockets accepted by the secondary servers Fastify binds for every
    // address `listen()` resolves to are only reachable through requests.
    // `inject()` requests carry a mock socket, which must not be tracked.
    this.instance.addHook('onRequest', (request, _reply, done) => {
      const socket = request.raw.socket;
      if (socket instanceof net.Socket) {
        track(socket);
      }
      done();
    });
  }

  private closeOpenConnections() {
    for (const socket of this.openConnections) {
      socket.destroy();
      this.openConnections.delete(socket);
    }
  }
}
