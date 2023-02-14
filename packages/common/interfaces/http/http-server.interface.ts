import { RequestMethod } from '../../enums';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '../../interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '../../interfaces/nest-application-options.interface';
import { VersioningOptions, VersionValue } from '../version-options.interface';

export type ErrorHandler<TRequest = any, TResponse = any> = (
  error: any,
  req: TRequest,
  res: TResponse,
  next?: Function,
) => any;
export type RequestHandler<TRequest = any, TResponse = any> = (
  req: TRequest,
  res: TResponse,
  next?: Function,
) => any;

export interface HttpServer<TRequest = any, TResponse = any> {
  use(
    handler:
      | RequestHandler<TRequest, TResponse>
      | ErrorHandler<TRequest, TResponse>,
  ): any;
  use(
    path: string,
    handler:
      | RequestHandler<TRequest, TResponse>
      | ErrorHandler<TRequest, TResponse>,
  ): any;
  useBodyParser?(...args: any[]): any;
  get(handler: RequestHandler<TRequest, TResponse>): any;
  get(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  post(handler: RequestHandler<TRequest, TResponse>): any;
  post(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  head(handler: RequestHandler<TRequest, TResponse>): any;
  head(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  delete(handler: RequestHandler<TRequest, TResponse>): any;
  delete(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  put(handler: RequestHandler<TRequest, TResponse>): any;
  put(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  patch(handler: RequestHandler<TRequest, TResponse>): any;
  patch(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  all(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  all(handler: RequestHandler<TRequest, TResponse>): any;
  options(handler: RequestHandler<TRequest, TResponse>): any;
  options(path: string, handler: RequestHandler<TRequest, TResponse>): any;
  listen(port: number | string, callback?: () => void): any;
  listen(port: number | string, hostname: string, callback?: () => void): any;
  reply(response: any, body: any, statusCode?: number): any;
  status(response: any, statusCode: number): any;
  end(response: any, message?: string): any;
  render(response: any, view: string, options: any): any;
  redirect(response: any, statusCode: number, url: string): any;
  isHeadersSent(response: any): boolean;
  setHeader(response: any, name: string, value: string): any;
  setErrorHandler?(handler: Function, prefix?: string): any;
  setNotFoundHandler?(handler: Function, prefix?: string): any;
  useStaticAssets?(...args: any[]): this;
  setBaseViewsDir?(path: string | string[]): this;
  setViewEngine?(engineOrOptions: any): this;
  createMiddlewareFactory(
    method: RequestMethod,
  ):
    | ((path: string, callback: Function) => any)
    | Promise<(path: string, callback: Function) => any>;
  getRequestHostname?(request: TRequest): string;
  getRequestMethod?(request: TRequest): string;
  getRequestUrl?(request: TRequest): string;
  getInstance(): any;
  registerParserMiddleware(...args: any[]): any;
  enableCors(options: CorsOptions | CorsOptionsDelegate<TRequest>): any;
  getHttpServer(): any;
  initHttpServer(options: NestApplicationOptions): void;
  close(): any;
  getType(): string;
  init?(): Promise<void>;
  applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): (req: TRequest, res: TResponse, next: () => void) => Function;
}
