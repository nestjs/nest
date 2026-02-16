import {
  InternalServerErrorException,
  Logger,
  NestApplicationOptions,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import {
  isNil,
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import {
  H3,
  eventHandler,
  fromNodeHandler,
  getQuery,
  getRouterParams,
  H3Event,
  readBody,
  handleCors,
  serveStatic,
  type CorsOptions,
} from 'h3';
import { toNodeHandler } from 'h3/node';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import { pathToRegexp } from 'path-to-regexp';
import { ServeStaticOptions } from '../interfaces/serve-static-options.interface';

/**
 * HTTP/2 options for the H3 adapter.
 *
 * @publicApi
 */
export interface H3Http2Options {
  /**
   * Enable HTTP/2 support.
   */
  http2: true;
  /**
   * TLS/SSL options for secure HTTP/2 connections (h2).
   * Required for HTTP/2 in browsers.
   */
  http2Options?: http2.SecureServerOptions;
  /**
   * Allow HTTP/1 connections as a fallback via ALPN negotiation.
   * Defaults to true.
   */
  allowHTTP1?: boolean;
}

/**
 * HTTP/2 cleartext options (h2c) - HTTP/2 without TLS.
 * Note: Browsers do not support h2c, only server-to-server communication.
 *
 * @publicApi
 */
export interface H3Http2CleartextOptions {
  /**
   * Enable HTTP/2 cleartext support (h2c).
   */
  http2: true;
  /**
   * HTTP/2 server options (without TLS).
   */
  http2Options?: http2.ServerOptions;
}

/**
 * Extended application options for H3 with HTTP/2 support.
 *
 * @publicApi
 */
export interface H3ApplicationOptions extends NestApplicationOptions {
  /**
   * HTTP/2 configuration options.
   */
  http2Options?: H3Http2Options | H3Http2CleartextOptions;
}

type VersionedRoute = <
  TRequest extends Record<string, any> = any,
  TResponse = any,
>(
  req: TRequest,
  res: TResponse,
  next: () => void,
) => any;

/**
 * HTTP/2 compatible server type
 */
type H3Server =
  | http.Server
  | https.Server
  | http2.Http2Server
  | http2.Http2SecureServer;

export class H3Adapter extends AbstractHttpAdapter<
  H3Server,
  http.IncomingMessage | http2.Http2ServerRequest,
  http.ServerResponse | http2.Http2ServerResponse
> {
  protected readonly instance: H3;
  private readonly logger = new Logger(H3Adapter.name);
  private isHttp2 = false;
  private onRequestHook?: (
    req: any,
    res: any,
    done: () => void,
  ) => Promise<void> | void;
  private onResponseHook?: (req: any, res: any) => Promise<void> | void;

  constructor(instance?: H3) {
    super(instance || new H3());
  }

  /**
   * Sets a hook that is called before each request is processed.
   * The hook can perform async operations and must call `done()` when finished.
   *
   * @param onRequestHook - The hook function to call before each request
   */
  public setOnRequestHook(
    onRequestHook: (
      req: any,
      res: any,
      done: () => void,
    ) => Promise<void> | void,
  ) {
    this.onRequestHook = onRequestHook;
  }

  /**
   * Sets a hook that is called after each response is finished.
   *
   * @param onResponseHook - The hook function to call after each response
   */
  public setOnResponseHook(
    onResponseHook: (req: any, res: any) => Promise<void> | void,
  ) {
    this.onResponseHook = onResponseHook;
  }

  public reply(
    response: http.ServerResponse | H3Event,
    body: any,
    statusCode?: number,
  ) {
    // response should be Node.js res object now
    const res = response as http.ServerResponse;
    if (!res || typeof res.end !== 'function') {
      return;
    }
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
      const mockRes = { send: (chunk: any) => res.end(chunk) } as any;
      stream.once('error', err => {
        body.errorHandler(err, mockRes);
      });
      return stream
        .pipe(res)
        .on('error', (err: Error) => body.errorLogger(err));
    }

    if (isNil(body)) {
      return res.end();
    }
    if (isObject(body) && !Buffer.isBuffer(body) && !isString(body)) {
      const responseContentType = res.getHeader('Content-Type');
      if (
        typeof responseContentType === 'string' &&
        !responseContentType.startsWith('application/json') &&
        (body as any)?.statusCode >= 400
      ) {
        this.logger.warn(
          "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
        );
        res.setHeader('Content-Type', 'application/json');
      } else if (!responseContentType) {
        res.setHeader('Content-Type', 'application/json');
      }
      return res.end(JSON.stringify(body));
    }
    return res.end(body);
  }

  public status(response: http.ServerResponse | H3Event, statusCode: number) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (res && typeof res.statusCode !== 'undefined') {
      res.statusCode = statusCode;
    }
    return response;
  }

  public end(response: http.ServerResponse | H3Event, message?: string) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (res && typeof res.end === 'function') {
      if (message) {
        return res.end(message);
      }
      return res.end();
    }
  }

  /**
   * Render method is part of the AbstractHttpAdapter interface contract.
   * Template rendering is not yet supported in H3Adapter.
   */
  public render(
    response: http.ServerResponse | H3Event,
    _view: string,
    _options: any,
  ) {
    this.logger.warn('render() is not supported in H3Adapter yet.');
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (res && typeof res.end === 'function') {
      return res.end('Render not supported');
    }
  }

  public redirect(
    response: http.ServerResponse | H3Event,
    statusCode: number,
    url: string,
  ) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (res) {
      res.statusCode = statusCode;
      res.setHeader('Location', url);
      res.end();
    }
  }

  /**
   * The prefix parameter is part of the AbstractHttpAdapter interface contract.
   * It represents the global prefix but is not used in H3's error handler implementation.
   */
  public setErrorHandler(handler: Function, _prefix?: string) {
    this.instance.config.onError = (error, event) => {
      return handler(
        error,
        event.runtime?.node?.req,
        event.runtime?.node?.res,
        (_err: any) => {
          // Next callback - error parameter required by signature but not used
        },
      );
    };
    return this;
  }

  /**
   * The prefix parameter is part of the AbstractHttpAdapter interface contract.
   * It represents the global prefix but is not used in H3's not-found handler implementation.
   */
  public setNotFoundHandler(handler: Function, _prefix?: string) {
    // Not found handler should be registered as a catch-all route, not middleware
    // This ensures it only runs when no other routes match
    this.instance.all('/**', async event => {
      const req = event.runtime?.node?.req;
      const res = event.runtime?.node?.res;

      // Register onResponse hook if set (same as wrapHandler)
      if (this.onResponseHook && res) {
        res.on('finish', () => {
          void this.onResponseHook?.apply(this, [req, res]);
        });
      }

      return handler(req, res);
    });
    return this;
  }

  public isHeadersSent(response: http.ServerResponse | H3Event): boolean {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    return res?.headersSent ?? false;
  }

  public getHeader(response: http.ServerResponse | H3Event, name: string) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    return res?.getHeader?.(name);
  }

  public setHeader(
    response: http.ServerResponse | H3Event,
    name: string,
    value: string,
  ) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (res && typeof res.setHeader === 'function') {
      res.setHeader(name, value);
    }
  }

  public appendHeader(
    response: http.ServerResponse | H3Event,
    name: string,
    value: string,
  ) {
    // Handle both H3Event and Node.js response
    const res =
      (response as H3Event).runtime?.node?.res ||
      (response as http.ServerResponse);
    if (!res || typeof res.setHeader !== 'function') {
      return;
    }
    const prev = res.getHeader(name);
    if (!prev) {
      res.setHeader(name, value);
    } else {
      const newValue = Array.isArray(prev)
        ? [...prev, value]
        : [String(prev), value];
      res.setHeader(name, newValue);
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

  /**
   * Serves static files from the specified directory.
   *
   * @param staticPath - The path to the directory containing static files
   * @param options - Options for serving static files (prefix, maxAge, etc.)
   */
  public useStaticAssets(staticPath: string, options?: ServeStaticOptions) {
    const prefix = options?.prefix || '';
    const normalizedPrefix = prefix.endsWith('/')
      ? prefix.slice(0, -1)
      : prefix;

    // Register static file handler using H3's serveStatic
    this.instance.use(async event => {
      const url = event.path || event.runtime?.node?.req?.url || '';
      const urlPath = url.split('?')[0];

      // Check if URL matches prefix
      if (normalizedPrefix && !urlPath.startsWith(normalizedPrefix)) {
        return; // Continue to next handler
      }

      // Remove prefix from path to get the file path
      const filePath = normalizedPrefix
        ? urlPath.slice(normalizedPrefix.length)
        : urlPath;

      // Construct the full file path
      const resolvedPath = path.join(staticPath, filePath);

      // Security: Ensure the resolved path is within the static directory
      const absoluteStaticPath = path.resolve(staticPath);
      const absoluteResolvedPath = path.resolve(resolvedPath);
      if (!absoluteResolvedPath.startsWith(absoluteStaticPath)) {
        return; // Prevent directory traversal attacks
      }

      // Handle dotfiles
      const basename = path.basename(filePath);
      if (basename.startsWith('.')) {
        const dotfileHandling = options?.dotfiles || 'ignore';
        if (dotfileHandling === 'deny') {
          const res = event.runtime?.node?.res;
          if (res) {
            res.statusCode = 403;
            res.end('Forbidden');
          }
          return;
        }
        if (dotfileHandling === 'ignore') {
          return; // Continue to next handler
        }
        // 'allow' falls through to serve the file
      }

      // Use H3's serveStatic helper
      const result = await serveStatic(event, {
        getContents: async id => {
          // Strip prefix from id since serveStatic passes the full path
          const idWithoutPrefix = normalizedPrefix
            ? id.replace(normalizedPrefix, '')
            : id;
          const fullPath = path.join(absoluteStaticPath, idWithoutPrefix);
          // Security check again
          const absFullPath = path.resolve(fullPath);
          if (!absFullPath.startsWith(absoluteStaticPath)) {
            return undefined;
          }
          try {
            return fs.readFileSync(absFullPath);
          } catch {
            return undefined;
          }
        },
        getMeta: async id => {
          // Strip prefix from id since serveStatic passes the full path
          const idWithoutPrefix = normalizedPrefix
            ? id.replace(normalizedPrefix, '')
            : id;
          const fullPath = path.join(absoluteStaticPath, idWithoutPrefix);
          const absFullPath = path.resolve(fullPath);
          if (!absFullPath.startsWith(absoluteStaticPath)) {
            return undefined;
          }
          try {
            const stats = fs.statSync(absFullPath);

            // H3's serveStatic handles index file lookup via indexNames option
            // So we only return metadata for actual files
            if (!stats.isFile()) {
              return undefined;
            }

            return {
              size: stats.size,
              mtime: stats.mtime,
            };
          } catch {
            return undefined;
          }
        },
        indexNames:
          options?.index === false
            ? []
            : options?.index === true || options?.index === undefined
              ? ['/index.html']
              : Array.isArray(options?.index)
                ? options.index.map((f: string) =>
                    f.startsWith('/') ? f : `/${f}`,
                  )
                : [
                    options.index.startsWith('/')
                      ? options.index
                      : `/${options.index}`,
                  ],
        // Allow fallthrough to next handler if file not found
        fallthrough: true,
      });

      // Apply custom headers if file was served
      if (result !== undefined) {
        const res = event.runtime?.node?.res;
        if (res) {
          // Apply ETag if enabled (default: true)
          if (options?.etag !== false) {
            // ETag is typically handled by serveStatic, but we could enhance it here
          }

          // Apply Last-Modified if enabled (default: true)
          if (options?.lastModified !== false) {
            // Last-Modified is typically handled by serveStatic
          }

          // Apply max-age cache control
          if (options?.maxAge !== undefined) {
            const maxAge =
              typeof options.maxAge === 'string'
                ? this.parseMaxAge(options.maxAge)
                : options.maxAge;
            let cacheControl = `max-age=${Math.floor(maxAge / 1000)}`;
            if (options?.immutable) {
              cacheControl += ', immutable';
            }
            res.setHeader('Cache-Control', cacheControl);
          }

          // Apply custom headers
          if (options?.setHeaders) {
            try {
              const stats = fs.statSync(absoluteResolvedPath);
              options.setHeaders(res, absoluteResolvedPath, stats);
            } catch {
              // File stats not available
            }
          }
        }
      }

      return result;
    });

    return this;
  }

  /**
   * Parse a max-age string like '1d', '2h', '30m' to milliseconds
   */
  private parseMaxAge(maxAge: string): number {
    const match = maxAge.match(/^(\d+)(ms|s|m|h|d)?$/);
    if (!match) {
      return 0;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2] || 'ms';
    switch (unit) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  }

  public setBaseViewsDir(...args: any[]) {
    return this;
  }

  public setViewEngine(...args: any[]) {
    return this;
  }

  public getRequestHostname(request: http.IncomingMessage | H3Event): string {
    // Handle both H3Event and Node.js request
    if ('runtime' in request) {
      return request.runtime?.node?.req?.headers?.host || '';
    }
    return request.headers?.host || '';
  }

  public getRequestMethod(request: http.IncomingMessage | H3Event): string {
    // Handle both H3Event and Node.js request
    if ('runtime' in request) {
      return request.runtime?.node?.req?.method || 'GET';
    }
    return request.method || 'GET';
  }

  public getRequestUrl(request: http.IncomingMessage | H3Event): string {
    // Handle both H3Event and Node.js request
    if ('runtime' in request) {
      return request.runtime?.node?.req?.url || '';
    }
    return request.url || '';
  }

  public enableCors(options?: CorsOptions) {
    // Use plain middleware function - don't wrap in eventHandler()
    this.instance.use(event => {
      // Map NestJS CORS options to H3 CORS options
      // H3 uses different property names: exposeHeaders instead of exposedHeaders,
      // allowHeaders instead of allowedHeaders
      const h3CorsOptions: CorsOptions = {
        origin: options?.origin,
        methods: options?.methods,
        credentials: options?.credentials,
        maxAge: options?.maxAge,
        // Map NestJS names to H3 names
        allowHeaders: (options as Record<string, unknown>)?.allowedHeaders as
          | string[]
          | undefined,
        exposeHeaders: (options as Record<string, unknown>)?.exposedHeaders as
          | string[]
          | undefined,
        preflight: {
          statusCode: 204,
          ...options?.preflight,
        },
      };

      // handleCors returns true/response if it handled the request (preflight)
      const corsResult = handleCors(event, h3CorsOptions);

      if (corsResult) {
        return corsResult;
      }

      // Return undefined to continue to route handler
    });
  }

  /**
   * The requestMethod parameter is part of the AbstractHttpAdapter interface contract.
   * H3 middleware uses instance.use() which doesn't filter by HTTP method (similar to Fastify).
   */
  public createMiddlewareFactory(
    _requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
      const { regexp } = pathToRegexp(normalizedPath);

      // Use plain middleware function - don't wrap in eventHandler()
      this.instance.use(async event => {
        const currentPath = (event.runtime?.node?.req?.url || '').split('?')[0];
        if (regexp.exec(currentPath)) {
          await fromNodeHandler(callback as any)(event);
        }
        // Return undefined to continue to route handler
      });
    };
  }

  /**
   * Initialize the HTTP server with support for HTTP/1.1, HTTPS, and HTTP/2.
   *
   * HTTP/2 can be enabled by passing `http2Options` in the application options:
   *
   * @example
   * ```typescript
   * // HTTP/2 with TLS (h2)
   * const app = await NestFactory.create(AppModule, new H3Adapter(), {
   *   httpsOptions: { key, cert },
   *   http2Options: { http2: true, allowHTTP1: true }
   * });
   *
   * // HTTP/2 cleartext (h2c) - for server-to-server only
   * const app = await NestFactory.create(AppModule, new H3Adapter(), {
   *   http2Options: { http2: true }
   * });
   * ```
   *
   * @param options - Application options including HTTP/2 configuration
   */
  public initHttpServer(
    options: NestApplicationOptions & {
      http2Options?: H3Http2Options | H3Http2CleartextOptions;
    },
  ) {
    const requestListener = toNodeHandler(this.instance);

    // Check for HTTP/2 options
    if (options?.http2Options?.http2) {
      this.isHttp2 = true;

      // HTTP/2 with TLS (h2) - required for browser support
      if (options.httpsOptions) {
        const secureOptions: http2.SecureServerOptions = {
          ...options.httpsOptions,
          ...options.http2Options.http2Options,
          allowHTTP1:
            (options.http2Options as H3Http2Options).allowHTTP1 ?? true,
        };

        this.httpServer = http2.createSecureServer(
          secureOptions,
          requestListener as any,
        );

        this.logger.log('HTTP/2 secure server (h2) initialized');
      } else {
        // HTTP/2 cleartext (h2c) - only for server-to-server communication
        const h2cOptions: http2.ServerOptions = {
          ...options.http2Options.http2Options,
        };

        this.httpServer = http2.createServer(
          h2cOptions,
          requestListener as any,
        );

        this.logger.warn(
          'HTTP/2 cleartext server (h2c) initialized. Note: Browsers do not support h2c.',
        );
      }
    } else if (options?.httpsOptions) {
      // HTTPS (HTTP/1.1 over TLS)
      this.httpServer = https.createServer(
        options.httpsOptions,
        requestListener,
      );
    } else {
      // HTTP/1.1
      this.httpServer = http.createServer(requestListener);
    }
  }

  /**
   * Returns whether the server is running in HTTP/2 mode.
   *
   * @returns {boolean} True if HTTP/2 is enabled
   */
  public isHttp2Enabled(): boolean {
    return this.isHttp2;
  }

  /**
   * Parameters are part of the AbstractHttpAdapter interface contract.
   * The prefix parameter could be used to conditionally apply parsing based on path prefix.
   * The rawBody parameter could be used to configure raw body parsing.
   * Currently, H3 adapter applies body parsing globally for POST, PUT, and PATCH requests.
   * Multipart form data is skipped to allow interceptors to handle file uploads.
   */
  public registerParserMiddleware(_prefix?: string, _rawBody?: boolean) {
    // Use plain middleware function - don't wrap in eventHandler()
    // Middleware must return undefined to allow route handlers to execute
    this.instance.use(async event => {
      const method = event.runtime?.node?.req?.method || 'GET';
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        // Get content type and check if it's multipart - skip body parsing for multipart
        const contentType =
          event.runtime?.node?.req?.headers?.['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
          // Skip body parsing for multipart - let interceptors handle it
          return;
        }
        const body = await readBody(event);
        (event as any).body = body;
      }
      // Return undefined to continue to next handler/route
    });
  }

  public getType(): string {
    return 'h3';
  }

  public get(handler: Function): void;
  public get(path: string, handler: Function): void;
  public get(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('GET', path as string, this.wrapHandler(handler));
  }

  public post(handler: Function): void;
  public post(path: string, handler: Function): void;
  public post(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('POST', path as string, this.wrapHandler(handler));
  }

  public put(handler: Function): void;
  public put(path: string, handler: Function): void;
  public put(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('PUT', path as string, this.wrapHandler(handler));
  }

  public delete(handler: Function): void;
  public delete(path: string, handler: Function): void;
  public delete(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('DELETE', path as string, this.wrapHandler(handler));
  }

  public patch(handler: Function): void;
  public patch(path: string, handler: Function): void;
  public patch(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('PATCH', path as string, this.wrapHandler(handler));
  }

  public options(handler: Function): void;
  public options(path: string, handler: Function): void;
  public options(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('OPTIONS', path as string, this.wrapHandler(handler));
  }

  public head(handler: Function): void;
  public head(path: string, handler: Function): void;
  public head(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? args[0] : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.instance.on('HEAD', path as string, this.wrapHandler(handler));
  }

  /**
   * Applies version filtering to a route handler.
   * Supports URI, Header, Media Type, and Custom versioning strategies.
   *
   * @param handler - The route handler function
   * @param version - The version(s) this handler supports
   * @param versioningOptions - The versioning configuration options
   * @returns A wrapped handler that filters by version
   */
  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute {
    const callNextHandler: VersionedRoute = (req, res, next) => {
      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
      return next();
    };

    // VERSION_NEUTRAL or URI versioning pass through directly
    // URI Versioning is done via the path, so the filter continues forward
    if (
      version === VERSION_NEUTRAL ||
      versioningOptions.type === VersioningType.URI
    ) {
      const handlerForNoVersioning: VersionedRoute = (req, res, next) =>
        handler(req, res, next);
      return handlerForNoVersioning;
    }

    // Custom Extractor Versioning Handler
    if (versioningOptions.type === VersioningType.CUSTOM) {
      const handlerForCustomVersioning: VersionedRoute = (req, res, next) => {
        const extractedVersion = versioningOptions.extractor(req);

        if (Array.isArray(version)) {
          if (
            Array.isArray(extractedVersion) &&
            version.filter(v => extractedVersion.includes(v as string)).length
          ) {
            return handler(req, res, next);
          }

          if (
            isString(extractedVersion) &&
            version.includes(extractedVersion)
          ) {
            return handler(req, res, next);
          }
        } else if (isString(version)) {
          // Known limitation: if there are multiple versions supported across separate
          // handlers/controllers, we can't select the highest matching handler.
          // Since this code is evaluated per-handler, we can't see if the highest
          // specified version exists in a different handler.
          if (
            Array.isArray(extractedVersion) &&
            extractedVersion.includes(version)
          ) {
            return handler(req, res, next);
          }

          if (isString(extractedVersion) && version === extractedVersion) {
            return handler(req, res, next);
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForCustomVersioning;
    }

    // Media Type (Accept Header) Versioning Handler
    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      const handlerForMediaTypeVersioning: VersionedRoute = (
        req,
        res,
        next,
      ) => {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : undefined;

        // No version was supplied
        if (isUndefined(acceptHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key,
          )[1];

          if (Array.isArray(version)) {
            if (version.includes(headerVersion)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === headerVersion) {
              return handler(req, res, next);
            }
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForMediaTypeVersioning;
    }

    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      const handlerForHeaderVersioning: VersionedRoute = (req, res, next) => {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        // No version was supplied
        if (isUndefined(customHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          if (Array.isArray(version)) {
            if (version.includes(customHeaderVersionParameter)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === customHeaderVersionParameter) {
              return handler(req, res, next);
            }
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForHeaderVersioning;
    }

    throw new Error('Unsupported versioning options');
  }

  private wrapHandler(handler: Function) {
    return eventHandler(async event => {
      const req = event.runtime?.node?.req;
      const res = event.runtime?.node?.res;

      if (!req || !res) {
        throw new Error('Node.js runtime not available');
      }

      // Copy H3 response headers to Node.js response (e.g., CORS headers set by middleware)
      for (const [key, value] of event.res.headers.entries()) {
        if (!res.getHeader(key)) {
          res.setHeader(key, value);
        }
      }

      // Add H3-specific properties to req
      (req as any).query = getQuery(event);
      (req as any).params = getRouterParams(event) || {};
      (req as any).body = (event as any).body;
      (req as any).h3Event = event;

      // Register onResponse hook if set
      if (this.onResponseHook) {
        res.on('finish', () => {
          void this.onResponseHook?.apply(this, [req, res]);
        });
      }

      // Call onRequest hook if set
      if (this.onRequestHook) {
        await new Promise<void>((resolve, reject) => {
          try {
            const result = this.onRequestHook?.apply(this, [req, res, resolve]);
            if (result && typeof result.then === 'function') {
              result.then(resolve).catch(reject);
            }
          } catch (err) {
            reject(err);
          }
        });
      }

      // Create a promise that resolves when the response is sent
      return new Promise<void>((resolve, reject) => {
        // Intercept res.end to know when the response is complete
        const originalEnd = res.end.bind(res);
        (res as any).end = function (...args: any[]) {
          originalEnd(...args);
          resolve();
        };

        // NestJS handler expects (req, res, next)
        const next = (err?: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        try {
          const result = handler(req, res, next);
          // Handle async handlers
          if (result && typeof result.then === 'function') {
            result.catch((err: any) => {
              reject(err);
            });
          }
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
