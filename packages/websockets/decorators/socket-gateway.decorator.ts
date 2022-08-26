import { GATEWAY_METADATA, GATEWAY_OPTIONS, PORT_METADATA } from '../constants';
import { GatewayMetadata } from '../interfaces';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { ScopeOptions } from '@nestjs/common';

/**
 * Decorator that marks a class as a Nest gateway that enables real-time, bidirectional
 * and event-based communication between the browser and the server.
 */
export function WebSocketGateway(port?: number): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> & ScopeOptions = GatewayMetadata,
>(options?: T): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> & ScopeOptions = GatewayMetadata,
>(port?: number, options?: T): ClassDecorator;
export function WebSocketGateway<
  T extends Record<string, any> & ScopeOptions = GatewayMetadata,
>(portOrOptions?: number | T, options?: T): ClassDecorator {
  const isPortInt = Number.isInteger(portOrOptions as number);
  // eslint-disable-next-line prefer-const
  let [port, opt] = isPortInt
    ? [portOrOptions, options]
    : [0, portOrOptions as T];
  const { scope, durable, ...gatewayOptions } = opt || ({} as T);

  return (target: object) => {
    Reflect.defineMetadata(GATEWAY_METADATA, true, target);
    Reflect.defineMetadata(PORT_METADATA, port, target);
    Reflect.defineMetadata(GATEWAY_OPTIONS, gatewayOptions, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, { scope, durable }, target);
  };
}
