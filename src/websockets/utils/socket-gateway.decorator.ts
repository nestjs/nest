import 'reflect-metadata';
import { GatewayMetadata } from '../interfaces';
import {
  PORT_METADATA,
  NAMESPACE_METADATA,
  GATEWAY_METADATA,
  GATEWAY_MIDDLEWARES
} from '../constants';

/**
 * Defines the Gateway. The gateway can inject dependencies through constructor.
 * Those dependencies should belongs to the same module. Gateway is listening on the specified port.
 */
export const WebSocketGateway = (
  metadataOrPort?: GatewayMetadata | number
): ClassDecorator => {
  if (Number.isInteger(metadataOrPort as number)) {
    metadataOrPort = { port: metadataOrPort } as any;
  }
  const metadata: GatewayMetadata = (metadataOrPort as GatewayMetadata) || {};
  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(NAMESPACE_METADATA, metadata.namespace, target);
    Reflect.defineMetadata(PORT_METADATA, metadata.port, target);
    Reflect.defineMetadata(GATEWAY_MIDDLEWARES, metadata.middlewares, target);
  };
};
