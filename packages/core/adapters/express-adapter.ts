import { RequestMethod } from '@nestjs/common';
import { HttpServer, RequestHandler } from '@nestjs/common/interfaces';
import { ServeStaticOptions } from '@nestjs/common/interfaces/external/serve-static-options.interface';
import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import * as express from 'express';
import { RouterMethodFactory } from '../helpers/router-method-factory';

export class ExpressAdapter implements HttpServer {
  private readonly routerMethodFactory = new RouterMethodFactory();

  constructor(private readonly instance) {}

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

  setHeader(response, name: string, value: string) {
    return response.set(name, value);
  }

  getHttpServer() {
    return this.instance;
  }

  getInstance() {
    return this.instance;
  }

  close() {
    return this.instance.close();
  }

  set(...args) {
    return this.instance.set(...args);
  }

  enable(...args) {
    return this.instance.enable(...args);
  }

  disable(...args) {
    return this.instance.disable(...args);
  }

  engine(...args) {
    return this.instance.engine(...args);
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

  createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return this.routerMethodFactory
      .get(this.instance, requestMethod)
      .bind(this.instance);
  }
}
