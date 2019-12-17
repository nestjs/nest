import { RequestMethod } from '@nestjs/common';
import { AbstractHttpAdapter } from '../../adapters';

export class NoopHttpAdapter extends AbstractHttpAdapter {
  constructor(instance: any) {
    super(instance);
  }
  close(): any {}
  initHttpServer(options: any): any {}
  useStaticAssets(...args: any[]): any {}
  setViewEngine(engine: string): any {}
  getRequestMethod(request: any): any {}
  getRequestUrl(request: any): any {}
  reply(response: any, body: any): any {}
  status(response: any, statusCode: number): any {}
  render(response: any, view: string, options: any): any {}
  redirect(response: any, statusCode: number, url: string) {}
  setErrorHandler(handler: Function, prefix: string = '/'): any {}
  setNotFoundHandler(handler: Function, prefix: string = '/'): any {}
  setHeader(response: any, name: string, value: string): any {}
  registerParserMiddleware(prefix: string = '/'): any {}
  enableCors(options: any, prefix: string = '/'): any {}
  createMiddlewareFactory(requestMethod: RequestMethod): any {}
  getType() {
    return '';
  }
}
