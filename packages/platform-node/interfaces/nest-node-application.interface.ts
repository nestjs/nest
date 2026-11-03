import type { HttpServer, INestApplication } from '@nestjs/common';
import type { CorsOptions, CorsOptionsDelegate } from '@nestjs/common/internal';
import type { Server as CoreHttpServer } from 'http';
import type { Server as CoreHttpsServer } from 'https';
import type { NodeRequest, NodeResponse } from '../adapters/node-request.js';
import type { NodeRouter } from '../router/node-router.js';
import type {
  NestNodeBodyParserOptionsFor,
  NestNodeBodyParserType,
} from './nest-node-body-parser.interface.js';
import type { ServeStaticOptions } from './serve-static-options.interface.js';
import type { NodeViewOptions } from '../views/view-renderer.js';

/**
 * Interface describing methods on NestNodeApplication.
 *
 * @see [Platform](https://docs.nestjs.com/first-steps#platform)
 *
 * @publicApi
 */
export interface NestNodeApplication<
  TServer extends CoreHttpServer | CoreHttpsServer = CoreHttpServer,
> extends INestApplication<TServer> {
  getHttpAdapter(): HttpServer<NodeRequest, NodeResponse, NodeRouter>;

  listen(port: number | string, callback?: () => void): Promise<TServer>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<TServer>;

  useStaticAssets(path: string, options?: ServeStaticOptions): this;

  enableCors(options?: CorsOptions | CorsOptionsDelegate<any>): void;

  /**
   * Configures the template engine used by `@Render()`, either with
   * `@fastify/view`-style options (`{ engine: { ejs: require('ejs') },
   * templates: 'views' }`) or with an engine name, as with Express.
   */
  setViewEngine(options: NodeViewOptions | string): this;

  /**
   * Sets the directory (or directories) views are resolved against.
   */
  setBaseViewsDir(path: string | string[]): this;

  useBodyParser<ParserType extends NestNodeBodyParserType>(
    parser: ParserType,
    options?: NestNodeBodyParserOptionsFor<ParserType>,
  ): this;
}
