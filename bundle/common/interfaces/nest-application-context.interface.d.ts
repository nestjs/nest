import { Type } from './type.interface';
export interface INestApplicationContext {
    /**
     * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
     * @returns {INestApplicationContext}
     */
    select<T>(module: Type<T>): INestApplicationContext;
    /**
     * Retrieves an instance of either injectable or controller available anywhere, otherwise, throws exception.
     * @returns {T}
     */
    get<T>(typeOrToken: Type<T> | string | symbol, options?: {
        strict: boolean;
    }): T;
}
