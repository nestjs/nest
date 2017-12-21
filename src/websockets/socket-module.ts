import 'reflect-metadata';

import { InstanceWrapper, NestContainer } from '@nestjs/core/injector/container';

import { ApplicationConfig } from '@nestjs/core/application-config';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { GATEWAY_METADATA } from './constants';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { SocketServerProvider } from './socket-server-provider';
import { SocketsContainer } from './container';
import { WebSocketsController } from './web-sockets-controller';
import { WsContextCreator } from './context/ws-context-creator';
import { WsProxy } from './context/ws-proxy';

export class SocketModule {
    private socketsContainer = new SocketsContainer();
    private webSocketsController: WebSocketsController;

    public setup(container: NestContainer, config: ApplicationConfig) {
        this.webSocketsController = new WebSocketsController(
            new SocketServerProvider(this.socketsContainer, config), container, config,
            this.getContextCreator(container),
        );
        const modules = container.getModules();
        modules.forEach(({ components }, moduleName) => this.hookGatewaysIntoServers(components, moduleName));
    }

    public hookGatewaysIntoServers(components: Map<string, InstanceWrapper<Injectable>>, moduleName: string) {
        components.forEach((wrapper) => this.hookGatewayIntoServer(wrapper, moduleName));
    }

    public hookGatewayIntoServer(wrapper: InstanceWrapper<Injectable>, moduleName: string) {
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

    public close() {
        const servers = this.socketsContainer.getAllServers();
        servers.forEach(({ server }) => server.close());
        this.socketsContainer.clear();
    }

    private getContextCreator(container: NestContainer): WsContextCreator {
        return new WsContextCreator(
            new WsProxy(),
            new ExceptionFiltersContext(),
            new PipesContextCreator(),
            new PipesConsumer(),
            new GuardsContextCreator(container),
            new GuardsConsumer(),
            new InterceptorsContextCreator(container),
            new InterceptorsConsumer(),
        );
    }
}
