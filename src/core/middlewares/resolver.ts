import { ModuleDependencies } from "../injector/container";
import { MiddlewaresContainer } from "./container";
import { Injector } from "../injector/injector";
import { NestModule } from "../../common/interfaces/nest-module.interface";

export class MiddlewaresResolver {
    private instanceLoader = new Injector();

    constructor(private middlewaresContainer: MiddlewaresContainer) {}

    resolveInstances(module: ModuleDependencies, moduleProto: NestModule) {
        const middlewares = this.middlewaresContainer.getMiddlewares(moduleProto);

        middlewares.forEach((val, middlewareType) => {
            this.instanceLoader.loadInstanceOfMiddleware(
                middlewareType,
                middlewares,
                module
            );
        });
    }

}
