import {
  HttpStatus,
  Logger,
  RawBodyRequest,
  RequestMethod,
  StreamableFile,
  VersioningOptions,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import {
  fastify,
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
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
  RequestGenericInterface,
} from 'fastify';
import * as Reply from 'fastify/lib/reply';
import { kRouteContext } from 'fastify/lib/symbols';
import { RouteShorthandMethod } from 'fastify/types/route';
import * as http2 from 'http2';
import * as https from 'https';
import {
  Chain as LightMyRequestChain,
  InjectOptions,
  Response as LightMyRequestResponse,
} from 'light-my-request';
// `querystring` is used internally in fastify for registering urlencoded body parser.
import { parse as querystringParse } from 'querystring';
import { NestFastifyBodyParserOptions } from '../interfaces';
import {
  FastifyStaticOptions,
  FastifyViewOptions,
} from '../interfaces/external';

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  https: http2.SecureServerOptions;
};

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  http2SessionTimeout?: number;
};

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions;
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
  TRawResponse extends RawReplyDefaultExpression<TServer> = RawReplyDefaultExpression<TServer>,
  TRequest extends FastifyRequest<
    RequestGenericInterface,
    TServer,
    TRawRequest
  > = FastifyRequest<RequestGenericInterface, TServer, TRawRequest>,
  TReply extends FastifyReply<
    TServer,
    TRawRequest,
    TRawResponse
  > = FastifyReply<TServer, TRawRequest, TRawResponse>,
  TInstance extends FastifyInstance<
    TServer,
    TRawRequest,
    TRawResponse
  > = FastifyInstance<TServer, TRawRequest, TRawResponse>,
> extends AbstractHttpAdapter<TServer, TRequest, TReply> {
  protected readonly instance: TInstance;

  private _isParserRegistered: boolean;
  private isMiddieRegistered: boolean;
  private versioningOptions: VersioningOptions;
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
            return versions.get(version.find(v => versions.has(v))) || null;
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
      if (this.versioningOptions.type === VersioningType.MEDIA_TYPE) {
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
      else if (this.versioningOptions.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | string[] | undefined =
          req.headers?.[this.versioningOptions.header] ||
          req.headers?.[this.versioningOptions.header.toLowerCase()];

        return isUndefined(customHeaderVersionParameter)
          ? VERSION_NEUTRAL // No version was supplied
          : customHeaderVersionParameter;
      }
      // Custom Versioning Handler
      else if (this.versioningOptions.type === VersioningType.CUSTOM) {
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
      | FastifyServerOptions<TServer>,
  ) {
    super();

    const instance =
      instanceOrOptions && (instanceOrOptions as TInstance).server
        ? instanceOrOptions
        : fastify({
            constraints: {
              version: this.versionConstraint as any,
            },
            ...(instanceOrOptions as FastifyServerOptions),
          });
    this.setInstance(instance);
  }

  public async init() {
    if (this.isMiddieRegistered) {
      return;
    }
    await this.registerMiddie();
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
    return this.injectConstraintsIfVersioned('get', ...args);
  }

  public post(...args: any[]) {
    return this.injectConstraintsIfVersioned('post', ...args);
  }

  public head(...args: any[]) {
    return this.injectConstraintsIfVersioned('head', ...args);
  }

  public delete(...args: any[]) {
    return this.injectConstraintsIfVersioned('delete', ...args);
  }

  public put(...args: any[]) {
    return this.injectConstraintsIfVersioned('put', ...args);
  }

  public patch(...args: any[]) {
    return this.injectConstraintsIfVersioned('patch', ...args);
  }

  public options(...args: any[]) {
    return this.injectConstraintsIfVersioned('options', ...args);
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

    if (statusCode) {
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
    return (response as TReply).code(statusCode);
  }

  public end(response: TReply, message?: string) {
    response.raw.end(message);
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

  public register<TRegister extends Parameters<FastifyRegister<TInstance>>>(
    plugin: TRegister['0'],
    opts?: TRegister['1'],
  ) {
    return this.instance.register(plugin, opts);
  }

  public inject(): LightMyRequestChain;
  public inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  public inject(
    opts?: InjectOptions | string,
  ): LightMyRequestChain | Promise<LightMyRequestResponse> {
    return this.instance.inject(opts);
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

  public setHeader(response: TReply, name: string, value: string) {
    return response.header(name, value);
  }

  public getRequestHostname(request: TRequest): string {
    return request.hostname;
  }

  public getRequestMethod(request: TRequest): string {
    return request.raw ? request.raw.method : request.method;
  }

  public getRequestUrl(request: TRequest): string;
  public getRequestUrl(request: TRawRequest): string;
  public getRequestUrl(request: TRequest & TRawRequest): string {
    return this.getRequestOriginalUrl(request.raw || request);
  }

  public enableCors(options: CorsOptions | CorsOptionsDelegate<TRequest>) {
    this.register(
      import('@fastify/cors') as Parameters<TInstance['register']>[0],
      options,
    );
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    if (this._isParserRegistered) {
      return;
    }

    this.registerUrlencodedContentParser(rawBody);
    this.registerJsonContentParser(rawBody);

    this._isParserRegistered = true;
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
        req: RawBodyRequest<FastifyRequest<unknown, TServer, TRawRequest>>,
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
      let normalizedPath = path.endsWith('/*')
        ? `${path.slice(0, -1)}(.*)`
        : path;

      // Fallback to "(.*)" to support plugins like GraphQL
      normalizedPath = normalizedPath === '/(.*)' ? '(.*)' : normalizedPath;

      // The following type assertion is valid as we use import('@fastify/middie') rather than require('@fastify/middie')
      // ref https://github.com/fastify/middie/pull/55
      this.instance.use(
        normalizedPath,
        callback as Parameters<TInstance['use']>['1'],
      );
    };
  }

  public getType(): string {
    return 'fastify';
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
      import('@fastify/middie') as Parameters<TInstance['register']>[0],
    );
  }

  private getRequestOriginalUrl(rawRequest: TRawRequest) {
    return rawRequest.originalUrl || rawRequest.url;
  }

  private injectConstraintsIfVersioned(
    routerMethodKey:
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'options'
      | 'patch'
      | 'head',
    ...args: any[]
  ) {
    const handlerRef = args[args.length - 1];
    const isVersioned =
      !isUndefined(handlerRef.version) &&
      handlerRef.version !== VERSION_NEUTRAL;

    if (isVersioned) {
      const isPathAndRouteTuple = args.length === 2;
      if (isPathAndRouteTuple) {
        const options = {
          constraints: {
            version: handlerRef.version,
          },
        };
        const path = args[0];
        return this.instance[routerMethodKey](path, options, handlerRef);
      }
    }
    return this.instance[routerMethodKey](
      ...(args as Parameters<
        RouteShorthandMethod<TServer, TRawRequest, TRawResponse>
      >),
    );
  }
}
