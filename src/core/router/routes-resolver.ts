import { Application } from 'express';
import { NestContainer, InstanceWrapper } from '../injector/container';
import { RouterBuilder } from './router-builder';
import { RouterProxy } from './router-proxy';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { Controller } from '../../common/interfaces/controller.interface';
import { Logger } from '../../common/services/logger.service';
import { getControllerMappingMessage } from '../helpers/messages';

export class RoutesResolver {
    private readonly logger = new Logger(RoutesResolver.name);
    private readonly routerProxy = new RouterProxy(new ExceptionsHandler());
    private routerBuilder: RouterBuilder;

    constructor(private container: NestContainer, expressAdapter) {
        this.routerBuilder = new RouterBuilder(this.routerProxy, expressAdapter);
    }

    resolve(express: Application) {
        const modules = this.container.getModules();
        modules.forEach(({ routes }) => this.setupRouters(routes, express));
    }

    setupRouters(
        routes: Map<string, InstanceWrapper<Controller>>,
        express: Application) {

        routes.forEach(({ instance, metatype }) => {
            this.logger.log(getControllerMappingMessage(metatype.name));

            const { path, router } = this.routerBuilder.build(instance, metatype);
            express.use(path, router);
        });
    }
}