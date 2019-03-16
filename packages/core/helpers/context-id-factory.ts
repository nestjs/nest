import { ContextId } from '../injector/instance-wrapper';

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
