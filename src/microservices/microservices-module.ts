import { InstanceWrapper } from '@nestjs/core/injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ListenersController } from './listeners-controller';
import { CustomTransportStrategy } from './interfaces';
import { Server } from './server/server';
import { ClientsContainer } from './container';
import { RpcContextCreator } from './context/rpc-context-creator';
import { RpcProxy } from './context/rpc-proxy';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';

export class MicroservicesModule {
    private static readonly clientsContainer = new ClientsContainer();
    private static listenersController: ListenersController;

    public static setup(container) {
        this.listenersController = new ListenersController(
            MicroservicesModule.clientsContainer,
            new RpcContextCreator(
                new RpcProxy(),
                new ExceptionFiltersContext(),
                new PipesContextCreator(),
                new PipesConsumer(),
                new GuardsContextCreator(container),
                new GuardsConsumer(),
            ),
        );
    }

    public static setupListeners(container, server: Server & CustomTransportStrategy) {
        if (!this.listenersController) {
            throw new RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes }, module) => this.bindListeners(routes, server, module));
    }

    public static setupClients(container) {
        if (!this.listenersController) {
            throw new RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes, components }) => {
            this.bindClients(routes);
            this.bindClients(components);
        });
    }

    public static bindListeners(
        controllers: Map<string, InstanceWrapper<Controller>>,
        server: Server & CustomTransportStrategy,
        module: string) {

        controllers.forEach(({ instance }) => {
            this.listenersController.bindPatternHandlers(instance, server, module);
        });
    }

    public static bindClients(controllers: Map<string, InstanceWrapper<Controller>>) {
        controllers.forEach(({ instance, isNotMetatype }) => {
            !isNotMetatype && this.listenersController.bindClientsToProperties(instance);
        });
    }

    public static close() {
        const clients = this.clientsContainer.getAllClients();
        clients.forEach((client) => client.close());
        this.clientsContainer.clear();
    }
}