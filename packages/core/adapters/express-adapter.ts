import * as express from 'express';
import {
  HttpServer,
  RequestHandler,
  ErrorHandler,
} from '@nestjs/common/interfaces';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { ServeStaticOptions } from '@nestjs/common/interfaces/external/serve-static-options.interface';

export class ExpressAdapter implements HttpServer {
  constructor(private readonly instance) {}

  use(...args: any[]) {
    return this.instance.use(...args);
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
    const res = response.status(statusCode);
    if (isNil(body)) {
      return res.send();
    }
    return isObject(body) ? res.json(body) : res.send(String(body));
  }

  render(response, view: string, options: any) {
    return response.render(view, options);
  }

  setErrorHandler(handler: Function) {
    return this.use(handler as any);
  }

  setNotFoundHandler(handler: Function) {
    return this.use(handler as any);
  }

  getHttpServer() {
    return this.instance;
  }

  close() {
    return this.instance.close();
  }

  set(...args) {
    return this.instance.set(...args);
  }

  enable(...args) {
    return this.instance.set(...args);
  }

  disable(...args) {
    return this.instance.set(...args);
  }

  engine(...args) {
    return this.instance.set(...args);
  }

  useStaticAssets(path: string, options: ServeStaticOptions) {
    return this.use(express.static(path, options));
  }

  setBaseViewsDir(path: string) {
    return this.set('views', path);
  }

  setViewEngine(engine: string) {
    return this.set('view engine', engine);
  }

  getRequestMethod(request): string {
    return request.method;
  }

  getRequestUrl(request): string {
    return request.url;
  }
}
