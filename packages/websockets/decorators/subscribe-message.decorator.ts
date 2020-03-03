import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../constants';

/**
 * Subscribes to messages that fulfils chosen pattern.
 */
export const SubscribeMessage = <T = string>(message: T): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
    Reflect.defineMetadata(MESSAGE_METADATA, message, descriptor.value);
    return descriptor;
  };
};
