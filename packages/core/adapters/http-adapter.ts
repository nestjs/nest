import type {
  HttpServer,
  RequestMethod,
  VersioningOptions,
} from '@nestjs/common';
import type { RequestHandler, VersionValue } from '@nestjs/common/internal';
import type { NestApplicationOptions } from '@nestjs/common';

/**
 * Base class for HTTP platform adapters (see `ExpressAdapter` and
 * `FastifyAdapter` for reference implementations).
 *
 * It implements the {@link HttpServer} contract that the Nest core relies on,
 * and that interface is where each method's calling conventions are
 * documented: when the core invokes it, with which arguments, and what it
 * expects back. This class only adds:
 *
 * - default implementations that delegate to the wrapped framework
 *   `instance` (`use()`, the HTTP-verb methods, `listen()`) or are inert
 *   (`init()`, `normalizePath()`, `mapException()`, `beforeClose()`, the
 *   `setOn*Hook()` setters);
 * - storage for the native server (`httpServer`) and the framework instance
 *   (`instance`), with their accessors;
 * - the introspection hooks used by instrumentation tooling.
 *
 * Every remaining {@link HttpServer} member is declared abstract here, even
 * the ones the interface marks optional, so subclasses cannot forget them.
 * `setBaseViewsDir()`, `useBodyParser()` and `isRouteOrderSensitive()` are
 * not declared on this class; implement them when the platform supports
 * them (see {@link HttpServer} for what the core does when they are absent).
 *
 * Keep in mind that the core also reads and writes properties of the request
 * object (`body`, `params`, `query`, `headers`, ...), that Server-Sent Events
 * write directly to the Node.js response, and that `app.listen()` and the
 * WebSocket adapters use the value returned by
 * {@link AbstractHttpAdapter.getHttpServer} as a Node.js `net.Server`; see the
 * {@link HttpServer} documentation for details.
 *
 * @typeParam TServer - Type of the native HTTP server stored in `httpServer`
 * (e.g. `http.Server | https.Server`).
 * @typeParam TRequest - Type of the framework request object.
 * @typeParam TResponse - Type of the framework response object.
 *
 * @see [HTTP adapter](https://docs.nestjs.com/faq/http-adapter)
 *
 * @publicApi
 */
export abstract class AbstractHttpAdapter<
  TServer = any,
  TRequest = any,
  TResponse = any,
> implements HttpServer<TRequest, TResponse> {
  /**
   * Native HTTP server created by {@link AbstractHttpAdapter.initHttpServer}
   * and returned by {@link AbstractHttpAdapter.getHttpServer}.
   */
  protected httpServer: TServer;
  /**
   * Callback registered through
   * {@link AbstractHttpAdapter.setOnRouteTriggered}, if any.
   */
  protected onRouteTriggered:
    ((requestMethod: RequestMethod, path: string) => void) | undefined;

  /**
   * @param instance The framework application instance to delegate to (e.g.
   * an Express `Application`). Subclasses typically create a default one
   * when none is given.
   */
  constructor(protected instance?: any) {}

  /**
   * Asynchronous setup hook, awaited by `NestFactory.create()` and again by
   * `app.init()`, so overrides must be idempotent. No-op by default.
   *
   * @see {@link HttpServer.init}
   */
  public async init() {}

  /**
   * Registers a global middleware by delegating to `instance.use(...args)`.
   *
   * @see {@link HttpServer.use}
   */
  public use(...args: any[]) {
    return this.instance.use(...args);
  }

  /**
   * Registers a `GET` route by delegating to `instance.get(...args)`.
   *
   * @see {@link HttpServer.get}
   */
  public get(handler: RequestHandler);
  public get(path: any, handler: RequestHandler);
  public get(...args: any[]) {
    return this.instance.get(...args);
  }

  /**
   * Registers a `POST` route by delegating to `instance.post(...args)`.
   *
   * @see {@link HttpServer.post}
   */
  public post(handler: RequestHandler);
  public post(path: any, handler: RequestHandler);
  public post(...args: any[]) {
    return this.instance.post(...args);
  }

  /**
   * Registers a `HEAD` route by delegating to `instance.head(...args)`.
   *
   * @see {@link HttpServer.head}
   */
  public head(handler: RequestHandler);
  public head(path: any, handler: RequestHandler);
  public head(...args: any[]) {
    return this.instance.head(...args);
  }

  /**
   * Registers a `DELETE` route by delegating to `instance.delete(...args)`.
   *
   * @see {@link HttpServer.delete}
   */
  public delete(handler: RequestHandler);
  public delete(path: any, handler: RequestHandler);
  public delete(...args: any[]) {
    return this.instance.delete(...args);
  }

  /**
   * Registers a `PUT` route by delegating to `instance.put(...args)`.
   *
   * @see {@link HttpServer.put}
   */
  public put(handler: RequestHandler);
  public put(path: any, handler: RequestHandler);
  public put(...args: any[]) {
    return this.instance.put(...args);
  }

  /**
   * Registers a `PATCH` route by delegating to `instance.patch(...args)`.
   *
   * @see {@link HttpServer.patch}
   */
  public patch(handler: RequestHandler);
  public patch(path: any, handler: RequestHandler);
  public patch(...args: any[]) {
    return this.instance.patch(...args);
  }

  /**
   * Registers a WebDAV `PROPFIND` route by delegating to
   * `instance.propfind(...args)`. Override when the framework exposes the
   * verb under a different API.
   *
   * @see {@link HttpServer.propfind}
   */
  public propfind(handler: RequestHandler);
  public propfind(path: any, handler: RequestHandler);
  public propfind(...args: any[]) {
    return this.instance.propfind(...args);
  }

  /**
   * Registers a WebDAV `PROPPATCH` route by delegating to
   * `instance.proppatch(...args)`. Override when the framework exposes the
   * verb under a different API.
   *
   * @see {@link HttpServer.proppatch}
   */
  public proppatch(handler: RequestHandler);
  public proppatch(path: any, handler: RequestHandler);
  public proppatch(...args: any[]) {
    return this.instance.proppatch(...args);
  }

  /**
   * Registers a WebDAV `MKCOL` route by delegating to
   * `instance.mkcol(...args)`. Override when the framework exposes the verb
   * under a different API.
   *
   * @see {@link HttpServer.mkcol}
   */
  public mkcol(handler: RequestHandler);
  public mkcol(path: any, handler: RequestHandler);
  public mkcol(...args: any[]) {
    return this.instance.mkcol(...args);
  }

  /**
   * Registers a WebDAV `COPY` route by delegating to
   * `instance.copy(...args)`. Override when the framework exposes the verb
   * under a different API.
   *
   * @see {@link HttpServer.copy}
   */
  public copy(handler: RequestHandler);
  public copy(path: any, handler: RequestHandler);
  public copy(...args: any[]) {
    return this.instance.copy(...args);
  }

  /**
   * Registers a WebDAV `MOVE` route by delegating to
   * `instance.move(...args)`. Override when the framework exposes the verb
   * under a different API.
   *
   * @see {@link HttpServer.move}
   */
  public move(handler: RequestHandler);
  public move(path: any, handler: RequestHandler);
  public move(...args: any[]) {
    return this.instance.move(...args);
  }

  /**
   * Registers a WebDAV `LOCK` route by delegating to
   * `instance.lock(...args)`. Override when the framework exposes the verb
   * under a different API.
   *
   * @see {@link HttpServer.lock}
   */
  public lock(handler: RequestHandler);
  public lock(path: any, handler: RequestHandler);
  public lock(...args: any[]) {
    return this.instance.lock(...args);
  }

  /**
   * Registers a WebDAV `UNLOCK` route by delegating to
   * `instance.unlock(...args)`. Override when the framework exposes the verb
   * under a different API.
   *
   * @see {@link HttpServer.unlock}
   */
  public unlock(handler: RequestHandler);
  public unlock(path: any, handler: RequestHandler);
  public unlock(...args: any[]) {
    return this.instance.unlock(...args);
  }

  /**
   * Registers a route for every HTTP method by delegating to
   * `instance.all(...args)`.
   *
   * @see {@link HttpServer.all}
   */
  public all(handler: RequestHandler);
  public all(path: any, handler: RequestHandler);
  public all(...args: any[]) {
    return this.instance.all(...args);
  }

  /**
   * Registers a `SEARCH` route by delegating to `instance.search(...args)`.
   * Override when the framework exposes the verb under a different API.
   *
   * @see {@link HttpServer.search}
   */
  public search(handler: RequestHandler);
  public search(path: any, handler: RequestHandler);
  public search(...args: any[]) {
    return this.instance.search(...args);
  }

  /**
   * Registers a `QUERY` route by delegating to `instance.query(...args)`.
   * Override when the framework exposes the verb under a different API.
   *
   * @see {@link HttpServer.query}
   */
  public query(handler: RequestHandler);
  public query(path: any, handler: RequestHandler);
  public query(...args: any[]) {
    return this.instance.query(...args);
  }

  /**
   * Registers an `OPTIONS` route by delegating to
   * `instance.options(...args)`.
   *
   * @see {@link HttpServer.options}
   */
  public options(handler: RequestHandler);
  public options(path: any, handler: RequestHandler);
  public options(...args: any[]) {
    return this.instance.options(...args);
  }

  /**
   * Starts listening by delegating to
   * `instance.listen(port, hostname, callback)`. The core always passes its
   * own callback as the last argument and expects it to be invoked once the
   * server is bound, or with an `Error` on failure. Override when the
   * framework instance does not expose a Node-style `listen()`, e.g. to call
   * `httpServer.listen()` instead.
   *
   * @see {@link HttpServer.listen}
   */
  public listen(port: string | number, callback?: () => void);
  public listen(port: string | number, hostname: string, callback?: () => void);
  public listen(port: any, hostname?: any, callback?: any) {
    return this.instance.listen(port, hostname, callback);
  }

  /**
   * Returns the native HTTP server stored by
   * {@link AbstractHttpAdapter.initHttpServer} (or
   * {@link AbstractHttpAdapter.setHttpServer}).
   *
   * @see {@link HttpServer.getHttpServer}
   */
  public getHttpServer(): TServer {
    return this.httpServer;
  }

  /**
   * Replaces the native HTTP server returned by
   * {@link AbstractHttpAdapter.getHttpServer}. Mostly useful for tests and
   * for adapters that obtain the server from elsewhere.
   */
  public setHttpServer(httpServer: TServer) {
    this.httpServer = httpServer;
  }

  /**
   * Replaces the framework application instance that the default method
   * implementations delegate to.
   */
  public setInstance<T = any>(instance: T) {
    this.instance = instance;
  }

  /**
   * Returns the framework application instance passed to the constructor
   * (or set through {@link AbstractHttpAdapter.setInstance}).
   *
   * @see {@link HttpServer.getInstance}
   */
  public getInstance<T = any>(): T {
    return this.instance as T;
  }

  /**
   * Converts and validates a route path before registration. Returns the
   * path unchanged by default; override to translate Nest's path syntax to
   * the router's and to throw on invalid paths.
   *
   * @see {@link HttpServer.normalizePath}
   */
  public normalizePath(path: string): string {
    return path;
  }

  /**
   * Registers a callback that the router invokes right before each route
   * handler runs, with the resolved `RequestMethod` and the route path as
   * declared (before {@link AbstractHttpAdapter.normalizePath}). The router
   * wraps every handler at registration time, so the callback must be set
   * before `app.init()` to take effect. Intended for instrumentation and
   * devtools; there is no need to override it.
   */
  public setOnRouteTriggered(
    onRouteTriggered: (requestMethod: RequestMethod, path: string) => void,
  ) {
    this.onRouteTriggered = onRouteTriggered;
  }

  /**
   * Returns the callback registered through
   * {@link AbstractHttpAdapter.setOnRouteTriggered}, if any. Read by the
   * router when registering routes.
   */
  public getOnRouteTriggered() {
    return this.onRouteTriggered;
  }

  /**
   * Registers a hook to run at the start of every request. No-op by default;
   * the built-in adapters accept a `(req, res, done) => void | Promise<void>`
   * function and call `done()` to continue processing. Intended for
   * instrumentation and devtools.
   */
  public setOnRequestHook(onRequestHook: Function): void {}

  /**
   * Registers a hook to run once a response has been sent. No-op by default;
   * the built-in adapters accept a `(req, res) => void | Promise<void>`
   * function. Intended for instrumentation and devtools.
   */
  public setOnResponseHook(onResponseHook: Function): void {}

  /**
   * Called by `app.close()` before the shutdown hooks run. No-op by default;
   * override to enter a "shutting down" state.
   *
   * @see {@link HttpServer.beforeClose}
   */
  public beforeClose(): void {}

  /**
   * Translates a framework-native error into something the exception filters
   * understand. Invoked by the global exception layer with every error it
   * receives, before it reaches the filters; the returned value is what the
   * filters see. Returns the error unchanged by default. The built-in
   * adapters map, for instance, body-parser `SyntaxError`s to
   * `BadRequestException`.
   */
  public mapException(error: unknown): unknown {
    return error;
  }

  /**
   * Stops the server; called by `app.close()`. May return a promise.
   *
   * @see {@link HttpServer.close}
   */
  abstract close();
  /**
   * Creates the native server and stores it in `httpServer`, honoring the
   * `httpsOptions`, `forceCloseConnections` and `return503OnClosing`
   * application options. Called once when the application is constructed.
   *
   * @see {@link HttpServer.initHttpServer}
   */
  abstract initHttpServer(options: NestApplicationOptions);
  /**
   * Serves static files; pass-through for `app.useStaticAssets()`.
   *
   * @see {@link HttpServer.useStaticAssets}
   */
  abstract useStaticAssets(...args: any[]);
  /**
   * Configures the template engine used by
   * {@link AbstractHttpAdapter.render}; pass-through for
   * `app.setViewEngine()`.
   *
   * @see {@link HttpServer.setViewEngine}
   */
  abstract setViewEngine(engine: string);
  /**
   * Returns the request host name, used for `@Controller({ host })`.
   *
   * @see {@link HttpServer.getRequestHostname}
   */
  abstract getRequestHostname(request: any);
  /**
   * Returns the upper-case request method (`'GET'`, `'POST'`, ...).
   *
   * @see {@link HttpServer.getRequestMethod}
   */
  abstract getRequestMethod(request: any);
  /**
   * Returns the original request URL, including the query string.
   *
   * @see {@link HttpServer.getRequestUrl}
   */
  abstract getRequestUrl(request: any);
  /**
   * Sets the status code without sending the response.
   *
   * @see {@link HttpServer.status}
   */
  abstract status(response: any, statusCode: number);
  /**
   * Sends the response body, handling empty bodies, `StreamableFile`,
   * objects (as JSON) and primitives.
   *
   * @see {@link HttpServer.reply}
   */
  abstract reply(response: any, body: any, statusCode?: number);
  /**
   * Terminates the response, optionally writing `message` first.
   *
   * @see {@link HttpServer.end}
   */
  abstract end(response: any, message?: string);
  /**
   * Renders a view template (`@Render()`).
   *
   * @see {@link HttpServer.render}
   */
  abstract render(response: any, view: string, options: any);
  /**
   * Issues a redirect (`@Redirect()`).
   *
   * @see {@link HttpServer.redirect}
   */
  abstract redirect(response: any, statusCode: number, url: string);
  /**
   * Installs the global exception layer.
   *
   * @see {@link HttpServer.setErrorHandler}
   */
  abstract setErrorHandler(handler: Function, prefix?: string);
  /**
   * Installs the catch-all handler for unmatched requests.
   *
   * @see {@link HttpServer.setNotFoundHandler}
   */
  abstract setNotFoundHandler(handler: Function, prefix?: string);
  /**
   * Reports whether response headers have already been flushed. Must return
   * synchronously.
   *
   * @see {@link HttpServer.isHeadersSent}
   */
  abstract isHeadersSent(response: any);
  /**
   * Reads a response header that was set earlier. Not used by the core
   * router; part of the base class so ecosystem packages can read headers
   * through the adapter regardless of the platform.
   */
  abstract getHeader(response: any, name: string);
  /**
   * Sets (replaces) a response header (`@Header()`).
   *
   * @see {@link HttpServer.setHeader}
   */
  abstract setHeader(response: any, name: string, value: string);
  /**
   * Appends a value to a response header, turning it into a multi-value
   * header (e.g. several `Set-Cookie` entries) instead of replacing it. Not
   * used by the core router; part of the base class so ecosystem packages
   * can append headers through the adapter regardless of the platform.
   */
  abstract appendHeader(response: any, name: string, value: string);
  /**
   * Registers the default JSON and URL-encoded body parsers, exposing
   * `req.rawBody` when `rawBody` is `true`.
   *
   * @see {@link HttpServer.registerParserMiddleware}
   */
  abstract registerParserMiddleware(prefix?: string, rawBody?: boolean);
  /**
   * Enables CORS. The core currently calls this with `options` only; the
   * `prefix` parameter is reserved.
   *
   * @see {@link HttpServer.enableCors}
   */
  abstract enableCors(options?: any, prefix?: string);
  /**
   * Returns the function used to mount Nest middleware for one HTTP method.
   * May be asynchronous.
   *
   * @see {@link HttpServer.createMiddlewareFactory}
   */
  abstract createMiddlewareFactory(
    requestMethod: RequestMethod,
  ):
    | ((path: string, callback: Function) => any)
    | Promise<(path: string, callback: Function) => any>;
  /**
   * Returns the platform identifier (`'express'`, `'fastify'`) that
   * ecosystem packages branch on.
   *
   * @see {@link HttpServer.getType}
   */
  abstract getType(): string;
  /**
   * Guards a route handler by request version for header, media-type and
   * custom versioning.
   *
   * @see {@link HttpServer.applyVersionFilter}
   */
  abstract applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): (req: TRequest, res: TResponse, next: () => void) => Function;
}
