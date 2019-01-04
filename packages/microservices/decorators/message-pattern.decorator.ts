import { PATTERN_HANDLER_METADATA, PATTERN_METADATA } from '../constants';
import { PatternHandler } from '../enums/pattern-handler.enum';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 */
export const MessagePattern = <T = PatternMetadata | string>(
  metadata?: T,
): MethodDecorator => {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(PATTERN_METADATA, metadata, descriptor.value);
    Reflect.defineMetadata(
      PATTERN_HANDLER_METADATA,
      PatternHandler.MESSAGE,
      descriptor.value,
    );
    return descriptor;
  };
};

/**
 * Registers gRPC method handler for specified service.
 */
export function GrpcMethod(service?: string): MethodDecorator;
export function GrpcMethod(service: string, method?: string): MethodDecorator;
export function GrpcMethod(service: string, method?: string): MethodDecorator {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const metadata = createMethodMetadata(target, key, service, method);
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

export function createMethodMetadata(
  target: any,
  key: string | symbol,
  service: string | undefined,
  method: string | undefined,
) {
  const capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  if (!service) {
    const { name } = target.constructor;
    return { service: name, rpc: capitalizeFirstLetter(key as string) };
  }
  if (service && !method) {
    return { service, rpc: capitalizeFirstLetter(key as string) };
  }
  return { service, rpc: method };
}
