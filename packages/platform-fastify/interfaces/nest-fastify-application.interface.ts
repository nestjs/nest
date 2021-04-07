import { INestApplication } from '@nestjs/common';
import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyRegisterOptions,
} from 'fastify';
import {
  Chain as LightMyRequestChain,
  InjectOptions,
  Response as LightMyRequestResponse,
} from 'light-my-request';

import { FastifyStaticOptions, PointOfViewOptions } from './external';

export interface NestFastifyApplication extends INestApplication {
  /**
   * A wrapper function around native `fastify.register()` method.
   * Example `app.register(require('fastify-formbody'))
   * @returns {Promise<FastifyInstance>}
   */
  register<Options extends FastifyPluginOptions = any>(
    plugin:
      | FastifyPluginCallback<Options>
      | FastifyPluginAsync<Options>
      | Promise<{ default: FastifyPluginCallback<Options> }>
      | Promise<{ default: FastifyPluginAsync<Options> }>,
    opts?: FastifyRegisterOptions<Options>,
  ): Promise<FastifyInstance>;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets({ root: 'public' })`
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
  inject(): LightMyRequestChain;
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;

  /**
   * Starts the application.
   * @returns A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(
    port: number | string,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
  listen(
    port: number | string,
    address: string,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
  listen(
    port: number | string,
    address: string,
    backlog: number,
    callback?: (err: Error, address: string) => void,
  ): Promise<any>;
}
