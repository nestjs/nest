import { Controller } from '../../../common/interfaces/controller.interface';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';

export interface ExceptionsFilter {
    create(instance: Controller, moduleName: string): ExceptionsHandler;
}