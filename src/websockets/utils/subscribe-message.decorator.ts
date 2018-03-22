import 'reflect-metadata';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../constants';
import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';

/**
 * Subscribes to messages which fulfils chosen pattern.
 */
export const SubscribeMessage = (
  message: any,
): MethodDecorator => {
  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
    Reflect.defineMetadata(MESSAGE_METADATA, message, descriptor.value);
    return descriptor;
  };
};
