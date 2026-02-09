import { NestApplicationOptions } from '@nestjs/common';
import { InjectionToken } from '@nestjs/common/interfaces/index.js';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface.js';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface.js';
import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer.js';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator.js';
import { loadAdapter } from '@nestjs/core/helpers/load-adapter.js';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector.js';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer.js';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator.js';
import { iterate } from 'iterare';
import { AbstractWsAdapter } from './adapters/index.js';
import { GATEWAY_METADATA } from './constants.js';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';
import { WsContextCreator } from './context/ws-context-creator.js';
import { WsProxy } from './context/ws-proxy.js';
import { NestGateway } from './interfaces/nest-gateway.interface.js';
import { SocketServerProvider } from './socket-server-provider.js';
import { SocketsContainer } from './sockets-container.js';
import { WebSocketsController } from './web-sockets-controller.js';

export class SocketModule<
  THttpServer = any,
  TAppOptions extends NestApplicationContextOptions =
    NestApplicationContextOptions,
> {
  private readonly socketsContainer = new SocketsContainer();
  private applicationConfig: ApplicationConfig;
  private webSocketsController: WebSocketsController;
  private isAdapterInitialized: boolean;
  private httpServer: THttpServer | undefined;
  private appOptions: TAppOptions;

  public register(
    container: NestContainer,
    applicationConfig: ApplicationConfig,
    graphInspector: GraphInspector,
    appOptions: TAppOptions,
    httpServer?: THttpServer,
  ) {
    this.applicationConfig = applicationConfig;
    this.appOptions = appOptions;
    this.httpServer = httpServer;

    const contextCreator = this.getContextCreator(container);
    const serverProvider = new SocketServerProvider(
      this.socketsContainer,
      applicationConfig,
    );
    this.webSocketsController = new WebSocketsController(
      serverProvider,
      applicationConfig,
      contextCreator,
      graphInspector,
      this.appOptions,
    );
    const modules = container.getModules();
    modules.forEach(({ providers }, moduleName: string) =>
      this.connectAllGateways(providers, moduleName),
    );
  }

  public connectAllGateways(
    providers: Map<InjectionToken, InstanceWrapper<Injectable>>,
    moduleName: string,
  ) {
    iterate(providers.values())
      .filter(wrapper => wrapper && !wrapper.isNotMetatype)
      .forEach(wrapper => this.connectGatewayToServer(wrapper, moduleName));
  }

  public async connectGatewayToServer(
    wrapper: InstanceWrapper<Injectable>,
    moduleName: string,
  ) {
    const { instance, metatype } = wrapper;
    const metadataKeys = Reflect.getMetadataKeys(metatype!);
    if (!metadataKeys.includes(GATEWAY_METADATA)) {
      return;
    }
    if (!this.isAdapterInitialized) {
      await this.initializeAdapter();
    }
    this.webSocketsController.connectGatewayToServer(
      instance as NestGateway,
      metatype!,
      moduleName,
      wrapper.id,
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

  private async initializeAdapter() {
    const forceCloseConnections = (this.appOptions as NestApplicationOptions)
      .forceCloseConnections;
    const adapter = this.applicationConfig.getIoAdapter();
    if (adapter) {
      (adapter as AbstractWsAdapter).forceCloseConnections =
        forceCloseConnections!;
      this.isAdapterInitialized = true;
      return;
    }
    const { IoAdapter } = await loadAdapter(
      '@nestjs/platform-socket.io',
      'WebSockets',
      () => import('@nestjs/platform-socket.io'),
    );
    const ioAdapter = new IoAdapter(this.httpServer);
    ioAdapter.forceCloseConnections = forceCloseConnections;
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
