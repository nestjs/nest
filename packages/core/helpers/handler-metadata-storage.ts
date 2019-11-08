import { Controller } from '@nestjs/common/interfaces';
import { CONTROLLER_ID_KEY } from '../injector/constants';
import { ContextId } from '../injector/instance-wrapper';
import { ParamProperties } from './context-utils';

export const HANDLER_METADATA_SYMBOL = Symbol.for('handler_metadata:cache');

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
  fnHandleResponse: <TResult, TResponse>(
    result: TResult,
    res: TResponse,
  ) => any;
}

export class HandlerMetadataStorage<TValue = HandlerMetadata, TKey = any> {
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
