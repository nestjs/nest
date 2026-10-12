import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
  type RequestMethod,
  StreamableFile,
  UnsupportedMediaTypeException,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import type { NestApplicationOptions } from '@nestjs/common';
import {
  type CorsOptions,
  type CorsOptionsDelegate,
  type RouteInfo,
  type VersionValue,
  addLeadingSlash,
  isNil,
  isObject,
  isString,
  isUndefined,
  stripEndSlash,
} from '@nestjs/common/internal';
import { AbstractHttpAdapter } from '@nestjs/core';
import {
  LegacyRouteConverter,
  RouterMethodFactory,
} from '@nestjs/core/internal';
import type { Server } from 'bun';
import cors from 'cors';
import { finished } from 'node:stream';
import { pathToRegexp } from 'path-to-regexp';
import type {
  BunAdapterOptions,
  BunServeOptions,
} from '../interfaces/bun-adapter-options.interface.js';
import type { NestBunBodyParserOptions } from '../interfaces/nest-bun-body-parser-options.interface.js';
import type { NestBunBodyParserType } from '../interfaces/nest-bun-body-parser.interface.js';
import type { NestBunViewEngineOption } from '../interfaces/nest-bun-view-engine.interface.js';
import type { ServeStaticOptions } from '../interfaces/serve-static-options.interface.js';
import { BunHttpServer } from './bun-http-server.js';
import { BunRequest } from './bun-request.js';
import { BunResponse } from './bun-response.js';
import {
  type NextFunction,
  type RequestHandler,
  Router,
} from './bun-router.js';
import { createBodyParser } from './utils/body-parser.util.js';
import { getMediaTypeVersion } from './utils/get-media-type-version.util.js';
import { serveStatic } from './utils/serve-static.util.js';
import { ViewRenderer } from './utils/view-renderer.util.js';

type OnRequestHook = (
  req: BunRequest,
  res: BunResponse,
  done: (err?: Error) => void,
) => Promise<void> | void;
type OnResponseHook = (
  req: BunRequest,
  res: BunResponse,
) => Promise<void> | void;
type VersionedRoute = (
  req: BunRequest,
  res: BunResponse,
  next: NextFunction,
) => any;

// Covers "application/json" and the "+json" structured syntax suffix (RFC 6839).
function isJsonContentType(contentType: string): boolean {
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return (
    mediaType.startsWith('application/json') || mediaType.endsWith('+json')
  );
}

/**
 * HTTP adapter running Nest directly on `Bun.serve()`: no Express, no
 * `node:http`. Requests are Web `Request`s wrapped in an Express-shaped
 * {@link BunRequest}; responses resolve into Web `Response`s.
 *
 * @example
 * const app = await NestFactory.create<NestBunApplication>(
 *   AppModule,
 *   new BunAdapter(),
 * );
 * await app.listen(3000);
 *
 * @publicApi
 */
export class BunAdapter extends AbstractHttpAdapter<
  BunHttpServer,
  BunRequest,
  BunResponse
> {
  private readonly logger = new Logger(BunAdapter.name);
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly registeredPrefixes = new Set<string>();
  private readonly views = new ViewRenderer();
  private readonly adapterOptions: BunAdapterOptions;
  private parsersRegistered = false;
  private isShuttingDown = false;
  private forceCloseConnections = false;
  private return503OnClosing = false;
  private onRequestHook?: OnRequestHook;
  private onResponseHook?: OnResponseHook;

  constructor(options: BunAdapterOptions = {}) {
    super(new Router());
    this.adapterOptions = options;
    this.router.use((req: BunRequest, res: BunResponse, next: NextFunction) => {
      if (this.onResponseHook) {
        res.on('finish', async () => {
          try {
            await this.onResponseHook!.call(this, req, res);
          } catch (err) {
            this.logger.error(err);
          }
        });
      }
      if (this.onRequestHook) {
        this.runRequestHook(req, res, next);
      } else {
        next();
      }
    });
  }

  /**
   * The underlying layer router (also returned by
   * `app.getHttpAdapter().getInstance()`).
   */
  public get router(): Router {
    return this.instance as Router;
  }

  /**
   * Runs a request through the whole Nest pipeline without a listening
   * socket, e.g. `await adapter.fetch(new Request('http://localhost/users'))`.
   * Also the `fetch` handler handed to `Bun.serve()`.
   */
  public readonly fetch = (
    request: Request,
    server?: Server<unknown> | null,
  ): Promise<Response> => {
    if (this.isShuttingDown && this.return503OnClosing) {
      return Promise.resolve(
        new Response('Service Unavailable', {
          status: 503,
          headers: { connection: 'close' },
        }),
      );
    }
    const req = new BunRequest(request, {
      server,
      trustProxy: this.adapterOptions.trustProxy,
    });
    const res = new BunResponse(req);
    req.res = res;
    if (this.views.configured) {
      res.viewRenderer = (view, data) => this.views.render(view, data);
    }
    return this.router.handle(req, res);
  };

  public initHttpServer(options: NestApplicationOptions) {
    const serve: BunServeOptions = { ...this.adapterOptions.serve };
    if (options?.httpsOptions) {
      const https = options.httpsOptions as Record<string, any>;
      serve.tls = {
        key: https.key,
        cert: https.cert,
        ca: https.ca,
        passphrase: https.passphrase,
        ...serve.tls,
      };
    }
    this.httpServer = new BunHttpServer(this.fetch, serve);
    this.forceCloseConnections = !!options?.forceCloseConnections;
    this.return503OnClosing = !!options?.return503OnClosing;
  }

  public listen(port: string | number, callback?: () => void): BunHttpServer;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): BunHttpServer;
  public listen(port: string | number, ...args: any[]): BunHttpServer {
    const callback =
      typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
    const hostname = isString(args[0]) ? args[0] : undefined;
    return this.httpServer.listen(port, hostname, callback);
  }

  public beforeClose() {
    this.isShuttingDown = true;
  }

  public async close() {
    this.isShuttingDown = true;
    await this.httpServer?.stop(this.forceCloseConnections);
  }

  public getType(): string {
    return 'bun';
  }

  public isRouteOrderSensitive(): boolean {
    return true;
  }

  /**
   * Registers a request hook. Call `done()` to continue processing the
   * request; only the first completion is forwarded, later errors are logged.
   */
  public setOnRequestHook(onRequestHook: OnRequestHook) {
    this.onRequestHook = onRequestHook;
  }

  /**
   * Registers a hook to run after the response has been sent. Thrown errors
   * and rejected promises are logged.
   */
  public setOnResponseHook(onResponseHook: OnResponseHook) {
    this.onResponseHook = onResponseHook;
  }

  public reply(response: BunResponse, body: any, statusCode?: number) {
    if (!isNil(statusCode)) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.send();
    }
    if (body instanceof StreamableFile) {
      const headers = body.getHeaders();
      setIfMissing(response, 'Content-Type', headers.type);
      setIfMissing(response, 'Content-Disposition', headers.disposition);
      setIfMissing(response, 'Content-Length', headers.length);
      const stream = body.getStream();
      stream.once('error', err => body.errorHandler(err, response as any));
      // pipe() leaves the source open when the client disconnects early
      finished(response, () => {
        if (!stream.readableEnded) {
          stream.destroy();
        }
      });
      return stream
        .pipe(response)
        .on('error', (err: Error) => body.errorLogger(err));
    }
    const contentType = response.getHeader('Content-Type');
    if (
      typeof contentType === 'string' &&
      !isJsonContentType(contentType) &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      this.logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
      );
      response.setHeader('Content-Type', 'application/json');
    }
    if (body instanceof Uint8Array) {
      return response.send(body);
    }
    return isObject(body) ? response.json(body) : response.send(String(body));
  }

  public status(response: BunResponse, statusCode: number) {
    return response.status(statusCode);
  }

  public end(response: BunResponse, message?: string) {
    return response.end(message);
  }

  public render(response: BunResponse, view: string, options: any) {
    return this.views
      .render(view, { ...response.locals, ...options })
      .then(html => {
        response.type('html').send(html);
      });
  }

  public redirect(response: BunResponse, statusCode: number, url: string) {
    return response.redirect(statusCode, url);
  }

  public isHeadersSent(response: BunResponse): boolean {
    return response.headersSent;
  }

  public getHeader(response: BunResponse, name: string) {
    return response.getHeader(name);
  }

  public setHeader(response: BunResponse, name: string, value: string) {
    return response.set(name, value);
  }

  public appendHeader(response: BunResponse, name: string, value: string) {
    return response.appendHeader(name, value);
  }

  public getRequestHostname(request: BunRequest): string {
    return request.hostname;
  }

  public getRequestMethod(request: BunRequest): string {
    return request.method;
  }

  public getRequestUrl(request: BunRequest): string {
    return request.originalUrl;
  }

  public normalizePath(path: string): string {
    try {
      const convertedPath = LegacyRouteConverter.tryConvert(path);
      // Call "pathToRegexp" to trigger a TypeError if the path is invalid
      pathToRegexp(convertedPath);
      return convertedPath;
    } catch (e) {
      if (e instanceof TypeError) {
        LegacyRouteConverter.printError(path);
      }
      throw e;
    }
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      try {
        // The core marks an exact-match path with a trailing "$" (e.g. "/api$").
        // "use()" matches by prefix, so strip the marker and register the path
        // as an exact "all()" route instead.
        const isExactPath = path.endsWith('$');
        const convertedPath = LegacyRouteConverter.tryConvert(
          isExactPath ? path.slice(0, -1) : path,
        );
        let router = this.routerMethodFactory.get(
          this.router as any,
          requestMethod,
        );
        if (isExactPath && router === this.router.use) {
          router = this.router.all;
        }
        // "/api" also matches "/api/"; that path is left to the wildcard entry
        // registered next to it, so the middleware doesn't run twice.
        const handler = isExactPath
          ? (req: BunRequest, res: BunResponse, next: NextFunction) =>
              req.path.endsWith('/') ? next() : callback(req, res, next)
          : callback;
        return router.call(this.router, convertedPath, handler);
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
  }

  public setErrorHandler(handler: Function, prefix?: string) {
    const normalizedPrefix = this.normalizePrefix(prefix);
    if (normalizedPrefix) {
      this.router.use(normalizedPrefix, handler as any);
    }
    // Always mount at the root as well, so routes outside the global prefix
    // still pass through the exception layer.
    return this.router.use(handler as any);
  }

  public setNotFoundHandler(
    handler: Function,
    prefix?: string,
    excludedRoutes?: RouteInfo[],
  ) {
    const normalizedPrefix = this.normalizePrefix(prefix);
    if (normalizedPrefix) {
      this.registeredPrefixes.add(normalizedPrefix);
      this.router.use(normalizedPrefix, handler as RequestHandler);
      // Excluded routes live at the root, out of the prefix handler's reach.
      // Mount the handler on each exact path, for every method, so a method
      // miss there still reaches the exception layer.
      for (const route of excludedRoutes ?? []) {
        this.router.all(addLeadingSlash(route.path), handler as RequestHandler);
      }
      return;
    }
    return this.router.use(
      (req: BunRequest, res: BunResponse, next: NextFunction) => {
        // When several apps share this adapter, skip requests that belong to
        // another app's prefix (full path segments only).
        for (const registeredPrefix of this.registeredPrefixes) {
          if (
            req.path === registeredPrefix ||
            req.path.startsWith(`${registeredPrefix}/`)
          ) {
            return next();
          }
        }
        return (handler as RequestHandler)(req, res, next);
      },
    );
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    if (this.parsersRegistered) {
      return;
    }
    this.parsersRegistered = true;
    const limit = this.adapterOptions.bodyLimit;
    this.router.use(createBodyParser('json', { limit, rawBody }));
    this.router.use(createBodyParser('urlencoded', { limit, rawBody }));
  }

  public useBodyParser(
    type: NestBunBodyParserType,
    rawBody?: boolean,
    options: NestBunBodyParserOptions = {},
  ): this {
    this.router.use(
      createBodyParser(type, {
        limit: this.adapterOptions.bodyLimit,
        ...options,
        rawBody,
      }),
    );
    return this;
  }

  public enableCors(options?: CorsOptions | CorsOptionsDelegate<any>) {
    return this.router.use(cors(options as any) as any);
  }

  public useStaticAssets(path: string, options: ServeStaticOptions = {}) {
    this.router.use(serveStatic(path, options));
    return this;
  }

  public setViewEngine(engine: NestBunViewEngineOption | string) {
    this.views.setEngine(engine);
    return this;
  }

  public setBaseViewsDir(path: string | string[]) {
    this.views.setDirs(path);
    return this;
  }

  /** Sets an app-level global available to every rendered view. */
  public setLocal(key: string, value: any) {
    this.views.locals[key] = value;
    return this;
  }

  public mapException(error: unknown): unknown {
    // SyntaxError: invalid JSON body; URIError: bad percent-encoding in a path.
    if (error instanceof SyntaxError || error instanceof URIError) {
      return new BadRequestException(error.message);
    }
    const status = (error as { status?: number })?.status;
    if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
      return new PayloadTooLargeException((error as Error).message);
    }
    if (status === HttpStatus.UNSUPPORTED_MEDIA_TYPE) {
      return new UnsupportedMediaTypeException((error as Error).message);
    }
    return error;
  }

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
    const run: VersionedRoute = (req, res, next) => handler(req, res, next);

    if (
      version === VERSION_NEUTRAL ||
      // URL Versioning is done via the path, so the filter continues forward
      versioningOptions.type === VersioningType.URI
    ) {
      return run;
    }

    const matches = (candidate: string | string[] | undefined): boolean => {
      if (isUndefined(candidate)) {
        return Array.isArray(version) && version.includes(VERSION_NEUTRAL);
      }
      if (Array.isArray(version)) {
        return Array.isArray(candidate)
          ? version.some(v => candidate.includes(v as string))
          : version.includes(candidate);
      }
      return isString(version) && Array.isArray(candidate)
        ? candidate.includes(version)
        : version === candidate;
    };

    switch (versioningOptions.type) {
      case VersioningType.CUSTOM:
        return (req, res, next) => {
          const extracted = versioningOptions.extractor(req);
          return !isNil(extracted) && matches(extracted)
            ? run(req, res, next)
            : callNextHandler(req, res, next);
        };
      case VersioningType.MEDIA_TYPE:
        return (req, res, next) =>
          matches(
            getMediaTypeVersion(req.headers.accept, versioningOptions.key),
          )
            ? run(req, res, next)
            : callNextHandler(req, res, next);
      case VersioningType.HEADER:
        return (req, res, next) =>
          matches(req.headers[versioningOptions.header.toLowerCase()])
            ? run(req, res, next)
            : callNextHandler(req, res, next);
      default:
        throw new Error('Unsupported versioning options');
    }
  }

  private normalizePrefix(prefix?: string): string {
    return prefix ? stripEndSlash(addLeadingSlash(prefix)) : '';
  }

  private runRequestHook(
    req: BunRequest,
    res: BunResponse,
    next: NextFunction,
  ): void {
    let completed = false;
    const doneOnce = (err?: unknown) => {
      if (completed) {
        if (err) {
          this.logger.error(err);
        }
        return;
      }
      completed = true;
      next(err);
    };
    try {
      const result = this.onRequestHook!.call(this, req, res, doneOnce);
      if (result && typeof result.then === 'function') {
        result.then(undefined, err =>
          doneOnce(err || new Error('Request hook failed')),
        );
      }
    } catch (err) {
      doneOnce(err || new Error('Request hook failed'));
    }
  }
}

function setIfMissing(
  res: BunResponse,
  name: string,
  value: string | string[] | number | undefined,
): void {
  if (value !== undefined && res.getHeader(name) === undefined) {
    res.setHeader(name, Array.isArray(value) ? value.join(',') : String(value));
  }
}
