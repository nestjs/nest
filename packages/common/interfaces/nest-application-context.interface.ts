import { LoggerService } from '../services/logger.service';
import { Abstract } from './abstract.interface';
import { Type } from './type.interface';
import { ShutdownSignal } from '../enums/shutdown-signal.enum';

export interface INestApplicationContext {
  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {INestApplicationContext}
   */
  select<T>(module: Type<T>): INestApplicationContext;

  /**
   * Retrieves an instance of either injectable or controller available anywhere, otherwise, throws exception.
   * @returns {TResult}
   */
  get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options?: { strict: boolean },
  ): TResult;

  /**
   * Terminates the application
   * @returns {Promise<void>}
   */
  close(): Promise<void>;

  /**
   * Sets custom logger service
   * @returns {void}
   */
  useLogger(logger: LoggerService): void;

  /**
   * Enables the usage of shutdown hooks. Will call the
   * `onApplicationShutdown` function of a provider if the
   * process receives a shutdown signal.
   *
   * @returns {this} The Nest application context instance
   */
  enableShutdownHooks(signals?: ShutdownSignal[] | string[]): this;
}
