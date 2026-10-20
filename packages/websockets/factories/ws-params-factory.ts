import { WsParamtype } from '../enums/ws-paramtype.enum.js';
import { isFunction, isNil, isObject } from '@nestjs/common/internal';

/**
 * A key picks a property of an object payload. Of an array, a Buffer or a
 * primitive the client sent instead, it picks only an own property (an
 * element, a length), not a prototype member: `Buffer#parent` exposes memory
 * shared with other requests, and a built-in function such as
 * `Array.prototype.values` passes for a DTO without required properties.
 * Objects keep resolving inherited properties, as a custom message parser may
 * build class instances.
 */
const getPayloadProperty = (payload: unknown, key: string) =>
  (isObject(payload) &&
    !Array.isArray(payload) &&
    !ArrayBuffer.isView(payload)) ||
  (!isNil(payload) && Object.hasOwn(Object(payload), key))
    ? (payload as Record<string, any>)[key]
    : undefined;

export class WsParamsFactory {
  public exchangeKeyForValue(
    type: number,
    data: string | undefined,
    args: unknown[],
  ) {
    if (!args) {
      return null;
    }
    switch (type as WsParamtype) {
      case WsParamtype.SOCKET:
        return args[0];
      case WsParamtype.PAYLOAD:
        return data ? getPayloadProperty(args[1], data) : args[1];
      case WsParamtype.ACK: {
        return args.find(arg => isFunction(arg));
      }
      default:
        return null;
    }
  }
}
