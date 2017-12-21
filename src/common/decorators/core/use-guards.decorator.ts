import { GUARDS_METADATA } from '../../constants';

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
export function UseGuards(...guards: any[]) {
    return (target: object, key?: string, descriptor?: any) => {
        if (descriptor) {
            Reflect.defineMetadata(GUARDS_METADATA, guards, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(GUARDS_METADATA, guards, target);
        return target;
    };
}
