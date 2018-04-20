import 'reflect-metadata';
import { ExceptionFilter } from '../../index';
/**
 * Setups exception filters to the chosen context.
 * When the `@UseFilters()` is used on the controller level:
 * - Exception Filter will be set up to every handler (every method)
 *
 * When the `@UseFilters()` is used on the handle level:
 * - Exception Filter will be set up only to specified method
 *
 * @param  {ExceptionFilter[]} ...filters
 */
export declare const UseFilters: (...filters: (Function | ExceptionFilter<any>)[]) => (target: any, key?: any, descriptor?: any) => any;
