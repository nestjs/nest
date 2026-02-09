import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface.js';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface.js';
import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception.js';
import {
  GuardsConsumer,
  GuardsContextCreator,
} from '@nestjs/core/guards/index.js';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { Injector } from '@nestjs/core/injector/injector.js';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector.js';
import {
  InterceptorsConsumer,
  InterceptorsContextCreator,
} from '@nestjs/core/interceptors/index.js';
import {
  PipesConsumer,
  PipesContextCreator,
} from '@nestjs/core/pipes/index.js';
import { ClientProxyFactory } from './client/index.js';
import { ClientsContainer } from './container.js';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';
import { RpcContextCreator } from './context/rpc-context-creator.js';
import { RpcProxy } from './context/rpc-proxy.js';
import { ListenersController } from './listeners-controller.js';
import { Server } from './server/server.js';

export class MicroservicesModule<
  TAppOptions extends NestApplicationContextOptions =
    NestApplicationContextOptions,
> {
  private readonly clientsContainer = new ClientsContainer();
  private listenersController: ListenersController;
  private appOptions: TAppOptions;

  public register(
    container: NestContainer,
    graphInspector: GraphInspector,
    config: ApplicationConfig,
    options: TAppOptions,
  ) {
    this.appOptions = options;
    const exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      config,
    );
    const contextCreator = new RpcContextCreator(
      new RpcProxy(),
      exceptionFiltersContext,
      new PipesContextCreator(container, config),
      new PipesConsumer(),
      new GuardsContextCreator(container, config),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container, config),
      new InterceptorsConsumer(),
    );

    const injector = new Injector({
      preview: container.contextOptions?.preview!,
      instanceDecorator:
        container.contextOptions?.instrument?.instanceDecorator,
    });
    this.listenersController = new ListenersController(
      this.clientsContainer,
      contextCreator,
      container,
      injector,
      ClientProxyFactory,
      exceptionFiltersContext,
      graphInspector,
    );
  }

  public setupListeners(container: NestContainer, serverInstance: Server) {
    if (!this.listenersController) {
      throw new RuntimeException();
    }
    const modules = container.getModules();
    modules.forEach(({ controllers }, moduleRef) =>
      this.bindListeners(controllers, serverInstance, moduleRef),
    );
  }

  public setupClients(container: NestContainer) {
    if (!this.listenersController) {
      throw new RuntimeException();
    }
    if (this.appOptions?.preview) {
      return;
    }
    const modules = container.getModules();
    modules.forEach(({ controllers, providers }) => {
      this.bindClients(controllers);
      this.bindClients(providers);
    });
  }

  public bindListeners(
    controllers: Map<string | symbol | Function, InstanceWrapper<Controller>>,
    serverInstance: Server,
    moduleName: string,
  ) {
    controllers.forEach(wrapper =>
      this.listenersController.registerPatternHandlers(
        wrapper,
        serverInstance,
        moduleName,
      ),
    );
  }

  public bindClients(
    items: Map<string | symbol | Function, InstanceWrapper<unknown>>,
  ) {
    items.forEach(({ instance, isNotMetatype }) => {
      !isNotMetatype &&
        this.listenersController.assignClientsToProperties(instance as object);
    });
  }

  public async close() {
    const clients = this.clientsContainer.getAllClients();
    await Promise.all(clients.map(client => client.close()));
    this.clientsContainer.clear();
  }
}
