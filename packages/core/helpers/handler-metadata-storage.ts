import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { ContextId } from '../injector/instance-wrapper.js';
import { HeaderStream } from '../router/sse-stream.js';
import { ParamProperties } from './context-utils.js';
import type { Type } from '@nestjs/common';

export const HANDLER_METADATA_SYMBOL = Symbol.for('handler_metadata:cache');

export type HandleResponseFn = HandlerResponseBasicFn | HandleSseResponseFn;

export type HandlerResponseBasicFn = <TResult, TResponse>(
  result: TResult,
  res: TResponse,
  req?: any,
  handlerObservable$?: Observable<unknown>,
) => any;

export type HandleSseResponseFn = <
  TResult extends Observable<unknown> = any,
  TResponse extends HeaderStream = any,
  TRequest extends IncomingMessage = any,
>(
  result: TResult,
  res: TResponse,
  req: TRequest,
) => any;

export interface HandlerMetadata {
  argsLength: number;
  isSseHandler: boolean;
  paramtypes: any[];
  httpStatusCode: number;
  responseHeaders: any[];
  hasCustomHeaders: boolean;
  getParamsMetadata: (
    moduleKey: string,
    contextId?: ContextId,
    inquirerId?: string,
  ) => (ParamProperties & { metatype?: any })[];
  fnHandleResponse: HandleResponseFn;
}

export class HandlerMetadataStorage<
  TValue = HandlerMetadata,
  TKey extends Type<unknown> = any,
> {
  // Keyed by class: same-named classes must not share an entry.
  private readonly [HANDLER_METADATA_SYMBOL] = new WeakMap<
    Function,
    Map<string, TValue>
  >();

  set(controller: TKey, methodName: string, metadata: TValue) {
    const ctor = controller.constructor;
    if (!ctor) {
      return;
    }
    let handlers = this[HANDLER_METADATA_SYMBOL].get(ctor);
    if (!handlers) {
      handlers = new Map<string, TValue>();
      this[HANDLER_METADATA_SYMBOL].set(ctor, handlers);
    }
    handlers.set(methodName, metadata);
  }

  get(controller: TKey, methodName: string): TValue | undefined {
    const handlers = this[HANDLER_METADATA_SYMBOL].get(controller.constructor);
    return handlers?.get(methodName);
  }
}
