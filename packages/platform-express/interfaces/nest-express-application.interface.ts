import { INestApplication, HttpServer } from '@nestjs/common';
import type { Server as CoreHttpServer } from 'http';
import type { Server as CoreHttpsServer } from 'https';
import type { Server } from 'net';
import type { Express } from 'express';
import { NestExpressBodyParserOptions } from './nest-express-body-parser-options.interface';
import { NestExpressBodyParserType } from './nest-express-body-parser.interface';
import { ServeStaticOptions } from './serve-static-options.interface';

/**
 * Interface describing methods on NestExpressApplication.
 *
 * @see [Platform](https://docs.nestjs.com/first-steps#platform)
 *
 * @publicApi
 */
export interface NestExpressApplication<
  TServer extends CoreHttpServer | CoreHttpsServer = CoreHttpServer,
> extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to the Express.js app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<Express.Request, Express.Response, Express>;

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
   * A wrapper function around native `express.set()` method.
   *
   * @example
   * app.set('trust proxy', 'loopback')
   *
   * @returns {this}
   */
  set(...args: any[]): this;

  /**
   * A wrapper function around native `express.engine()` method.
   * @example
   * app.engine('mustache', mustacheExpress())
   *
   * @returns {this}
   */
  engine(...args: any[]): this;

  /**
   * A wrapper function around native `express.enable()` method.
   * @example
   * app.enable('x-powered-by')
   *
   * @returns {this}
   */
  enable(...args: any[]): this;

  /**
   * A wrapper function around native `express.disable()` method.
   *
   * @example
   * app.disable('x-powered-by')
   *
   * @returns {this}
   */
  disable(...args: any[]): this;

  useStaticAssets(options: ServeStaticOptions): this;
  /**
   * Sets a base directory for public assets.
   * @example
   * app.useStaticAssets('public')
   *
   * @returns {this}
   */
  useStaticAssets(path: string, options?: ServeStaticOptions): this;

  /**
   * Register Express body parsers on the fly. Will respect
   * the application's `rawBody` option.
   *
   * @example
   * const app = await NestFactory.create<NestExpressApplication>(
   *   AppModule,
   *   { rawBody: true }
   * );
   * app.useBodyParser('json', { limit: '50mb' });
   *
   * @returns {this}
   */
  useBodyParser<Options = NestExpressBodyParserOptions>(
    parser: NestExpressBodyParserType,
    options?: Omit<Options, 'verify'>,
  ): this;

  /**
   * Sets one or multiple base directories for templates (views).
   *
   * @example
   * app.setBaseViewsDir('views')
   *
   * @returns {this}
   */
  setBaseViewsDir(path: string | string[]): this;

  /**
   * Sets a view engine for templates (views).
   * @example
   * app.setViewEngine('pug')
   *
   * @returns {this}
   */
  setViewEngine(engine: string): this;

  /**
   * Sets app-level globals for view templates.
   *
   * @example
   * app.setLocal('title', 'My Site')
   *
   * @see https://expressjs.com/en/4x/api.html#app.locals
   *
   * @returns {this}
   */
  setLocal(key: string, value: any): this;
}
