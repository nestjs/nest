import { createRequestClass } from '../../adapters/configured-request.js';
import {
  createHttp2RequestClass,
  NODE_HTTP2,
  NodeHttp2Response,
} from '../../adapters/node-http2.js';
import { NodeRequest, NodeResponse } from '../../adapters/node-request.js';

// Members of NodeHttp2Response that NodeResponse must not declare: copied
// over, they would replace the HTTP/2 ones
const http2Members = ['end', 'destroy', 'emit', 'destroyed'];

/**
 * The members `prototype` declares and inherits from other classes, up to
 * (but not including) `base`, with the descriptors of the most derived one.
 */
function membersOf(prototype: object, base: object) {
  const members = new Map<string | symbol, PropertyDescriptor>();
  for (let proto = prototype; proto !== base;) {
    for (const key of Reflect.ownKeys(proto)) {
      if (key !== 'constructor' && !members.has(key)) {
        members.set(key, Object.getOwnPropertyDescriptor(proto, key)!);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return members;
}

describe('createHttp2RequestClass', () => {
  it('should give the HTTP/2 request every member of NodeRequest', () => {
    const { prototype } = createHttp2RequestClass(NodeRequest);

    for (const [key, descriptor] of membersOf(
      NodeRequest.prototype,
      Object.getPrototypeOf(NodeRequest.prototype),
    )) {
      expect(Object.getOwnPropertyDescriptor(prototype, key)).toEqual(
        descriptor,
      );
    }
    expect(NODE_HTTP2 in prototype).toBe(true);
  });

  it('should give it those of a configured request class too', () => {
    const requestClass = createRequestClass({ trustProxy: true });
    const { prototype } = createHttp2RequestClass(requestClass);

    for (const [key, descriptor] of membersOf(
      requestClass.prototype,
      Object.getPrototypeOf(NodeRequest.prototype),
    )) {
      expect(Object.getOwnPropertyDescriptor(prototype, key)).toEqual(
        descriptor,
      );
    }
  });
});

describe('NodeHttp2Response', () => {
  it('should have every member of NodeResponse', () => {
    for (const [key, descriptor] of membersOf(
      NodeResponse.prototype,
      Object.getPrototypeOf(NodeResponse.prototype),
    )) {
      expect(http2Members).not.toContain(key);
      expect(
        Object.getOwnPropertyDescriptor(NodeHttp2Response.prototype, key),
      ).toEqual(descriptor);
    }
    expect(NODE_HTTP2 in NodeHttp2Response.prototype).toBe(true);
  });
});
