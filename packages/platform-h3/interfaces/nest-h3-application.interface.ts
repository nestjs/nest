import { HttpServer, INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { H3, H3Event } from 'h3';
import * as http from 'http';
import { Server } from 'http';
import { ServeStaticOptions } from './serve-static-options.interface';

/**
 * Interface describing methods on NestH3Application.
 *
 * @publicApi
 */
export interface NestH3Application extends INestApplication<Server> {
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
  listen(port: number | string, callback?: () => void): Promise<Server>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<Server>;

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
   * @param options - CORS options
   */
  enableCors(options?: CorsOptions): void;

  /**
   * Sets a hook that is called before each request is processed.
   * The hook can perform async operations and must call `done()` when finished.
   *
   * @example
   * app.getHttpAdapter().setOnRequestHook((req, res, done) => {
   *   console.log('Request received:', req.url);
   *   done();
   * });
   *
   * @param onRequestHook - The hook function to call before each request
   */
  setOnRequestHook(
    onRequestHook: (
      req: http.IncomingMessage,
      res: http.ServerResponse,
      done: () => void,
    ) => Promise<void> | void,
  ): void;

  /**
   * Sets a hook that is called after each response is finished.
   *
   * @example
   * app.getHttpAdapter().setOnResponseHook((req, res) => {
   *   console.log('Response sent for:', req.url);
   * });
   *
   * @param onResponseHook - The hook function to call after each response
   */
  setOnResponseHook(
    onResponseHook: (
      req: http.IncomingMessage,
      res: http.ServerResponse,
    ) => Promise<void> | void,
  ): void;
}
