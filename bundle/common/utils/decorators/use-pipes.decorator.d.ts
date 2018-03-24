import { PipeTransform } from '../../interfaces/index';
/**
 * Setups pipes to the chosen context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be set up to every handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be set up only to specified method
 *
 * @param  {PipeTransform[]} ...pipes (instances)
 */
export declare function UsePipes(
  ...pipes: PipeTransform<any>[]
): (target: object, key?: any, descriptor?: any) => any;
