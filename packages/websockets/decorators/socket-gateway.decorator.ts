import { GATEWAY_METADATA, GATEWAY_OPTIONS, PORT_METADATA } from '../constants';
import { GatewayMetadata } from '../interfaces';

/**
 * Decorator that marks a class as a Nest gateway that enables real-time, bidirectional
 * and event-based communication between the browser and the server.
 *
 * @publicApi
 */
export function WebSocketGateway(port?: number): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> = GatewayMetadata,
>(options?: T): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> = GatewayMetadata,
>(port?: number, options?: T): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> = GatewayMetadata,
>(portOrOptions?: number | T, options?: T): ClassDecorator {
  const isPortInt = Number.isInteger(portOrOptions as number);
  // eslint-disable-next-line prefer-const
  let [port, opt] = isPortInt ? [portOrOptions, options] : [0, portOrOptions];

  opt = opt || ({} as T);
  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(PORT_METADATA, port, target);
    Reflect.defineMetadata(GATEWAY_OPTIONS, opt, target);
  };
}
