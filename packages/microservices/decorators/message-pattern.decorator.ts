import { PATTERN_HANDLER_METADATA, PATTERN_METADATA } from '../constants';
import { PatternHandler } from '../enums/pattern-handler.enum';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

export enum GrpcMethodStreamingType {
  NO_STREAMING = 'no_stream',
  RX_STREAMING = 'rx_stream',
  PT_STREAMING = 'pt_stream',
}

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
    const metadata = createGrpcMethodMetadata(target, key, service, method);
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

/**
 * Registers gRPC call through RX handler for service and method
 *
 * @param service String parameter reflecting the name of service definition from proto file
 */
export function GrpcStreamMethod(service?: string);
/**
 * @param service String parameter reflecting the name of service definition from proto file
 * @param method Optional string parameter reflecting the name of method inside of a service definition coming after rpc keyword
 */
export function GrpcStreamMethod(service: string, method?: string);
export function GrpcStreamMethod(service: string, method?: string) {
  return (
    target: any,
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
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

/**
 * Registers gRPC call pass through handler for service and method
 *
 * @param service String parameter reflecting the name of service definition from proto file
 */
export function GrpcStreamCall(service?: string);
/**
 * @param service String parameter reflecting the name of service definition from proto file
 * @param method Optional string parameter reflecting the name of method inside of a service definition coming after rpc keyword
 */
export function GrpcStreamCall(service: string, method?: string);
export function GrpcStreamCall(service: string, method?: string) {
  return (
    target: any,
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
    return MessagePattern(metadata)(target, key, descriptor);
  };
}

export function createGrpcMethodMetadata(
  target: any,
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
