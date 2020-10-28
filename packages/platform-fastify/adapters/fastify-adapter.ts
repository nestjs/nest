/* eslint-disable @typescript-eslint/no-var-requires */
import { HttpStatus, Logger, RequestMethod } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import {
  fastify,
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyPlugin,
  FastifyPluginOptions,
  FastifyRegisterOptions,
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
import * as http2 from 'http2';
import * as https from 'https';
import { InjectOptions } from 'light-my-request';
import * as pathToRegexp from 'path-to-regexp';
import {
  FastifyStaticOptions,
  PointOfViewOptions,
} from '../interfaces/external';

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  https: http2.SecureServerOptions;
};

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true;
  http2SessionTimeout?: number;
};

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions;
};

export class FastifyAdapter<
  TServer extends RawServerBase = RawServerDefault,
  TRawRequest extends RawRequestDefaultExpression<
    TServer
  > = RawRequestDefaultExpression<TServer>,
  TRawResponse extends RawReplyDefaultExpression<
    TServer
  > = RawReplyDefaultExpression<TServer>
> extends AbstractHttpAdapter<
  TServer,
  FastifyRequest<RequestGenericInterface, TServer, TRawRequest>,
  FastifyReply<TServer, TRawRequest, TRawResponse>
> {
  protected readonly instance: FastifyInstance<
    TServer,
    TRawRequest,
    TRawResponse
  >;
  private isMiddieRegistered: boolean;

  constructor(
    instanceOrOptions:
      | FastifyInstance<TServer>
      | FastifyHttp2Options<TServer>
      | FastifyHttp2SecureOptions<any>
      | FastifyHttpsOptions<any>
      | FastifyServerOptions<TServer> = fastify() as any,
  ) {
    const instance =
      instanceOrOptions &&
      (instanceOrOptions as FastifyInstance<TServer>).server
        ? instanceOrOptions
        : fastify(instanceOrOptions as FastifyServerOptions);

    super(instance);
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
    if (typeof port === 'string') {
      port = parseInt(port);
    }
    return this.instance.listen(port, ...args);
  }

  public reply(
    response: TRawResponse | FastifyReply,
    body: any,
    statusCode?: number,
  ) {
    const fastifyReply: FastifyReply = this.isNativeResponse(response)
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
    return fastifyReply.send(body);
  }

  public status(response: TRawResponse | FastifyReply, statusCode: number) {
    if (this.isNativeResponse(response)) {
      response.statusCode = statusCode;
      return response;
    }
    return response.code(statusCode);
  }

  public render(
    response: FastifyReply & { view: Function },
    view: string,
    options: any,
  ) {
    return response && response.view(view, options);
  }

  public redirect(response: FastifyReply, statusCode: number, url: string) {
    const code = statusCode ?? HttpStatus.FOUND;
    return response.status(code).redirect(url);
  }

  public setErrorHandler(
    handler: Parameters<
      FastifyInstance<TServer, TRawRequest, TRawResponse>['setErrorHandler']
    >[0],
  ) {
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(
    handler: Parameters<
      FastifyInstance<TServer, TRawRequest, TRawResponse>['setNotFoundHandler']
    >[0],
  ) {
    return this.instance.setNotFoundHandler(handler);
  }

  public getHttpServer<T = TServer>(): T {
    return (this.instance.server as unknown) as T;
  }

  public getInstance<
    T = FastifyInstance<TServer, TRawRequest, TRawResponse>
  >(): T {
    return (this.instance as unknown) as T;
  }

  public register<Options extends FastifyPluginOptions>(
    plugin: FastifyPlugin<Options>,
    opts?: FastifyRegisterOptions<Options>,
  ) {
    return this.instance.register(plugin, opts);
  }

  public async inject(opts: InjectOptions | string) {
    return await this.instance.inject(opts);
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
      loadPackage('fastify-static', 'FastifyAdapter.useStaticAssets()'),
      options,
    );
  }

  public setViewEngine(options: PointOfViewOptions | string) {
    if (typeof options === 'string') {
      new Logger('FastifyAdapter').error(
        "setViewEngine() doesn't support a string argument.",
      );
      process.exit(1);
    }
    return this.register(
      loadPackage('point-of-view', 'FastifyAdapter.setViewEngine()'),
      options,
    );
  }

  public setHeader(response: FastifyReply, name: string, value: string) {
    return response.header(name, value);
  }

  public getRequestHostname(request: FastifyRequest): string {
    return request.hostname;
  }

  public getRequestMethod(request: FastifyRequest): string {
    return request.raw ? request.raw.method : request.method;
  }

  public getRequestUrl(request: FastifyRequest): string {
    return request.raw ? request.raw.url : request.url;
  }

  public enableCors(options: CorsOptions) {
    this.register(require('fastify-cors'), options);
  }

  public registerParserMiddleware() {
    this.register(require('fastify-formbody'));
  }

  public async createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): Promise<(path: string, callback: Function) => any> {
    if (!this.isMiddieRegistered) {
      await this.registerMiddie();
    }
    return (path: string, callback: Function) => {
      const re = pathToRegexp(path);
      const normalizedPath = path === '/*' ? '' : path;

      this.instance.use(
        normalizedPath,
        (req: any, res: any, next: Function) => {
          const queryParamsIndex = req.originalUrl.indexOf('?');
          const pathname =
            queryParamsIndex >= 0
              ? req.originalUrl.slice(0, queryParamsIndex)
              : req.originalUrl;

          if (!re.exec(pathname + '/') && normalizedPath) {
            return next();
          }
          if (
            requestMethod === RequestMethod.ALL ||
            req.method === RequestMethod[requestMethod]
          ) {
            return callback(req, res, next);
          }
          next();
        },
      );
    };
  }

  public getType(): string {
    return 'fastify';
  }

  protected registerWithPrefix(factory: FastifyPlugin, prefix = '/') {
    return this.instance.register(factory, { prefix });
  }

  private isNativeResponse(
    response: TRawResponse | FastifyReply,
  ): response is TRawResponse {
    return !('status' in response);
  }

  private async registerMiddie() {
    this.isMiddieRegistered = true;
    await this.register(require('middie'));
  }
}
