import { HttpServer, INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { H3, H3Event } from 'h3';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import { ServeStaticOptions } from './serve-static-options.interface';

/**
 * HTTP/2 compatible server type for H3.
 */
type H3Server =
  | http.Server
  | https.Server
  | http2.Http2Server
  | http2.Http2SecureServer;

/**
 * Interface describing methods on NestH3Application.
 *
 * @see [Platform](https://docs.nestjs.com/first-steps#platform)
 *
 * @publicApi
 */
export interface NestH3Application<
  TServer extends H3Server = http.Server,
> extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to the H3 app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<H3Event, H3Event, H3>;

  /**
   * Starts the application.
   *
   * @param {number|string} port
   * @param {string} [hostname]
   * @param {Function} [callback] Optional callback
   * @returns {Promise} A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(port: number | string, callback?: () => void): Promise<TServer>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<TServer>;

  /**
   * Sets a base directory for public assets.
   *
   * @example
   * app.useStaticAssets('public')
   * app.useStaticAssets('public', { prefix: '/static' })
   *
   * @param path - The path to the directory containing static files
   * @param options - Options for serving static files
   * @returns {this}
   */
  useStaticAssets(path: string, options?: ServeStaticOptions): this;

  /**
   * Enables CORS (Cross-Origin Resource Sharing).
   *
   * @example
   * app.enableCors()
   * app.enableCors({ origin: 'https://example.com' })
   *
   * @param options - CORS options
   */
  enableCors(options?: CorsOptions): void;

  /**
   * A wrapper function for H3 settings.
   * This is a no-op stub for Express compatibility.
   *
   * @returns {this}
   */
  set(...args: any[]): this;

  /**
   * A wrapper function for Express compatibility.
   * This is a no-op stub in H3.
   *
   * @returns {this}
   */
  enable(...args: any[]): this;

  /**
   * A wrapper function for Express compatibility.
   * This is a no-op stub in H3.
   *
   * @returns {this}
   */
  disable(...args: any[]): this;

  /**
   * Template engine registration.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @returns {this}
   */
  engine(...args: any[]): this;

  /**
   * Sets the base directory for views/templates.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @param path - The path to the views directory
   * @returns {this}
   */
  setBaseViewsDir(path: string | string[]): this;

  /**
   * Sets the view engine for templates.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @param engine - The view engine name
   * @returns {this}
   */
  setViewEngine(engine: string): this;

  /**
   * Returns the underlying H3 instance.
   * Use this to access H3-specific features.
   *
   * @example
   * const h3 = app.getHttpAdapter().getInstance();
   *
   * @returns {H3}
   */
  getInstance(): H3;

  /**
   * Returns the HTTP adapter type identifier.
   *
   * @returns {string} Always returns 'h3'
   */
  getType(): string;

  /**
   * Sets a hook that is called before each request is processed.
   * The hook can perform async operations and must call `done()` when finished.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * adapter.setOnRequestHook((req, res, done) => {
   *   console.log('Request received:', req.url);
   *   done();
   * });
   *
   * @param onRequestHook - The hook function to call before each request
   */
  setOnRequestHook(
    onRequestHook: (
      req: http.IncomingMessage | http2.Http2ServerRequest,
      res: http.ServerResponse | http2.Http2ServerResponse,
      done: () => void,
    ) => Promise<void> | void,
  ): void;

  /**
   * Sets a hook that is called after each response is finished.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * adapter.setOnResponseHook((req, res) => {
   *   console.log('Response sent for:', req.url);
   * });
   *
   * @param onResponseHook - The hook function to call after each response
   */
  setOnResponseHook(
    onResponseHook: (
      req: http.IncomingMessage | http2.Http2ServerRequest,
      res: http.ServerResponse | http2.Http2ServerResponse,
    ) => Promise<void> | void,
  ): void;

  /**
   * Returns whether the server is running in HTTP/2 mode.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * if (adapter.isHttp2Enabled()) {
   *   console.log('Running with HTTP/2');
   * }
   *
   * @returns {boolean} True if HTTP/2 is enabled
   */
  isHttp2Enabled(): boolean;
}
