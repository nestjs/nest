import { Application } from 'express';
import { NestContainer, InstanceWrapper } from '../injector/container';
import { RouterBuilder } from './router-builder';
import { RouterProxy } from './router-proxy';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { Controller } from '../../common/interfaces/controller.interface';
import { Logger } from '../../common/services/logger.service';
import { getRouteMappedMessage, getControllerMappingMessage } from '../helpers/messages';
import { NestMode } from '../../common/enums/nest-mode.enum';

export class RoutesResolver {
    private readonly logger = new Logger(RoutesResolver.name);
    private readonly routerProxy = new RouterProxy(new ExceptionsHandler());
    private routerBuilder: RouterBuilder;

    constructor(private container: NestContainer, expressAdapter, private mode = NestMode.RUN) {
        this.routerBuilder = new RouterBuilder(this.routerProxy, expressAdapter, mode);
    }

    resolve(expressInstance: Application) {
        const modules = this.container.getModules();
        modules.forEach(({ routes }) => this.setupRouters(routes, expressInstance));
    }

    setupRouters(
        routes: Map<string, InstanceWrapper<Controller>>,
        expressInstance: Application) {

        routes.forEach(({ instance, metatype }) => {
            if (this.mode === NestMode.RUN) {
                this.logger.log(getControllerMappingMessage(metatype.name));
            }
            const { path, router } = this.routerBuilder.build(instance, metatype);
            expressInstance.use(path, router);
        });
    }
}