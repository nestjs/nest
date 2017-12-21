import 'reflect-metadata';
import { GatewayMetadata } from '../interfaces';
/**
 * Defines the Gateway. The gateway can inject dependencies through constructor.
 * Those dependencies should belongs to the same module. Gateway is listening on the specified port.
 */
export declare const WebSocketGateway: (
  metadataOrPort?: number | GatewayMetadata
) => ClassDecorator;
