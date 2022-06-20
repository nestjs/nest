import { RequestMethod, VersioningOptions } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import { AbstractHttpAdapter } from '../../adapters';

export class NoopHttpAdapter extends AbstractHttpAdapter {
  constructor(instance: any) {
    super(instance);
  }
  close(): any {}
  initHttpServer(options: any): any {}
  useStaticAssets(...args: any[]): any {}
  setViewEngine(engine: string): any {}
  getRequestHostname(request: any): any {}
  getRequestMethod(request: any): any {}
  getRequestUrl(request: any): any {}
  reply(response: any, body: any): any {}
  end(response: any, message?: any): any {}
  status(response: any, statusCode: number): any {}
  render(response: any, view: string, options: any): any {}
  redirect(response: any, statusCode: number, url: string) {}
  setErrorHandler(handler: Function, prefix = '/'): any {}
  setNotFoundHandler(handler: Function, prefix = '/'): any {}
  isHeadersSent(response: any): any {}
  setHeader(response: any, name: string, value: string): any {}
  registerParserMiddleware(): any {}
  enableCors(options: any): any {}
  createMiddlewareFactory(requestMethod: RequestMethod): any {}
  getType() {
    return '';
  }
  applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ) {
    return (req, res, next) => {
      return () => {};
    };
  }
}
