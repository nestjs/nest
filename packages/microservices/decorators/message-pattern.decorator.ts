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
import {
  InvalidGrpcDecoratorException,
  RpcDecoratorMetadata,
} from '../errors/invalid-grpc-message-decorator.exception';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

export enum GrpcMethodStreamingType {
  NO_STREAMING = 'no_stream',
  RX_STREAMING = 'rx_stream',
  PT_STREAMING = 'pt_stream',
}

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 *
 * @publicApi
 */
export const MessagePattern: {
  <T = PatternMetadata | string>(metadata?: T): MethodDecorator;
  <T = PatternMetadata | string>(
    metadata?: T,
    transport?: Transport | symbol,
  ): MethodDecorator;
  <T = PatternMetadata | string>(
    metadata?: T,
    extras?: Record<string, any>,
  ): MethodDecorator;
  <T = PatternMetadata | string>(
    metadata?: T,
    transport?: Transport | symbol,
    extras?: Record<string, any>,
  ): MethodDecorator;
} = <T = PatternMetadata | string>(
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
    try {
      Reflect.defineMetadata(
        PATTERN_METADATA,
        ([] as any[]).concat(metadata),
        descriptor.value,
      );
      Reflect.defineMetadata(
        PATTERN_HANDLER_METADATA,
        PatternHandler.MESSAGE,
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
    } catch (err) {
      throw new InvalidGrpcDecoratorException(metadata as RpcDecoratorMetadata);
    }
  };
};

/**
 * Registers gRPC method handler for specified service.
 */
export function GrpcMethod(service?: string): MethodDecorator;
export function GrpcMethod(service: string, method?: string): MethodDecorator;
export function GrpcMethod(
  service: string | undefined,
  method?: string,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const metadata = createGrpcMethodMetadata(target, key, service, method);
    return MessagePattern(metadata, Transport.GRPC)(target, key, descriptor);
  };
}

/**
 * Registers gRPC call through RX handler for service and method
 *
 * @param service String parameter reflecting the name of service definition from proto file
 */
export function GrpcStreamMethod(service?: string): MethodDecorator;
/**
 * @param service String parameter reflecting the name of service definition from proto file
 * @param method Optional string parameter reflecting the name of method inside of a service definition coming after rpc keyword
 */
export function GrpcStreamMethod(
  service: string,
  method?: string,
): MethodDecorator;
export function GrpcStreamMethod(
  service: string | undefined,
  method?: string,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const metadata = createGrpcMethodMetadata(
      target,
      key,
      service,
      method,
      GrpcMethodStreamingType.RX_STREAMING,
    );

    MessagePattern(metadata, Transport.GRPC)(target, key, descriptor);

    const originalMethod = descriptor.value;

    // Override original method to call the "drainBuffer" method on the first parameter
    // This is required to avoid premature message emission
    descriptor.value = async function (
      this: any,
      observable: any,
      ...args: any[]
    ) {
      const result = await Promise.resolve(
        originalMethod.apply(this, [observable, ...args]),
      );

      // Drain buffer if "drainBuffer" method is available
      if (observable && observable.drainBuffer) {
        observable.drainBuffer();
      }
      return result;
    };

    // Copy all metadata from the original method to the new one
    const metadataKeys = Reflect.getMetadataKeys(originalMethod);
    metadataKeys.forEach(metadataKey => {
      const metadataValue = Reflect.getMetadata(metadataKey, originalMethod);
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
    });
  };
}

/**
 * Registers gRPC call pass through handler for service and method
 *
 * @param service String parameter reflecting the name of service definition from proto file
 */
export function GrpcStreamCall(service?: string): MethodDecorator;
/**
 * @param service String parameter reflecting the name of service definition from proto file
 * @param method Optional string parameter reflecting the name of method inside of a service definition coming after rpc keyword
 */
export function GrpcStreamCall(
  service: string,
  method?: string,
): MethodDecorator;
export function GrpcStreamCall(
  service: string | undefined,
  method?: string,
): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const metadata = createGrpcMethodMetadata(
      target,
      key,
      service,
      method,
      GrpcMethodStreamingType.PT_STREAMING,
    );
    return MessagePattern(metadata, Transport.GRPC)(target, key, descriptor);
  };
}

export function createGrpcMethodMetadata(
  target: object,
  key: string | symbol,
  service: string | undefined,
  method: string | undefined,
  streaming = GrpcMethodStreamingType.NO_STREAMING,
) {
  const capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  if (!service) {
    const { name } = target.constructor;
    return {
      service: name,
      rpc: capitalizeFirstLetter(key as string),
      streaming,
    };
  }
  if (service && !method) {
    return { service, rpc: capitalizeFirstLetter(key as string), streaming };
  }
  return { service, rpc: method, streaming };
}
