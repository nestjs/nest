import { Controller } from '@nestjs/common/interfaces';
import { ParamProperties } from './context-utils';

export const HANDLER_METADATA_SYMBOL = Symbol.for('handler_metadata:cache');

export interface HandlerMetadata {
  argsLength: number;
  paramsOptions: (ParamProperties & { metatype?: any })[];
  fnHandleResponse: <TResult, TResponse>(
    result: TResult,
    res: TResponse,
  ) => any;
}

export class HandlerMetadataStorage<T = any> {
  private readonly [HANDLER_METADATA_SYMBOL] = new Map<
    string,
    HandlerMetadata
  >();

  set(controller: T, methodName: string, metadata: HandlerMetadata) {
    const metadataKey = this.getMetadataKey(controller, methodName);
    this[HANDLER_METADATA_SYMBOL].set(metadataKey, metadata);
  }

  get(controller: T, methodName: string): HandlerMetadata | undefined {
    const metadataKey = this.getMetadataKey(controller, methodName);
    return this[HANDLER_METADATA_SYMBOL].get(metadataKey);
  }

  private getMetadataKey(controller: Controller, methodName: string): string {
    const ctor = controller.constructor;
    const controllerKey = ctor && ctor.name;
    return controllerKey + methodName;
  }
}
