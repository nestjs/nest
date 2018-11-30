import { RequestMethod } from '@nestjs/common';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { isFunction, isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { RouterMethodFactory } from '@nestjs/core/helpers/router-method-factory';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import { ServeStaticOptions } from './../interfaces/serve-static-options.interface';

export class ExpressAdapter extends AbstractHttpAdapter {
  private readonly routerMethodFactory = new RouterMethodFactory();

  public reply(response, body: any, statusCode: number) {
    const res = response.status(statusCode);
    if (isNil(body)) {
      return res.send();
    }
    return isObject(body) ? res.json(body) : res.send(String(body));
  }

  public render(response, view: string, options: any) {
    return response.render(view, options);
  }

  public setErrorHandler(handler: Function) {
    return this.use(handler);
  }

  public setNotFoundHandler(handler: Function) {
    return this.use(handler);
  }

  public setHeader(response, name: string, value: string) {
    return response.set(name, value);
  }

  public close() {
    return this.instance.close();
  }

  public set(...args: any[]) {
    return this.instance.set(...args);
  }

  public enable(...args: any[]) {
    return this.instance.enable(...args);
  }

  public disable(...args: any[]) {
    return this.instance.disable(...args);
  }

  public engine(...args: any[]) {
    return this.instance.engine(...args);
  }

  public useStaticAssets(path: string, options: ServeStaticOptions) {
    if (options && options.prefix) {
      return this.use(options.prefix, express.static(path, options));
    }
    return this.use(express.static(path, options));
  }

  public setBaseViewsDir(path: string) {
    return this.set('views', path);
  }

  public setViewEngine(engine: string) {
    return this.set('view engine', engine);
  }

  public getRequestMethod(request): string {
    return request.method;
  }

  public getRequestUrl(request): string {
    return request.url;
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return this.routerMethodFactory
      .get(this.instance, requestMethod)
      .bind(this.instance);
  }

  public initHttpServer(options: NestApplicationOptions) {
    const isHttpsEnabled = options && options.httpsOptions;
    if (isHttpsEnabled) {
      this.httpServer = https.createServer(
        options.httpsOptions,
        this.getInstance(),
      );
      return;
    }
    this.httpServer = http.createServer(this.getInstance());
  }

  public registerParserMiddleware() {
    const parserMiddleware = {
      jsonParser: bodyParser.json(),
      urlencodedParser: bodyParser.urlencoded({ extended: true }),
    };
    Object.keys(parserMiddleware)
      .filter(parser => !this.isMiddlewareApplied(parser))
      .forEach(parserKey => this.use(parserMiddleware[parserKey]));
  }

  private isMiddlewareApplied(name: string); : boolean; {
    const app = this.getInstance();
    return (
      !!app._router &&
      !!app._router.stack &&
      isFunction(app._router.stack.filter) &&
      app._router.stack.some(
        (layer: any) => layer && layer.handle && layer.handle.name === name,
      )
    );
  }
}
