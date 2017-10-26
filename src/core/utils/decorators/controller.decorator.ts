import 'reflect-metadata';
import { ControllerMetadata } from '../../interfaces/controllers/controller-metadata.interface';
import { isUndefined, isObject } from '../shared.utils';
import { PATH_METADATA } from '../../constants';

/**
 * Defines the Controller. The controller can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export function Controller(prefix?: string): ClassDecorator {
    const path = isUndefined(prefix) ? '/' : prefix;
    return (target: object) => {
        Reflect.defineMetadata(PATH_METADATA, path, target);
    };
}