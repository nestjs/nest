import 'reflect-metadata';
import { NestContainer, InstanceWrapper } from '../core/injector/container';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { SocketsContainer } from './container';
import { SubjectsController } from './subjects-controller';
import { Injectable } from '../common/interfaces/injectable.interface';
import { SocketServerProvider } from './socket-server-provider';
import { GATEWAY_METADATA } from './constants';

export class SocketModule {
    private static socketsContainer = new SocketsContainer();
    private static subjectsController;

    static setup(container: NestContainer) {
        this.subjectsController = new SubjectsController(
            new SocketServerProvider(this.socketsContainer));

        const modules = container.getModules();
        modules.forEach(({ components }) => this.hookGatewaysIntoServers(components));
    }

    static hookGatewaysIntoServers(components: Map<string, InstanceWrapper<Injectable>>) {
        components.forEach(({ instance, metatype }) => {
            const metadataKeys = Reflect.getMetadataKeys(metatype);
            if (metadataKeys.indexOf(GATEWAY_METADATA) < 0) { return; }

            this.subjectsController.hookGatewayIntoServer(
                <NestGateway>instance,
                metatype
            );
        });
    }

}