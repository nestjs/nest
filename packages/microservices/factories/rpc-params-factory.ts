import { RpcParamtype } from '../enums/rpc-paramtype.enum.js';
import { isNil, isObject } from '@nestjs/common/internal';

/**
 * A key picks a property of an object payload. Of an array, a Buffer or a
 * primitive the peer sent instead, it picks only an own property (an element,
 * a length), not a prototype member: `Buffer#parent` exposes memory shared
 * with other requests, and a built-in function such as
 * `Array.prototype.values` passes for a DTO without required properties.
 * Objects keep resolving inherited properties, as a custom deserializer may
 * build class instances.
 */
const getPayloadProperty = (payload: unknown, key: string) =>
  (isObject(payload) &&
    !Array.isArray(payload) &&
    !ArrayBuffer.isView(payload)) ||
  (!isNil(payload) && Object.hasOwn(Object(payload), key))
    ? (payload as Record<string, any>)[key]
    : undefined;

export class RpcParamsFactory {
  public exchangeKeyForValue(
    type: number,
    data: string | undefined,
    args: unknown[],
  ) {
    if (!args) {
      return null;
    }
    switch (type as RpcParamtype) {
      case RpcParamtype.PAYLOAD:
        return data ? getPayloadProperty(args[0], data) : args[0];
      case RpcParamtype.CONTEXT:
        return args[1];
      case RpcParamtype.GRPC_CALL:
        return args[2];
      default:
        return null;
    }
  }
}
