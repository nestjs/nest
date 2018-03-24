import 'reflect-metadata';
import { SELF_DECLARED_DEPS_METADATA } from '../../constants';
import { isFunction } from '../../utils/shared.utils';

/**
 * Injects provider which has to be available in the current injector (module) scope.
 * Providers are recognized by types or tokens.
 */
export function Inject(token: any): ParameterDecorator {
  return (target, key, index) => {
    const args = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];
    const type = isFunction(token) ? token.name : token;

    args.push({ index, param: type });
    Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, args, target);
  };
}
