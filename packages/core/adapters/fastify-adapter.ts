import { RequestMethod } from '@nestjs/common';
import { ErrorHandler, RequestHandler } from '@nestjs/common/interfaces';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import * as pathToRegexp from 'path-to-regexp';

export class FastifyAdapter {
  protected readonly instance: any;

  constructor(options?: any) {
    this.instance = loadPackage('fastify', 'FastifyAdapter')(options);
  }

  use(handler: RequestHandler | ErrorHandler);
  use(path: any, handler: RequestHandler | ErrorHandler);
  use(...args: any[]) {
    return this.instance.use(...args);
  }

  get(handler: RequestHandler);
  get(path: any, handler: RequestHandler);
  get(...args: any[]) {
    return this.instance.get(...args);
  }

  post(handler: RequestHandler);
  post(path: any, handler: RequestHandler);
  post(...args: any[]) {
    return this.instance.post(...args);
  }

  head(handler: RequestHandler);
  head(path: any, handler: RequestHandler);
  head(...args: any[]) {
    return this.instance.head(...args);
  }

  delete(handler: RequestHandler);
  delete(path: any, handler: RequestHandler);
  delete(...args: any[]) {
    return this.instance.delete(...args);
  }

  put(handler: RequestHandler);
  put(path: any, handler: RequestHandler);
  put(...args: any[]) {
    return this.instance.put(...args);
  }

  patch(handler: RequestHandler);
  patch(path: any, handler: RequestHandler);
  patch(...args: any[]) {
    return this.instance.patch(...args);
  }

  options(handler: RequestHandler);
  options(path: any, handler: RequestHandler);
  options(...args: any[]) {
    return this.instance.options(...args);
  }

  listen(port: string | number, callback?: () => void);
  listen(port: string | number, hostname: string, callback?: () => void);
  listen(port: any, hostname?: any, callback?: any) {
    return this.instance.listen(port, hostname, callback);
  }

  reply(response, body: any, statusCode: number) {
    return response.code(statusCode).send(body);
  }

  render(response, view: string, options: any) {
    return response.view(view, options);
  }

  setErrorHandler(handler: Function) {
    return this.instance.setErrorHandler(handler);
  }

  setNotFoundHandler(handler: Function) {
    return this.instance.setNotFoundHandler(handler);
  }

  getHttpServer<T = any>(): T {
    return this.instance.server as any as T;
  }

  getInstance<T = any>(): T {
    return this.instance as any as T;
  }

  register(...args) {
    return this.instance.register(...args);
  }

  inject(...args) {
    return this.instance.inject(...args);
  }

  close() {
    return this.instance.close();
  }

  useStaticAssets(options: {
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

  setHeader(response, name: string, value: string) {
    return response.header(name, value);
  }

  getRequestMethod(request): string {
    return request.raw.method;
  }

  getRequestUrl(request): string {
    return request.raw.url;
  }

  createMiddlewareFactory(
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
