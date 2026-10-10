import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  type NestApplicationOptions,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
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
import { LegacyRouteConverter } from '@nestjs/core/internal';
import cors from 'cors';
import encodeUrl from 'encodeurl';
import * as http from 'http';
import * as https from 'https';
import { pathToRegexp } from 'path-to-regexp';
import serveStatic from 'serve-static';
import { Duplex, finished, Writable } from 'stream';
import type {
  NestNodeBodyParserOptionsFor,
  NestNodeBodyParserType,
} from '../interfaces/nest-node-body-parser.interface.js';
import type { ServeStaticOptions } from '../interfaces/serve-static-options.interface.js';
import * as bodyParsers from '../body-parser/body-parser.js';
import { NodeRouter } from '../router/node-router.js';
import { getRoutingPath } from '../router/utils.js';
import { type NodeViewOptions, ViewRenderer } from '../views/view-renderer.js';
import { endWithoutBody, NodeRequest, NodeResponse } from './node-request.js';
import { getMediaTypeVersion } from './utils/get-media-type-version.util.js';

type StreamableHandlerResponse = Parameters<StreamableFile['errorHandler']>[1];

type VersionedRoute = <
  TRequest extends Record<string, any> = any,
  TResponse = any,
>(
  req: TRequest,
  res: TResponse,
  next: () => void,
) => any;

const METHODS_BY_REQUEST_METHOD: Record<RequestMethod, string | null> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.ALL]: null,
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
  [RequestMethod.SEARCH]: 'SEARCH',
  [RequestMethod.PROPFIND]: 'PROPFIND',
  [RequestMethod.PROPPATCH]: 'PROPPATCH',
  [RequestMethod.MKCOL]: 'MKCOL',
  [RequestMethod.COPY]: 'COPY',
  [RequestMethod.MOVE]: 'MOVE',
  [RequestMethod.LOCK]: 'LOCK',
  [RequestMethod.UNLOCK]: 'UNLOCK',
  [RequestMethod.QUERY]: 'QUERY',
};

// Covers "application/json" and the "+json" structured syntax suffix (RFC 6839),
// e.g. "application/problem+json", with or without parameters.
function isJsonContentType(contentType: string): boolean {
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return (
    mediaType.startsWith('application/json') || mediaType.endsWith('+json')
  );
}

function rawBodyVerifier(req: NodeRequest, _res: unknown, buffer: Buffer) {
  if (Buffer.isBuffer(buffer)) {
    req.rawBody = buffer;
  }
  return true;
}

function getBodyParserOptions<T extends object>(rawBody: boolean, options?: T) {
  return rawBody ? { ...options, verify: rawBodyVerifier } : options || {};
}

/**
 * HTTP adapter built directly on the Node.js `http`/`https` modules, with no
 * third-party framework in between.
 *
 * Handlers receive the native `IncomingMessage`/`ServerResponse` objects
 * (see {@link NodeRequest} and {@link NodeResponse}), routes are matched
 * through a radix tree, and route paths use the same syntax as with the
 * Express adapter. Connect-style `(req, res, next)` middleware works as long
 * as it relies on the Node.js request and response APIs, or on the small
 * Express-compatible subset `NodeRequest` and `NodeResponse` provide.
 *
 * @publicApi
 */
export class NodeAdapter extends AbstractHttpAdapter<
  http.Server | https.Server,
  NodeRequest,
  NodeResponse
> {
  declare protected instance: NodeRouter;
  private readonly logger = new Logger(NodeAdapter.name);
  private readonly openConnections = new Set<Duplex>();
  private readonly registeredPrefixes = new Set<string>();
  private readonly views = new ViewRenderer();
  private isShuttingDown = false;
  private onRequestHook?: (
    req: NodeRequest,
    res: NodeResponse,
    done: () => void,
  ) => Promise<void> | void;
  private onResponseHook?: (
    req: NodeRequest,
    res: NodeResponse,
  ) => Promise<void> | void;

  constructor(router?: NodeRouter) {
    super();
    this.setInstance(
      router ??
        new NodeRouter((err, req, res) => this.finalHandler(err, req, res)),
    );
  }

  public setOnRequestHook(
    onRequestHook: (
      req: NodeRequest,
      res: NodeResponse,
      done: () => void,
    ) => Promise<void> | void,
  ) {
    this.onRequestHook = onRequestHook;
  }

  public setOnResponseHook(
    onResponseHook: (
      req: NodeRequest,
      res: NodeResponse,
    ) => Promise<void> | void,
  ) {
    this.onResponseHook = onResponseHook;
  }

  public reply(response: NodeResponse, body: any, statusCode?: number) {
    if (!isNil(statusCode)) {
      response.statusCode = statusCode;
    }
    if (isNil(body)) {
      if (endWithoutBody(response)) {
        return;
      }
      return response.end();
    }
    if (body instanceof StreamableFile) {
      this.applyStreamHeaders(response, body);
      const stream = body.getStream();
      stream.once('error', err => {
        body.errorHandler(err, this.toStreamableHandlerResponse(response));
      });
      // pipe() leaves the source open when the client disconnects early
      finished(response, () => {
        if (!stream.readableEnded) {
          stream.destroy();
        }
      });
      return stream
        .pipe<Writable>(response)
        .on('error', (err: Error) => body.errorLogger(err));
    }
    const responseContentType = response.getHeader('Content-Type');
    if (
      typeof responseContentType === 'string' &&
      !isJsonContentType(responseContentType) &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      this.logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
      );
      response.setHeader('Content-Type', 'application/json');
    }
    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      return this.writeBody(
        response,
        body,
        responseContentType,
        'application/octet-stream',
      );
    }
    if (isObject(body)) {
      return this.writeBody(
        response,
        JSON.stringify(body) ?? '',
        responseContentType,
        'application/json; charset=utf-8',
      );
    }
    return this.writeBody(
      response,
      String(body),
      responseContentType,
      'text/plain; charset=utf-8',
    );
  }

  public status(response: NodeResponse, statusCode: number) {
    response.statusCode = statusCode;
    return response;
  }

  public end(response: NodeResponse, message?: string) {
    return response.end(message);
  }

  public async render(response: NodeResponse, view: string, options: any) {
    if (!this.views.isConfigured()) {
      throw new InternalServerErrorException(
        'No view engine is configured; call app.setViewEngine() to use @Render().',
      );
    }
    const html = await this.views.render(view, options);
    return this.writeBody(
      response,
      html,
      response.getHeader('Content-Type'),
      'text/html; charset=utf-8',
    );
  }

  public redirect(response: NodeResponse, statusCode: number, url: string) {
    response.statusCode = statusCode;
    response.setHeader('Location', encodeUrl(url));
    response.end();
  }

  public setErrorHandler(handler: Function, prefix?: string) {
    return this.use(handler);
  }

  public setNotFoundHandler(
    handler: Function,
    prefix?: string,
    excludedRoutes?: RouteInfo[],
  ) {
    const normalizedPrefix = this.normalizePrefix(prefix);
    if (normalizedPrefix) {
      this.registeredPrefixes.add(normalizedPrefix);
      this.use(normalizedPrefix, handler);
      // Excluded routes live at the root, out of the prefix mount's reach.
      for (const route of excludedRoutes ?? []) {
        this.instance.useExact(undefined, addLeadingSlash(route.path), handler);
      }
      return;
    }
    return this.use((req: NodeRequest, res: NodeResponse, next: Function) => {
      // When multiple apps share this adapter, skip requests that belong to
      // another app's prefix (see the ExpressAdapter).
      const path = getRoutingPath(req.url!);
      for (const registeredPrefix of this.registeredPrefixes) {
        if (
          path === registeredPrefix ||
          path.startsWith(`${registeredPrefix}/`)
        ) {
          return next();
        }
      }
      return handler(req, res, next);
    });
  }

  public isHeadersSent(response: NodeResponse): boolean {
    return response.headersSent;
  }

  public getHeader(response: NodeResponse, name: string) {
    return response.getHeader(name);
  }

  public setHeader(response: NodeResponse, name: string, value: string) {
    return response.setHeader(name, value);
  }

  public appendHeader(response: NodeResponse, name: string, value: string) {
    return response.appendHeader(name, value);
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

  public listen(port: string | number, callback?: () => void): http.Server;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): http.Server;
  public listen(port: any, ...args: any[]): http.Server {
    return this.httpServer.listen(port, ...args);
  }

  public beforeClose() {
    this.isShuttingDown = true;
  }

  public close() {
    this.isShuttingDown = true;
    this.closeOpenConnections();

    if (!this.httpServer) {
      return undefined;
    }
    return new Promise(resolve => this.httpServer.close(resolve));
  }

  public useStaticAssets(path: string, options?: ServeStaticOptions) {
    if (options?.prefix) {
      return this.use(options.prefix, serveStatic(path, options));
    }
    return this.use(serveStatic(path, options));
  }

  public setViewEngine(options: NodeViewOptions | string) {
    this.views.setEngine(options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]) {
    this.views.setBaseViewsDir(path);
    return this;
  }

  public getRequestHostname(request: NodeRequest): string | undefined {
    return request.hostname;
  }

  public getRequestMethod(request: NodeRequest): string {
    return request.method!;
  }

  public getRequestUrl(request: NodeRequest): string {
    return request.originalUrl ?? request.url!;
  }

  public enableCors(options?: CorsOptions | CorsOptionsDelegate<any>) {
    return this.use(cors(options as any));
  }

  public createMiddlewareFactory(
    requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    // Routes passed to "forRoutes()" as plain strings come with no method
    // (-1). As with the ExpressAdapter (which falls back to "use()"), the
    // middleware is then mounted on the path, and runs for every sub-path.
    const isMount = !(requestMethod in METHODS_BY_REQUEST_METHOD);
    const method = METHODS_BY_REQUEST_METHOD[requestMethod] ?? undefined;
    return (path: string, callback: Function) => {
      try {
        // The core marks an exact-match path with a trailing "$" (e.g. "/api$")
        const isExactPath = path.endsWith('$');
        const convertedPath = LegacyRouteConverter.tryConvert(
          isExactPath ? path.slice(0, -1) : path,
        );
        // "/api" also matches "/api/"; that path is left to the wildcard entry
        // registered next to it, so the middleware doesn't run twice.
        const handler = isExactPath
          ? (req: NodeRequest, res: NodeResponse, next: Function) =>
              getRoutingPath(req.url!).endsWith('/')
                ? next()
                : callback(req, res, next)
          : callback;
        return isMount && !isExactPath
          ? this.instance.use(convertedPath, handler)
          : this.instance.useExact(method, convertedPath, handler);
      } catch (e) {
        if (e instanceof TypeError) {
          LegacyRouteConverter.printError(path);
        }
        throw e;
      }
    };
  }

  public initHttpServer(options: NestApplicationOptions) {
    const serverOptions = {
      IncomingMessage: NodeRequest,
      ServerResponse: NodeResponse,
    } as http.ServerOptions<typeof NodeRequest, typeof NodeResponse>;
    const listener = (req: NodeRequest, res: NodeResponse) =>
      this.handleRequest(req, res);

    this.httpServer = options?.httpsOptions
      ? https.createServer(
          { ...options.httpsOptions, ...serverOptions } as https.ServerOptions,
          listener as http.RequestListener,
        )
      : http.createServer(serverOptions, listener);

    if (options?.return503OnClosing) {
      this.use((req: NodeRequest, res: NodeResponse, next: Function) => {
        if (this.isShuttingDown) {
          res.setHeader('Connection', 'close');
          res.statusCode = 503;
          res.end('Service Unavailable');
        } else {
          next();
        }
      });
    }

    if (options?.forceCloseConnections) {
      this.trackOpenConnections();
    }
  }

  public registerParserMiddleware(prefix?: string, rawBody?: boolean) {
    if (!this.instance.hasMiddleware('jsonParser')) {
      this.use(bodyParsers.json(getBodyParserOptions(!!rawBody)));
    }
    if (!this.instance.hasMiddleware('urlencodedParser')) {
      this.use(
        bodyParsers.urlencoded(
          getBodyParserOptions(!!rawBody, { extended: true }),
        ),
      );
    }
  }

  public useBodyParser<ParserType extends NestNodeBodyParserType>(
    type: ParserType,
    rawBody: boolean,
    options?: NestNodeBodyParserOptionsFor<ParserType>,
  ): this {
    const parser = (bodyParsers[type] as Function)(
      getBodyParserOptions(rawBody, options),
    );
    this.use(parser);
    return this;
  }

  public getType(): string {
    return 'node';
  }

  public isRouteOrderSensitive(): boolean {
    // Routes are matched by specificity (static > parametric > wildcard), as
    // with Fastify, regardless of the registration order.
    return false;
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

    if (
      version === VERSION_NEUTRAL ||
      // URL Versioning is done via the path, so the filter continues forward
      versioningOptions.type === VersioningType.URI
    ) {
      return (req, res, next) => handler(req, res, next);
    }

    if (versioningOptions.type === VersioningType.CUSTOM) {
      return (req, res, next) => {
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
    }

    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      return (req, res, next) => {
        const acceptHeaderValue: string | string[] | undefined =
          req.headers?.['accept'];
        const headerVersion = getMediaTypeVersion(
          acceptHeaderValue,
          versioningOptions.key,
        );
        if (isUndefined(headerVersion)) {
          if (Array.isArray(version) && version.includes(VERSION_NEUTRAL)) {
            return handler(req, res, next);
          }
        } else if (Array.isArray(version)) {
          if (version.includes(headerVersion)) {
            return handler(req, res, next);
          }
        } else if (isString(version) && version === headerVersion) {
          return handler(req, res, next);
        }
        return callNextHandler(req, res, next);
      };
    }

    if (versioningOptions.type === VersioningType.HEADER) {
      return (req, res, next) => {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header.toLowerCase()];
        if (isUndefined(customHeaderVersionParameter)) {
          if (Array.isArray(version) && version.includes(VERSION_NEUTRAL)) {
            return handler(req, res, next);
          }
        } else if (Array.isArray(version)) {
          if (version.includes(customHeaderVersionParameter)) {
            return handler(req, res, next);
          }
        } else if (
          isString(version) &&
          version === customHeaderVersionParameter
        ) {
          return handler(req, res, next);
        }
        return callNextHandler(req, res, next);
      };
    }

    throw new Error('Unsupported versioning options');
  }

  public mapException(error: unknown): unknown {
    if (error instanceof HttpException) {
      return error;
    }
    // SyntaxError is thrown by the JSON body parser when given invalid JSON,
    // URIError
    // when a path parameter has an invalid percent-encoding (e.g. "%FF")
    if (error instanceof SyntaxError || error instanceof URIError) {
      return new BadRequestException(error.message);
    }
    // Body parser errors (payload too large, unsupported charset, ...)
    if (this.isClientHttpError(error)) {
      return new HttpException(error.message, error.statusCode);
    }
    return error;
  }

  private handleRequest(req: NodeRequest, res: NodeResponse) {
    if (this.onResponseHook) {
      res.on('finish', () => {
        void this.onResponseHook!.apply(this, [req, res]);
      });
    }
    if (this.onRequestHook) {
      void this.onRequestHook.apply(this, [
        req,
        res,
        () => this.instance.handle(req, res),
      ]);
      return;
    }
    this.instance.handle(req, res);
  }

  private finalHandler(err: any, req: NodeRequest, res: NodeResponse) {
    if (res.headersSent) {
      req.socket.destroy();
      return;
    }
    if (err !== undefined) {
      const statusCode = err?.statusCode ?? err?.status;
      res.statusCode =
        statusCode >= 400 && statusCode < 600
          ? statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;
      if (res.statusCode >= 500) {
        this.logger.error(err?.stack ?? err);
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(http.STATUS_CODES[res.statusCode]);
      return;
    }
    res.statusCode = HttpStatus.NOT_FOUND;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Cannot ${req.method} ${req.path}`);
  }

  private isClientHttpError(
    error: any,
  ): error is Error & { statusCode: number } {
    return (
      error instanceof Error &&
      (error as any).expose === true &&
      typeof (error as any).statusCode === 'number' &&
      (error as any).statusCode >= 400 &&
      (error as any).statusCode < 500
    );
  }

  private normalizePrefix(prefix?: string): string {
    return stripEndSlash(addLeadingSlash(prefix));
  }

  private trackOpenConnections() {
    this.httpServer.on('connection', (socket: Duplex) => {
      this.openConnections.add(socket);
      socket.on('close', () => this.openConnections.delete(socket));
    });
  }

  private closeOpenConnections() {
    for (const socket of this.openConnections) {
      socket.destroy();
      this.openConnections.delete(socket);
    }
  }

  // Writes the headers in a single "writeHead()" call, which is cheaper than
  // one "setHeader()" per header, with an explicit "Content-Length" (also
  // sent in answer to HEAD requests, which carry no body).
  private writeBody(
    response: NodeResponse,
    payload: string | Uint8Array,
    contentType: unknown,
    defaultContentType: string,
  ) {
    if (endWithoutBody(response)) {
      return;
    }
    const contentLength =
      typeof payload === 'string'
        ? Buffer.byteLength(payload)
        : payload.byteLength;
    response.writeHead(
      response.statusCode,
      contentType === undefined
        ? {
            'Content-Type': defaultContentType,
            'Content-Length': contentLength,
          }
        : { 'Content-Length': contentLength },
    );
    return response.end(payload);
  }

  // `StreamableFile` error handlers reply through a Fastify/Express-like `send()`
  private toStreamableHandlerResponse(
    response: NodeResponse,
  ): StreamableHandlerResponse {
    return {
      get destroyed() {
        return response.destroyed;
      },
      get headersSent() {
        return response.headersSent;
      },
      get statusCode() {
        return response.statusCode;
      },
      set statusCode(statusCode: number) {
        response.statusCode = statusCode;
      },
      send: (body: string) => {
        // Replaces the headers describing the file (its length, notably)
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.setHeader('Content-Length', Buffer.byteLength(body));
        response.end(body);
      },
      end: () => response.end(),
    };
  }

  private setHeaderIfNotExists(
    response: NodeResponse,
    name: string,
    value?: string | string[] | number,
  ) {
    if (value !== undefined && response.getHeader(name) === undefined) {
      const headerValue = Array.isArray(value) ? value.join(',') : value;
      response.setHeader(name, headerValue);
    }
  }

  private applyStreamHeaders(
    response: NodeResponse,
    streamable: StreamableFile,
  ) {
    const headers = streamable.getHeaders();
    this.setHeaderIfNotExists(response, 'Content-Type', headers.type);
    this.setHeaderIfNotExists(
      response,
      'Content-Disposition',
      headers.disposition,
    );
    this.setHeaderIfNotExists(response, 'Content-Length', headers.length);
  }
}
