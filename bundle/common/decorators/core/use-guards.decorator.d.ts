import { CanActivate } from '../../interfaces';
/**
 * Binds guards to the particular context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be register to each handler (every method)
 *
 * When the `@UseGuards()` is used on the handler level:
 * - Guard will be registered only to specified method
 *
 * @param  {} ...guards
 */
export declare function UseGuards(...guards: (CanActivate | Function)[]): (target: any, key?: any, descriptor?: any) => any;
