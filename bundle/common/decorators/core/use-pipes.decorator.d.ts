import { PipeTransform } from '../../interfaces/index';
/**
 * Binds pipes to the particular context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be register to each handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be registered only to specified method
 *
 * @param  {PipeTransform[]} ...pipes
 */
export declare function UsePipes(...pipes: (PipeTransform | Function)[]): (target: any, key?: any, descriptor?: any) => any;
