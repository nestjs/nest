import { PATTERN_METADATA, PATTERN_HANDLER_METADATA } from '../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';
// Required import for Reflect for assure that global namespace is imported
// for this particular implementations (allows testing only this file)
import 'reflect-metadata';

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

/**
 * Registers gRPC call pass through handler for service and method
 *
 * @param service  : String parameter reflecting the name of service
 *                   definition from proto file
 * @constructor
 */
export function GrpcStream(service?: string);
/**
 *
 * @param service  : String parameter reflecting the name of service
 *                   definition from proto file
 * @param method   : Optional string parameter reflecting the name of
 *                   method inside of a service definition coming after
 *                   rpc keyword
 * @constructor
 */
export function GrpcStream(service: string, method?: string);
export function GrpcStream(service: string, method?: string) {
  return (target, key, descriptor: PropertyDescriptor) => {
    const metadata = createMethodMetadata(
      target, key, service, method, true
    );
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

export function createMethodMetadata(
  target: any,
  key: string,
  service: string | undefined,
  method: string | undefined,
  streaming = false
) {
  const capitalizeFirstLetter = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  if (!service) {
    const { name } = target.constructor;
    return { service: name, rpc: capitalizeFirstLetter(key), streaming};
  }
  if (service && !method) {
    return { service, rpc: capitalizeFirstLetter(key), streaming};
  }
  return { service, rpc: method, streaming};
}
