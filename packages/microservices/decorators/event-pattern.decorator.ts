import {
  isObject,
  isNumber,
  isNil,
  isSymbol,
} from '@nestjs/common/utils/shared.utils';
import {
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
  PATTERN_EXTRAS_METADATA,
} from '../constants';
import { PatternHandler } from '../enums/pattern-handler.enum';
import { Transport } from '../enums';

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 *
 * @publicApi
 */
export const EventPattern: {
  <T = string>(metadata?: T): MethodDecorator;
  <T = string>(metadata?: T, transport?: Transport | symbol): MethodDecorator;
  <T = string>(metadata?: T, extras?: Record<string, any>): MethodDecorator;
  <T = string>(
    metadata?: T,
    transport?: Transport | symbol,
    extras?: Record<string, any>,
  ): MethodDecorator;
} = <T = string>(
  metadata?: T,
  transportOrExtras?: Transport | symbol | Record<string, any>,
  maybeExtras?: Record<string, any>,
): MethodDecorator => {
  let transport: Transport | symbol;
  let extras: Record<string, any>;
  if (
    (isNumber(transportOrExtras) || isSymbol(transportOrExtras)) &&
    isNil(maybeExtras)
  ) {
    transport = transportOrExtras;
  } else if (isObject(transportOrExtras) && isNil(maybeExtras)) {
    extras = transportOrExtras;
  } else {
    transport = transportOrExtras as Transport | symbol;
    extras = maybeExtras;
  }
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      PATTERN_METADATA,
      [].concat(metadata),
      descriptor.value,
    );
    Reflect.defineMetadata(
      PATTERN_HANDLER_METADATA,
      PatternHandler.EVENT,
      descriptor.value,
    );
    Reflect.defineMetadata(TRANSPORT_METADATA, transport, descriptor.value);
    Reflect.defineMetadata(
      PATTERN_EXTRAS_METADATA,
      {
        ...Reflect.getMetadata(PATTERN_EXTRAS_METADATA, descriptor.value),
        ...extras,
      },
      descriptor.value,
    );
    return descriptor;
  };
};
