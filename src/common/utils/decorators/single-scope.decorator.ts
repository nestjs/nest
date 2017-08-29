import 'reflect-metadata';
import { PATH_METADATA, SHARED_MODULE_METADATA } from '../../constants';
/**
 * Makes the module single-scoped (not singleton).
 * Nest will always create the new instance of the module, when it's imported by another one.
 */
export const SingleScope = () => {
  return (target: any) => {
        const Metatype = target as FunctionConstructor;
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(SHARED_MODULE_METADATA, true, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type as any;
    };
};