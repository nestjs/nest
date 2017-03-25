import 'reflect-metadata';
import { SELF_PARAMS_METADATA } from '../constants';
import { isFunction } from './shared.utils';

export const Inject = (param): ParameterDecorator => {
    return (target, key, index) => {
        const selfArgs = Reflect.getMetadata(SELF_PARAMS_METADATA, target) || [];
        const type = isFunction(param) ? param.name : param;

        selfArgs.push({ index, param: type });
        Reflect.defineMetadata(SELF_PARAMS_METADATA, selfArgs, target);
    }
};