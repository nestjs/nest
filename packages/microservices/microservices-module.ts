import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { GuardsConsumer, GuardsContextCreator } from '@nestjs/core/guards';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import {
  InterceptorsConsumer,
  InterceptorsContextCreator,
} from '@nestjs/core/interceptors';
import { PipesConsumer, PipesContextCreator } from '@nestjs/core/pipes';
import { ClientProxyFactory } from './client';
import { ClientsContainer } from './container';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { RpcContextCreator } from './context/rpc-context-creator';
import { RpcProxy } from './context/rpc-proxy';
import { CustomTransportStrategy } from './interfaces';
import { ListenersController } from './listeners-controller';
import { Server } from './server/server';

export class MicroservicesModule<
  TAppOptions extends NestApplicationContextOptions = NestApplicationContextOptions,
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

    const injector = new Injector();
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

  public setupListeners(
    container: NestContainer,
    server: Server & CustomTransportStrategy,
  ) {
    if (!this.listenersController) {
      throw new RuntimeException();
    }
    const modules = container.getModules();
    modules.forEach(({ controllers }, moduleRef) =>
      this.bindListeners(controllers, server, moduleRef),
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
    server: Server & CustomTransportStrategy,
    moduleName: string,
  ) {
    controllers.forEach(wrapper =>
      this.listenersController.registerPatternHandlers(
        wrapper,
        server,
        moduleName,
      ),
    );
  }

  public bindClients(
    items: Map<string | symbol | Function, InstanceWrapper<unknown>>,
  ) {
    items.forEach(({ instance, isNotMetatype }) => {
      !isNotMetatype &&
        this.listenersController.assignClientsToProperties(instance);
    });
  }

  public async close() {
    const clients = this.clientsContainer.getAllClients();
    await Promise.all(clients.map(client => client.close()));
    this.clientsContainer.clear();
  }
}
