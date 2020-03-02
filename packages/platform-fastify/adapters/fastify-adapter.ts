import { HttpStatus, RequestMethod } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as formBody from 'fastify-formbody';
import * as Reply from 'fastify/lib/reply';
import * as pathToRegexp from 'path-to-regexp';

export class FastifyAdapter<TInstance = any> extends AbstractHttpAdapter {
  constructor(
    instanceOrOptions:
      | TInstance
      | fastify.ServerOptions
      | fastify.ServerOptionsAsHttp
      | fastify.ServerOptionsAsHttp2
      | fastify.ServerOptionsAsSecure
      | fastify.ServerOptionsAsSecureHttp
      | fastify.ServerOptionsAsSecureHttp2 = fastify() as any,
  ) {
    const instance =
      instanceOrOptions &&
      (instanceOrOptions as fastify.FastifyInstance<any, any, any>).server
        ? instanceOrOptions
        : fastify((instanceOrOptions as any) as fastify.ServerOptions);

    super(instance);
  }

  public listen(port: string | number, callback?: () => void);
  public listen(port: string | number, hostname: string, callback?: () => void);
  public listen(port: any, ...args: any[]) {
    return this.instance.listen(port, ...args);
  }

  public reply(response: any, body: any, statusCode?: number) {
    const isNativeResponse = typeof response.status !== 'function';
    if (isNativeResponse) {
      const fastifyContext = {
        preSerialization: null,
        preValidation: [],
        preHandler: [],
        onSend: [],
        onError: [],
      };
      response = new Reply(response, fastifyContext, {});
    }
    if (statusCode) {
      response.status(statusCode);
    }
    return response.send(body);
  }

  public status(response: any, statusCode: number) {
    return response.code(statusCode);
  }

  public render(response: any, view: string, options: any) {
    return response.view(view, options);
  }

  public redirect(response: any, statusCode: number, url: string) {
    const code = statusCode ? statusCode : HttpStatus.FOUND;
    return response.status(code).redirect(url);
  }

  public setErrorHandler(
    handler: Parameters<fastify.FastifyInstance['setErrorHandler']>[0],
    prefix?: string,
  ) {
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(
    handler: Parameters<fastify.FastifyInstance['setNotFoundHandler']>[0],
    prefix?: string,
  ) {
    return this.instance.setNotFoundHandler(handler);
  }

  public getHttpServer<TServer = any>(): TServer {
    return this.instance.server as TServer;
  }

  public getInstance<TServer = any>(): TServer {
    return this.instance as TServer;
  }

  public register(...args: any[]) {
    return this.instance.register(...args);
  }

  public inject(...args: any[]) {
    return this.instance.inject(...args);
  }

  public close() {
    return this.instance.close();
  }

  public initHttpServer(options: NestApplicationOptions) {
    this.httpServer = this.instance.server;
  }

  public useStaticAssets(options: {
    root: string;
    prefix?: string;
    setHeaders?: Function;
    send?: any;
  }) {
    return this.register(
      loadPackage('fastify-static', 'FastifyAdapter.useStaticAssets()', () =>
        require('fastify-static'),
      ),
      options,
    );
  }

  public setViewEngine(options: any) {
    return this.register(
      loadPackage('point-of-view', 'FastifyAdapter.setViewEngine()'),
      options,
      () => require('point-of-view'),
    );
  }

  public setHeader(response: any, name: string, value: string) {
    return response.header(name, value);
  }

  public getRequestHostname(request: any): string {
    return request.hostname;
  }

  public getRequestMethod(request: any): string {
    return request.raw ? request.raw.method : request.method;
  }

  public getRequestUrl(request: any): string {
    return request.raw ? request.raw.url : request.url;
  }

  public enableCors(options: CorsOptions) {
    this.register(cors, options);
  }

  public registerParserMiddleware() {
    this.register(formBody);
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
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

  protected registerWithPrefix<T extends fastify.Plugin<any, any, any, any>>(
    factory: T,
    prefix = '/',
  ): ReturnType<fastify.FastifyInstance['register']> {
    return this.instance.register(factory, { prefix });
  }
}
