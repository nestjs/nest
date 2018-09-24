import { LoggerService } from '../services/logger.service';
import { Type } from './type.interface';
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
    get<TInput = any, TResult = TInput>(typeOrToken: Type<TInput> | string | symbol, options?: {
        strict: boolean;
    }): TResult;
    /**
     * Terminates the application
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
    /**
     * Sets custom logger service
     * @returns {void}
     */
    useLogger(logger: LoggerService): any;
}
