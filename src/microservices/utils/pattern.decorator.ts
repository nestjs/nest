import 'reflect-metadata';
import { PATTERN_METADATA, PATTERN_HANDLER_METADATA } from '../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

/**
 * Subscribes to the messages, which fulfils chosen pattern.
 */
export const MessagePattern = (
  metadata?: PatternMetadata | string,
): MethodDecorator => {
  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATTERN_METADATA, metadata, descriptor.value);
    Reflect.defineMetadata(PATTERN_HANDLER_METADATA, true, descriptor.value);
    return descriptor;
  };
};
