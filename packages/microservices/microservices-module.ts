import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { ClientProxyFactory } from './client';
import { ClientsContainer } from './container';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { RpcContextCreator } from './context/rpc-context-creator';
import { RpcProxy } from './context/rpc-proxy';
import { CustomTransportStrategy } from './interfaces';
import { ListenersController } from './listeners-controller';
import { Server } from './server/server';

export class MicroservicesModule {
  private readonly clientsContainer = new ClientsContainer();
  private listenersController: ListenersController;

  public register(container: NestContainer, config: ApplicationConfig) {
    const rpcProxy = new RpcProxy();
    const exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      config,
    );
    const contextCreator = new RpcContextCreator(
      rpcProxy,
      exceptionFiltersContext,
      new PipesContextCreator(container, config),
      new PipesConsumer(),
      new GuardsContextCreator(container, config),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container, config),
      new InterceptorsConsumer(),
    );
    this.listenersController = new ListenersController(
      this.clientsContainer,
      contextCreator,
      container,
      new Injector(),
      ClientProxyFactory,
      exceptionFiltersContext,
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

  public close() {
    const clients = this.clientsContainer.getAllClients();
    clients.forEach(client => client.close());
    this.clientsContainer.clear();
  }
}
