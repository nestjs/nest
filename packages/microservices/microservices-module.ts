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
import { CustomTransportStrategy, MicroserviceOptions } from './interfaces';
import { ListenersController } from './listeners-controller';
import { Server } from './server/server';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { PreRequestHandler } from './interfaces/pre-request-handler';

export class MicroservicesModule {
  private readonly clientsContainer = new ClientsContainer();
  private listenersController: ListenersController;

  public register(
    container: NestContainer,
    config: ApplicationConfig,
    microservicesConfig: NestMicroserviceOptions & MicroserviceOptions,
  ) {
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

    const injector = new Injector();
    this.listenersController = new ListenersController(
      this.clientsContainer,
      contextCreator,
      container,
      injector,
      ClientProxyFactory,
      exceptionFiltersContext,
      this.getPreRequestHandler(microservicesConfig?.preRequest, container),
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

  public async close() {
    const clients = this.clientsContainer.getAllClients();
    await Promise.all(clients.map(client => client.close()));
    this.clientsContainer.clear();
  }

  private getPreRequestHandler(
    preRequestToken,
    container: NestContainer,
  ): PreRequestHandler {
    if (preRequestToken) {
      const modules = container.getModules();

      for (const module of modules.values()) {
        const provider = module.getProviderByKey(preRequestToken);

        if (provider) {
          return provider.instance;
        }
      }

      throw new RuntimeException(
        'Cannot find preRequest instance! Please make sure that there is a corresponding provider for your token!',
      );
    }

    return null;
  }
}
