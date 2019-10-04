import { GATEWAY_METADATA, GATEWAY_OPTIONS, PORT_METADATA } from '../constants';
import { GatewayMetadata } from '../interfaces';

/**
 * Defines the Gateway. The gateway is able to inject dependencies through constructor.
 * Those dependencies should belong to the same module. Gateway is listening on the specified port.
 */
export function WebSocketGateway(port?: number): ClassDecorator;
export function WebSocketGateway(options?: GatewayMetadata): ClassDecorator;
export function WebSocketGateway(
  port?: number,
  options?: GatewayMetadata,
): ClassDecorator;
export function WebSocketGateway(
  portOrOptions?: number | GatewayMetadata,
  options?: GatewayMetadata,
): ClassDecorator {
  const isPortInt = Number.isInteger(portOrOptions as number);
  // tslint:disable-next-line:prefer-const
  let [port, opt] = isPortInt ? [portOrOptions, options] : [0, portOrOptions];

  opt = opt || {};
  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(PORT_METADATA, port, target);
    Reflect.defineMetadata(GATEWAY_OPTIONS, opt, target);
  };
}
