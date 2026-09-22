import { CanActivate } from './features/can-activate.interface.js';
import { NestInterceptor } from './features/nest-interceptor.interface.js';
import { GlobalPrefixOptions } from './global-prefix-options.interface.js';
import { CsrfProtectionOptions } from './http/csrf-protection-options.interface.js';
import { HttpServer } from './http/http-server.interface.js';
import { SecurityHeadersOptions } from './http/security-headers-options.interface.js';
import {
  ExceptionFilter,
  INestMicroservice,
  NestHybridApplicationOptions,
  PipeTransform,
} from './index.js';
import { INestApplicationContext } from './nest-application-context.interface.js';
import { VersioningOptions } from './version-options.interface.js';
import { WebSocketAdapter } from './websockets/web-socket-adapter.interface.js';

/**
 * Interface defining the core NestApplication object.
 *
 * @publicApi
 */
export interface INestApplication<
  TServer = any,
> extends INestApplicationContext {
  /**
   * A wrapper function around HTTP adapter method: `adapter.use()`.
   * Example `app.use(cors())`
   *
   * @returns {this}
   */
  use(...args: any[]): this;

  /**
   * Enables CORS (Cross-Origin Resource Sharing)
   *
   * @returns {void}
   */
  enableCors(options?: any): void;

  /**
   * Enables protection against cross-site request forgery (CSRF) for every
   * route, based on Fetch Metadata (`Sec-Fetch-Site`) with an `Origin`/`Host`
   * fallback (the algorithm of Go's `net/http.CrossOriginProtection`).
   *
   * `GET`, `HEAD` and `OPTIONS` requests are always allowed. Other requests
   * are rejected with a `ForbiddenException`, which goes through the
   * exception filters, when the browser reports them as cross-origin.
   * Requests carrying neither `Sec-Fetch-Site` nor `Origin` (non-browser
   * clients) are allowed.
   *
   * Must be called once, before `app.init()` / `app.listen()`. The check runs
   * before Nest middleware, body parsing, guards and handlers. It shares one
   * request hook with `app.useSecurityHeaders()`, registered where the first
   * of the two is called: middleware registered with `app.use()` before that
   * runs before the check.
   *
   * @param {CsrfProtectionOptions} options
   * @returns {this}
   */
  enableCsrfProtection(options?: CsrfProtectionOptions): this;

  /**
   * Sets security-related response headers on every response (routes,
   * `404`s and errors, including rejections of `enableCsrfProtection()`):
   * the same headers and defaults as helmet 8, including a default
   * Content-Security-Policy, and removes `X-Powered-By`.
   *
   * Pass `false` for a header to leave it out, `true` for its default, or an
   * object to configure it. Options are validated when this method is
   * called. Route handlers and `@Header()` can still override a header per
   * route.
   *
   * Must be called once, before `app.init()` / `app.listen()`. It shares one
   * request hook with `app.enableCsrfProtection()`, registered where the
   * first of the two is called: middleware registered with `app.use()` before
   * that runs first, so responses it ends itself do not carry the headers.
   *
   * @param {SecurityHeadersOptions} options
   * @returns {this}
   */
  useSecurityHeaders(options?: SecurityHeadersOptions): this;

  /**
   * Enables Versioning for the application.
   * By default, URI-based versioning is used.
   *
   * @param {VersioningOptions} options
   * @returns {this}
   */
  enableVersioning(options?: VersioningOptions): this;

  /**
   * Starts the application.
   *
   * @param {number|string} port
   * @param {string} [hostname]
   * @param {Function} [callback] Optional callback
   * @returns {Promise} A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(port: number | string, callback?: () => void): Promise<any>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<any>;

  /**
   * Returns the url the application is listening at, based on OS and IP version. Returns as an IP value either in IPv6 or IPv4
   *
   * @returns {Promise<string>} The IP where the server is listening
   */
  getUrl(): Promise<string>;

  /**
   * Registers a prefix for every HTTP route path.
   *
   * @param {string | string[]} prefix The prefix for every HTTP route path (for example `/v1/api`).
   *   Can be an array of prefixes to register multiple prefixes (for example `['api', 'v1']`).
   * @param {GlobalPrefixOptions} options Global prefix options object
   * @returns {this}
   */
  setGlobalPrefix(
    prefix: string | string[],
    options?: GlobalPrefixOptions,
  ): this;

  /**
   * Register Ws Adapter which will be used inside Gateways.
   * Use when you want to override default `socket.io` library.
   *
   * @param {WebSocketAdapter} adapter
   * @returns {this}
   */
  useWebSocketAdapter(adapter: WebSocketAdapter): this;

  /**
   * Connects microservice to the NestApplication instance. Transforms application
   * to a hybrid instance.
   *
   * @template {object} T
   * @param {T} options Microservice options object
   * @param {NestHybridApplicationOptions} hybridOptions Hybrid options object
   * @returns {INestMicroservice}
   */
  connectMicroservice<T extends object = any>(
    options: T,
    hybridOptions?: NestHybridApplicationOptions,
  ): INestMicroservice;

  /**
   * Returns array of the microservices connected to the NestApplication.
   *
   * @returns {INestMicroservice[]}
   */
  getMicroservices(): INestMicroservice[];

  /**
   * Returns the underlying native HTTP server.
   *
   * @returns {TServer}
   */
  getHttpServer(): TServer;

  /**
   * Returns the underlying HTTP adapter.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer;

  /**
   * Starts all connected microservices asynchronously.
   *
   * @returns {Promise}
   */
  startAllMicroservices(): Promise<this>;

  /**
   * Registers exception filters as global filters (will be used within
   * every HTTP route handler)
   *
   * @param {...ExceptionFilter} filters
   */
  useGlobalFilters(...filters: ExceptionFilter[]): this;

  /**
   * Registers pipes as global pipes (will be used within every HTTP route handler)
   *
   * @param {...PipeTransform} pipes
   */
  useGlobalPipes(...pipes: PipeTransform<any>[]): this;

  /**
   * Registers interceptors as global interceptors (will be used within
   * every HTTP route handler)
   *
   * @param {...NestInterceptor} interceptors
   */
  useGlobalInterceptors(...interceptors: NestInterceptor[]): this;

  /**
   * Registers guards as global guards (will be used within every HTTP route handler)
   *
   * @param {...CanActivate} guards
   */
  useGlobalGuards(...guards: CanActivate[]): this;

  /**
   * Terminates the application (including NestApplication, Gateways, and each connected
   * microservice)
   *
   * @returns {Promise<void>}
   */
  close(): Promise<void>;
}
