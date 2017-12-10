import { InstanceWrapper, NestContainer } from '@nestjs/core/injector/container';

import { ApplicationConfig } from '@nestjs/core/application-config';
import { ClientsContainer } from './container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { CustomTransportStrategy } from './interfaces';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { ListenersController } from './listeners-controller';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { RpcContextCreator } from './context/rpc-context-creator';
import { RpcProxy } from './context/rpc-proxy';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { Server } from './server/server';

export class MicroservicesModule {
    private readonly clientsContainer = new ClientsContainer();
    private listenersController: ListenersController;

    public setup(container: NestContainer, config: ApplicationConfig) {
        const contextCreator = new RpcContextCreator(
            new RpcProxy(),
            new ExceptionFiltersContext(config),
            new PipesContextCreator(config),
            new PipesConsumer(),
            new GuardsContextCreator(container, config),
            new GuardsConsumer(),
            new InterceptorsContextCreator(container, config),
            new InterceptorsConsumer(),
        );
        this.listenersController = new ListenersController(
            this.clientsContainer,
            contextCreator,
        );
    }

    public setupListeners(container: NestContainer, server: Server & CustomTransportStrategy) {
        if (!this.listenersController) {
            throw new RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes }, module) => this.bindListeners(routes, server, module));
    }

    public setupClients(container: NestContainer) {
        if (!this.listenersController) {
            throw new RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes, components }) => {
            this.bindClients(routes);
            this.bindClients(components);
        });
    }

    public bindListeners(
        controllers: Map<string, InstanceWrapper<Controller>>,
        server: Server & CustomTransportStrategy,
        module: string) {

        controllers.forEach(({ instance }) => {
            this.listenersController.bindPatternHandlers(instance, server, module);
        });
    }

    public bindClients(controllers: Map<string, InstanceWrapper<Controller>>) {
        controllers.forEach(({ instance, isNotMetatype }) => {
            !isNotMetatype && this.listenersController.bindClientsToProperties(instance);
        });
    }

    public close() {
        const clients = this.clientsContainer.getAllClients();
        clients.forEach((client) => client.close());
        this.clientsContainer.clear();
    }
}
