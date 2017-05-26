import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';

export interface ExceptionsFilter {
    create(instance: Controller, moduleName: string): ExceptionsHandler;
}