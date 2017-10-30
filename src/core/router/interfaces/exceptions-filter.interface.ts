import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { Controller } from '../../interfaces/controllers/controller.interface';

export interface ExceptionsFilter {
    create(instance: Controller, callback): ExceptionsHandler;
}
