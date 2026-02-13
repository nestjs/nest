import { NestApplicationOptions } from '@nestjs/common';
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
import { InjectionToken } from '@nestjs/common';
import {
  Injectable,
  NestApplicationContextOptions,
} from '@nestjs/common/internal';
import { ApplicationConfig, NestContainer, GraphInspector } from '@nestjs/core';
import {
  GuardsConsumer,
  GuardsContextCreator,
  loadAdapter,
  InstanceWrapper,
  InterceptorsConsumer,
  InterceptorsContextCreator,
  PipesConsumer,
  PipesContextCreator,
} from '@nestjs/core/internal';

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
