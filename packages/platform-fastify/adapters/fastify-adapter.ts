import { RequestMethod } from '@nestjs/common';
import { ErrorHandler, RequestHandler } from '@nestjs/common/interfaces';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as formBody from 'fastify-formbody';
import * as pathToRegexp from 'path-to-regexp';

export class FastifyAdapter extends AbstractHttpAdapter {
  constructor(
    instanceOrOptions:
      | fastify.FastifyInstance<any, any, any>
      | fastify.ServerOptions = fastify(),
  ) {
    const instance =
      instanceOrOptions &&
      (instanceOrOptions as fastify.FastifyInstance<any, any, any>).server
        ? instanceOrOptions
        : fastify(instanceOrOptions as fastify.ServerOptions);

    super(instance);
  }

  public use(handler: RequestHandler | ErrorHandler);
  public use(path: any, handler: RequestHandler | ErrorHandler);
  public use(...args: any[]) {
    return this.instance.use(...args);
  }

  public get(handler: RequestHandler);
  public get(path: any, handler: RequestHandler);
  public get(...args: any[]) {
    return this.instance.get(...args);
  }

  public post(handler: RequestHandler);
  public post(path: any, handler: RequestHandler);
  public post(...args: any[]) {
    return this.instance.post(...args);
  }

  public head(handler: RequestHandler);
  public head(path: any, handler: RequestHandler);
  public head(...args: any[]) {
    return this.instance.head(...args);
  }

  public delete(handler: RequestHandler);
  public delete(path: any, handler: RequestHandler);
  public delete(...args: any[]) {
    return this.instance.delete(...args);
  }

  public put(handler: RequestHandler);
  public put(path: any, handler: RequestHandler);
  public put(...args: any[]) {
    return this.instance.put(...args);
  }

  public patch(handler: RequestHandler);
  public patch(path: any, handler: RequestHandler);
  public patch(...args: any[]) {
    return this.instance.patch(...args);
  }

  public options(handler: RequestHandler);
  public options(path: any, handler: RequestHandler);
  public options(...args: any[]) {
    return this.instance.options(...args);
  }

  public listen(port: string | number, callback?: () => void);
  public listen(port: string | number, hostname: string, callback?: () => void);
  public listen(port: any, hostname?: any, callback?: any) {
    return this.instance.listen(port, hostname, callback);
  }

  public reply(response, body: any, statusCode: number) {
    return response.code(statusCode).send(body);
  }

  public render(response, view: string, options: any) {
    return response.view(view, options);
  }

  public setErrorHandler(handler: Function) {
    return this.instance.setErrorHandler(handler);
  }

  public setNotFoundHandler(handler: Function) {
    return this.instance.setNotFoundHandler(handler);
  }

  public getHttpServer<T = any>(): T {
    return this.instance.server as T;
  }

  public getInstance<T = any>(): T {
    return this.instance as T;
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
      loadPackage('fastify-static', 'FastifyAdapter.useStaticAssets()'),
      options,
    );
  }

  setViewEngine(options: any) {
    return this.register(
      loadPackage('point-of-view', 'FastifyAdapter.setViewEngine()'),
      options,
    );
  }

  public setHeader(response, name: string, value: string) {
    return response.header(name, value);
  }

  public getRequestMethod(request): string {
    return request.raw.method;
  }

  public getRequestUrl(request): string {
    return request.raw.url;
  }

  public enableCors(options: CorsOptions) {
    this.register(cors(options));
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

      this.instance.use(normalizedPath, (req, res, next) => {
        if (!re.exec(req.originalUrl + '/')) {
          return next();
        }
        if (
          requestMethod === RequestMethod.ALL ||
          req.method === RequestMethod[requestMethod]
        ) {
          return callback(req, res, next);
        }
        next();
      });
    };
  }
}
