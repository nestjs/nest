import { PATTERN_METADATA, PATTERN_HANDLER_METADATA } from '../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 */
export const MessagePattern = <T = PatternMetadata | string>(
  metadata?: T,
): MethodDecorator => {
  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATTERN_METADATA, metadata, descriptor.value);
    Reflect.defineMetadata(PATTERN_HANDLER_METADATA, true, descriptor.value);
    return descriptor;
  };
};

/**
 * Registers gRPC method handler for specified service.
 */
export function GrpcMethod(service?: string);
export function GrpcMethod(service: string, method?: string);
export function GrpcMethod(service: string, method?: string) {
  return (target, key, descriptor: PropertyDescriptor) => {
    const metadata = createMethodMetadata(target, key, service, method);
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

export function createMethodMetadata(
  target: any,
  key: string,
  service: string | undefined,
  method: string | undefined,
) {
  const capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  if (!service) {
    const { name } = target.constructor;
    return { service: name, rpc: capitalizeFirstLetter(key) };
  }
  if (service && !method) {
    return { service, rpc: capitalizeFirstLetter(key) };
  }
  return { service, rpc: method };
}
