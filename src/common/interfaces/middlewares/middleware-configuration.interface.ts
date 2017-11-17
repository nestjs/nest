import {RequestMethod} from '../../enums/request-method.enum';
import {ControllerMetadata} from '../controllers/controller-metadata.interface';
import {Controller} from '../controllers/controller.interface';

export interface MiddlewareConfiguration {
  middlewares: any;
  forRoutes: (Controller|ControllerMetadata&{method?: RequestMethod})[];
}