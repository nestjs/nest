import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { loadAdapter } from '@nestjs/core/helpers/load-adapter';
import { NestContainer } from '@nestjs/core/injector/container';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { InstanceToken } from '@nestjs/core/injector/module';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { iterate } from 'iterare';
import { AbstractWsAdapter } from './adapters';
import { GATEWAY_METADATA } from './constants';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { WsContextCreator } from './context/ws-context-creator';
import { WsProxy } from './context/ws-proxy';
import { SocketServerProvider } from './socket-server-provider';
import { SocketsContainer } from './sockets-container';
import { WebSocketsController } from './web-sockets-controller';
import { Injector } from '@nestjs/core/injector/injector';

export class SocketModule<HttpServer = any> {
  private readonly socketsContainer = new SocketsContainer();
  private applicationConfig: ApplicationConfig;
  private webSocketsController: WebSocketsController;
  private isAdapterInitialized: boolean;
  private httpServer: HttpServer | undefined;

  public register(
    container: NestContainer,
    config: ApplicationConfig,
    injector: Injector,
    httpServer?: HttpServer,
  ) {
    this.applicationConfig = config;
    this.httpServer = httpServer;

    const contextCreator = this.getContextCreator(container);
    const serverProvider = new SocketServerProvider(
      this.socketsContainer,
      config,
    );
    this.webSocketsController = new WebSocketsController(
      container,
      injector,
      serverProvider,
      config,
      contextCreator,
    );
    const modules = container.getModules();
    modules.forEach(({ providers }, moduleName: string) =>
      this.connectAllGateways(providers, moduleName),
    );
  }

  public connectAllGateways(
    providers: Map<InstanceToken, InstanceWrapper<Injectable>>,
    moduleName: string,
  ) {
    iterate(providers.values())
      .filter(wrapper => wrapper && !wrapper.isNotMetatype)
      .forEach(wrapper => this.connectGatewayToServer(wrapper, moduleName));
  }

  public connectGatewayToServer(
    wrapper: InstanceWrapper<Injectable>,
    moduleName: string,
  ) {
    const { metatype } = wrapper;
    const metadataKeys = Reflect.getMetadataKeys(metatype);
    if (!metadataKeys.includes(GATEWAY_METADATA)) {
      return;
    }
    if (!this.isAdapterInitialized) {
      this.initializeAdapter();
    }
    this.webSocketsController.connectGatewayToServer(
      wrapper,
      metatype,
      moduleName,
    );
  }

  public async close(): Promise<any> {
    if (!this.applicationConfig) {
      return;
    }
    const adapter = this.applicationConfig.getIoAdapter();
    if (!adapter) {
      return;
    }
    const servers = this.socketsContainer.getAll();
    await Promise.all(
      iterate(servers.values())
        .filter(({ server }) => server)
        .map(async ({ server }) => adapter.close(server)),
    );
    await (adapter as AbstractWsAdapter)?.dispose();

    this.socketsContainer.clear();
  }

  private initializeAdapter() {
    const adapter = this.applicationConfig.getIoAdapter();
    if (adapter) {
      this.isAdapterInitialized = true;
      return;
    }
    const { IoAdapter } = loadAdapter(
      '@nestjs/platform-socket.io',
      'WebSockets',
      () => require('@nestjs/platform-socket.io'),
    );
    const ioAdapter = new IoAdapter(this.httpServer);
    this.applicationConfig.setIoAdapter(ioAdapter);

    this.isAdapterInitialized = true;
  }

  private getContextCreator(container: NestContainer): WsContextCreator {
    return new WsContextCreator(
      new WsProxy(),
      new ExceptionFiltersContext(container),
      new PipesContextCreator(container),
      new PipesConsumer(),
      new GuardsContextCreator(container),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container),
      new InterceptorsConsumer(),
    );
  }
}
