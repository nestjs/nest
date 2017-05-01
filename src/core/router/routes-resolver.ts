import { Application } from 'express';
import { NestContainer, InstanceWrapper } from '../injector/container';
import { RouterProxy } from './router-proxy';
import { Controller } from '../../common/interfaces/controller.interface';
import { Logger } from '../../common/services/logger.service';
import { ControllerMappingMessage } from '../helpers/messages';
import { Resolver } from './interfaces/resolver.interface';
import { RouterExceptionFilters } from './router-exception-filters';
import { MetadataScanner } from '../metadata-scanner';
import { RouterExplorer } from './interfaces/explorer.inteface';
import { ExpressRouterExplorer } from './router-explorer';

export class RoutesResolver implements Resolver {
    private readonly logger = new Logger(RoutesResolver.name);
    private readonly routerProxy = new RouterProxy();
    private readonly routerExceptionsFilter: RouterExceptionFilters;
    private readonly routerBuilder: RouterExplorer;

    constructor(private container: NestContainer, expressAdapter) {
        this.routerExceptionsFilter = new RouterExceptionFilters(container);
        this.routerBuilder = new ExpressRouterExplorer(
            new MetadataScanner(),
            this.routerProxy,
            expressAdapter,
            this.routerExceptionsFilter,
        );
    }

    public resolve(express: Application) {
        const modules = this.container.getModules();
        modules.forEach(({ routes }, moduleName) => this.setupRouters(routes, moduleName, express));
    }

    public setupRouters(
        routes: Map<string, InstanceWrapper<Controller>>,
        moduleName: string,
        express: Application) {

        routes.forEach(({ instance, metatype }) => {
            this.logger.log(ControllerMappingMessage(metatype.name));

            const { path, router } = this.routerBuilder.explore(instance, metatype, moduleName);
            express.use(path, router);
        });
    }
}