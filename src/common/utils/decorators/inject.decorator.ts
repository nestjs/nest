import 'reflect-metadata';
import { SELF_DECLARED_DEPS_METADATA } from '../../constants';
import { isFunction } from '../shared.utils';

/**
 * Injects component, which has to be available in the current injector (module) scope.
 * Components are recognized by types / or tokens.
 */
export function Inject(token): ParameterDecorator {
    return (target, key, index) => {
        const args = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];
        const type = isFunction(token) ? token.name : token;

        args.push({ index, param: type });
        Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, args, target);
    };
}