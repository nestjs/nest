import { FastifyCorsOptions } from '@fastify/cors';
import { HttpServer, INestApplication } from '@nestjs/common';
import {
  FastifyBodyParser,
  FastifyInstance,
  FastifyListenOptions,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyRegisterOptions,
  FastifyReply,
  FastifyRequest,
  RawServerBase,
  RawServerDefault,
} from 'fastify';
import {
  InjectOptions,
  Chain as LightMyRequestChain,
  Response as LightMyRequestResponse,
} from 'light-my-request';
import { FastifyStaticOptions, FastifyViewOptions } from './external';
import { NestFastifyBodyParserOptions } from './nest-fastify-body-parser-options.interface';

/**
 * @publicApi
 */
export interface NestFastifyApplication<
  TServer extends RawServerBase = RawServerDefault,
> extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to a Fastify app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<FastifyRequest, FastifyReply, FastifyInstance>;

  /**
   * A wrapper function around native `fastify.register()` method.
   * Example `app.register(require('@fastify/formbody'))
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
   * Register Fastify body parsers on the fly. Will respect
   * the application's `rawBody` option.
   *
   * @example
   * const app = await NestFactory.create<NestFastifyApplication>(
   *   AppModule,
   *   new FastifyAdapter(),
   *   { rawBody: true }
   * );
   * // enable the json parser with a parser limit of 50mb
   * app.useBodyParser('application/json', { bodyLimit: 50 * 1000 * 1024 });
   *
   * @returns {this}
   */
  useBodyParser<TServer extends RawServerBase = RawServerBase>(
    type: string | string[] | RegExp,
    options?: NestFastifyBodyParserOptions,
    parser?: FastifyBodyParser<Buffer, TServer>,
  ): this;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets({ root: 'public' })`
   * @returns {this}
   */
  useStaticAssets(options: FastifyStaticOptions): this;

  /**
   * Enables CORS (Cross-Origin Resource Sharing)
   *
   * @returns {void}
   */
  enableCors(options?: FastifyCorsOptions): void;

  /**
   * Sets a view engine for templates (views), for example: `pug`, `handlebars`, or `ejs`.
   *
   * Don't pass in a string. The string type in the argument is for compatibility reason and will cause an exception.
   * @returns {this}
   */
  setViewEngine(options: FastifyViewOptions | string): this;

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
    opts: FastifyListenOptions,
    callback?: (err: Error | null, address: string) => void,
  ): Promise<TServer>;
  listen(opts?: FastifyListenOptions): Promise<TServer>;
  listen(
    callback?: (err: Error | null, address: string) => void,
  ): Promise<TServer>;
  listen(
    port: number | string,
    callback?: (err: Error | null, address: string) => void,
  ): Promise<TServer>;
  listen(
    port: number | string,
    address: string,
    callback?: (err: Error | null, address: string) => void,
  ): Promise<TServer>;
  listen(
    port: number | string,
    address: string,
    backlog: number,
    callback?: (err: Error | null, address: string) => void,
  ): Promise<TServer>;
}
