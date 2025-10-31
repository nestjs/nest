import {
  isNil,
  isNumber,
  isObject,
  isSymbol,
} from '@nestjs/common/utils/shared.utils';
import {
  PATTERN_EXTRAS_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from '../constants';
import { Transport } from '../enums';
import { PatternHandler } from '../enums/pattern-handler.enum';

export type EventDataMethodDecorator<
  TEventTypes extends Record<string, any>,
  TKey extends keyof TEventTypes,
> = (
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    (data: TEventTypes[TKey], ...args: unknown[]) => any
  >,
) => void;

/**
 * Subscribes to incoming events which fulfils chosen pattern.
 *
 * @publicApi
 */
export const EventPattern: {
  <TEventTypes extends Record<string, any>>(
    topic: keyof TEventTypes,
  ): EventDataMethodDecorator<TEventTypes, typeof topic>;
  <TEventTypes extends Record<string, any>>(
    topic: keyof TEventTypes,
    transport: Transport | symbol,
  ): EventDataMethodDecorator<TEventTypes, typeof topic>;
  <TEventTypes extends Record<string, any>>(
    topic: keyof TEventTypes,
    extras: Record<string, any>,
  ): EventDataMethodDecorator<TEventTypes, typeof topic>;
  <TEventTypes extends Record<string, any>>(
    topic: keyof TEventTypes,
    transport: Transport | symbol,
    extras: Record<string, any>,
  ): EventDataMethodDecorator<TEventTypes, typeof topic>;
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
    extras = maybeExtras!;
  }
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      PATTERN_METADATA,
      ([] as any[]).concat(metadata),
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
