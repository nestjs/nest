import { ControllerMetadata } from "../../../common/interfaces/controller-metadata.interface";
import { Controller } from "../../../common/interfaces/controller.interface";
import { MiddlewareProto } from "./middleware-proto.interface";
import { RequestMethod } from "../../../common/enums/request-method.enum";

export interface MiddlewareConfiguration {
    middlewares: MiddlewareProto | MiddlewareProto[];
    forRoutes: (Controller | ControllerMetadata & { method?: RequestMethod })[];
}