import { Type } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { CONTROLLER_ID_KEY } from '../injector/constants';
import { ContextId } from '../injector/instance-wrapper';
import { HeaderStream } from '../router/sse-stream';
import { ParamProperties } from './context-utils';

export const HANDLER_METADATA_SYMBOL = Symbol.for('handler_metadata:cache');

export type HandleResponseFn = HandlerResponseBasicFn | HandleSseResponseFn;

export type HandlerResponseBasicFn = <TResult, TResponse>(
  result: TResult,
  res: TResponse,
  req?: any,
) => any;

export type HandleSseResponseFn = <
  TResult extends Observable<unknown> = any,
  TResponse extends HeaderStream = any,
  TRequest extends IncomingMessage = any
>(
  result: TResult,
  res: TResponse,
  req: TRequest,
) => any;

export interface HandlerMetadata {
  argsLength: number;
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
  TKey extends Type<unknown> = any
> {
  private readonly [HANDLER_METADATA_SYMBOL] = new Map<string, TValue>();

  set(controller: TKey, methodName: string, metadata: TValue) {
    const metadataKey = this.getMetadataKey(controller, methodName);
    this[HANDLER_METADATA_SYMBOL].set(metadataKey, metadata);
  }

  get(controller: TKey, methodName: string): TValue | undefined {
    const metadataKey = this.getMetadataKey(controller, methodName);
    return this[HANDLER_METADATA_SYMBOL].get(metadataKey);
  }

  private getMetadataKey(controller: Controller, methodName: string): string {
    const ctor = controller.constructor;
    const controllerKey = ctor && (ctor[CONTROLLER_ID_KEY] || ctor.name);
    return controllerKey + methodName;
  }
}
