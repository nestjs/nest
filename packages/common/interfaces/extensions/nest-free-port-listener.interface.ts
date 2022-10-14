import { INestApplication } from '../nest-application.interface';
import { INestListenFreePortOptions } from './nest-listen-free-port-options.interface';

/**
 * INestApplication extension with methods to listen free port.
 *
 * @example
 *   const app = await NestFactory.create<INestFreePortListener>(AppModule);
 *   await app.listenFreePort({ port: 3000 });
 */
export interface INestFreePortListener extends INestApplication {
  /**
   * Starts the application on free port.
   * If selected port is busy it increments port value and trying again.
   *
   * @param {Object} options Server listening options.
   * @returns {Promise} A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listenFreePort(options?: INestListenFreePortOptions): Promise<any>;
}
