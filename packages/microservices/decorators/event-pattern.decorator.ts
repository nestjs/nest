import { PATTERN_HANDLER_METADATA, PATTERN_METADATA } from '../constants';
import { PatternHandler } from '../enums/pattern-handler.enum';

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 */
export const EventPattern = <T = string>(metadata?: T): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(PATTERN_METADATA, metadata, descriptor.value);
    Reflect.defineMetadata(
      PATTERN_HANDLER_METADATA,
      PatternHandler.EVENT,
      descriptor.value,
    );
    return descriptor;
  };
};
