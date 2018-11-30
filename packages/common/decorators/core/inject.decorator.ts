import {
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '../../constants';
import { isFunction, isUndefined } from '../../utils/shared.utils';

/**
 * Injects provider which has to be available in the current injector (module) scope.
 * Providers are recognized by either types or tokens.
 */
export function Inject<T = any>(token?: T) {
  return (target: Object, key: string | symbol, index?: number) => {
    token = token || Reflect.getMetadata('design:type', target, key);
    const type =
      token && isFunction(token) ? ((token as any) as Function).name : token;

    if (!isUndefined(index)) {
      const dependencies =
        Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

      dependencies.push({ index, param: type });
      Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, dependencies, target);
      return;
    }
    const properties =
      Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) || [];

    properties.push({ key, type });
    Reflect.defineMetadata(
      PROPERTY_DEPS_METADATA,
      properties,
      target.constructor,
    );
  };
}
