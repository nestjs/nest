import { ControllerMetadata } from '../controllers/controller-metadata.interface';
import { Controller } from '../controllers/controller.interface';
import { RequestMethod } from '../../enums/request-method.enum';
export interface MiddlewareConfiguration {
    middlewares: any;
    forRoutes: (Controller | ControllerMetadata & {
        method?: RequestMethod;
    })[];
}
