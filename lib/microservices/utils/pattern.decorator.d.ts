import 'reflect-metadata';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';
/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 */
export declare const MessagePattern: <T = string | PatternMetadata>(
  metadata?: T,
) => MethodDecorator;
/**
 * Registers gRPC route handler for specified service.
 */
export declare const GrpcRoute: (
  service: string,
  rpc: string,
) => MethodDecorator;
