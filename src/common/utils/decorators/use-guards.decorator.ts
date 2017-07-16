import { GUARDS_METADATA } from '../../constants';

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
