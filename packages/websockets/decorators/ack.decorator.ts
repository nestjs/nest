import { WsParamtype } from '../enums/ws-paramtype.enum';
import { createPipesWsParamDecorator } from '../utils/param.utils';

/**
 * WebSockets `ack` parameter decorator.
 * Extracts the `ack` callback function from the arguments of a ws event.
 *
 * This decorator signals to the framework that the `ack` callback will be
 * handled manually within the method, preventing the framework from
 * automatically sending an acknowledgement based on the return value.
 *
 * @example
 * ```typescript
 * @SubscribeMessage('events')
 * onEvent(
 *   @MessageBody() data: string,
 *   @Ack() ack: (response: any) => void
 * ) {
 *   // Manually call the ack callback
 *   ack({ status: 'ok' });
 * }
 * ```
 *
 * @publicApi
 */
export function Ack(): ParameterDecorator {
  return createPipesWsParamDecorator(WsParamtype.ACK)();
}
