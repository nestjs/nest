import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface.js';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler.js';
import { ContextId } from '../../injector/instance-wrapper.js';

export interface ExceptionsFilter {
  create(
    instance: Controller,
    callback: Function,
    module: string,
    contextId?: ContextId,
    inquirerId?: string,
  ): ExceptionsHandler;
}
