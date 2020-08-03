import { INestApplication } from '@nestjs/common';
import { ServeStaticOptions } from './serve-static-options.interface';

/**
 * Interface describing methods on NestExpressApplication.
 *
 * @see [Platform](https://docs.nestjs.com/first-steps#platform)
 *
 * @publicApi
 */
export interface NestExpressApplication extends INestApplication {
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
   * A wrapper function around native `express.locals` property.
   * @example
   * app.setLocals({title: 'My App'})
   *
   * @returns {this}
   */
  setLocals(source: object): this;

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
}
