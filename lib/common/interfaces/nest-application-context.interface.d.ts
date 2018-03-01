import { Type } from './type.interface';
export interface INestApplicationContext {
    /**
     * Allows you to navigate through the modules tree, for example, to pull out a specific instance from the selected module.
     * @returns INestApplicationContext
     */
    select<T>(module: Type<T>): INestApplicationContext;
    /**
     * Makes possible to retrieve the instance of the component or controller available inside the processed module.
     * @returns T
     */
    get<T>(typeOrToken: Type<T> | string | symbol): T;
}
