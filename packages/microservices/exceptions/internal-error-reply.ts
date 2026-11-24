import { isObject } from '@nestjs/common/internal';

/**
 * The error replies `BaseRpcExceptionFilter` answers an exception other than
 * an `RpcException` with, so that a transport can tell them from the reply to
 * an `RpcException` with the same message. Nothing of it is sent.
 */
const internalErrorReplies = new WeakSet<object>();

export function markInternalErrorReply<T extends object>(reply: T): T {
  internalErrorReplies.add(reply);
  return reply;
}

export function isInternalErrorReply(reply: unknown): boolean {
  return isObject(reply) && internalErrorReplies.has(reply);
}
