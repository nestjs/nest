import { Server, IncomingMessage, ServerResponse } from 'http';
import { RequestMethod } from '../enums';

export type ErrorHandler = (
  error: any,
  req: Partial<IncomingMessage>,
  res: ServerResponse | any,
  next?: Function,
) => any;

export type RequestHandler = (
  req: Partial<IncomingMessage>,
  res: ServerResponse | any,
  next?: Function,
) => any;

export interface HttpServer {
  create(): Server | any;
  use(handler: RequestHandler | ErrorHandler): any;
  use(path, handler: RequestHandler | ErrorHandler): any;
  get(handler: RequestHandler): any;
  get(path, handler: RequestHandler): any;
  post(handler: RequestHandler): any;
  post(path, handler: RequestHandler): any;
  head(handler: RequestHandler): any;
  head(path, handler: RequestHandler): any;
  delete(handler: RequestHandler): any;
  delete(path, handler: RequestHandler): any;
  put(handler: RequestHandler): any;
  put(path, handler: RequestHandler): any;
  patch(handler: RequestHandler): any;
  patch(path, handler: RequestHandler): any;
  options(handler: RequestHandler): any;
  options(path, handler: RequestHandler): any;
  listen(port: number | string, callback?: () => void);
  listen(port: number | string, hostname: string, callback?: () => void);
  reply(response: any, body: any, statusCode: number);
  render(response: any, view: string, options: any);
  setHeader(response: any, name: string, value: string);
  setErrorHandler?(handler: Function);
  setNotFoundHandler?(handler: Function);
  useStaticAssets?(...args: any[]): Promise<this>;
  setBaseViewsDir?(path: string): Promise<this>;
  setViewEngine?(engineOrOptions: any): Promise<this>;
  registerParserMiddleware(): Promise<this>;
  createMiddlewareFactory(
    method: keyof RequestMethod,
  ): (path: string, callback: Function) => any;
  getRequestMethod?(request): string;
  getRequestUrl?(request): string;
  getInstance(): any;
  getHttpServer(): any;
  close();
}
