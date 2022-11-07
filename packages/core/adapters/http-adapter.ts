import { HttpServer, RequestMethod, VersioningOptions } from '@nestjs/common';
import { RequestHandler, VersionValue } from '@nestjs/common/interfaces';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';

/**
 * @publicApi
 */
export abstract class AbstractHttpAdapter<
  TServer = any,
  TRequest = any,
  TResponse = any,
> implements HttpServer<TRequest, TResponse>
{
  protected httpServer: TServer;

  constructor(protected instance?: any) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async init() {}

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

  public all(handler: RequestHandler);
  public all(path: any, handler: RequestHandler);
  public all(...args: any[]) {
    return this.instance.all(...args);
  }

  public search(port: string | number, callback?: () => void);
  public search(port: string | number, hostname: string, callback?: () => void);
  public search(port: any, hostname?: any, callback?: any) {
    return this.instance.search(port, hostname, callback);
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

  public setInstance<T = any>(instance: T) {
    this.instance = instance;
  }

  public getInstance<T = any>(): T {
    return this.instance as T;
  }

  abstract close();
  abstract initHttpServer(options: NestApplicationOptions);
  abstract useStaticAssets(...args: any[]);
  abstract setViewEngine(engine: string);
  abstract getRequestHostname(request: any);
  abstract getRequestMethod(request: any);
  abstract getRequestUrl(request: any);
  abstract status(response: any, statusCode: number);
  abstract reply(response: any, body: any, statusCode?: number);
  abstract end(response: any, message?: string);
  abstract render(response: any, view: string, options: any);
  abstract redirect(response: any, statusCode: number, url: string);
  abstract setErrorHandler(handler: Function, prefix?: string);
  abstract setNotFoundHandler(handler: Function, prefix?: string);
  abstract isHeadersSent(response: any);
  abstract setHeader(response: any, name: string, value: string);
  abstract registerParserMiddleware(prefix?: string, rawBody?: boolean);
  abstract enableCors(
    options: CorsOptions | CorsOptionsDelegate<TRequest>,
    prefix?: string,
  );
  abstract createMiddlewareFactory(
    requestMethod: RequestMethod,
  ):
    | ((path: string, callback: Function) => any)
    | Promise<(path: string, callback: Function) => any>;
  abstract getType(): string;
  abstract applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): (req: TRequest, res: TResponse, next: () => void) => Function;
}
