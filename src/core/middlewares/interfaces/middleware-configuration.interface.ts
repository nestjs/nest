import { ControllerMetadata } from '../../../common/interfaces/controller-metadata.interface';
import { Controller } from '../../../common/interfaces/controller.interface';
import { RequestMethod } from '../../../common/enums/request-method.enum';

export interface MiddlewareConfiguration {
    middlewares: any;
    forRoutes: (Controller | ControllerMetadata & { method?: RequestMethod })[];
}