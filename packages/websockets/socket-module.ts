import 'reflect-metadata';
import iterate from 'iterare';
import {
  NestContainer,
  InstanceWrapper,
} from '@nestjs/core/injector/container';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { SocketsContainer } from './container';
import { WebSocketsController } from './web-sockets-controller';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { SocketServerProvider } from './socket-server-provider';
import { GATEWAY_METADATA } from './constants';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { WsContextCreator } from './context/ws-context-creator';
import { WsProxy } from './context/ws-proxy';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';

export class SocketModule {
  private readonly socketsContainer = new SocketsContainer();
  private applicationConfig: ApplicationConfig;
  private webSocketsController: WebSocketsController;

  public register(container, config) {
    this.applicationConfig = config;
    this.webSocketsController = new WebSocketsController(
      new SocketServerProvider(this.socketsContainer, config),
      container,
      config,
      this.getContextCreator(container),
    );
    const modules = container.getModules();
    modules.forEach(({ components }, moduleName) =>
      this.hookGatewaysIntoServers(components, moduleName),
    );
  }

  public hookGatewaysIntoServers(
    components: Map<string, InstanceWrapper<Injectable>>,
    moduleName: string,
  ) {
    components.forEach(wrapper =>
      this.hookGatewayIntoServer(wrapper, moduleName),
    );
  }

  public hookGatewayIntoServer(
    wrapper: InstanceWrapper<Injectable>,
    moduleName: string,
  ) {
    const { instance, metatype, isNotMetatype } = wrapper;
    if (isNotMetatype) {
      return;
    }
    const metadataKeys = Reflect.getMetadataKeys(metatype);
    if (metadataKeys.indexOf(GATEWAY_METADATA) < 0) {
      return;
    }
    this.webSocketsController.hookGatewayIntoServer(
      instance as NestGateway,
      metatype,
      moduleName,
    );
  }

  public async close(): Promise<any> {
    if (!this.applicationConfig) {
      return void 0;
    }
    const adapter = this.applicationConfig.getIoAdapter();
    const servers = this.socketsContainer.getAllServers();
    await Promise.all(
      iterate(servers.values()).map(
        async ({ server }) => server && (await adapter.close(server)),
      ),
    );
    this.socketsContainer.clear();
  }

  private getContextCreator(container): WsContextCreator {
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
