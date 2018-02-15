import { WebSocketAdapter } from './web-socket-adapter.interface';
import { ExceptionFilter } from './exceptions/exception-filter.interface';
import { PipeTransform } from './pipe-transform.interface';
import { NestInterceptor } from './nest-interceptor.interface';
import { CanActivate } from './can-activate.interface';
import { INestApplicationContext } from './nest-application-context.interface';

export interface INestMicroservice extends INestApplicationContext {
  /**
   * Starts the microservice.
   *
   * @param  {Function} callback Callback called after instant
   * @returns Promise
   */
  listen(callback: () => void);

  /**
   * Starts the microservice and can be awaited.
   *
   * @returns Promise
   */
  listenAsync(): Promise<any>;

  /**
   * Setup Web Sockets Adapter, which will be used inside Gateways.
   * Use, when you want to override default `socket.io` library.
   *
   * @param  {WebSocketAdapter} adapter
   * @returns void
   */
  useWebSocketAdapter(adapter: WebSocketAdapter): this;

  /**
   * Setups exception filters as a global filters (will be used within every message pattern handler)
   *
   * @param  {ExceptionFilter[]} ...filters
   */
  useGlobalFilters(...filters: ExceptionFilter[]): this;

  /**
   * Setups pipes as a global pipes (will be used within every message pattern handler)
   *
   * @param  {PipeTransform[]} ...pipes
   */
  useGlobalPipes(...pipes: PipeTransform<any>[]): this;

  /**
   * Setups interceptors as a global interceptors (will be used within every message pattern handler)
   *
   * @param  {NestInterceptor[]} ...interceptors
   */
  useGlobalInterceptors(...interceptors: NestInterceptor[]): this;

  /**
   * Setups guards as a global guards (will be used within every message pattern handler)
   *
   * @param  {CanActivate[]} ...guards
   */
  useGlobalGuards(...guards: CanActivate[]): this;

  /**
   * Terminates the application (both NestMicroservice and every Web Socket Gateway)
   *
   * @returns void
   */
  close(): void;
}
