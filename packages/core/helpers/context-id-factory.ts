import { ContextId } from '../injector/instance-wrapper';
import { REQUEST_CONTEXT_ID } from '../router/request/request-constants';

export function createContextId(): ContextId {
  /**
   * We are generating random identifier to track asynchronous
   * execution context. An identifier does not have to be neither unique
   * nor unpredictable because WeakMap uses objects as keys (reference comparison).
   * Thus, even though identifier number might be equal, WeakMap would properly
   * associate asynchronous context with its internal map values using object reference.
   * Object is automatically removed once request has been processed (closure).
   */
  return { id: Math.random() };
}

export class ContextIdFactory {
  /**
   * Generates a context identifier based on the request object.
   */
  public static create(): ContextId {
    return createContextId();
  }

  /**
   * Generates a random identifier to track asynchronous execution context.
   * @param request request object
   */
  public static getByRequest<T extends Record<any, any> = any>(
    request: T,
    propsToInspect: string[] = ['raw'],
  ): ContextId {
    if (!request) {
      return ContextIdFactory.create();
    }
    if (request[REQUEST_CONTEXT_ID as any]) {
      return request[REQUEST_CONTEXT_ID as any];
    }
    for (const key of propsToInspect) {
      if (request[key]?.[REQUEST_CONTEXT_ID]) {
        return request[key][REQUEST_CONTEXT_ID];
      }
    }
    return ContextIdFactory.create();
  }
}
