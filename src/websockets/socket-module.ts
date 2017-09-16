import 'reflect-metadata';
import { NestContainer, InstanceWrapper } from '@nestjs/core/injector/container';
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
    private static socketsContainer = new SocketsContainer();
    private static webSocketsController: WebSocketsController;

    public static setup(container, config) {
        this.webSocketsController = new WebSocketsController(
            new SocketServerProvider(this.socketsContainer, config), container, config,
            new WsContextCreator(
                new WsProxy(),
                new ExceptionFiltersContext(),
                new PipesContextCreator(),
                new PipesConsumer(),
                new GuardsContextCreator(container),
                new GuardsConsumer(),
                new InterceptorsContextCreator(container),
                new InterceptorsConsumer(),
            ),
        );

        const modules = container.getModules();
        modules.forEach(({ components }, moduleName) => this.hookGatewaysIntoServers(components, moduleName));
    }

    public static hookGatewaysIntoServers(components: Map<string, InstanceWrapper<Injectable>>, moduleName: string) {
        components.forEach(({ instance, metatype, isNotMetatype }) => {
            if (isNotMetatype) return;

            const metadataKeys = Reflect.getMetadataKeys(metatype);
            if (metadataKeys.indexOf(GATEWAY_METADATA) < 0) return;

            this.webSocketsController.hookGatewayIntoServer(
                instance as NestGateway,
                metatype,
                moduleName,
            );
        });
    }

    public static close() {
        const servers = this.socketsContainer.getAllServers();
        servers.forEach(({ server }) => server.close());
        this.socketsContainer.clear();
    }
}