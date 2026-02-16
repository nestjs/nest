import {
  Logger,
  RequestMethod,
  StreamableFile,
  VersioningOptions,
} from '@nestjs/common';
import { isNil, isObject, isString } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import {
  H3,
  eventHandler,
  fromNodeHandler,
  getQuery,
  H3Event,
  readBody,
  handleCors,
} from 'h3';
import { toNodeHandler } from 'h3/node';
import * as http from 'http';
import * as https from 'https';
import { pathToRegexp } from 'path-to-regexp';

export class H3Adapter extends AbstractHttpAdapter<
  http.Server | https.Server,
  H3Event,
  H3Event
> {
  protected readonly instance: H3;
  private readonly logger = new Logger(H3Adapter.name);

  constructor(instance?: H3) {
    super(instance || new H3());
  }

  public reply(response: H3Event, body: any, statusCode?: number) {
    if (!response.runtime?.node?.res) {
      return;
    }
    const res = response.runtime.node.res;
    if (statusCode) {
      res.statusCode = statusCode;
    }
    if (body instanceof StreamableFile) {
      const streamHeaders = body.getHeaders();
      if (
        res.getHeader('Content-Type') === undefined &&
        streamHeaders.type !== undefined
      ) {
        res.setHeader('Content-Type', streamHeaders.type);
      }
      if (
        res.getHeader('Content-Disposition') === undefined &&
        streamHeaders.disposition !== undefined
      ) {
        res.setHeader('Content-Disposition', streamHeaders.disposition);
      }
      if (
        res.getHeader('Content-Length') === undefined &&
        streamHeaders.length !== undefined
      ) {
        res.setHeader('Content-Length', String(streamHeaders.length));
      }
      const stream = body.getStream();
      (res as any).send = (chunk: any) => res.end(chunk);
      stream.once('error', err => {
        body.errorHandler(err, res as any);
      });
      return stream
        .pipe(res)
        .on('error', (err: Error) => body.errorLogger(err));
    }

    if (isNil(body)) {
      return res.end();
    }
    if (isObject(body) && !Buffer.isBuffer(body) && !isString(body)) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      return res.end(JSON.stringify(body));
    }
    return res.end(body);
  }

  public status(response: H3Event, statusCode: number) {
    if (response.runtime?.node?.res) {
      response.runtime.node.res.statusCode = statusCode;
    }
    return response;
  }

  public end(response: H3Event, message?: string) {
    if (response.runtime?.node?.res) {
      if (message) {
        return response.runtime.node.res.end(message);
      }
      return response.runtime.node.res.end();
    }
  }

  public render(response: H3Event, view: string, options: any) {
    this.logger.warn('render() is not supported in H3Adapter yet.');
    if (response.runtime?.node?.res) {
      return response.runtime.node.res.end('Render not supported');
    }
  }

  public redirect(response: H3Event, statusCode: number, url: string) {
    if (response.runtime?.node?.res) {
      response.runtime.node.res.statusCode = statusCode;
      response.runtime.node.res.setHeader('Location', url);
      response.runtime.node.res.end();
    }
  }

  public setErrorHandler(handler: Function, prefix?: string) {
    this.instance.config.onError = (error, event) => {
      return handler(
        error,
        event.runtime?.node?.req,
        event.runtime?.node?.res,
        err => {
          // Next callback
        },
      );
    };
    return this;
  }

  public setNotFoundHandler(handler: Function, prefix?: string) {
    this.instance.use(
      eventHandler(async event => {
        return handler(event.runtime?.node?.req, event.runtime?.node?.res);
      }),
    );
    return this;
  }

  public isHeadersSent(response: H3Event): boolean {
    return response.runtime?.node?.res?.headersSent ?? false;
  }

  public getHeader(response: H3Event, name: string) {
    return response.runtime?.node?.res?.getHeader(name);
  }

  public setHeader(response: H3Event, name: string, value: string) {
    if (response.runtime?.node?.res) {
      response.runtime.node.res.setHeader(name, value);
    }
  }

  public appendHeader(response: H3Event, name: string, value: string) {
    if (!response.runtime?.node?.res) {
      return;
    }
    const prev = response.runtime.node.res.getHeader(name);
    if (!prev) {
      response.runtime.node.res.setHeader(name, value);
    } else {
      const newValue = Array.isArray(prev)
        ? [...prev, value]
        : [String(prev), value];
      response.runtime.node.res.setHeader(name, newValue);
    }
  }

  public listen(port: string | number, callback?: () => void): any;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): any;
  public listen(port: any, ...args: any[]): any {
    return this.httpServer.listen(port, ...args);
  }

  public close() {
    if (!this.httpServer) {
      return undefined;
    }
    return new Promise(resolve => this.httpServer.close(resolve));
  }

  public set(...args: any[]) {
    return this.instance;
  }

  public enable(...args: any[]) {
    return this.instance;
  }

  public disable(...args: any[]) {
    return this.instance;
  }

  public engine(...args: any[]) {
    return this.instance;
  }

  public useStaticAssets(...args: any[]) {
    return this;
  }

  public setBaseViewsDir(...args: any[]) {
    return this;
  }

  public setViewEngine(...args: any[]) {
    return this;
  }

  public getRequestHostname(request: H3Event): string {
    return (request.runtime?.node?.req?.headers['host'] as string) || '';
  }

  public getRequestMethod(request: H3Event): string {
    return request.runtime?.node?.req?.method || 'GET';
  }

  public getRequestUrl(request: H3Event): string {
    return request.runtime?.node?.req?.url || '';
  }

  public enableCors(options: any) {
    this.instance.use(
      eventHandler(async event => {
        if (handleCors(event, options)) {
          return;
        }
      }),
    );
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      let normalizedPath = path;
      if (path.endsWith('/')) {
        normalizedPath = path.slice(0, -1);
      }

      const { regexp } = pathToRegexp(normalizedPath);

      const handler = eventHandler(async event => {
        const currentPath = (event.runtime?.node?.req?.url || '').split('?')[0];
        if (regexp.exec(currentPath)) {
          const nodeHandler = fromNodeHandler(callback as any);
          return nodeHandler(event);
        }
      });

      this.instance.use(handler);
    };
  }

  public initHttpServer(options: any) {
    const requestListener = toNodeHandler(this.instance);
    if (options && options.httpsOptions) {
      this.httpServer = https.createServer(
        options.httpsOptions,
        requestListener,
      );
    } else {
      this.httpServer = http.createServer(requestListener);
    }
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    const parser = eventHandler(async event => {
      const method = event.runtime?.node?.req?.method || 'GET';
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const body = await readBody(event);
        (event as any).body = body;
      }
    });
    this.instance.use(parser);
  }

  public getType(): string {
    return 'h3';
  }

  public get(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.get(path, this.wrapHandler(handler));
  }

  public post(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.post(path, this.wrapHandler(handler));
  }

  public put(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.put(path, this.wrapHandler(handler));
  }

  public delete(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.delete(path, this.wrapHandler(handler));
  }

  public patch(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.patch(path, this.wrapHandler(handler));
  }

  public options(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    this.instance.options(path, this.wrapHandler(handler));
  }

  public head(...args: any[]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler = args.length > 1 ? args[1] : args[0];
    (this.instance as any).use(path, this.wrapHandler(handler), {
      method: 'HEAD',
    });
  }

  public applyVersionFilter(
    handler: Function,
    version: any,
    versioningOptions: VersioningOptions,
  ) {
    return (req: any, res: any, next: () => void) => {
      return handler(req, res, next);
    };
  }

  private wrapHandler(handler: any) {
    return eventHandler(async event => {
      (event as any).query = getQuery(event);
      (event as any).params = event.context.params;

      await new Promise<void>((resolve, reject) => {
        const next = () => {
          resolve();
        };
        // NestJS handler expects (req, res, next)
        handler(event, event, next);
      });
    });
  }
}
