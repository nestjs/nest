import { AsyncResource } from 'async_hooks';
import { IncomingMessage } from 'http';
import { constants, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { NodeRequest, NodeResponse } from './node-request.js';

/**
 * Set on the prototypes of the HTTP/2 request and response classes, which the
 * router must keep (it gives plain HTTP/1 objects those of {@link NodeRequest}
 * and {@link NodeResponse}).
 *
 * @internal
 */
export const NODE_HTTP2 = Symbol('nestjs.node.http2');

const END_SCOPE = Symbol('endScope');

/**
 * Copies the members a class declares, and those it inherits from other
 * classes, up to (but not including) `base`, onto `target`. The members of
 * the most derived class win.
 */
function copyMembers(target: object, source: object, base: object) {
  const chain: object[] = [];
  for (let proto = source; proto && proto !== base;) {
    chain.unshift(proto);
    proto = Object.getPrototypeOf(proto);
  }
  for (const proto of chain) {
    for (const key of Reflect.ownKeys(proto)) {
      if (key !== 'constructor') {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(proto, key)!,
        );
      }
    }
  }
}

/**
 * Request of the `NodeAdapter` over HTTP/2: an `Http2ServerRequest` with the
 * members of {@link NodeRequest}, which extends the HTTP/1 `IncomingMessage`
 * (so it is not an `instanceof NodeRequest`).
 *
 * @internal
 */
export function createHttp2RequestClass(
  requestClass: typeof NodeRequest,
): typeof Http2ServerRequest {
  class NodeHttp2Request extends Http2ServerRequest {
    declare [NODE_HTTP2]: true;
  }
  NodeHttp2Request.prototype[NODE_HTTP2] = true;
  copyMembers(
    NodeHttp2Request.prototype,
    requestClass.prototype,
    IncomingMessage.prototype,
  );
  return NodeHttp2Request;
}

/**
 * Response of the `NodeAdapter` over HTTP/2: an `Http2ServerResponse` with
 * the members of {@link NodeResponse}, which extends the HTTP/1
 * `ServerResponse` (so it is not an `instanceof NodeResponse`).
 *
 * @internal
 */
export class NodeHttp2Response extends Http2ServerResponse {
  declare [NODE_HTTP2]: true;
  declare [END_SCOPE]: AsyncResource | undefined;

  end(...args: any[]): this {
    if (this.listenerCount('finish') > 0) {
      this[END_SCOPE] ??= new AsyncResource('NodeHttp2Response');
    }
    return super.end(...(args as Parameters<Http2ServerResponse['end']>));
  }

  destroy(err?: Error): this {
    // Without an error, the stream closes as if the response were complete,
    // where an HTTP/1 client sees the connection drop: a response cut short
    // (a failing StreamableFile or res.sendFile()) is reset with one instead
    if (!err && this.headersSent && !this.writableEnded) {
      this.stream.close(constants.NGHTTP2_INTERNAL_ERROR);
      return this;
    }
    return super.destroy(err);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    // As over HTTP/1, "finish" runs in the async context end() was called in
    // (which the request hooks and AsyncLocalStorage rely on), not in that of
    // the session, where the stream closes once the request body is read
    const scope = event === 'finish' ? this[END_SCOPE] : undefined;
    return scope
      ? scope.runInAsyncScope(super.emit, this, event, ...args)
      : super.emit(event, ...args);
  }
}
NodeHttp2Response.prototype[NODE_HTTP2] = true;
copyMembers(
  NodeHttp2Response.prototype,
  NodeResponse.prototype,
  // ServerResponse and OutgoingMessage stay behind: HTTP/2 has its own
  Object.getPrototypeOf(NodeResponse.prototype),
);
