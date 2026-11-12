import {
  GATEWAY_METADATA,
  GATEWAY_OPTIONS,
  PORT_METADATA,
} from '../constants.js';
import { GatewayMetadata } from '../interfaces/index.js';
import { isObject } from '@nestjs/common/internal';

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
  // Told apart by the options, not by the port: a port that is not an integer,
  // e.g. Number(process.env.PORT) with the variable unset, is kept, so that
  // the gateway is refused at startup instead of losing its options
  const isOptions = isObject(portOrOptions);
  // eslint-disable-next-line prefer-const
  let [port, opt] = isOptions
    ? [0, portOrOptions]
    : [portOrOptions ?? 0, options];

  opt = opt || ({} as T);
  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(PORT_METADATA, port, target);
    Reflect.defineMetadata(GATEWAY_OPTIONS, opt, target);
  };
}
