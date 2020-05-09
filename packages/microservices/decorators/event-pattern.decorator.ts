import {
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '../constants';
import { PatternHandler } from '../enums/pattern-handler.enum';

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 */
export const EventPattern = <T = string>(
  metadata?: T,
  transport?: number,
): MethodDecorator => {
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
    Reflect.defineMetadata(TRANSPORT_METADATA, transport, descriptor.value);
    return descriptor;
  };
};
