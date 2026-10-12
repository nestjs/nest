import type { INestApplication } from '@nestjs/common';
import type { CorsOptions, CorsOptionsDelegate } from '@nestjs/common/internal';
import type { BunAdapter } from '../adapters/bun-adapter.js';
import type { BunHttpServer } from '../adapters/bun-http-server.js';
import type { NestBunBodyParserOptions } from './nest-bun-body-parser-options.interface.js';
import type { NestBunBodyParserType } from './nest-bun-body-parser.interface.js';
import type { NestBunViewEngineOption } from './nest-bun-view-engine.interface.js';
import type { ServeStaticOptions } from './serve-static-options.interface.js';

/**
 * Interface describing methods on NestBunApplication, mirroring
 * `NestExpressApplication`.
 *
 * @example
 * const app = await NestFactory.create<NestBunApplication>(
 *   AppModule,
 *   new BunAdapter(),
 * );
 *
 * @publicApi
 */
export interface NestBunApplication extends INestApplication<BunHttpServer> {
  /**
   * Returns the underlying HTTP adapter.
   */
  getHttpAdapter(): BunAdapter;

  /**
   * Starts the application.
   *
   * @returns A Promise that resolves to the underlying `BunHttpServer`.
   */
  listen(port: number | string, callback?: () => void): Promise<BunHttpServer>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<BunHttpServer>;

  /**
   * Serves a directory of static assets through `Bun.file()`.
   *
   * @example
   * app.useStaticAssets('public', { prefix: '/static' })
   */
  useStaticAssets(path: string, options?: ServeStaticOptions): this;

  enableCors(options?: CorsOptions | CorsOptionsDelegate<any>): void;

  /**
   * Registers an extra body parser on the fly. Respects the application's
   * `rawBody` option.
   *
   * @example
   * app.useBodyParser('text', { limit: '1mb' });
   */
  useBodyParser(
    parser: NestBunBodyParserType,
    options?: NestBunBodyParserOptions,
  ): this;

  /**
   * Sets one or multiple base directories for templates (views).
   */
  setBaseViewsDir(path: string | string[]): this;

  /**
   * Sets a view engine: `'ejs'`, `'hbs'`, `'pug'` or any
   * `{ render(file, data) }` object.
   */
  setViewEngine(engine: NestBunViewEngineOption): this;

  /**
   * Sets app-level globals for view templates.
   */
  setLocal(key: string, value: any): this;
}
