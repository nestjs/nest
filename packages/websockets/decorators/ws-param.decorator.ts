import { PipeTransform, Type } from '@nestjs/common';
import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createPipesWsParamDecorator } from '../utils/param.utils';

/**
 * WebSocket parameter decorator. Extracts path parameters from the WebSocket URL.
 *
 * Use this decorator to inject path parameter values from dynamic WebSocket URLs.
 * Path parameters are defined in the WebSocket gateway path configuration using
 * the same syntax as HTTP controllers (e.g., `:id`, `:userId`).
 *
 * @example
 * ```typescript
 * @WebSocketGateway({ path: '/chat/:roomId/socket' })
 * export class ChatGateway {
 *   @SubscribeMessage('message')
 *   handleMessage(
 *     @ConnectedSocket() client: WebSocket,
 *     @MessageBody() data: any,
 *     @WsParam('roomId') roomId: string,
 *   ) {
 *     // roomId is automatically extracted from the WebSocket URL
 *     console.log(`Message received in room: ${roomId}`);
 *   }
 * }
 * ```
 *
 * @param property - The name of the path parameter to extract (optional)
 * @param pipes - Optional transformation/validation pipes
 * @returns ParameterDecorator
 *
 * @publicApi
 */
export function WsParam(
  property?: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;

/**
 * WebSocket parameter decorator without property name.
 * Returns all path parameters as an object.
 *
 * @param pipes - Optional transformation/validation pipes
 * @returns ParameterDecorator
 *
 * @publicApi
 */
export function WsParam(
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator;

/**
 * Implementation of the WsParam decorator
 */
export function WsParam(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamtype.PARAM)(property, ...pipes);
}
