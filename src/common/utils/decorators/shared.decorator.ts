import 'reflect-metadata';
import { ControllerMetadata } from '../../interfaces/controllers/controller-metadata.interface';
import { isString } from '../shared.utils';
import { PATH_METADATA, SHARED_MODULE_METADATA } from '../../constants';
import { NestModuleMetatype } from '../../interfaces/modules/module-metatype.interface';

export const Shared = (token: string = 'global'): ClassDecorator => {
    return (target: FunctionConstructor) => {
        const Type = class extends target {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(SHARED_MODULE_METADATA, token, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type;
    };
};