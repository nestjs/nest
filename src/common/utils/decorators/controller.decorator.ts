import 'reflect-metadata';

import {PATH_METADATA} from '../../constants';
import {
  ControllerMetadata
} from '../../interfaces/controllers/controller-metadata.interface';
import {isObject, isUndefined} from '../shared.utils';

/**
 * Defines the Controller. The controller can inject dependencies through
 * constructor. Those dependencies should belongs to the same module.
 */
export function Controller(prefix?: string): ClassDecorator {
  const path = isUndefined(prefix) ? '/' : prefix;
  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
  };
}