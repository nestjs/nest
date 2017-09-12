import { GUARDS_METADATA } from '../../constants';

/**
 * Setups guards to the chosen context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be setuped to the every handler (every method)
 *
 * When the `@UseGuards()` is used on the handle level:
 * - Guard will be setuped only to specified method
 *
 * @param  {} ...guards (types)
 */
export const UseGuards = (...guards) => {
    return (target: object, key?, descriptor?) => {
        if (descriptor) {
            Reflect.defineMetadata(GUARDS_METADATA, guards, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(GUARDS_METADATA, guards, target);
        return target;
    };
};
