import { Observable } from 'rxjs';
import { ExceptionFilter } from './exceptions/exception-filter.interface';
import { CanActivate } from './features/can-activate.interface';
import { NestInterceptor } from './features/nest-interceptor.interface';
import { PipeTransform } from './features/pipe-transform.interface';
import { INestApplicationContext } from './nest-application-context.interface';
import { WebSocketAdapter } from './websockets/web-socket-adapter.interface';

/**
 * Interface describing Microservice Context.
 *
 * @publicApi
 */
export interface INestMicroservice extends INestApplicationContext {
  /**
   * Starts the microservice.
   *
   * @returns {void}
   */
  listen(): Promise<any>;

  /**
   * Registers a web socket adapter that will be used for Gateways.
   * Use to override the default `socket.io` library.
   *
   * @param {WebSocketAdapter} adapter
   * @returns {this}
   */
  useWebSocketAdapter(adapter: WebSocketAdapter): this;

  /**
   * Registers global exception filters (will be used for every pattern handler).
   *
   * @param {...ExceptionFilter} filters
   */
  useGlobalFilters(...filters: ExceptionFilter[]): this;

  /**
   * Registers global pipes (will be used for every pattern handler).
   *
   * @param {...PipeTransform} pipes
   */
  useGlobalPipes(...pipes: PipeTransform<any>[]): this;

  /**
   * Registers global interceptors (will be used for every pattern handler).
   *
   * @param {...NestInterceptor} interceptors
   */
  useGlobalInterceptors(...interceptors: NestInterceptor[]): this;

  /**
   * Registers global guards (will be used for every pattern handler).
   *
   * @param {...CanActivate} guards
   */
  useGlobalGuards(...guards: CanActivate[]): this;

  /**
   * Terminates the application.
   *
   * @returns {Promise<void>}
   */
  close(): Promise<void>;

  /**
   * Returns an observable that emits status changes.
   *
   * @returns {Observable<string>}
   */
  status: Observable<string>;

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  on<
    EventsMap extends Record<string, Function> = Record<string, Function>,
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey],
  >(
    event: EventKey,
    callback: EventCallback,
  ): void;

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  unwrap<T>(): T;
}
