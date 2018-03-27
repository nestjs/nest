import 'reflect-metadata';
import { GatewayMetadata } from '../interfaces';
/**
 * Defines the Gateway. The gateway is able to inject dependencies through constructor.
 * Those dependencies should belong to the same module. Gateway is listening on the specified port.
 */
export declare function WebSocketGateway(port?: number): any;
export declare function WebSocketGateway(options?: GatewayMetadata | any): any;
export declare function WebSocketGateway(
  port?: number,
  options?: GatewayMetadata | any,
): any;
