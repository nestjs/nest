import { INestApplication } from '@nestjs/common';
import {
  InjectOptions,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import {
  FastifyPluginOptions,
  FastifyPlugin,
  FastifyRegisterOptions,
} from 'fastify';
import { FastifyStaticOptions } from 'fastify-static';
import { PointOfViewOptions } from 'point-of-view';

export interface NestFastifyApplication extends INestApplication {
  /**
   * A wrapper function around native `fastify.register()` method.
   * Example `app.register(require('fastify-formbody'))`
   *
   * @returns {this}
   */
  register<Options extends FastifyPluginOptions>(
    plugin: FastifyPlugin<Options>,
    opts?: FastifyRegisterOptions<Options>,
  ): this;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets({ root: 'public' })`
   *
   * @returns {this}
   */
  useStaticAssets(options: FastifyStaticOptions): this;

  /**
   * Sets a view engine for templates (views), for example: `pug`, `handlebars`, or `ejs`.
   *
   * Don't pass in a string. The string type in the argument is for compatibilility reason and will cause an exception.
   * @returns {this}
   */
  setViewEngine(options: PointOfViewOptions | string): this;

  /**
   * A wrapper function around native `fastify.inject()` method.
   * @returns {void}
   */
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;

  /**
   * Starts the application.
   * @returns A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(
    port: number,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
  listen(
    port: number,
    address: string,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
  listen(
    port: number,
    address: string,
    backlog: number,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
}
