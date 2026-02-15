import { ClientProxyFactory } from './client/index.js';
import { ClientsContainer } from './container.js';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';
import { RpcContextCreator } from './context/rpc-context-creator.js';
import { RpcProxy } from './context/rpc-proxy.js';
import { ListenersController } from './listeners-controller.js';
import { Server } from './server/server.js';
import type {
  Controller,
  NestApplicationContextOptions,
} from '@nestjs/common/internal';
import type {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
} from '@nestjs/core';
import {
  RuntimeException,
  GuardsConsumer,
  GuardsContextCreator,
  Injector,
  type InstanceWrapper,
  InterceptorsConsumer,
  InterceptorsContextCreator,
  PipesConsumer,
  PipesContextCreator,
} from '@nestjs/core/internal';

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
