import { NestContainer, InstanceWrapper } from '../core/injector/container';
import { Controller } from '../common/interfaces/controller.interface';
import { ListenersController } from './listeners-controller';

export class MicroservicesModule {
    private static readonly listenersController = new ListenersController();

    static setupListeners(container: NestContainer, server) {
        const modules = container.getModules();
        modules.forEach(({ routes }) => this.bindListeners(routes, server));
    }

    static setupClients(container: NestContainer) {
        const modules = container.getModules();
        modules.forEach(({ routes, components }) => {
            this.bindClients(routes);
            this.bindClients(components);
        });
    }

    static bindListeners(controllers: Map<string, InstanceWrapper<Controller>>, server) {
        controllers.forEach(({ instance }) => {
            this.listenersController.bindPatternHandlers(instance, server);
        });
    }

    static bindClients(controllers: Map<string, InstanceWrapper<Controller>>,) {
        controllers.forEach(({ instance }) => {
            this.listenersController.bindClientsToProperties(instance);
        });
    }

}