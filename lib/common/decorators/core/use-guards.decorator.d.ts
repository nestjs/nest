/**
 * Setups guards to the chosen context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be set up to every handler (every method)
 *
 * When the `@UseGuards()` is used on the handle level:
 * - Guard will be set up only to specified method
 *
 * @param  {} ...guards (types)
 */
export declare function UseGuards(...guards: any[]): (target: object, key?: any, descriptor?: any) => any;
