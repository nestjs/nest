import 'reflect-metadata';
import { PATTERN_METADATA, PATTERN_HANDLER_METADATA } from '../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

/**
 * Subscribes to incoming messages which fulfils chosen pattern.
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

/**
 * Registers gRPC route handler for specified service.
 */
export const GrpcRoute = (service: string, rpc: string) =>
  MessagePattern({ service, rpc });
