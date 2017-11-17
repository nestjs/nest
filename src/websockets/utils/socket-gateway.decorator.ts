import 'reflect-metadata';

import {
  GATEWAY_METADATA,
  GATEWAY_MIDDLEWARES,
  NAMESPACE_METADATA,
  PORT_METADATA
} from '../constants';
import {GatewayMetadata} from '../interfaces';

/**
 * Defines the Gateway. The gateway can inject dependencies through constructor.
 * Those dependencies should belongs to the same module. Gateway is listening on
 * the specified port.
 */
export const WebSocketGateway = (metadataOrPort
                                 ?: GatewayMetadata|number): ClassDecorator => {
  if (Number.isInteger(metadataOrPort as number)) {
    metadataOrPort = {port : metadataOrPort} as any;
  }
  const metadata: GatewayMetadata = metadataOrPort as GatewayMetadata || {};
  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(NAMESPACE_METADATA, metadata.namespace, target);
    Reflect.defineMetadata(PORT_METADATA, metadata.port, target);
    Reflect.defineMetadata(GATEWAY_MIDDLEWARES, metadata.middlewares, target);
  };
};