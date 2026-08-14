import { ExceptionsHandler } from '../../exceptions/exceptions-handler.js';
import { ContextId } from '../../injector/instance-wrapper.js';
import type { Controller } from '@nestjs/common/internal';

export interface ExceptionsFilter {
  create(
    instance: Controller,
    callback: Function,
    module: string,
    contextId?: ContextId,
    inquirerId?: string,
  ): ExceptionsHandler;
}
