import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../constants';

/**
 * Subscribes to messages that fulfils chosen pattern.
 *
 * @publicApi
 */
export const SubscribeMessage = <T = string>(
  ...messages: T[]
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
    const currentMessages =
      Reflect.getMetadata(MESSAGE_METADATA, descriptor.value) || [];
    Reflect.defineMetadata(
      MESSAGE_METADATA,
      [...currentMessages, ...messages],
      descriptor.value,
    );
    return descriptor;
  };
};
