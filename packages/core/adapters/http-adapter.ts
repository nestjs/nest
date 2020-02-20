import { HttpServer, RequestMethod } from '@nestjs/common';
import { RequestHandler } from '@nestjs/common/interfaces';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';

/**
 * @publicApi
 */
export abstract class AbstractHttpAdapter<
  TServer = any,
  TRequest = any,
  TResponse = any
> implements HttpServer<TRequest, TResponse> {
  protected httpServer: TServer;

  constructor(protected readonly instance: any) {}

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

  public getHttpServer(): TServer {
    return this.httpServer as TServer;
  }

  public setHttpServer(httpServer: TServer) {
    this.httpServer = httpServer;
  }

  public getInstance<T = any>(): T {
    return this.instance as T;
  }

  abstract close();
  abstract initHttpServer(options: NestApplicationOptions);
  abstract useStaticAssets(...args: any[]);
  abstract setViewEngine(engine: string);
  abstract getRequestHostname(request);
  abstract getRequestMethod(request);
  abstract getRequestUrl(request);
  abstract status(response, statusCode: number);
  abstract reply(response, body: any, statusCode?: number);
  abstract render(response, view: string, options: any);
  abstract redirect(response, statusCode: number, url: string);
  abstract setErrorHandler(handler: Function, prefix?: string);
  abstract setNotFoundHandler(handler: Function, prefix?: string);
  abstract setHeader(response, name: string, value: string);
  abstract registerParserMiddleware(prefix?: string);
  abstract enableCors(options: CorsOptions, prefix?: string);
  abstract createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any;
  abstract getType(): string;
}
