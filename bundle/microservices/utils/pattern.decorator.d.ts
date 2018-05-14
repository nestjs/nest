import 'reflect-metadata';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';
/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 */
export declare const MessagePattern: <T = string | PatternMetadata>(metadata?: T) => MethodDecorator;
/**
 * Registers gRPC method handler for specified service.
 */
export declare function GrpcMethod(service?: string): any;
export declare function GrpcMethod(service: string, method?: string): any;
export declare function createMethodMetadata(target: any, key: string, service: string | undefined, method: string | undefined): {
    service: any;
    rpc: string;
};
