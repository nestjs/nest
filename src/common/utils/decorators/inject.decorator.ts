import 'reflect-metadata';
import { SELF_DECLARED_DEPS_METADATA } from '../../constants';
import { isFunction } from '../shared.utils';

export const Inject = (param): ParameterDecorator => {
    return (target, key, index) => {
        const args = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];
        const type = isFunction(param) ? param.name : param;

        args.push({ index, param: type });
        Reflect.defineMetadata(SELF_DECLARED_DEPS_METADATA, args, target);
    };
};