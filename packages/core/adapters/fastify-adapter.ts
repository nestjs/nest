import {
  HttpServer,
  RequestHandler,
  ErrorHandler,
} from '@nestjs/common/interfaces';
import { Logger } from '@nestjs/common';
import { MissingRequiredDependencyException } from '../errors/exceptions/missing-dependency.exception';

export class FastifyAdapter {
  private readonly logger = new Logger(FastifyAdapter.name);
  protected readonly instance;

  constructor() {
    try {
      this.instance = require('fastify')();
    } catch (e) {
      throw new MissingRequiredDependencyException('fastify', 'FastifyAdapter');
    }
  }

  use(handler: RequestHandler | ErrorHandler);
  use(path: any, handler: RequestHandler | ErrorHandler);
  use(pathOrHandler: any, handler?: RequestHandler | ErrorHandler | undefined) {
    return handler
      ? this.instance.use(pathOrHandler, handler)
      : this.instance.use(pathOrHandler);
  }

  get(handler: RequestHandler);
  get(path: any, handler: RequestHandler);
  get(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.get(pathOrHandler, handler);
  }

  post(handler: RequestHandler);
  post(path: any, handler: RequestHandler);
  post(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.post(pathOrHandler, handler);
  }

  head(handler: RequestHandler);
  head(path: any, handler: RequestHandler);
  head(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.head(pathOrHandler, handler);
  }

  delete(handler: RequestHandler);
  delete(path: any, handler: RequestHandler);
  delete(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.delete(pathOrHandler, handler);
  }

  put(handler: RequestHandler);
  put(path: any, handler: RequestHandler);
  put(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.put(pathOrHandler, handler);
  }

  patch(handler: RequestHandler);
  patch(path: any, handler: RequestHandler);
  patch(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.patch(pathOrHandler, handler);
  }

  options(handler: RequestHandler);
  options(path: any, handler: RequestHandler);
  options(pathOrHandler: any, handler?: RequestHandler) {
    return this.instance.options(pathOrHandler, handler);
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

  getHttpServer() {
    return this.instance.server;
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
    try {
      return this.register(require('fastify-static'), options);
    } catch (e) {
      throw new MissingRequiredDependencyException(
        'fastify-static',
        'FastifyAdapter.useStaticAssets()',
      );
    }
  }

  setViewEngine(options: any) {
    try {
      return this.register(require('point-of-view'), options);
    } catch (e) {
      throw new MissingRequiredDependencyException(
        'point-of-view',
        'FastifyAdapter.setViewEngine()',
      );
    }
  }

  getRequestMethod(request): string {
    return request.raw.method;
  }

  getRequestUrl(request): string {
    return request.raw.url;
  }
}
