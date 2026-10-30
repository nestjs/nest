import { PipeTransform, Type } from '@nestjs/common';
import { WsParamtype } from '../enums/ws-paramtype.enum.js';
import { createPipesWsParamDecorator } from '../utils/param.utils.js';

/**
 * WebSocket parameter decorator. Extracts path parameters from the handshake URL.
 *
 * Only `WsAdapter` (`@nestjs/platform-ws`) populates path parameters. Under
 * `IoAdapter` (`@nestjs/platform-socket.io`) a named parameter resolves to
 * `undefined`, and `@WsParam()` with no name resolves to `{}`.
 *
 * Path parameters use the same syntax as HTTP controllers (`:id`, `*path`,
 * `{/optional}`). Guards, interceptors and `handleDisconnect` can read the same
 * map from the client via `WS_PATH_PARAMS`. `handleConnection(client, req)`
 * receives them on `req.params`.
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
