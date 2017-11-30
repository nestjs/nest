import 'reflect-metadata';
import { ControllerMetadata } from '../../interfaces/controllers/controller-metadata.interface';
import { isString } from '../../utils/shared.utils';
import { PATH_METADATA, SHARED_MODULE_METADATA } from '../../constants';
import { NestModuleMetatype } from '../../interfaces/modules/module-metatype.interface';
import { Logger } from '../../index';

/**
 * Specifies scope of this module. When module is `@Shared()`, Nest will create only one instance of this
 * module and share them between all of the modules.
 * @deprecated
 */
export const Shared = (scope: string = 'global') => {
    const logger = new Logger('Shared');
    logger.warn('DEPRECATED! Since version 4.0.0 `@Shared()` decorator is deprecated. All modules are singletons now.');
    return (target: any) => {
        const Metatype = target as FunctionConstructor;
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(SHARED_MODULE_METADATA, scope, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type as any;
    };
};