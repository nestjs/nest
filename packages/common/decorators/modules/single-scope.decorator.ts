import { SHARED_MODULE_METADATA } from '../../constants';

/**
 * Makes the module single-scoped (not singleton).
 * In this case, Nest will always create a new instance of this particular module when it's imported by another one.
 */
export function SingleScope(): ClassDecorator {
  return (target: any) => {
    const Metatype = target as FunctionConstructor;
    const Type = class extends Metatype {
      constructor(...args: any[]) {
        super(...args);
      }
    };
    Reflect.defineMetadata(SHARED_MODULE_METADATA, true, Type);
    Object.defineProperty(Type, 'name', { value: target.name });
    return Type as any;
  };
}
