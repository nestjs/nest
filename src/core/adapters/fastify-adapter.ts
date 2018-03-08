import {
  HttpServer,
  RequestHandler,
  ErrorHandler,
} from '@nestjs/common/interfaces';

export class FastifyAdapter implements HttpServer {
  constructor(protected readonly instance) {}

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

  close() {
    return this.instance.close();
  }
}
