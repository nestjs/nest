import {
  HttpStatus,
  Logger,
  RequestMethod,
  StreamableFile,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { VersionValue, VERSION_NEUTRAL } from '@nestjs/common/interfaces';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import {
  fastify,
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
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
import { RouteShorthandMethod } from 'fastify/types/route';
import * as http2 from 'http2';
import * as https from 'https';
import {
  Chain as LightMyRequestChain,
  InjectOptions,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import {
  FastifyStaticOptions,
  PointOfViewOptions,
} from '../interfaces/external';

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance,
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  https: http2.SecureServerOptions;
};

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance,
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  http2SessionTimeout?: number;
};

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance,
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions;
};

type VersionedRoute = Function & {
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
      const versions = new Map();
      return {
        get(version: string | Array<string>) {
          return versions.get(version) || null;
        },
        set(
          versionOrVersions: string | Array<string>,
          store: Map<string, any>,
        ) {
          const storeVersionConstraint = version =>
            versions.set(version, store);
          if (Array.isArray(versionOrVersions))
            versionOrVersions.forEach(storeVersionConstraint);
          else storeVersionConstraint(versionOrVersions);
        },
        del(version: string | Array<string>) {
          versions.delete(version);
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

        if (acceptHeaderVersionParameter) {
          const headerVersion = acceptHeaderVersionParameter.split(
            this.versioningOptions.key,
          )[1];
          return headerVersion;
        }
      }
      // Header Versioning Handler
      else if (this.versioningOptions.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | string[] | undefined =
          req.headers?.[this.versioningOptions.header] ||
          req.headers?.[this.versioningOptions.header.toLowerCase()];

        if (customHeaderVersionParameter) {
          return customHeaderVersionParameter;
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
  public listen(port: string | number, ...args: any[]): Promise<string> {
    return this.instance.listen(port, ...args);
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
  ) {
    if (!this.versioningOptions) {
      this.versioningOptions = versioningOptions;
    }
    const versionedRoute = handler as VersionedRoute;
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
            context: {
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
      if (fastifyReply.getHeader('Content-Type') === undefined) {
        fastifyReply.header('Content-Type', streamHeaders.type);
      }
      if (fastifyReply.getHeader('Content-Disposition') === undefined) {
        fastifyReply.header('Content-Disposition', streamHeaders.disposition);
      }
      body = body.getStream();
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

  public register<TRegister extends Parameters<TInstance['register']>>(
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
      loadPackage('fastify-static', 'FastifyAdapter.useStaticAssets()', () =>
        require('fastify-static'),
      ),
      options,
    );
  }

  public setViewEngine(options: PointOfViewOptions | string) {
    if (isString(options)) {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
      process.exit(1);
    }
    return this.register(
      loadPackage('point-of-view', 'FastifyAdapter.setViewEngine()', () =>
        require('point-of-view'),
      ),
      options,
    );
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
    this.register(import('fastify-cors'), options);
  }

  public registerParserMiddleware() {
    if (this._isParserRegistered) {
      return;
    }
    this.register(import('fastify-formbody'));
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

      // The following type assertion is valid as we use import('middie') rather than require('middie')
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

  private async registerMiddie() {
    this.isMiddieRegistered = true;
    await this.register(import('middie'));
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
