import { MiddlewaresContainer, MiddlewareWrapper } from './container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';
import { MiddlewareMetatype } from './interfaces/middleware-metatype.interface';
import { Logger } from '../../common/services/logger.service';
import { getMiddlewareInitMessage } from '../helpers/messages';
import { NestMode } from '../../common/enums/nest-mode.enum';

export class MiddlewaresResolver {
    private readonly logger: Logger = new Logger(MiddlewaresResolver.name);
    private readonly instanceLoader = new Injector();

    constructor(
        private middlewaresContainer: MiddlewaresContainer,
        private mode = NestMode.RUN) {}

    resolveInstances(module: Module, moduleName: string) {
        const middlewares = this.middlewaresContainer.getMiddlewares(moduleName);

        middlewares.forEach(({ metatype }) => {
            this.resolveMiddlewareInstance(metatype, middlewares, module);

            if (this.mode === NestMode.RUN) {
                this.logger.log(getMiddlewareInitMessage(metatype.name, module.metatype.name));
            }
        });
    }

    private resolveMiddlewareInstance(
        metatype: MiddlewareMetatype,
        middlewares: Map<string, MiddlewareWrapper>,
        module: Module) {

        this.instanceLoader.loadInstanceOfMiddleware(
            metatype,
            middlewares,
            module
        );
    }

}
